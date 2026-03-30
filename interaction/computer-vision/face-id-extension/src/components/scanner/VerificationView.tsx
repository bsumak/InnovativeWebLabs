import { Button } from "@/components/ui/button";

interface VerificationViewProps {
	status: string;
	similarity: number | null;
	faceDetected: boolean;
	hasAutofill: boolean;
}

export default function VerificationView({
	status,
	similarity,
	faceDetected,
	hasAutofill,
}: VerificationViewProps) {
	if (status === "verified") {
		return (
			<div className="flex flex-col items-center gap-3">
				<p className="text-lg text-green-600">
					Identity verified! ({Math.round((similarity ?? 0) * 100)}% match)
				</p>
				<p className="text-muted-foreground">
					{hasAutofill
						? "Credentials filled — you can close this tab."
						: "You can close this tab now."}
				</p>
			</div>
		);
	}

	if (status === "rejected") {
		return (
			<div className="flex flex-col items-center gap-4">
				<div className="flex h-64 w-64 items-center justify-center rounded-full border-4 border-red-500 bg-red-500/10">
					<p className="text-2xl font-bold text-red-500">Access Denied</p>
				</div>
				<p className="text-muted-foreground">
					Face did not match. Please try again.
				</p>
				<Button
					size="lg"
					variant="outline"
					onClick={() => window.location.reload()}
				>
					Retry
				</Button>
			</div>
		);
	}

	return (
		<>
			{status === "active" && (
				<p className="text-muted-foreground">
					Position your face in the circle...
				</p>
			)}

			{faceDetected && similarity !== null && (
				<p className="text-muted-foreground">
					Matching... ({Math.round(similarity * 100)}%)
				</p>
			)}
		</>
	);
}
