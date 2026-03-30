import { onValue, ref, remove, set } from "firebase/database";
import { db } from "./firebase";

const PHONE_SCAN_BASE_URL = "https://face-id-extension.web.app/scan";
const SESSION_TTL_MS = 60_000; // 60 seconds

function generateId(length = 12): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => chars[b % chars.length]).join("");
}

export interface Session {
	id: string;
	secret: string;
	qrUrl: string;
}

/**
 * Creates a verification session — uploads descriptors for phone to verify against.
 */
export async function createVerifySession(
	descriptors: number[][],
): Promise<Session> {
	const id = generateId();
	const secret = generateId(24);

	await set(ref(db, `sessions/${id}`), {
		secret,
		mode: "verify",
		descriptors,
		createdAt: Date.now(),
		result: null,
	});

	const qrUrl = `${PHONE_SCAN_BASE_URL}?session=${id}&secret=${secret}`;

	setTimeout(() => {
		deleteSession(id);
	}, SESSION_TTL_MS);

	return { id, secret, qrUrl };
}

/**
 * Creates an enrollment session — phone will capture descriptors and upload them.
 */
export async function createEnrollSession(): Promise<Session> {
	const id = generateId();
	const secret = generateId(24);

	await set(ref(db, `sessions/${id}`), {
		secret,
		mode: "enroll",
		createdAt: Date.now(),
		result: null,
	});

	const qrUrl = `${PHONE_SCAN_BASE_URL}?session=${id}&secret=${secret}`;

	setTimeout(() => {
		deleteSession(id);
	}, SESSION_TTL_MS);

	return { id, secret, qrUrl };
}

/**
 * Listens for the verification result from the phone.
 */
export function onSessionResult(
	sessionId: string,
	secret: string,
	callback: (verified: boolean) => void,
): () => void {
	const resultRef = ref(db, `sessions/${sessionId}/result`);

	const unsubscribe = onValue(resultRef, (snapshot) => {
		if (!snapshot.exists()) return;
		const result = snapshot.val();
		if (result.secret !== secret) return;
		callback(result.verified === true);
	});

	return unsubscribe;
}

/**
 * Listens for enrollment result — phone uploads descriptors.
 * Returns descriptors on success, null on failure.
 */
export function onEnrollmentResult(
	sessionId: string,
	secret: string,
	callback: (descriptors: number[][] | null) => void,
): () => void {
	const resultRef = ref(db, `sessions/${sessionId}/result`);

	const unsubscribe = onValue(resultRef, (snapshot) => {
		if (!snapshot.exists()) return;
		const result = snapshot.val();
		if (result.secret !== secret) return;

		if (result.enrolled && result.descriptors) {
			callback(result.descriptors as number[][]);
		} else {
			callback(null);
		}
	});

	return unsubscribe;
}

/**
 * Deletes a session and its data from Firebase.
 */
export async function deleteSession(sessionId: string): Promise<void> {
	try {
		await remove(ref(db, `sessions/${sessionId}`));
	} catch {
		// Session may already be deleted
	}
}
