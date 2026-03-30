import {
	Plus,
	RefreshCw,
	ScanFace,
	Settings,
	ShieldCheck,
	UserPlus,
	X,
} from "lucide-react";
import Loading from "@/components/Loading";
import CredentialForm from "@/components/popup/CredentialForm";
import CredentialList from "@/components/popup/CredentialList";
import MasterPasswordSetup from "@/components/popup/MasterPasswordSetup";
import MasterPasswordUnlock from "@/components/popup/MasterPasswordUnlock";
import { Button } from "@/components/ui/button";
import { usePopup } from "@/hooks/usePopup";

export default function App() {
	const {
		view,
		masterInput,
		setMasterInput,
		confirmInput,
		setConfirmInput,
		masterError,
		setupMasterPassword,
		unlock,
		resetExtension,
		isEnrolled,
		credentials,
		matchedCred,
		openScanner,
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
		visiblePasswords,
		togglePasswordVisibility,
		handleDelete,
	} = usePopup();

	if (view === "loading") {
		return (
			<div className="flex w-96 items-center justify-center p-8">
				<Loading message="Loading..." />
			</div>
		);
	}

	if (view === "setup-master") {
		return (
			<MasterPasswordSetup
				masterInput={masterInput}
				setMasterInput={setMasterInput}
				confirmInput={confirmInput}
				setConfirmInput={setConfirmInput}
				masterError={masterError}
				onSubmit={setupMasterPassword}
			/>
		);
	}

	if (view === "unlock") {
		return (
			<MasterPasswordUnlock
				masterInput={masterInput}
				setMasterInput={setMasterInput}
				masterError={masterError}
				onUnlock={unlock}
				onReset={resetExtension}
			/>
		);
	}

	return (
		<div className="w-96 p-5">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
						<ShieldCheck className="size-4 text-primary" />
					</div>
					<h1 className="text-base font-bold text-foreground">
						Face ID Extension
					</h1>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => {
						chrome.tabs.create({
							url: chrome.runtime.getURL("src/settings/index.html"),
						});
					}}
				>
					<Settings className="size-4" />
				</Button>
			</div>

			{/* Face ID section */}
			<div className="mt-4 flex flex-col gap-3">
				{isEnrolled ? (
					<div className="flex flex-col gap-2">
						{matchedCred ? (
							<>
								<p className="text-sm text-muted-foreground">
									Credential found for this site.
								</p>
								<Button
									className="w-full"
									size="lg"
									onClick={() => openScanner("verify")}
								>
									<ScanFace className="size-4" />
									Scan Face to Login
								</Button>
							</>
						) : (
							<p className="text-sm text-muted-foreground">
								No credential saved for this site.
							</p>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => openScanner("enroll")}
						>
							<RefreshCw className="size-3" />
							Re-enroll Face
						</Button>
					</div>
				) : (
					<Button
						className="w-full"
						size="lg"
						onClick={() => openScanner("enroll")}
					>
						<UserPlus className="size-4" />
						Enroll Face
					</Button>
				)}

				{/* Divider */}
				<div className="flex items-center gap-3">
					<div className="h-px flex-1 bg-border" />
					<span className="text-xs text-muted-foreground">Credentials</span>
					<div className="h-px flex-1 bg-border" />
				</div>

				{/* Credentials header */}
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold text-foreground">
						Saved Credentials
					</h2>
					<Button
						variant={showForm ? "ghost" : "outline"}
						size="sm"
						onClick={() => (showForm ? resetForm() : setShowForm(true))}
					>
						{showForm ? (
							<>
								<X className="size-3" />
								Cancel
							</>
						) : (
							<>
								<Plus className="size-3" />
								Add
							</>
						)}
					</Button>
				</div>

				{showForm && (
					<CredentialForm
						editingId={editingId}
						label={label}
						setLabel={setLabel}
						domains={domains}
						updateDomain={updateDomain}
						addDomain={addDomain}
						addCurrentDomain={addCurrentDomain}
						currentDomain={currentDomain}
						removeDomain={removeDomain}
						email={email}
						setEmail={setEmail}
						password={password}
						setPassword={setPassword}
						onSave={handleSave}
					/>
				)}

				<CredentialList
					credentials={credentials}
					matchedCredId={matchedCred?.id ?? null}
					visiblePasswords={visiblePasswords}
					onEdit={startEdit}
					onDelete={handleDelete}
					onTogglePassword={togglePasswordVisibility}
				/>
			</div>
		</div>
	);
}
