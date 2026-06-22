import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { copyToClipboard, shortHash } from "@/lib/license-utils";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { resetLicenseDevices, subscribeToLicense, updateLicense } from "@/lib/license-service";
import { listAuditLogs } from "@/lib/activity-service";
import type { AuditLog, License } from "@/lib/types";

export const Route = createFileRoute("/sy-erp/licenses/$id")({
  component: () => (
    <DashboardLayout>
      <Detail />
    </DashboardLayout>
  ),
});

function Detail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [license, setLicense] = useState<License | null>(null);
  const [events, setEvents] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToLicense(
      id,
      (next) => {
        setLicense(next);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        toast.error(error.message);
      },
    );
  }, [id]);

  useEffect(() => {
    listAuditLogs(id)
      .then(setEvents)
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Unable to load license events"),
      );
  }, [id]);

  if (!license) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        {loading ? "Loading license..." : "License not found."}{" "}
        <Link to="/licenses" className="text-primary hover:underline">
          Back to licenses
        </Link>
      </div>
    );
  }

  const signedPreview = JSON.stringify(
    {
      payload: {
        licenseKey: license.licenseKey,
        deviceHash: license.activations[0]?.deviceHash ?? "<deviceHash>",
        issuedAt: new Date().toISOString(),
        expiresAt: license.expiresAt,
        maxDevices: license.maxDevices,
        planId: license.planId,
      },
      signature: "MEUCIQ…<base64-RSA-SHA256-signature>",
    },
    null,
    2,
  );

  async function removeDevice(hash: string) {
    try {
      await updateLicense(license.id, {
        activations: license.activations.filter((a) => a.deviceHash !== hash),
      });
      toast.success("Device removed from license");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove device");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            onClick={() => navigate({ to: "/licenses" })}
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All licenses
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-semibold tracking-tight">{license.licenseKey}</h1>
            <StatusBadge status={license.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {license.customerName} · {license.customerEmail}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            copyToClipboard(license.licenseKey);
            toast.success("License key copied");
          }}
          className="gap-1.5"
        >
          <Copy className="h-4 w-4" /> Copy key
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{license.planName}</div>
            <div className="text-xs text-muted-foreground">Plan ID: {license.planId}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Device usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {license.activations.length}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / {license.maxDevices}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${Math.min(100, (license.activations.length / license.maxDevices) * 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Validity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="text-muted-foreground">Starts</span>{" "}
              {format(new Date(license.startsAt), "MMM d, yyyy")}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Expires</span>{" "}
              {format(new Date(license.expiresAt), "MMM d, yyyy")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Activated devices</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await resetLicenseDevices(license.id);
                toast.success("Devices reset");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to reset devices");
              }
            }}
            className="gap-1.5"
            disabled={license.activations.length === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset all
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {license.activations.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No devices activated yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-6 py-2 font-medium">Device hash</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">App version</th>
                    <th className="px-3 py-2 font-medium">Activated</th>
                    <th className="px-3 py-2 font-medium">Last seen</th>
                    <th className="px-6 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {license.activations.map((a) => (
                    <tr key={a.deviceHash} className="border-b border-border last:border-0">
                      <td className="px-6 py-2.5 font-mono text-[11px]" title={a.deviceHash}>
                        {shortHash(a.deviceHash)}
                      </td>
                      <td className="px-3 py-2.5">{a.deviceName}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{a.appVersion}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {format(new Date(a.activatedAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {a.lastSeenAt ? format(new Date(a.lastSeenAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-6 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeDevice(a.deviceHash)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activation history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 && (
              <div className="text-sm text-muted-foreground">No events yet.</div>
            )}
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="font-medium">{e.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.adminEmail} · {format(new Date(e.createdAt), "PPpp")}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Signed payload preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted/60 p-3 text-[11px] leading-relaxed">
              {signedPreview}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">
              The signature is generated server-side by the <code>activateLicense</code> Express
              endpoint using RSA-SHA256. The Electron app verifies it with the embedded public key
              and stores the payload locally for offline use.
            </p>
          </CardContent>
        </Card>
      </div>

      {license.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{license.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
