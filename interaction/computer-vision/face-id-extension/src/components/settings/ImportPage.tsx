import { useState, useRef } from "react";
import { ArrowLeft, Upload, FileUp, Check } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImportEntry, type ParsedEntry } from "./ImportEntry";
import { saveCredential, getCredentials } from "@/lib/credentials";
import { decryptFromSession } from "@/lib/crypto";

function extractDomain(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		// If URL parsing fails, try stripping manually
		return url
			.replace(/^https?:\/\//, "")
			.replace(/\/.*$/, "")
			.replace(/:\d+$/, "");
	}
}

function parseCSV(text: string): ParsedEntry[] {
	const lines = text.split("\n").filter((line) => line.trim());
	if (lines.length < 2) return [];

	const entries: ParsedEntry[] = [];

	for (let i = 1; i < lines.length; i++) {
		// Parse CSV respecting quoted fields
		const fields: string[] = [];
		let current = "";
		let inQuotes = false;

		for (const char of lines[i]) {
			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				fields.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		fields.push(current.trim());

		if (fields.length < 4) continue;

		const [name, url, username, password, note] = fields;
		const domain = extractDomain(url);
		if (!domain || !username) continue;

		entries.push({
			id: crypto.randomUUID(),
			name: name || domain,
			domain,
			username,
			password: password || "",
			note: note || "",
		});
	}

	return entries;
}

interface ImportPageProps {
	onBack: () => void;
}

export function ImportPage({ onBack }: ImportPageProps) {
	const [entries, setEntries] = useState<ParsedEntry[]>([]);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [importing, setImporting] = useState(false);
	const [done, setDone] = useState(false);
	const [error, setError] = useState("");
	const [importedCount, setImportedCount] = useState(0);
	const [skippedCount, setSkippedCount] = useState(0);
	const fileRef = useRef<HTMLInputElement>(null);

	const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setError("");
		setDone(false);

		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result as string;
			const parsed = parseCSV(text);
			if (parsed.length === 0) {
				setError("No valid entries found in the CSV file.");
				return;
			}
			setEntries(parsed);
			setSelected(new Set(parsed.map((_, i) => i)));
		};
		reader.readAsText(file);
	};

	const toggleAll = () => {
		if (selected.size === entries.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(entries.map((_, i) => i)));
		}
	};

	const toggleEntry = (index: number, checked: boolean) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (checked) next.add(index);
			else next.delete(index);
			return next;
		});
	};

	const handleImport = async () => {
		if (selected.size === 0) return;

		setImporting(true);
		setError("");

		try {
			// Get master password from session
			const session = await chrome.storage.session.get("mp");
			if (!session.mp) {
				setError(
					"Master password not found. Please unlock the extension first via the popup.",
				);
				setImporting(false);
				return;
			}
			const masterPassword = await decryptFromSession(session.mp as string);

			// Get existing credentials to check for duplicates
			const existing = await getCredentials();

			let imported = 0;
			let skipped = 0;

			for (const index of selected) {
				const entry = entries[index];

				// Skip if a credential with the same domain and username already exists
				const isDuplicate = existing.some(
					(c) =>
						c.domains.some((d) => d === entry.domain) &&
						c.email === entry.username,
				);

				if (isDuplicate) {
					skipped++;
					continue;
				}

				await saveCredential(
					{
						label: entry.name,
						domains: [entry.domain],
						email: entry.username,
						password: entry.password,
					},
					masterPassword,
				);
				imported++;
			}

			setImportedCount(imported);
			setSkippedCount(skipped);
			setDone(true);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Unknown error";
			setError(`Failed to import: ${message}`);
		} finally {
			setImporting(false);
		}
	};

	const allSelected = entries.length > 0 && selected.size === entries.length;

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="w-full max-w-md px-4 py-12">
				<div className="mb-8">
					<Button
						variant="ghost"
						size="sm"
						onClick={onBack}
						className="mb-4 -ml-2"
					>
						<ArrowLeft className="size-4 mr-1" />
						Back to Settings
					</Button>
					<div className="text-center">
						<h1 className="text-2xl font-bold text-foreground">
							Import Passwords
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Import credentials from Google Password Manager CSV export.
						</p>
					</div>
				</div>

				{!done ? (
					<div className="flex flex-col gap-4">
						{/* File Upload */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileUp className="size-4" />
									CSV File
								</CardTitle>
								<CardDescription>
									Export your passwords from Google Password Manager and upload
									the CSV file here.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Input
									ref={fileRef}
									type="file"
									accept=".csv"
									onChange={handleFile}
									className="cursor-pointer"
								/>
							</CardContent>
						</Card>

						{error && (
							<p className="text-sm text-red-500 text-center">{error}</p>
						)}

						{/* Entries List */}
						{entries.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										<span>
											{selected.size} of {entries.length} selected
										</span>
									</CardTitle>
									<CardDescription className="flex items-center gap-2">
										<Checkbox
											id="select-all"
											checked={allSelected}
											onCheckedChange={toggleAll}
										/>
										<Label htmlFor="select-all">Select all</Label>
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
										{entries.map((entry, i) => (
											<ImportEntry
												key={entry.id}
												entry={entry}
												checked={selected.has(i)}
												onCheckedChange={(checked) =>
													toggleEntry(i, checked)
												}
											/>
										))}
									</div>

									<Button
										onClick={handleImport}
										disabled={selected.size === 0 || importing}
										className="w-full mt-4"
									>
										<Upload className="size-4 mr-1" />
										{importing
											? "Importing..."
											: `Import ${selected.size} credential${selected.size !== 1 ? "s" : ""}`}
									</Button>
								</CardContent>
							</Card>
						)}
					</div>
				) : (
					<Card>
						<CardContent className="pt-6">
							<div className="flex flex-col items-center gap-3 text-center">
								<div className="flex size-12 items-center justify-center rounded-full bg-green-500/10">
									<Check className="size-6 text-green-500" />
								</div>
								<div>
									<p className="text-lg font-semibold text-foreground">
										Import complete
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										{importedCount} credential{importedCount !== 1 ? "s" : ""}{" "}
										imported
										{skippedCount > 0 && (
											<>, {skippedCount} duplicate{skippedCount !== 1 ? "s" : ""} skipped</>
										)}
									</p>
								</div>
								<Button variant="outline" onClick={onBack} className="mt-2">
									Back to Settings
								</Button>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
