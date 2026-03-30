import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import Loading from "@/components/Loading";
import {
	createVerifySession,
	deleteSession,
	onSessionResult,
	type Session,
} from "@/lib/session";

const SESSION_TTL = 60;

interface QRVerificationProps {
	tabId: number | null;
	credId: string | null;
	onVerified: () => void;
	onRejected: () => void;
}

export default function QRVerification({
	tabId,
	credId,
	onVerified,
	onRejected,
}: QRVerificationProps) {
	const [session, setSession] = useState<Session | null>(null);
	const [status, setStatus] = useState<
		"creating" | "waiting" | "verified" | "rejected" | "expired" | "error"
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
			const data = await chrome.storage.local.get("faceDescriptors");
			if (!data.faceDescriptors) {
				setStatus("error");
				setError("No face enrolled. Please enroll first.");
				return;
			}

			const newSession = await createVerifySession(
				data.faceDescriptors as number[][],
			);
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

			// Listen for result
			unsubscribeRef.current = onSessionResult(
				newSession.id,
				newSession.secret,
				(verified) => {
					if (verified) {
						setStatus("verified");
						onVerified();
					} else {
						setStatus("rejected");
						onRejected();
					}
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
		return <Loading message="Creating scan session..." />;
	}

	if (status === "error") {
		return <p className="text-destructive">{error}</p>;
	}

	if (status === "verified") {
		return (
			<div className="flex flex-col items-center gap-3">
				<p className="text-lg text-green-600">Identity verified!</p>
				<p className="text-muted-foreground">
					{tabId && credId
						? "Credentials filled — you can close this tab."
						: "You can close this tab now."}
				</p>
			</div>
		);
	}

	if (status === "rejected") {
		return (
			<div className="flex flex-col items-center gap-4">
				<div className="flex h-64 w-64 items-center justify-center rounded-full border-4 border-red-500 bg-red-500/10">
					<p className="text-2xl font-bold text-red-500">Access Denied</p>
				</div>
				<p className="text-muted-foreground">
					Face did not match. Please try again.
				</p>
				<button
					type="button"
					className="rounded-lg border border-border bg-background px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
					onClick={() => startSession()}
				>
					Retry
				</button>
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
			<p className="text-muted-foreground">Scan this QR code with your phone</p>
			<p
				className={`text-xs font-medium ${countdown <= 10 ? "text-destructive" : "text-muted-foreground"}`}
			>
				Expires in {countdown}s
			</p>
		</div>
	);
}
