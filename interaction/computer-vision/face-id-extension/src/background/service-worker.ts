chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "checkUnlocked") {
		chrome.storage.session.get("mp").then((session) => {
			sendResponse({ unlocked: !!session.mp });
		});
		return true; // async response
	}

	if (message.action === "openScanner") {
		const senderTab = sender.tab;
		if (!senderTab?.id) {
			sendResponse({ success: false });
			return;
		}

		const params = new URLSearchParams({
			mode: "verify",
			tabId: String(senderTab.id),
			credId: message.credId,
		});

		chrome.tabs.create({
			url: chrome.runtime.getURL(`src/scanner/index.html?${params}`),
			windowId: senderTab.windowId,
			index: senderTab.index + 1,
		});

		sendResponse({ success: true });
	}
});
