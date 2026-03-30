import { Button } from "@/components/ui/button";

const ENROLLMENT_STEPS = [
	"Look straight at the camera",
	"Turn your head slightly to the left",
	"Turn your head slightly to the right",
] as const;

interface EnrollmentViewProps {
	status: string;
	enrollStep: number;
	faceDetected: boolean;
	onCapture: () => void;
}

export { ENROLLMENT_STEPS };

export default function EnrollmentView({
	status,
	enrollStep,
	faceDetected,
	onCapture,
}: EnrollmentViewProps) {
	if (status === "enrolled") {
		return (
			<div className="flex flex-col items-center gap-3">
				<p className="text-lg text-green-600">Face ID enrolled successfully!</p>
				<p className="text-muted-foreground">
					{ENROLLMENT_STEPS.length} angles captured.
				</p>
			</div>
		);
	}

	if (
		status === "requesting" ||
		status === "loading-models" ||
		status === "error"
	) {
		return null;
	}

	return (
		<div className="flex flex-col items-center gap-3">
			<p className="text-sm text-muted-foreground">
				Step {enrollStep + 1} of {ENROLLMENT_STEPS.length}
			</p>
			<p className="text-muted-foreground">{ENROLLMENT_STEPS[enrollStep]}</p>
			{faceDetected ? (
				<Button size="lg" onClick={onCapture}>
					Capture
				</Button>
			) : (
				<p className="text-sm text-muted-foreground">Waiting for face...</p>
			)}
		</div>
	);
}
