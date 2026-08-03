# POS License Manager - Admin Dashboard

A standalone admin web dashboard for managing offline-capable POS desktop app
subscriptions and licenses. The Electron POS app stays offline after first
activation by storing a locally signed RSA-SHA256 license payload it verifies
with an embedded public key.

## Stack

- React + TypeScript + TanStack Start
- Tailwind CSS + shadcn/ui
- MongoDB-backed admin login and password reset
- Express API for license CRUD and activation
- MongoDB persistence
- Recharts

## Project Layout

```text
src/
  components/        UI: layout, status badge, license form dialog
  lib/
    api-config.ts    API endpoint config
    auth-context.tsx React context wrapping backend admin auth
    license-service.ts REST client for the Express API
    types.ts         License/Plan/AuditLog types
    license-utils.ts Key generator, hash truncation, clipboard
    activity-service.ts REST client for audit logs and activation attempts
    plan-service.ts REST client for subscription plan CRUD
  routes/            File-based routes
server/
  index.js           Express API for license CRUD and activation
  model/db.js        MongoDB connection and collection indexes
  keys/              RSA signing keypair used by activation
```

## Run Locally

Start the API server:

```powershell
$env:MONGODB_URI=""
npm run dev:api
```

Start the dashboard in another terminal:

```powershell
npm run dev
```

By default the dashboard calls:

```text
http://127.0.0.1:8787
```

The API reads MongoDB settings from:

```text
MONGODB_URI
MONGODB_DB_NAME
```

On first startup, if no admin user exists, the API creates one from:

```text
ADMIN_EMAIL
ADMIN_PASSWORD
```

Defaults are `admin@pos-license.local` / `admin123456`.

Override it with:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8787"
npm run dev
```

## Signing Keys

The Express API reads the private key from either:

- `LICENSE_PRIVATE_KEY` environment variable
- `server/keys/private.pem`

Generate a keypair if needed:

```bash
mkdir -p server/keys
openssl genpkey -algorithm RSA -out server/keys/private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in server/keys/private.pem -pubout -out server/keys/public.pem
```

Embed `server/keys/public.pem` in the Electron app. Never ship
`server/keys/private.pem` to clients.

## API Endpoints

```text
GET    /health
GET    /api/licenses
GET    /api/licenses/:id
POST   /api/licenses
PATCH  /api/licenses/:id
POST   /api/licenses/:id/reset-devices
DELETE /api/licenses/:id
GET    /api/plans
GET    /api/plans/:id
POST   /api/plans
PATCH  /api/plans/:id
DELETE /api/plans/:id
GET    /api/audit-logs
GET    /api/activation-attempts
POST   /api/activateLicense
```

## Activation Flow

```js
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
  Buffer.from(signature, "base64"),
);

if (!ok) throw new Error("License signature invalid");
if (new Date(payload.expiresAt) < new Date()) throw new Error("License expired");
if (payload.deviceHash !== currentDeviceHash) throw new Error("Bound to different device");
```

## Security Notes

- The dashboard frontend never sees or signs with the private key.
- License and plan admin routes require an API admin session token.
- Revocation only takes effect when a device reconnects or its local signed payload expires.
- Activation attempts are recorded in the MongoDB `activationAttempts` collection.
