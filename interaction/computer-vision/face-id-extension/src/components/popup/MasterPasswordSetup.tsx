import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MasterPasswordSetupProps {
	masterInput: string;
	setMasterInput: (value: string) => void;
	confirmInput: string;
	setConfirmInput: (value: string) => void;
	masterError: string;
	onSubmit: () => void;
}

export default function MasterPasswordSetup({
	masterInput,
	setMasterInput,
	confirmInput,
	setConfirmInput,
	masterError,
	onSubmit,
}: MasterPasswordSetupProps) {
	return (
		<div className="w-96 p-5">
			<div className="mb-4 flex items-center gap-2">
				<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
					<Lock className="size-4 text-primary" />
				</div>
				<div>
					<h1 className="text-base font-bold text-foreground">
						Face ID Extension
					</h1>
					<p className="text-xs text-muted-foreground">First-time setup</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Create Master Password</CardTitle>
					<CardDescription>
						This password protects all your saved credentials. You'll need it
						once per browser session.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<div>
						<Label htmlFor="master">Master Password</Label>
						<Input
							id="master"
							type="password"
							placeholder="Min. 6 characters"
							value={masterInput}
							onChange={(e) => setMasterInput(e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="confirm">Confirm Password</Label>
						<Input
							id="confirm"
							type="password"
							placeholder="Repeat password"
							value={confirmInput}
							onChange={(e) => setConfirmInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && onSubmit()}
						/>
					</div>
					{masterError && (
						<p className="text-sm text-destructive">{masterError}</p>
					)}
					<Button className="mt-1" onClick={onSubmit}>
						Set Master Password
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
