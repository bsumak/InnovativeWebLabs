import { useEffect, useRef, useState } from "react";
import { ENROLLMENT_STEPS } from "@/components/scanner/EnrollmentView";
import { getDecryptedCredential } from "@/lib/credentials";
import { decryptFromSession } from "@/lib/crypto";
import human from "@/lib/human";

export type ScanStatus =
	| "idle"
	| "requesting"
	| "loading-models"
	| "active"
	| "detected"
	| "capturing"
	| "enrolled"
	| "verified"
	| "rejected"
	| "error";

export type Mode = "enroll" | "verify";

function getParams() {
	const params = new URLSearchParams(window.location.search);
	return {
		mode: (params.get("mode") === "verify" ? "verify" : "enroll") as Mode,
		tabId: params.get("tabId") ? Number(params.get("tabId")) : null,
		credId: params.get("credId"),
	};
}

const SIMILARITY_THRESHOLD = 0.65;
const VERIFY_TIMEOUT_MS = 2000;

export function useScanner() {
	const { mode, tabId, credId } = useRef(getParams()).current;
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const animationRef = useRef<number>(0);
	const doneRef = useRef(false);
	const verifyStartRef = useRef<number | null>(null);
	const [status, setStatus] = useState<ScanStatus>("idle");
	const [error, setError] = useState("");
	const [faceDetected, setFaceDetected] = useState(false);
	const [similarity, setSimilarity] = useState<number | null>(null);
	const descriptorRef = useRef<number[] | null>(null);
	const storedDescriptorsRef = useRef<number[][] | null>(null);

	const [enrollStep, setEnrollStep] = useState(0);
	const enrolledDescriptors = useRef<number[][]>([]);

	const stopCamera = () => {
		if (animationRef.current) {
			cancelAnimationFrame(animationRef.current);
		}
		if (streamRef.current) {
			for (const track of streamRef.current.getTracks()) {
				track.stop();
			}
			streamRef.current = null;
			console.log("[Camera] Stopped");
		}
	};

	const performAutofill = async () => {
		if (!tabId || !credId) return;

		const session = await chrome.storage.session.get("mp");
		if (!session.mp) return;
		const mp = await decryptFromSession(session.mp as string);

		const cred = await getDecryptedCredential(credId, mp);
		if (!cred) return;

		chrome.tabs.sendMessage(tabId, {
			action: "fill",
			email: cred.email,
			password: cred.password,
		});

		// Focus the original tab before closing
		chrome.tabs.update(tabId, { active: true });
	};

	const detectLoop = async () => {
		if (!videoRef.current || doneRef.current) return;

		const result = await human.detect(videoRef.current);
		const face = result.face[0];

		if (doneRef.current) return;

		if (face?.embedding && face.score > 0.5) {
			setFaceDetected(true);
			descriptorRef.current = face.embedding;

			if (mode === "verify" && storedDescriptorsRef.current) {
				const match = human.match.find(
					face.embedding,
					storedDescriptorsRef.current,
				);
				setSimilarity(match.similarity);

				if (match.similarity >= SIMILARITY_THRESHOLD) {
					doneRef.current = true;
					stopCamera();
					setStatus("verified");
					await performAutofill();
					setTimeout(() => window.close(), 1500);
					return;
				}

				if (!verifyStartRef.current) {
					verifyStartRef.current = Date.now();
				}

				if (Date.now() - verifyStartRef.current > VERIFY_TIMEOUT_MS) {
					doneRef.current = true;
					stopCamera();
					setStatus("rejected");
					return;
				}
			} else if (mode === "enroll") {
				setStatus("detected");
			}
		} else {
			setFaceDetected(false);
			descriptorRef.current = null;
			setSimilarity(null);
			verifyStartRef.current = null;
			if (mode === "enroll" && status !== "capturing") {
				setStatus("active");
			}
		}

		if (!doneRef.current) {
			animationRef.current = requestAnimationFrame(detectLoop);
		}
	};

	const startCamera = async () => {
		setStatus("requesting");

		if (mode === "verify") {
			const data = await chrome.storage.local.get("faceDescriptors");
			if (!data.faceDescriptors) {
				setStatus("error");
				setError("No face enrolled. Please enroll first.");
				return;
			}
			storedDescriptorsRef.current = data.faceDescriptors as number[][];
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user", width: 640, height: 480 },
				audio: false,
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
			console.log("[Camera] Started");
			setStatus("loading-models");
			await human.warmup();
			setStatus("active");
			detectLoop();
		} catch (err) {
			setStatus("error");
			if (err instanceof DOMException && err.name === "NotAllowedError") {
				setError("Camera access denied. Please allow camera permissions.");
			} else if (err instanceof DOMException && err.name === "NotFoundError") {
				setError("No camera found. Please connect a webcam.");
			} else {
				setError("Failed to access camera.");
			}
		}
	};

	const captureAngle = () => {
		if (!descriptorRef.current) return;

		enrolledDescriptors.current.push(Array.from(descriptorRef.current));
		const nextStep = enrollStep + 1;

		if (nextStep >= ENROLLMENT_STEPS.length) {
			doneRef.current = true;
			stopCamera();
			setStatus("enrolled");
			chrome.storage.local.set({
				faceDescriptors: enrolledDescriptors.current,
			});
			setTimeout(() => window.close(), 1500);
		} else {
			setEnrollStep(nextStep);
			setFaceDetected(false);
			setStatus("capturing");
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: camera starts once on mount
	useEffect(() => {
		startCamera();
		return () => stopCamera();
	}, []);

	const borderColor = faceDetected
		? "border-green-500"
		: status === "error" || status === "rejected"
			? "border-red-500"
			: "border-border";

	return {
		mode,
		tabId,
		videoRef,
		status,
		error,
		faceDetected,
		similarity,
		enrollStep,
		borderColor,
		captureAngle,
	};
}
