import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { mockAuditLogs, mockActivationAttempts } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { format } from "date-fns";

export const Route = createFileRoute("/audit")({
  component: () => (
    <DashboardLayout>
      <Audit />
    </DashboardLayout>
  ),
});

function actionColor(action: string) {
  if (action.includes("revoked") || action.includes("delete"))
    return "bg-status-revoked/15 text-status-revoked";
  if (action.includes("created") || action.includes("activated"))
    return "bg-status-active/15 text-status-active";
  if (action.includes("login")) return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}

function Audit() {
  const [q, setQ] = useState("");

  const logs = useMemo(() => {
    const v = q.trim().toLowerCase();
    if (!v) return mockAuditLogs;
    return mockAuditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(v) ||
        l.adminEmail.toLowerCase().includes(v) ||
        (l.licenseKey ?? "").toLowerCase().includes(v)
    );
  }, [q]);

  const attempts = useMemo(() => {
    const v = q.trim().toLowerCase();
    if (!v) return mockActivationAttempts;
    return mockActivationAttempts.filter(
      (a) =>
        a.licenseKey.toLowerCase().includes(v) ||
        (a.failureReason ?? "").toLowerCase().includes(v)
    );
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          All admin operations and activation attempts.
        </p>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search action, admin, license key, or failure reason…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
      </Card>

      <Tabs defaultValue="admin">
        <TabsList>
          <TabsTrigger value="admin">Admin actions</TabsTrigger>
          <TabsTrigger value="attempts">Activation attempts</TabsTrigger>
        </TabsList>
        <TabsContent value="admin">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Time</th>
                    <th className="px-3 py-2.5 font-medium">Admin</th>
                    <th className="px-3 py-2.5 font-medium">Action</th>
                    <th className="px-3 py-2.5 font-medium">License</th>
                    <th className="px-3 py-2.5 font-medium">Device</th>
                    <th className="px-3 py-2.5 font-medium">IP / UA</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {format(new Date(l.createdAt), "MMM d, HH:mm")}
                      </td>
                      <td className="px-3 py-2.5">{l.adminEmail}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={
                            "inline-block rounded px-2 py-0.5 text-[11px] font-medium " +
                            actionColor(l.action)
                          }
                        >
                          {l.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {l.licenseKey ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {l.deviceHash ? l.deviceHash.slice(0, 16) + "…" : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        {l.ipAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="attempts">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Time</th>
                    <th className="px-3 py-2.5 font-medium">License key</th>
                    <th className="px-3 py-2.5 font-medium">Device</th>
                    <th className="px-3 py-2.5 font-medium">App</th>
                    <th className="px-3 py-2.5 font-medium">Result</th>
                    <th className="px-3 py-2.5 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {format(new Date(a.createdAt), "MMM d, HH:mm")}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">{a.licenseKey}</td>
                      <td className="px-3 py-2.5">{a.deviceName}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{a.appVersion}</td>
                      <td className="px-3 py-2.5">
                        {a.success ? (
                          <span className="inline-block rounded bg-status-active/15 px-2 py-0.5 text-[11px] font-medium text-status-active">
                            success
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-status-revoked/15 px-2 py-0.5 text-[11px] font-medium text-status-revoked">
                            {a.failureReason}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        {a.ipAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
