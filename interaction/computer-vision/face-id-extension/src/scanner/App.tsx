import { useEffect, useState } from "react";
import Loading from "@/components/Loading";
import CameraPreview from "@/components/scanner/CameraPreview";
import EnrollmentView from "@/components/scanner/EnrollmentView";
import QREnrollment from "@/components/scanner/QREnrollment";
import QRVerification from "@/components/scanner/QRVerification";
import VerificationView from "@/components/scanner/VerificationView";
import { useScanner } from "@/hooks/useScanner";
import { getDecryptedCredential } from "@/lib/credentials";
import { decryptFromSession } from "@/lib/crypto";
import type { CameraMode } from "@/settings/App";

type ScanMethod = "webcam" | "qr" | "loading";

function getParams() {
	const params = new URLSearchParams(window.location.search);
	return {
		mode: params.get("mode") === "verify" ? "verify" : "enroll",
		tabId: params.get("tabId") ? Number(params.get("tabId")) : null,
		credId: params.get("credId"),
	};
}

async function detectWebcam(): Promise<boolean> {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		return devices.some((d) => d.kind === "videoinput");
	} catch {
		return false;
	}
}

async function resolveScanMethod(): Promise<ScanMethod> {
	const data = await chrome.storage.sync.get("cameraMode");
	const mode = (data.cameraMode as CameraMode) || "auto";

	if (mode === "webcam") return "webcam";
	if (mode === "phone") return "qr";

	const hasWebcam = await detectWebcam();
	return hasWebcam ? "webcam" : "qr";
}

function WebcamScanner() {
	const {
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
	} = useScanner();

	const title = mode === "enroll" ? "Enroll Face ID" : "Verify Face ID";
	const isDone =
		status === "enrolled" || status === "verified" || status === "rejected";

	return (
		<div className="flex flex-col items-center gap-6">
			<h1 className="text-2xl font-bold text-foreground">{title}</h1>

			{status === "enrolled" && (
				<EnrollmentView
					status={status}
					enrollStep={enrollStep}
					faceDetected={faceDetected}
					onCapture={captureAngle}
				/>
			)}

			{(status === "verified" || status === "rejected") && (
				<VerificationView
					status={status}
					similarity={similarity}
					faceDetected={faceDetected}
					hasAutofill={!!tabId}
				/>
			)}

			{!isDone && (
				<>
					<CameraPreview videoRef={videoRef} borderColor={borderColor} />

					{status === "requesting" && (
						<p className="text-muted-foreground">Requesting camera access...</p>
					)}

					{status === "loading-models" && (
						<Loading message="Loading face recognition models..." />
					)}

					{mode === "enroll" && (
						<EnrollmentView
							status={status}
							enrollStep={enrollStep}
							faceDetected={faceDetected}
							onCapture={captureAngle}
						/>
					)}

					{mode === "verify" && (
						<VerificationView
							status={status}
							similarity={similarity}
							faceDetected={faceDetected}
							hasAutofill={!!tabId}
						/>
					)}

					{status === "error" && <p className="text-destructive">{error}</p>}
				</>
			)}
		</div>
	);
}

export default function App() {
	const [scanMethod, setScanMethod] = useState<ScanMethod>("loading");
	const { mode, tabId, credId } = getParams();

	useEffect(() => {
		resolveScanMethod().then(setScanMethod);
	}, []);

	const handleVerified = async () => {
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
		setTimeout(() => window.close(), 1500);
	};

	const handleRejected = () => {
		// QRVerification handles retry UI internally
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			{scanMethod === "loading" && <Loading message="Loading..." />}

			{scanMethod === "webcam" && <WebcamScanner />}

			{scanMethod === "qr" && (
				<div className="flex flex-col items-center gap-6">
					<h1 className="text-2xl font-bold text-foreground">
						{mode === "enroll" ? "Enroll Face ID" : "Verify Face ID"}
					</h1>
					{mode === "enroll" ? (
						<QREnrollment />
					) : (
						<QRVerification
							tabId={tabId}
							credId={credId}
							onVerified={handleVerified}
							onRejected={handleRejected}
						/>
					)}
				</div>
			)}
		</div>
	);
}
