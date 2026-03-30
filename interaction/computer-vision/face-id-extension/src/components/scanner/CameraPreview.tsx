import type { RefObject } from "react";

interface CameraPreviewProps {
	videoRef: RefObject<HTMLVideoElement | null>;
	borderColor: string;
}

export default function CameraPreview({
	videoRef,
	borderColor,
}: CameraPreviewProps) {
	return (
		<div
			className={`relative h-64 w-64 overflow-hidden rounded-full border-4 ${borderColor} transition-colors duration-300`}
		>
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className="h-full w-full object-cover"
			/>
		</div>
	);
}
