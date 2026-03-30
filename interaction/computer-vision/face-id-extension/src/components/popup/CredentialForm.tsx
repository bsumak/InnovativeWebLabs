import { Link, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CredentialFormProps {
	editingId: string | null;
	label: string;
	setLabel: (value: string) => void;
	domains: string[];
	updateDomain: (index: number, value: string) => void;
	addDomain: () => void;
	addCurrentDomain: () => void;
	currentDomain: string | null;
	removeDomain: (index: number) => void;
	email: string;
	setEmail: (value: string) => void;
	password: string;
	setPassword: (value: string) => void;
	onSave: () => void;
}

export default function CredentialForm({
	editingId,
	label,
	setLabel,
	domains,
	updateDomain,
	addDomain,
	addCurrentDomain,
	currentDomain,
	removeDomain,
	email,
	setEmail,
	password,
	setPassword,
	onSave,
}: CredentialFormProps) {
	return (
		<Card>
			<CardContent className="flex flex-col gap-3 p-4">
				<div>
					<Label htmlFor="label">Label</Label>
					<Input
						id="label"
						placeholder="e.g. School Portal"
						value={label}
						onChange={(e) => setLabel(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label>Domains</Label>
					{domains.map((domain, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: editable list without stable IDs
						<div key={i} className="flex gap-1">
							<Input
								placeholder="example.com"
								value={domain}
								onChange={(e) => updateDomain(i, e.target.value)}
							/>
							{domains.length > 1 && (
								<Button
									variant="outline"
									size="icon"
									className="shrink-0"
									onClick={() => removeDomain(i)}
								>
									<Minus className="size-3" />
								</Button>
							)}
						</div>
					))}
					<div className="flex gap-1">
						<Button variant="ghost" size="sm" onClick={addDomain}>
							<Plus className="size-3" />
							Add domain
						</Button>
						{currentDomain && !domains.includes(currentDomain) && (
							<Button variant="ghost" size="sm" onClick={addCurrentDomain}>
								<Link className="size-3" />
								Add current
							</Button>
						)}
					</div>
				</div>
				<div>
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						placeholder="you@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>
				<div>
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						type="password"
						placeholder={editingId ? "Leave blank to keep current" : "••••••••"}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>
				<Button className="mt-1" onClick={onSave}>
					{editingId ? "Update" : "Save"}
				</Button>
			</CardContent>
		</Card>
	);
}
