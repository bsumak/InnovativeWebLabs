import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import Loading from "@/components/Loading";
import {
	createEnrollSession,
	deleteSession,
	onEnrollmentResult,
	type Session,
} from "@/lib/session";

const SESSION_TTL = 60;

export default function QREnrollment() {
	const [session, setSession] = useState<Session | null>(null);
	const [status, setStatus] = useState<
		"creating" | "waiting" | "enrolled" | "expired" | "error"
	>("creating");
	const [error, setError] = useState("");
	const [countdown, setCountdown] = useState(SESSION_TTL);
	const unsubscribeRef = useRef<(() => void) | null>(null);
	const sessionRef = useRef<Session | null>(null);
	const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const cleanup = () => {
		if (unsubscribeRef.current) {
			unsubscribeRef.current();
			unsubscribeRef.current = null;
		}
		if (sessionRef.current) {
			deleteSession(sessionRef.current.id);
			sessionRef.current = null;
		}
		if (countdownRef.current) {
			clearInterval(countdownRef.current);
			countdownRef.current = null;
		}
	};

	const startSession = async () => {
		cleanup();
		setStatus("creating");
		setCountdown(SESSION_TTL);

		try {
			const newSession = await createEnrollSession();
			setSession(newSession);
			sessionRef.current = newSession;
			setStatus("waiting");

			// Countdown timer
			countdownRef.current = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						if (sessionRef.current?.id === newSession.id) {
							setStatus("expired");
							cleanup();
						}
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			// Listen for enrollment result
			unsubscribeRef.current = onEnrollmentResult(
				newSession.id,
				newSession.secret,
				async (descriptors) => {
					if (descriptors) {
						// Save descriptors locally
						await chrome.storage.local.set({ faceDescriptors: descriptors });
						setStatus("enrolled");
					} else {
						setStatus("error");
						setError("Enrollment failed on phone.");
					}
					// Delete session (and descriptors) from Firebase
					cleanup();
				},
			);
		} catch (err) {
			setStatus("error");
			setError(
				`Failed to create session: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: starts once on mount
	useEffect(() => {
		startSession();
		return () => cleanup();
	}, []);

	if (status === "creating") {
		return <Loading message="Creating enrollment session..." />;
	}

	if (status === "error") {
		return <p className="text-destructive">{error}</p>;
	}

	if (status === "enrolled") {
		return (
			<div className="flex flex-col items-center gap-3">
				<p className="text-lg text-green-600">Face ID enrolled successfully!</p>
				<p className="text-muted-foreground">
					3 angles captured. You can close this tab.
				</p>
			</div>
		);
	}

	if (status === "expired") {
		return (
			<div className="flex flex-col items-center gap-4">
				<p className="text-muted-foreground">Session expired.</p>
				<button
					type="button"
					className="rounded-lg border border-border bg-background px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
					onClick={() => startSession()}
				>
					Generate New QR Code
				</button>
			</div>
		);
	}

	// status === "waiting"
	return (
		<div className="flex flex-col items-center gap-4">
			{session && (
				<div className="rounded-2xl border border-border bg-white p-4">
					<QRCodeSVG value={session.qrUrl} size={256} level="M" />
				</div>
			)}
			<p className="text-muted-foreground">
				Scan this QR code with your phone to enroll your face
			</p>
			<p
				className={`text-xs font-medium ${countdown <= 10 ? "text-destructive" : "text-muted-foreground"}`}
			>
				Expires in {countdown}s
			</p>
		</div>
	);
}
