const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100_000;

// Session key derived from a persistent extension secret (stored in local storage).
// The secret itself is not sensitive — it just ensures all extension contexts
// derive the same key. The encrypted session data is still only in memory
// (chrome.storage.session) and clears on browser close.
let sessionKey: CryptoKey | null = null;

async function getSessionKey(): Promise<CryptoKey> {
	if (!sessionKey) {
		const data = await chrome.storage.local.get("sessionSecret");
		let secret: string;
		if (data.sessionSecret) {
			secret = data.sessionSecret as string;
		} else {
			secret = toBase64(
				crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer,
			);
			await chrome.storage.local.set({ sessionSecret: secret });
		}

		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			encode(secret).buffer as ArrayBuffer,
			"PBKDF2",
			false,
			["deriveKey"],
		);

		sessionKey = await crypto.subtle.deriveKey(
			{
				name: "PBKDF2",
				salt: encode("faceid-session-salt").buffer as ArrayBuffer,
				iterations: 1,
				hash: "SHA-256",
			},
			keyMaterial,
			{ name: "AES-GCM", length: 256 },
			false,
			["encrypt", "decrypt"],
		);
	}
	return sessionKey;
}

export async function encryptForSession(plaintext: string): Promise<string> {
	const key = await getSessionKey();
	const iv = crypto.getRandomValues(
		new Uint8Array(IV_LENGTH),
	) as Uint8Array<ArrayBuffer>;
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		encode(plaintext).buffer as ArrayBuffer,
	);
	const packed = new Uint8Array(iv.length + encrypted.byteLength);
	packed.set(iv, 0);
	packed.set(new Uint8Array(encrypted), iv.length);
	return toBase64(packed.buffer as ArrayBuffer);
}

export async function decryptFromSession(ciphertext: string): Promise<string> {
	const key = await getSessionKey();
	const packed = fromBase64(ciphertext);
	const iv = packed.slice(0, IV_LENGTH) as Uint8Array<ArrayBuffer>;
	const data = packed.slice(IV_LENGTH);
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		data.buffer as ArrayBuffer,
	);
	return decode(decrypted);
}

function encode(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function decode(buffer: ArrayBuffer): string {
	return new TextDecoder().decode(buffer);
}

function toBase64(buffer: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
	return Uint8Array.from(atob(base64), (c) =>
		c.charCodeAt(0),
	) as Uint8Array<ArrayBuffer>;
}

async function deriveKey(
	password: string,
	salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		encode(password).buffer as ArrayBuffer,
		"PBKDF2",
		false,
		["deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

/**
 * Hash a master password for storage verification.
 * Returns a base64 string containing salt + hash.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(
		new Uint8Array(SALT_LENGTH),
	) as Uint8Array<ArrayBuffer>;
	const key = await deriveKey(password, salt);

	const iv = crypto.getRandomValues(
		new Uint8Array(IV_LENGTH),
	) as Uint8Array<ArrayBuffer>;
	const marker = encode("faceid-verified");
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		marker.buffer as ArrayBuffer,
	);

	const packed = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
	packed.set(salt, 0);
	packed.set(iv, salt.length);
	packed.set(new Uint8Array(encrypted), salt.length + iv.length);

	return toBase64(packed.buffer as ArrayBuffer);
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(
	password: string,
	storedHash: string,
): Promise<boolean> {
	try {
		const packed = fromBase64(storedHash);
		const salt = packed.slice(0, SALT_LENGTH) as Uint8Array<ArrayBuffer>;
		const iv = packed.slice(
			SALT_LENGTH,
			SALT_LENGTH + IV_LENGTH,
		) as Uint8Array<ArrayBuffer>;
		const ciphertext = packed.slice(SALT_LENGTH + IV_LENGTH);

		const key = await deriveKey(password, salt);
		const decrypted = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv },
			key,
			ciphertext.buffer as ArrayBuffer,
		);

		return decode(decrypted) === "faceid-verified";
	} catch {
		return false;
	}
}

/**
 * Encrypt a plaintext string with a password.
 * Returns a base64 string containing salt + iv + ciphertext.
 */
export async function encrypt(
	plaintext: string,
	password: string,
): Promise<string> {
	const salt = crypto.getRandomValues(
		new Uint8Array(SALT_LENGTH),
	) as Uint8Array<ArrayBuffer>;
	const iv = crypto.getRandomValues(
		new Uint8Array(IV_LENGTH),
	) as Uint8Array<ArrayBuffer>;
	const key = await deriveKey(password, salt);

	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		encode(plaintext).buffer as ArrayBuffer,
	);

	const packed = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
	packed.set(salt, 0);
	packed.set(iv, salt.length);
	packed.set(new Uint8Array(encrypted), salt.length + iv.length);

	return toBase64(packed.buffer as ArrayBuffer);
}

/**
 * Decrypt a base64 ciphertext string with a password.
 */
export async function decrypt(
	ciphertext: string,
	password: string,
): Promise<string> {
	const packed = fromBase64(ciphertext);
	const salt = packed.slice(0, SALT_LENGTH) as Uint8Array<ArrayBuffer>;
	const iv = packed.slice(
		SALT_LENGTH,
		SALT_LENGTH + IV_LENGTH,
	) as Uint8Array<ArrayBuffer>;
	const data = packed.slice(SALT_LENGTH + IV_LENGTH);

	const key = await deriveKey(password, salt);
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		data.buffer as ArrayBuffer,
	);

	return decode(decrypted);
}
