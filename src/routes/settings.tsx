import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Download, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/license-utils";
import { ACTIVATION_ENDPOINT } from "@/lib/firebase";
import { useState } from "react";

const SAMPLE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyHkk8sP7mF...
...exampleRSA2048PublicKeyForOfflineLicenseVerification...
QIDAQAB
-----END PUBLIC KEY-----`;

export const Route = createFileRoute("/settings")({
  component: () => (
    <DashboardLayout>
      <Settings />
    </DashboardLayout>
  ),
});

function Settings() {
  const [brandName, setBrandName] = useState("POS License Manager");
  const [minVersion, setMinVersion] = useState("1.4.0");
  const [requireSigned, setRequireSigned] = useState(true);

  function downloadPublicKey() {
    const blob = new Blob([SAMPLE_PUBLIC_KEY], { type: "application/x-pem-file" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "license-public-key.pem";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure signing keys, activation endpoints, and branding.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Signing key status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-md bg-status-active/10 px-3 py-2 text-sm text-status-active ring-1 ring-status-active/20">
              <ShieldCheck className="h-4 w-4" />
              Private key configured in Cloud Functions secret
              <code className="ml-auto rounded bg-background px-1.5 py-0.5 text-[11px]">
                LICENSE_PRIVATE_KEY
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              The private RSA-2048 key is stored as a secret accessible only to the{" "}
              <code>activateLicense</code> Cloud Function. It is never exposed to the dashboard
              frontend or to clients.
            </p>
            <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-expired" />
              Rotating the key invalidates all currently signed local payloads. Devices will need
              to reconnect to receive a payload signed with the new key.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Public key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="max-h-32 overflow-auto rounded-md bg-muted/60 p-3 text-[11px] leading-tight">
              {SAMPLE_PUBLIC_KEY}
            </pre>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  copyToClipboard(SAMPLE_PUBLIC_KEY);
                  toast.success("Public key copied");
                }}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPublicKey} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Download .pem
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Embed this PEM in the Electron app to verify locally signed payloads.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activation endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>HTTPS Cloud Function URL</Label>
            <div className="flex gap-2">
              <Input value={ACTIVATION_ENDPOINT} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  copyToClipboard(ACTIVATION_ENDPOINT);
                  toast.success("Endpoint copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure the Electron app to POST{" "}
              <code>{`{ licenseKey, deviceHash, deviceName, appVersion }`}</code> to this URL.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">App version policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Minimum supported app version</Label>
              <Input value={minVersion} onChange={(e) => setMinVersion(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label className="cursor-pointer">Require signed payload verification</Label>
                <div className="text-xs text-muted-foreground">
                  Reject app versions that don't verify the local signature.
                </div>
              </div>
              <Switch checked={requireSigned} onCheckedChange={setRequireSigned} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Shown on the login page and email templates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Admin users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Admin user management is configured in your Firebase project under Authentication →
              Users. Custom claims (e.g. <code>admin: true</code>) gate access to admin-only Cloud
              Functions.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
