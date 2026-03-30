import { Checkbox } from "@/components/ui/checkbox";
import { Globe, Mail, KeyRound } from "lucide-react";

export interface ParsedEntry {
	id: string;
	name: string;
	domain: string;
	username: string;
	password: string;
	note: string;
}

interface ImportEntryProps {
	entry: ParsedEntry;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}

export function ImportEntry({ entry, checked, onCheckedChange }: ImportEntryProps) {
	const id = `import-${entry.domain}-${entry.username}`;
	return (
		<button
			type="button"
			onClick={() => onCheckedChange(!checked)}
			className={`flex w-full items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-left ${
				checked
					? "border-primary bg-primary/5"
					: "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
			}`}
		>
			<Checkbox
				id={id}
				checked={checked}
				onCheckedChange={(v) => onCheckedChange(v === true)}
				onClick={(e) => e.stopPropagation()}
				className="mt-0.5"
			/>
			<div className="flex-1 min-w-0">
				<span className="text-sm font-medium text-foreground">{entry.name}</span>
				<div className="mt-1 flex flex-col gap-0.5">
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Globe className="size-3 shrink-0" />
						<span className="truncate">{entry.domain}</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Mail className="size-3 shrink-0" />
						<span className="truncate">{entry.username}</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<KeyRound className="size-3 shrink-0" />
						<span className="font-mono">••••••••</span>
					</div>
				</div>
				{entry.note && (
					<p className="mt-1 text-xs text-muted-foreground/70 italic truncate">
						{entry.note}
					</p>
				)}
			</div>
		</button>
	);
}
