import { LockKeyhole } from "lucide-react";
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

interface MasterPasswordUnlockProps {
	masterInput: string;
	setMasterInput: (value: string) => void;
	masterError: string;
	onUnlock: () => void;
	onReset: () => void;
}

export default function MasterPasswordUnlock({
	masterInput,
	setMasterInput,
	masterError,
	onUnlock,
	onReset,
}: MasterPasswordUnlockProps) {
	return (
		<div className="w-96 p-5">
			<div className="mb-4 flex items-center gap-2">
				<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
					<LockKeyhole className="size-4 text-primary" />
				</div>
				<div>
					<h1 className="text-base font-bold text-foreground">
						Face ID Extension
					</h1>
					<p className="text-xs text-muted-foreground">Locked</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Unlock</CardTitle>
					<CardDescription>
						Enter your master password to access credentials.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<div>
						<Label htmlFor="master-unlock">Master Password</Label>
						<Input
							id="master-unlock"
							type="password"
							placeholder="Enter master password"
							value={masterInput}
							onChange={(e) => setMasterInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && onUnlock()}
						/>
					</div>
					{masterError && (
						<p className="text-sm text-destructive">{masterError}</p>
					)}
					<Button className="mt-1" onClick={onUnlock}>
						Unlock
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground"
						onClick={onReset}
					>
						Forgot password? Reset everything
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
