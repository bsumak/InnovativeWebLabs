import {
	ExternalLink,
	Eye,
	EyeOff,
	Globe,
	Mail,
	Pencil,
	Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Credential } from "@/lib/credentials";

interface CredentialListProps {
	credentials: Credential[];
	matchedCredId: string | null;
	visiblePasswords: Record<string, string>;
	onEdit: (cred: Credential) => void;
	onDelete: (id: string) => void;
	onTogglePassword: (id: string) => void;
}

export default function CredentialList({
	credentials,
	matchedCredId,
	visiblePasswords,
	onEdit,
	onDelete,
	onTogglePassword,
}: CredentialListProps) {
	if (credentials.length === 0) {
		return (
			<div className="flex flex-col items-center gap-1 py-4 text-center">
				<p className="text-sm text-muted-foreground">
					No saved credentials yet.
				</p>
				<p className="text-xs text-muted-foreground">
					Click "Add" to save your first login.
				</p>
			</div>
		);
	}

	const sorted = matchedCredId
		? [...credentials].sort((a, b) => {
				if (a.id === matchedCredId) return -1;
				if (b.id === matchedCredId) return 1;
				return 0;
			})
		: credentials;

	return (
		<div className="flex flex-col gap-2">
			{sorted.map((cred) => (
				<Card
					key={cred.id}
					className={
						matchedCredId === cred.id ? "border-primary bg-primary/5" : ""
					}
				>
					<CardContent className="flex flex-col gap-2 p-3">
						{/* Header row */}
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-foreground">
								{cred.label}
							</span>
							<div className="flex gap-1">
								{cred.domains.length > 0 && (
									<Button
										variant="ghost"
										size="icon-xs"
										onClick={() =>
											chrome.tabs.create({
												url: `https://${cred.domains[0]}`,
											})
										}
									>
										<ExternalLink className="size-3" />
									</Button>
								)}
								<Button
									variant="ghost"
									size="icon-xs"
									onClick={() => onEdit(cred)}
								>
									<Pencil className="size-3" />
								</Button>
								<Button
									variant="ghost"
									size="icon-xs"
									className="text-destructive hover:text-destructive"
									onClick={() => onDelete(cred.id)}
								>
									<Trash2 className="size-3" />
								</Button>
							</div>
						</div>

						{/* Email */}
						<div className="flex items-center gap-1.5">
							<Mail className="size-3 text-muted-foreground" />
							<p className="text-xs text-muted-foreground">{cred.email}</p>
						</div>

						{/* Password */}
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								className="text-muted-foreground hover:text-foreground transition-colors"
								onClick={() => onTogglePassword(cred.id)}
							>
								{visiblePasswords[cred.id] ? (
									<EyeOff className="size-3" />
								) : (
									<Eye className="size-3" />
								)}
							</button>
							<p className="font-mono text-xs text-muted-foreground">
								{visiblePasswords[cred.id] ?? "••••••••"}
							</p>
						</div>

						{/* Domain badges */}
						<div className="flex flex-wrap gap-1">
							{cred.domains.map((domain) => (
								<span
									key={domain}
									className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[0.625rem] text-muted-foreground"
								>
									<Globe className="size-2.5" />
									{domain}
								</span>
							))}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
