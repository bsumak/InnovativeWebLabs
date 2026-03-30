import CameraPreview from "@/components/CameraPreview";
import Loading from "@/components/Loading";
import VerificationView from "@/components/VerificationView";
import { usePhoneScanner } from "@/hooks/usePhoneScanner";

export default function App() {
	const {
		mode,
		videoRef,
		status,
		error,
		faceDetected,
		similarity,
		borderColor,
		enrollStep,
		enrollmentSteps,
		captureAngle,
	} = usePhoneScanner();

	const title =
		mode === "enroll" ? "Enroll Face ID" : "Face ID Verification";
	const isDone =
		status === "enrolled" ||
		status === "verified" ||
		status === "rejected";

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="flex flex-col items-center gap-6">
				<h1 className="text-2xl font-bold text-foreground">{title}</h1>

				{status === "loading-session" && (
					<Loading message="Loading session..." />
				)}

				{status === "invalid-session" && (
					<div className="flex flex-col items-center gap-3 text-center">
						<p className="text-destructive">{error}</p>
					</div>
				)}

				{/* Enrollment done */}
				{status === "enrolled" && (
					<div className="flex flex-col items-center gap-3">
						<p className="text-lg text-green-600">
							Face ID enrolled successfully!
						</p>
						<p className="text-muted-foreground">
							{enrollmentSteps.length} angles captured. You can close this
							page.
						</p>
					</div>
				)}

				{/* Verification done */}
				{isDone && status !== "enrolled" && (
					<VerificationView
						status={status}
						similarity={similarity}
						faceDetected={faceDetected}
					/>
				)}

				{/* Active scanning */}
				{!isDone &&
					status !== "loading-session" &&
					status !== "invalid-session" && (
						<>
							<CameraPreview
								videoRef={videoRef}
								borderColor={borderColor}
							/>

							{status === "requesting" && (
								<p className="text-muted-foreground">
									Requesting camera access...
								</p>
							)}

							{status === "loading-models" && (
								<Loading message="Loading face recognition models..." />
							)}

							{/* Enrollment UI */}
							{mode === "enroll" &&
								status !== "requesting" &&
								status !== "loading-models" &&
								status !== "error" && (
									<div className="flex flex-col items-center gap-3">
										<p className="text-sm text-muted-foreground">
											Step {enrollStep + 1} of {enrollmentSteps.length}
										</p>
										<p className="text-muted-foreground">
											{enrollmentSteps[enrollStep]}
										</p>
										{faceDetected ? (
											<button
												type="button"
												className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
												onClick={captureAngle}
											>
												Capture
											</button>
										) : (
											<p className="text-sm text-muted-foreground">
												Waiting for face...
											</p>
										)}
									</div>
								)}

							{/* Verification UI */}
							{mode === "verify" && (
								<VerificationView
									status={status}
									similarity={similarity}
									faceDetected={faceDetected}
								/>
							)}

							{status === "error" && (
								<p className="text-destructive">{error}</p>
							)}
						</>
					)}
			</div>
		</div>
	);
}
