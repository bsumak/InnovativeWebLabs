import {
	Camera,
	FileUp,
	Monitor,
	Moon,
	Smartphone,
	Sparkles,
	Sun,
	Webcam,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImportPage } from "@/components/settings/ImportPage";
import { getTheme, setTheme as setThemePersist, type Theme } from "@/lib/theme";

export type CameraMode = "webcam" | "phone" | "auto";

const CAMERA_OPTIONS: {
	value: CameraMode;
	label: string;
	description: string;
	icon: typeof Camera;
}[] = [
	{
		value: "auto",
		label: "Auto-detect",
		description:
			"Uses your webcam if available, otherwise falls back to phone camera via QR code.",
		icon: Sparkles,
	},
	{
		value: "webcam",
		label: "PC Webcam",
		description: "Always use your computer's built-in or external webcam.",
		icon: Webcam,
	},
	{
		value: "phone",
		label: "Phone Camera",
		description:
			"Always scan a QR code with your phone to verify your identity.",
		icon: Smartphone,
	},
];

const THEME_OPTIONS: {
	value: Theme;
	label: string;
	icon: typeof Sun;
}[] = [
	{ value: "system", label: "System", icon: Monitor },
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
];

export default function App() {
	const [page, setPage] = useState<"settings" | "import">("settings");
	const [cameraMode, setCameraMode] = useState<CameraMode>("auto");
	const [theme, setTheme] = useState<Theme>("system");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		chrome.storage.sync.get("cameraMode").then((data) => {
			if (data.cameraMode) {
				setCameraMode(data.cameraMode as CameraMode);
			}
		});
		getTheme().then(setTheme);
	}, []);

	const showSaved = () => {
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	const handleCameraChange = (value: string) => {
		const mode = value as CameraMode;
		setCameraMode(mode);
		chrome.storage.sync.set({ cameraMode: mode });
		showSaved();
	};

	const handleThemeChange = (value: string) => {
		const newTheme = value as Theme;
		setTheme(newTheme);
		setThemePersist(newTheme);
		showSaved();
	};

	if (page === "import") {
		return <ImportPage onBack={() => setPage("settings")} />;
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="w-full max-w-md px-4 py-12">
				<div className="mb-8 text-center">
					<h1 className="text-2xl font-bold text-foreground">Settings</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Configure your Face ID Extension preferences.
					</p>
				</div>

				<div className="flex flex-col gap-4">
					{/* Camera Mode */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Camera className="size-4" />
								Camera Mode
							</CardTitle>
							<CardDescription>
								Choose how you want to scan your face for authentication.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<RadioGroup value={cameraMode} onValueChange={handleCameraChange}>
								{CAMERA_OPTIONS.map((option) => (
									<Label
										key={option.value}
										htmlFor={`camera-${option.value}`}
										className="cursor-pointer"
									>
										<div
											className={`flex w-full items-start gap-3 rounded-lg border p-3 transition-colors ${
												cameraMode === option.value
													? "border-primary bg-primary/5"
													: "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
											}`}
										>
											<RadioGroupItem
												value={option.value}
												id={`camera-${option.value}`}
												className="mt-0.5"
											/>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<option.icon className="size-4 text-muted-foreground" />
													<span className="text-sm font-medium text-foreground">
														{option.label}
													</span>
												</div>
												<p className="mt-1 text-xs text-muted-foreground">
													{option.description}
												</p>
											</div>
										</div>
									</Label>
								))}
							</RadioGroup>
						</CardContent>
					</Card>

					{/* Theme */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Sun className="size-4" />
								Appearance
							</CardTitle>
							<CardDescription>
								Choose your preferred color theme.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<RadioGroup
								value={theme}
								onValueChange={handleThemeChange}
								className="grid-cols-3"
							>
								{THEME_OPTIONS.map((option) => (
									<label
										key={option.value}
										htmlFor={`theme-${option.value}`}
										className="cursor-pointer"
									>
										<div
											className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
												theme === option.value
													? "border-primary bg-primary/5"
													: "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
											}`}
										>
											<option.icon className="size-5 text-muted-foreground" />
											<span className="text-xs font-medium text-foreground">
												{option.label}
											</span>
											<RadioGroupItem
												value={option.value}
												id={`theme-${option.value}`}
											/>
										</div>
									</label>
								))}
							</RadioGroup>
						</CardContent>
					</Card>
					{/* Import Passwords */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileUp className="size-4" />
								Import Passwords
							</CardTitle>
							<CardDescription>
								Import credentials from a Google Password Manager CSV export.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button
								variant="outline"
								className="w-full"
								onClick={() => setPage("import")}
							>
								<FileUp className="size-4 mr-1" />
								Import from CSV
							</Button>
						</CardContent>
					</Card>
				</div>

				<div className="mt-4 flex h-5 items-center justify-center">
					{saved && (
						<p className="text-xs text-primary animate-in fade-in">
							Settings saved
						</p>
					)}
				</div>

				<p className="mt-4 text-center text-xs text-muted-foreground">
					Face ID Extension v1.0
				</p>
			</div>
		</div>
	);
}
