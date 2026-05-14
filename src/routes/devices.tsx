import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { mockLicenses } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { copyToClipboard, shortHash } from "@/lib/license-utils";
import { toast } from "sonner";
import { Copy, Eye, Search, Monitor, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/devices")({
  component: () => (
    <DashboardLayout>
      <Devices />
    </DashboardLayout>
  ),
});

interface Row {
  deviceHash: string;
  deviceName: string;
  appVersion: string;
  activatedAt: string;
  lastSeenAt?: string;
  licenseKey: string;
  licenseId: string;
  customer: string;
  status: "active" | "inactive" | "expired" | "revoked";
}

function Devices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Row[]>(() =>
    mockLicenses.flatMap((l) =>
      l.activations.map((a) => ({
        ...a,
        licenseKey: l.licenseKey,
        licenseId: l.id,
        customer: l.customerName,
        status: l.status,
      }))
    )
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (r) =>
        r.deviceHash.toLowerCase().includes(q) ||
        r.deviceName.toLowerCase().includes(q) ||
        r.licenseKey.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
        <p className="text-sm text-muted-foreground">
          All devices currently bound to a license.
        </p>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by device, customer, or license…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Device</th>
                <th className="px-3 py-2.5 font-medium">Hash</th>
                <th className="px-3 py-2.5 font-medium">License</th>
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 font-medium">App</th>
                <th className="px-3 py-2.5 font-medium">Activated</th>
                <th className="px-3 py-2.5 font-medium">Last seen</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                      <Monitor className="h-8 w-8" />
                      <div className="text-sm font-medium text-foreground">No devices</div>
                      <p className="text-xs">No activations match your search.</p>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.deviceHash} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{r.deviceName}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px]" title={r.deviceHash}>
                    {shortHash(r.deviceHash)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                    {r.licenseKey}
                  </td>
                  <td className="px-3 py-2.5">{r.customer}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.appVersion}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {format(new Date(r.activatedAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {r.lastSeenAt ? formatDistanceToNow(new Date(r.lastSeenAt), { addSuffix: true }) : "—"}
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Copy device hash"
                        onClick={() => {
                          copyToClipboard(r.deviceHash);
                          toast.success("Device hash copied");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="View license"
                        onClick={() => navigate({ to: "/licenses/$id", params: { id: r.licenseId } as never })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Remove device"
                        onClick={() => {
                          setData((d) => d.filter((x) => x.deviceHash !== r.deviceHash));
                          toast.success("Device removed from license");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "device" : "devices"}
        </div>
      </Card>
    </div>
  );
}
