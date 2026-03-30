const KEY_PREFIX = "cred_";

interface Credential {
	id: string;
	label: string;
	domains: string[];
	email: string;
	password: string;
}

interface FillRequest {
	action: "fill";
	email: string;
	password: string;
}

function findTextInputBeforePassword(
	scope: Document | HTMLElement,
	passwordInput: HTMLInputElement,
): HTMLInputElement | null {
	const inputs = Array.from(
		scope.querySelectorAll<HTMLInputElement>('input[type="text"]'),
	);
	let candidate: HTMLInputElement | null = null;
	for (const input of inputs) {
		if (
			passwordInput.compareDocumentPosition(input) &
			Node.DOCUMENT_POSITION_PRECEDING
		) {
			candidate = input;
		}
	}
	return candidate;
}

function findLoginForm(): {
	emailInput: HTMLInputElement | null;
	passwordInput: HTMLInputElement | null;
	submitButton: HTMLElement | null;
} {
	const passwordInput =
		document.querySelector<HTMLInputElement>(
			'input[type="password"][autocomplete="current-password"]',
		) ?? document.querySelector<HTMLInputElement>('input[type="password"]');

	if (!passwordInput)
		return { emailInput: null, passwordInput: null, submitButton: null };

	const form = passwordInput.closest("form");
	const scope = form ?? document;

	const emailInput =
		scope.querySelector<HTMLInputElement>('input[type="email"]') ??
		scope.querySelector<HTMLInputElement>('input[name="email"]') ??
		scope.querySelector<HTMLInputElement>('input[name="username"]') ??
		scope.querySelector<HTMLInputElement>('input[name="login"]') ??
		scope.querySelector<HTMLInputElement>('input[id="email"]') ??
		scope.querySelector<HTMLInputElement>('input[id="username"]') ??
		scope.querySelector<HTMLInputElement>('input[id="login"]') ??
		scope.querySelector<HTMLInputElement>('input[autocomplete="email"]') ??
		scope.querySelector<HTMLInputElement>('input[autocomplete="username"]') ??
		findTextInputBeforePassword(scope, passwordInput);

	const submitButton =
		scope.querySelector<HTMLElement>('button[type="submit"]') ??
		scope.querySelector<HTMLElement>('input[type="submit"]') ??
		scope.querySelector<HTMLElement>("button:not([type])");

	return { emailInput, passwordInput, submitButton };
}

function setNativeValue(input: HTMLInputElement, value: string) {
	const setter = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)?.set;
	setter?.call(input, value);
	input.dispatchEvent(new Event("input", { bubbles: true }));
	input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function findMatchingCredential(): Promise<Credential | null> {
	const hostname = window.location.hostname;
	const data = await chrome.storage.sync.get(null);
	for (const [key, value] of Object.entries(data)) {
		if (!key.startsWith(KEY_PREFIX)) continue;
		const cred = value as Credential;
		if (cred.domains?.some((domain) => hostname.includes(domain))) {
			return cred;
		}
	}
	return null;
}

let bannerDismissed = false;

function removeBanner() {
	document.getElementById("faceid-banner")?.remove();
}

function dismissBanner() {
	bannerDismissed = true;
	removeBanner();
}

async function resolveTheme(): Promise<"light" | "dark"> {
	const data = await chrome.storage.sync.get("theme");
	const theme = data.theme as string | undefined;
	if (theme === "dark") return "dark";
	if (theme === "light") return "light";
	// system default
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

async function injectBanner(cred: Credential) {
	if (bannerDismissed) return;
	if (document.getElementById("faceid-banner")) return;

	const theme = await resolveTheme();

	const banner = document.createElement("div");
	banner.id = "faceid-banner";

	const shadow = banner.attachShadow({ mode: "closed" });
	if (theme === "dark") banner.classList.add("dark");

	const style = document.createElement("style");
	style.textContent = `
		:host {
			all: initial;
			display: block;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		}
		.banner {
			position: fixed;
			top: 12px;
			right: 12px;
			z-index: 2147483647;
			background: #fff;
			border: 1px solid #e2e2e2;
			border-radius: 12px;
			box-shadow: 0 4px 24px rgba(0,0,0,0.12);
			padding: 14px 16px;
			display: flex;
			align-items: center;
			gap: 12px;
			max-width: 380px;
			animation: slideIn 0.25s ease-out;
		}
		@keyframes slideIn {
			from { opacity: 0; transform: translateY(-12px); }
			to { opacity: 1; transform: translateY(0); }
		}
		.icon {
			flex-shrink: 0;
			width: 36px;
			height: 36px;
			border-radius: 8px;
			background: #0d7a8a;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.icon svg {
			width: 20px;
			height: 20px;
			color: white;
		}
		.content {
			flex: 1;
			min-width: 0;
		}
		.title {
			font-size: 13px;
			font-weight: 600;
			color: #111;
			margin: 0 0 2px 0;
		}
		.detail {
			font-size: 12px;
			color: #666;
			margin: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.actions {
			display: flex;
			gap: 6px;
			flex-shrink: 0;
		}
		.btn {
			padding: 7px 14px;
			border-radius: 8px;
			font-size: 12px;
			font-weight: 600;
			cursor: pointer;
			border: none;
			transition: opacity 0.15s;
		}
		.btn:hover { opacity: 0.85; }
		.btn-primary {
			background: #0d7a8a;
			color: white;
		}
		.btn-dismiss {
			background: transparent;
			color: #999;
			padding: 7px 8px;
			font-size: 16px;
			line-height: 1;
		}
		.btn-dismiss:hover { color: #666; }
		:host(.dark) .banner {
			background: #1a1a2e;
			border-color: #2a2a3e;
			box-shadow: 0 4px 24px rgba(0,0,0,0.3);
		}
		:host(.dark) .title { color: #eee; }
		:host(.dark) .detail { color: #999; }
		:host(.dark) .btn-dismiss { color: #666; }
		:host(.dark) .btn-dismiss:hover { color: #999; }
	`;

	const container = document.createElement("div");
	container.className = "banner";
	container.innerHTML = `
		<div class="icon">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M7 3H5a2 2 0 0 0-2 2v2"/>
				<path d="M17 3h2a2 2 0 0 1 2 2v2"/>
				<path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
				<path d="M17 21h2a2 2 0 0 0 2-2v-2"/>
				<circle cx="12" cy="11" r="3"/>
				<path d="M12 14c-2.5 0-4.5 1.5-5 3.5"/>
				<path d="M17 17.5c-.5-2-2.5-3.5-5-3.5"/>
			</svg>
		</div>
		<div class="content">
			<p class="title">Face ID - ${cred.label}</p>
			<p class="detail">${cred.email}</p>
		</div>
		<div class="actions">
			<button class="btn btn-primary" id="faceid-scan-btn">Scan to login</button>
			<button class="btn btn-dismiss" id="faceid-dismiss-btn">✕</button>
		</div>
	`;

	shadow.appendChild(style);
	shadow.appendChild(container);

	shadow.getElementById("faceid-scan-btn")?.addEventListener("click", () => {
		chrome.runtime.sendMessage({
			action: "openScanner",
			credId: cred.id,
		});
		removeBanner();
	});

	shadow.getElementById("faceid-dismiss-btn")?.addEventListener("click", () => {
		dismissBanner();
	});

	document.body.appendChild(banner);
}

// Check if master password is unlocked (via background service worker)
async function isMasterPasswordUnlocked(): Promise<boolean> {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage({ action: "checkUnlocked" }, (response) => {
			resolve(response?.unlocked === true);
		});
	});
}

// Detect login forms and show banner if credentials exist and master password is unlocked
async function detectAndBadge() {
	const { passwordInput } = findLoginForm();
	if (!passwordInput) return;

	const cred = await findMatchingCredential();
	if (!cred) return;

	const unlocked = await isMasterPasswordUnlocked();
	if (!unlocked) return;

	injectBanner(cred);
}

// Run detection on page load
detectAndBadge();

// Observe DOM changes for SPAs that load forms dynamically
const observer = new MutationObserver(() => {
	if (!document.getElementById("faceid-banner")) {
		detectAndBadge();
	}
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for fill messages from scanner
chrome.runtime.onMessage.addListener(
	(message: FillRequest, _sender, sendResponse) => {
		if (message.action !== "fill") return;

		const { emailInput, passwordInput, submitButton } = findLoginForm();

		if (!passwordInput) {
			sendResponse({ success: false, reason: "No login form found" });
			return;
		}

		if (emailInput) {
			setNativeValue(emailInput, message.email);
		}
		setNativeValue(passwordInput, message.password);

		removeBanner();

		if (submitButton) {
			submitButton.click();
		}

		sendResponse({ success: true });
	},
);
