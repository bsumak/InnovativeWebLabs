# Face ID Extension

A Chrome browser extension that uses webcam face recognition to autofill and submit saved login credentials — bringing Face ID-like authentication to any system with a webcam.

## How It Works

1. **Set a master password** — encrypts all stored credentials (like Bitwarden)
2. **Enroll your face** — captures 3 angles (straight, left, right) for accurate recognition
3. **Save credentials** — associate login details with one or more domains
4. **Scan to login** — visit a saved site, click "Scan Face to Login", and the extension verifies your face and autofills the form

## Features

- Face enrollment with multi-angle capture for better accuracy
- AES-GCM encrypted credential storage with PBKDF2 key derivation
- Master password cached per browser session (no re-entry until browser closes)
- Domain-based credential matching with multi-domain support
- Automatic form detection, autofill, and submission
- Works in incognito mode
- Fully client-side — no server, no external API calls

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 8**
- **CRXJS** — Chrome extension bundling with HMR
- **@vladmandic/human** — face detection and recognition (TensorFlow.js-based)
- **Web Crypto API** — encryption and key derivation
- **Tailwind CSS 4** + **shadcn/ui** — styling and components
- **Biome** — linting and formatting

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Then load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with HMR |
| `pnpm build` | Production build |
| `pnpm lint` | Lint with auto-fix |
| `pnpm format` | Format + sort imports |
| `pnpm typecheck` | Type checking |

## Project Structure

```
src/
├── popup/          # Extension popup UI (master password, credential management)
├── scanner/        # Face enrollment & verification (opens in dedicated tab)
├── content/        # Content script (form detection, autofill)
├── hooks/          # Business logic (usePopup, useScanner)
├── components/     # React components (popup/, scanner/, ui/)
└── lib/            # Crypto, credentials CRUD, face detection config
```

## Security Model

- Master password is hashed with PBKDF2 (100k iterations) and stored in `chrome.storage.sync`
- Credential passwords are encrypted with AES-GCM using a key derived from the master password
- Session caching uses a per-install secret stored in `chrome.storage.local`
- Face descriptors (embeddings) are stored locally, never transmitted
- All crypto operations use the Web Crypto API (no JS crypto libraries)
