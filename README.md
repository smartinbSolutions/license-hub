# POS License Manager — Admin Dashboard

A standalone admin web dashboard for managing offline-capable POS desktop app
subscriptions and licenses. The Electron POS app stays offline after first
activation by storing a locally signed RSA-SHA256 license payload it verifies
with an embedded public key.

## Stack

- React + TypeScript + TanStack Start
- Tailwind CSS + shadcn/ui
- Firebase Auth (email/password) + Firestore + Cloud Functions
- Recharts

## Project layout

```
src/
  components/        UI: layout, status badge, license form dialog
  lib/
    firebase.ts      Firebase client (Auth/Firestore/Functions)
    auth-context.tsx React context wrapping Firebase Auth
    types.ts         License/Plan/AuditLog types
    license-utils.ts Key generator, hash truncation, clipboard
    mock-data.ts     Demo data (replace with Firestore queries)
  routes/            File-based routes
    login.tsx        /login
    index.tsx        /          Overview
    licenses.tsx     /licenses
    licenses.$id.tsx /licenses/:id
    devices.tsx      /devices
    plans.tsx        /plans
    audit.tsx        /audit
    settings.tsx     /settings
functions/           Firebase Cloud Functions (admin + activation)
firestore.rules      Security rules outline
```

## Wiring real data

The dashboard ships with `src/lib/mock-data.ts` so the UI is immediately
usable. To wire it to Firestore:

1. Replace `mockLicenses`, `mockPlans`, `mockAuditLogs`, `mockActivationAttempts`
   imports with TanStack Query hooks calling Firestore via the SDK
   (`getDocs`, `onSnapshot`).
2. Replace mutating `setLicenses(...)` calls in `routes/licenses.tsx` and
   `routes/plans.tsx` with `httpsCallable(functions, 'createLicense'|...)`
   calls and invalidate the relevant query keys.
3. Set the admin custom claim on at least one Firebase Auth user:
   ```js
   admin.auth().setCustomUserClaims(uid, { admin: true })
   ```

## Cloud Functions

See `functions/index.js`. Provides:

| Function                 | Type        | Purpose                                |
|--------------------------|-------------|----------------------------------------|
| `createLicense`          | onCall      | Admin-only. Generates key, writes doc. |
| `updateLicense`          | onCall      | Admin-only. Updates fields + audit.    |
| `resetLicenseDevices`    | onCall      | Admin-only. Clears activations.        |
| `deleteLicense`          | onCall      | Admin-only. Removes license.           |
| `activateLicense`        | onRequest   | Public. Validates + signs payload.     |

### Setup

```bash
cd functions
npm install
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in private.pem -pubout -out public.pem
firebase functions:secrets:set LICENSE_PRIVATE_KEY < private.pem
firebase deploy --only functions
```

Embed `public.pem` in the Electron app — never `private.pem`.

## Activation flow (Electron client)

```js
// In Electron main process, on first launch:
const res = await fetch(ACTIVATION_ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    licenseKey: userEnteredKey,
    deviceHash: sha256(machineId + cpuId + osInstallId),
    deviceName: os.hostname(),
    appVersion: app.getVersion(),
  }),
});
const { payload, signature } = await res.json();
fs.writeFileSync(licensePath, JSON.stringify({ payload, signature }));
```

Subsequent launches verify offline:

```js
const { payload, signature } = JSON.parse(fs.readFileSync(licensePath));
const ok = crypto.verify(
  "RSA-SHA256",
  Buffer.from(JSON.stringify(payload)),
  PUBLIC_KEY_PEM,
  Buffer.from(signature, "base64")
);
if (!ok) throw new Error("License signature invalid");
if (new Date(payload.expiresAt) < new Date()) throw new Error("License expired");
if (payload.deviceHash !== currentDeviceHash) throw new Error("Bound to different device");
```

## Security notes

- The dashboard frontend never sees or signs with the private key.
- All writes go through authenticated admin Cloud Functions.
- Firestore rules deny all writes; reads gated on `request.auth.token.admin`.
- Revocation only takes effect when a device reconnects (or its locally
  signed payload expires). The dashboard surfaces this in the overview.
- The public activation endpoint records every attempt to `activationAttempts`
  for forensic visibility.

## Firestore data model

See `src/lib/types.ts`. Collections: `licenses`, `plans`, `auditLogs`,
`activationAttempts`.
