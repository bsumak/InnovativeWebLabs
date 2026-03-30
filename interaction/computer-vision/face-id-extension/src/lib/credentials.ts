import { decrypt, encrypt } from "./crypto";

const KEY_PREFIX = "cred_";

export interface Credential {
	id: string;
	label: string;
	domains: string[];
	email: string;
	/** Encrypted password (base64 ciphertext) */
	password: string;
}

export interface DecryptedCredential {
	id: string;
	label: string;
	domains: string[];
	email: string;
	password: string;
}

/** Migrate old single-array format to per-key storage */
async function migrateIfNeeded(): Promise<void> {
	const data = await chrome.storage.sync.get("credentials");
	if (!data.credentials) return;

	const old = data.credentials as Credential[];
	const entries: Record<string, Credential> = {};
	for (const cred of old) {
		entries[`${KEY_PREFIX}${cred.id}`] = cred;
	}

	await chrome.storage.sync.set(entries);
	await chrome.storage.sync.remove("credentials");
}

export async function getCredentials(): Promise<Credential[]> {
	await migrateIfNeeded();

	const data = await chrome.storage.sync.get(null);
	return Object.entries(data)
		.filter(([key]) => key.startsWith(KEY_PREFIX))
		.map(([, value]) => value as Credential);
}

export async function getDecryptedCredential(
	id: string,
	masterPassword: string,
): Promise<DecryptedCredential | null> {
	const data = await chrome.storage.sync.get(`${KEY_PREFIX}${id}`);
	const cred = data[`${KEY_PREFIX}${id}`] as Credential | undefined;
	if (!cred) return null;

	const password = await decrypt(cred.password, masterPassword);
	return { ...cred, password };
}

export async function saveCredential(
	cred: Omit<Credential, "id">,
	masterPassword: string,
): Promise<void> {
	const id = crypto.randomUUID();
	const encryptedPassword = await encrypt(cred.password, masterPassword);
	const credential: Credential = {
		...cred,
		password: encryptedPassword,
		id,
	};
	await chrome.storage.sync.set({ [`${KEY_PREFIX}${id}`]: credential });
}

export async function updateCredential(
	id: string,
	updates: Partial<Omit<Credential, "id">>,
	masterPassword: string,
): Promise<void> {
	const key = `${KEY_PREFIX}${id}`;
	const data = await chrome.storage.sync.get(key);
	const cred = data[key] as Credential | undefined;
	if (!cred) return;

	if (updates.password) {
		updates.password = await encrypt(updates.password, masterPassword);
	}

	await chrome.storage.sync.set({ [key]: { ...cred, ...updates } });
}

export async function deleteCredential(id: string): Promise<void> {
	await chrome.storage.sync.remove(`${KEY_PREFIX}${id}`);
}

export function findCredentialForUrl(
	credentials: Credential[],
	url: string,
): Credential | null {
	try {
		const hostname = new URL(url).hostname;
		return (
			credentials.find((c) =>
				c.domains.some((domain) => hostname.includes(domain)),
			) ?? null
		);
	} catch {
		return null;
	}
}
