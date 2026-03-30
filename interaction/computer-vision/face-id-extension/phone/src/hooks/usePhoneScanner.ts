import { useEffect, useRef, useState } from "react";
import { get, ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import human from "@/lib/human";

export type ScanMode = "enroll" | "verify";

export type ScanStatus =
	| "loading-session"
	| "invalid-session"
	| "requesting"
	| "loading-models"
	| "active"
	| "detected"
	| "capturing"
	| "enrolled"
	| "verified"
	| "rejected"
	| "error";

const SIMILARITY_THRESHOLD = 0.65;
const VERIFY_TIMEOUT_MS = 2000;

const ENROLLMENT_STEPS = [
	"Look straight at the camera",
	"Turn your head slightly to the left",
	"Turn your head slightly to the right",
];

function getParams() {
	const params = new URLSearchParams(window.location.search);
	return {
		sessionId: params.get("session"),
		secret: params.get("secret"),
	};
}

export function usePhoneScanner() {
	const { sessionId, secret } = useRef(getParams()).current;
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const animationRef = useRef<number>(0);
	const doneRef = useRef(false);
	const verifyStartRef = useRef<number | null>(null);
	const storedDescriptorsRef = useRef<number[][] | null>(null);
	const descriptorRef = useRef<number[] | null>(null);
	const enrolledDescriptors = useRef<number[][]>([]);

	const [mode, setMode] = useState<ScanMode>("verify");
	const [status, setStatus] = useState<ScanStatus>("loading-session");
	const [error, setError] = useState("");
	const [faceDetected, setFaceDetected] = useState(false);
	const [similarity, setSimilarity] = useState<number | null>(null);
	const [enrollStep, setEnrollStep] = useState(0);

	const stopCamera = () => {
		if (animationRef.current) {
			cancelAnimationFrame(animationRef.current);
		}
		if (streamRef.current) {
			for (const track of streamRef.current.getTracks()) {
				track.stop();
			}
			streamRef.current = null;
		}
	};

	const writeVerifyResult = async (verified: boolean) => {
		if (!sessionId || !secret) return;
		try {
			await set(ref(db, `sessions/${sessionId}/result`), {
				verified,
				secret,
				timestamp: Date.now(),
			});
		} catch (err) {
			console.error("Failed to write result to Firebase:", err);
		}
	};

	const writeEnrollResult = async (descriptors: number[][]) => {
		if (!sessionId || !secret) return;
		try {
			await set(ref(db, `sessions/${sessionId}/result`), {
				enrolled: true,
				descriptors,
				secret,
				timestamp: Date.now(),
			});
		} catch (err) {
			console.error("Failed to write enrollment to Firebase:", err);
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
			writeEnrollResult(enrolledDescriptors.current);
		} else {
			setEnrollStep(nextStep);
			setFaceDetected(false);
			setStatus("capturing");
		}
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
					await writeVerifyResult(true);
					return;
				}

				if (!verifyStartRef.current) {
					verifyStartRef.current = Date.now();
				}

				if (Date.now() - verifyStartRef.current > VERIFY_TIMEOUT_MS) {
					doneRef.current = true;
					stopCamera();
					setStatus("rejected");
					await writeVerifyResult(false);
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
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user", width: 640, height: 480 },
				audio: false,
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
			setStatus("loading-models");
			await human.warmup();
			setStatus("active");
			detectLoop();
		} catch (err) {
			setStatus("error");
			if (err instanceof DOMException && err.name === "NotAllowedError") {
				setError("Camera access denied. Please allow camera permissions.");
			} else if (err instanceof DOMException && err.name === "NotFoundError") {
				setError("No camera found on this device.");
			} else {
				setError("Failed to access camera.");
			}
		}
	};

	const loadSession = async () => {
		if (!sessionId || !secret) {
			setStatus("invalid-session");
			setError("Invalid or missing scan link.");
			return;
		}

		try {
			const snapshot = await get(ref(db, `sessions/${sessionId}`));
			if (!snapshot.exists()) {
				setStatus("invalid-session");
				setError("Session not found or expired.");
				return;
			}

			const session = snapshot.val();

			if (session.secret !== secret) {
				setStatus("invalid-session");
				setError("Invalid session secret.");
				return;
			}

			if (session.result) {
				setStatus("invalid-session");
				setError("This session has already been used.");
				return;
			}

			if (session.mode === "enroll") {
				setMode("enroll");
				await startCamera();
				return;
			}

			// Verify mode
			if (!session.descriptors || session.descriptors.length === 0) {
				setStatus("invalid-session");
				setError("No face data found for this session.");
				return;
			}

			storedDescriptorsRef.current = session.descriptors;
			await startCamera();
		} catch (err) {
			setStatus("error");
			setError(
				`Failed to load session: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: loads once on mount
	useEffect(() => {
		loadSession();
		return () => stopCamera();
	}, []);

	const borderColor = faceDetected
		? "border-green-500"
		: status === "error" || status === "rejected"
			? "border-red-500"
			: "border-border";

	return {
		mode,
		videoRef,
		status,
		error,
		faceDetected,
		similarity,
		borderColor,
		enrollStep,
		enrollmentSteps: ENROLLMENT_STEPS,
		captureAngle,
	};
}
