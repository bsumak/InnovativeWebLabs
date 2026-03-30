import { useEffect, useState } from "react";
import {
	type Credential,
	deleteCredential,
	findCredentialForUrl,
	getCredentials,
	getDecryptedCredential,
	saveCredential,
	updateCredential,
} from "@/lib/credentials";
import {
	decryptFromSession,
	encryptForSession,
	hashPassword,
	verifyPassword,
} from "@/lib/crypto";

export type View = "loading" | "setup-master" | "unlock" | "main";

export function usePopup() {
	const [view, setView] = useState<View>("loading");
	const [masterPassword, setMasterPassword] = useState("");
	const [masterInput, setMasterInput] = useState("");
	const [confirmInput, setConfirmInput] = useState("");
	const [masterError, setMasterError] = useState("");

	const [isEnrolled, setIsEnrolled] = useState(false);
	const [credentials, setCredentials] = useState<Credential[]>([]);
	const [matchedCred, setMatchedCred] = useState<Credential | null>(null);
	const [currentTabId, setCurrentTabId] = useState<number | null>(null);
	const [currentDomain, setCurrentDomain] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [label, setLabel] = useState("");
	const [domains, setDomains] = useState<string[]>([""]);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [visiblePasswords, setVisiblePasswords] = useState<
		Record<string, string>
	>({});

	// biome-ignore lint/correctness/useExhaustiveDependencies: init runs once on mount
	useEffect(() => {
		init();
	}, []);

	const init = async () => {
		const data = await chrome.storage.sync.get("masterPasswordHash");
		if (!data.masterPasswordHash) {
			setView("setup-master");
			return;
		}

		const session = await chrome.storage.session.get("mp");
		if (session.mp) {
			try {
				setMasterPassword(await decryptFromSession(session.mp as string));
				await loadData();
				setView("main");
				return;
			} catch {
				await chrome.storage.session.remove("mp");
			}
		}
		setView("unlock");
	};

	const loadData = async () => {
		const data = await chrome.storage.local.get("faceDescriptors");
		setIsEnrolled(!!data.faceDescriptors);

		const creds = await getCredentials();
		setCredentials(creds);

		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (tab?.id && tab.url) {
			setCurrentTabId(tab.id);
			try {
				setCurrentDomain(new URL(tab.url).hostname);
			} catch {
				// ignore invalid URLs (e.g. chrome:// pages)
			}
			const match = findCredentialForUrl(creds, tab.url);
			setMatchedCred(match);
		}
	};

	const setupMasterPassword = async () => {
		if (masterInput.length < 6) {
			setMasterError("Password must be at least 6 characters.");
			return;
		}
		if (masterInput !== confirmInput) {
			setMasterError("Passwords do not match.");
			return;
		}

		const hash = await hashPassword(masterInput);
		await chrome.storage.sync.set({ masterPasswordHash: hash });
		await chrome.storage.session.set({
			mp: await encryptForSession(masterInput),
		});
		setMasterPassword(masterInput);
		setMasterInput("");
		setConfirmInput("");
		setMasterError("");
		await loadData();
		setView("main");
	};

	const unlock = async () => {
		const data = await chrome.storage.sync.get("masterPasswordHash");
		const valid = await verifyPassword(
			masterInput,
			data.masterPasswordHash as string,
		);

		if (!valid) {
			setMasterError("Incorrect master password.");
			return;
		}

		await chrome.storage.session.set({
			mp: await encryptForSession(masterInput),
		});
		setMasterPassword(masterInput);
		setMasterInput("");
		setMasterError("");
		await loadData();
		setView("main");
	};

	const resetExtension = async () => {
		const confirmed = window.confirm(
			"This will delete ALL data including credentials, face enrollment, and master password. This cannot be undone. Continue?",
		);
		if (!confirmed) return;

		await chrome.storage.sync.clear();
		await chrome.storage.local.clear();
		await chrome.storage.session.clear();
		setMasterPassword("");
		setMasterInput("");
		setConfirmInput("");
		setMasterError("");
		setView("setup-master");
	};

	const openScanner = async (mode: "enroll" | "verify") => {
		const params = new URLSearchParams({ mode });
		if (mode === "verify" && currentTabId !== null && matchedCred) {
			params.set("tabId", String(currentTabId));
			params.set("credId", matchedCred.id);
		}
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		chrome.tabs.create({
			url: chrome.runtime.getURL(`src/scanner/index.html?${params}`),
			windowId: tab?.windowId,
			index: tab ? tab.index + 1 : undefined,
		});
	};

	const resetForm = () => {
		setLabel("");
		setDomains([""]);
		setEmail("");
		setPassword("");
		setShowForm(false);
		setEditingId(null);
	};

	const startEdit = (cred: Credential) => {
		setEditingId(cred.id);
		setLabel(cred.label);
		setDomains(cred.domains.length > 0 ? [...cred.domains] : [""]);
		setEmail(cred.email);
		setPassword("");
		setShowForm(true);
		requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
	};

	const updateDomain = (index: number, value: string) => {
		const updated = [...domains];
		updated[index] = value;
		setDomains(updated);
	};

	const addDomain = () => {
		setDomains([...domains, ""]);
	};

	const removeDomain = (index: number) => {
		if (domains.length <= 1) return;
		setDomains(domains.filter((_, i) => i !== index));
	};

	const addCurrentDomain = () => {
		if (!currentDomain) return;
		if (domains.includes(currentDomain)) return;
		// Fill the first empty slot, or append
		const emptyIndex = domains.findIndex((d) => d.trim() === "");
		if (emptyIndex !== -1) {
			updateDomain(emptyIndex, currentDomain);
		} else {
			setDomains([...domains, currentDomain]);
		}
	};

	const handleSave = async () => {
		const validDomains = domains.map((d) => d.trim()).filter(Boolean);
		if (!label.trim() || validDomains.length === 0 || !email) return;
		if (!editingId && !password) return;

		if (editingId) {
			const updates: Record<string, unknown> = {
				label: label.trim(),
				domains: validDomains,
				email,
			};
			if (password) updates.password = password;
			await updateCredential(editingId, updates, masterPassword);
		} else {
			await saveCredential(
				{ label: label.trim(), domains: validDomains, email, password },
				masterPassword,
			);
		}

		resetForm();
		await loadData();
	};

	const togglePasswordVisibility = async (id: string) => {
		if (visiblePasswords[id]) {
			setVisiblePasswords((prev) => {
				const next = { ...prev };
				delete next[id];
				return next;
			});
			return;
		}

		const cred = await getDecryptedCredential(id, masterPassword);
		if (!cred) return;
		setVisiblePasswords((prev) => ({ ...prev, [id]: cred.password }));
	};

	const handleDelete = async (id: string) => {
		const confirmed = window.confirm(
			"Delete this credential? This cannot be undone.",
		);
		if (!confirmed) return;

		await deleteCredential(id);
		if (editingId === id) resetForm();
		await loadData();
	};

	return {
		// View state
		view,

		// Master password
		masterInput,
		setMasterInput,
		confirmInput,
		setConfirmInput,
		masterError,
		setupMasterPassword,
		unlock,
		resetExtension,

		// Main view
		isEnrolled,
		credentials,
		matchedCred,
		openScanner,

		// Form
		showForm,
		setShowForm,
		editingId,
		label,
		setLabel,
		domains,
		email,
		setEmail,
		password,
		setPassword,
		resetForm,
		startEdit,
		updateDomain,
		addDomain,
		addCurrentDomain,
		currentDomain,
		removeDomain,
		handleSave,

		// Credential list
		visiblePasswords,
		togglePasswordVisibility,
		handleDelete,
	};
}
