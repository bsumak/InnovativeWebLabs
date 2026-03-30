import { Loader2 } from "lucide-react";

interface LoadingProps {
	message?: string;
}

export default function Loading({ message = "Loading..." }: LoadingProps) {
	return (
		<div className="flex flex-col items-center gap-3">
			<Loader2 className="size-8 animate-spin text-primary" />
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	);
}
