export type Theme = "light" | "dark" | "system";

export async function getTheme(): Promise<Theme> {
	const data = await chrome.storage.sync.get("theme");
	return (data.theme as Theme) || "system";
}

export async function setTheme(theme: Theme): Promise<void> {
	await chrome.storage.sync.set({ theme });
	applyTheme(theme);
}

export function applyTheme(theme: Theme): void {
	const isDark =
		theme === "dark" ||
		(theme === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);

	document.documentElement.classList.toggle("dark", isDark);
}

/** Call this on page load to apply the saved theme. */
export async function initTheme(): Promise<void> {
	const theme = await getTheme();
	applyTheme(theme);

	// Listen for system theme changes when in "system" mode
	if (theme === "system") {
		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", () => applyTheme("system"));
	}
}
