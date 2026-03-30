# Face ID Extension — Implementation Steps

## Phase 1: Basic Extension (Webcam Flow)

### Step 1: Webcam Feed in Scanner Tab ✅
- Popup shows a "Scan Face" button that opens a dedicated extension tab (`src/scanner/`)
- Scanner tab accesses the webcam using `getUserMedia` (doesn't work in popups, must be a full tab)
- Render a live camera feed — circular preview with face detection status overlay
- Handle camera permissions and stream cleanup when tab closes

### Step 2: Face Enrollment ✅
- Install and integrate `@vladmandic/human`
- On first use, scan the user's face and extract a face descriptor (embedding)
- Store the face descriptor in `chrome.storage.local`

### Step 3: Face Verification ✅
- Scan the user's face live via webcam
- Compare the live face descriptor against the stored one (65% threshold)
- Access denied screen after 2s of failed matching with retry option
- Auto-close scanner tab 1.5s after success

### Step 4: Credential Management ✅
- Build a UI to add, view, edit, and delete saved credentials (site URL, email, password)
- Store credentials in `chrome.storage.sync`
- Associate credentials with specific site URLs
- Popup detects current tab URL and matches against saved credentials

### Step 5: Content Script + Autofill ✅
- Content script injected on all pages, detects login forms (password + email/username inputs)
- On face verification success, sends credentials to content script
- Autofill email/password fields and auto-submit the form
- Works in both normal and incognito mode (`incognito: "split"`)

---

## Phase 1.5: Polish & Improvements

### Step 6: Multiple Domains per Credential ✅
- Credential model updated: `siteUrl` → `domains[]` + `label`
- Form UI supports adding/removing multiple domains
- URL matching checks against all domains
- Label for human-readable credential name (e.g. "Spletne ucilnice UM")

### Step 7: Multi-Angle Face Enrollment ✅
- 3-step guided enrollment: straight → left → right
- Stores all 3 descriptors as `faceDescriptors` array in `chrome.storage.local`
- Verification uses `human.match.find()` to compare against all 3 and return best match
- Instructions stay visible during capture, button appears when face detected

### Step 8: Encrypt Stored Passwords ✅
- AES-GCM encryption via Web Crypto API (PBKDF2 key derivation)
- Credentials encrypted with master password before saving to `chrome.storage.sync`
- Decrypted on-the-fly during autofill via `chrome.storage.session`

### Step 9: Master Password ✅
- Set on first use, hash stored in `chrome.storage.sync`
- Bitwarden-style: unlock once per browser session, cached encrypted in `chrome.storage.session`
- Session encryption uses per-install secret in `chrome.storage.local`
- Graceful fallback if session secret is deleted mid-session
- "Forgot password? Reset everything" wipes all data

### Step 10: Re-enroll Face ✅
- "Re-enroll Face" button in popup when already enrolled
- Opens enrollment flow (replaces previous descriptors)

### Step 11: Password Visibility Toggle ✅
- Eye/EyeOff icons (Lucide) on each credential card
- Decrypts and reveals password on click, hides on second click
- Uses cached master password from session for decryption

### Step 12: Highlight Matched Credential ✅
- Matched credential card gets `border-primary` highlight
- Clear visual indicator of which credential will be used for autofill

### Step 13: Loading State for Face Models ✅
- Reusable `Loading` component with Lucide spinner
- Scanner shows "Loading face recognition models..." during `human.warmup()`
- Models cached in IndexedDB after first download

### Step 14: Refactor ✅
- Break up large files into smaller, focused modules/components
- `popup/App.tsx` → separate components (master password screens, credential form, credential list)
- `scanner/App.tsx` → extract enrollment and verification logic
- Extract shared logic into custom hooks (`usePopup`, `useScanner`)
- Lint fixes, biome config for Tailwind directives, import sorting
- Added CLAUDE.md and project README

---

## Phase 2: Advanced (QR Code Phone Fallback + Settings)

### Step 15: Settings Page & Camera Mode Preference ✅
- Add a settings icon (gear) to the popup header
- Settings opens as a new extension tab (like scanner) at `src/settings/`
- Setting: **Camera mode** with 3 options:
  - **PC webcam** — always use local webcam (current behavior)
  - **Phone camera** — always show QR code for phone scan
  - **Auto** (default) — detect if webcam exists via `navigator.mediaDevices.enumerateDevices()`, use webcam if available, fall back to phone
- Store preference in `chrome.storage.sync` (syncs across devices)
- Update scanner flow to check this setting before choosing webcam vs QR path

### Step 16: Firebase Project Setup ✅
- Create Firebase project in Firebase Console (`face-id-extension`)
- Enable **Realtime Database** (start in test mode, lock down rules later)
- Enable **Firebase Hosting** (will serve the phone scan page at `face-id-extension.web.app`)
- Install Firebase CLI locally (`pnpm add -g firebase-tools`)
- `firebase init` in a separate `/phone` directory (or subfolder) — select Hosting + Realtime Database
- Configure hosting to deploy the phone scan page
- Add Firebase client SDK to both the extension and phone page (`firebase/app`, `firebase/database`)
- **Console walkthrough:** step-by-step clicks in Firebase Console will be guided during implementation

### Step 17: Phone Scan Page (Firebase Hosting) ✅
- Build a standalone page at `face-id-extension.web.app/scan`
- Page reads `session` and `secret` from URL query params
- Requests camera access, runs `@vladmandic/human` face detection
- Same enrollment/verification UI as the extension scanner (reuse components or rebuild lightweight)
- Needs access to the user's stored face descriptors — fetch from Firebase Realtime DB (extension uploads them when creating the session)
- On successful face match: write `{ verified: true }` to the session doc in Realtime DB
- On failure/timeout: write `{ verified: false }`
- Show success/failure feedback, then the page can be closed

### Step 18: Session Management ✅
- When the extension needs phone verification:
  1. Generate a random session ID + secret
  2. Upload face descriptors + secret to Realtime DB at `/sessions/{sessionId}`
  3. Set a TTL (60s expiry) — use Firebase server timestamp + a cleanup rule or Cloud Function
  4. Generate QR code containing `https://face-id-extension.web.app/scan?session={id}&secret={secret}`
- Session doc structure:
  ```
  /sessions/{sessionId} {
    secret: "random-string",
    descriptors: [[...], [...], [...]],
    createdAt: serverTimestamp,
    result: null  // phone writes "verified" or "denied"
  }
  ```
- Security: phone page must provide the correct `secret` to write to the session
- Session is deleted after result is written or after TTL expires

### Step 19: QR Code Display in Extension ✅
- Install a QR code library (e.g., `qrcode.react` or `qrcode`)
- When camera mode is "phone" or "auto" falls back to phone:
  - Extension creates a session (Step 18)
  - Display QR code in the scanner tab instead of the webcam feed
  - Show instructions: "Scan this QR code with your phone"
  - Extension listens to `/sessions/{sessionId}/result` in Realtime DB
- On receiving `verified: true` → trigger autofill (same as webcam flow)
- On receiving `denied` or timeout → show error with retry option
- QR code refreshes if session expires

### Step 20: Firebase Security Rules ✅
- Lock down Realtime Database rules:
  - `/sessions/{id}`: writable only if `secret` matches, readable by anyone with the session ID
  - Sessions auto-expire (TTL enforcement)
  - No access to other users' sessions
- Ensure face descriptors in the session are deleted after verification (don't persist on server)
- Phone page doesn't need Firebase Auth — session secret acts as the auth token

### Step 21: Webcam Detection & Auto Mode ✅
- Implement `detectWebcam()` utility using `navigator.mediaDevices.enumerateDevices()`
  - Check for `videoinput` devices
  - Handle permissions (may need to request camera access once to enumerate)
- In auto mode:
  - If webcam detected → proceed with local webcam scanner (existing flow)
  - If no webcam → create Firebase session and show QR code
- Edge case: webcam detected but fails to start (e.g., in use) → fall back to QR

### Step 22: Integration Testing & Polish ✅
- Test full flow: extension → QR → phone scan → autofill
- Test auto-detection on a device without webcam
- Test session expiry and retry
- Test incognito mode with phone flow
- Cleanup: loading states, error handling, timeout UX
- Performance: ensure face models load quickly on phone (may need to warm up)

### Step 23: Firebase Hosting Deploy & Production Rules ✅
- Deploy phone scan page to Firebase Hosting (`firebase deploy --only hosting`)
- Switch Realtime Database from test mode to production security rules
- Test the live `face-id-extension.web.app/scan` URL
- Verify QR codes work end-to-end with the hosted page
