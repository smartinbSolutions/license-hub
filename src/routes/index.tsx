import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mockLicenses,
  mockActivationSeries,
  mockPlans,
} from "@/lib/mock-data";
import {
  KeyRound,
  CheckCircle2,
  Clock,
  Monitor,
  PackageOpen,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/")({
  component: () => (
    <DashboardLayout>
      <Overview />
    </DashboardLayout>
  ),
});

function Overview() {
  const total = mockLicenses.length;
  const active = mockLicenses.filter((l) => l.status === "active").length;
  const expired = mockLicenses.filter((l) => l.status === "expired").length;
  const devices = mockLicenses.reduce((s, l) => s + l.activations.length, 0);
  const unused = mockLicenses.filter((l) => l.activations.length === 0).length;

  const recent = mockLicenses
    .flatMap((l) =>
      l.activations.map((a) => ({ ...a, customer: l.customerName, key: l.licenseKey }))
    )
    .sort((a, b) => +new Date(b.activatedAt) - +new Date(a.activatedAt))
    .slice(0, 5);

  const statusPie = [
    { name: "Active", value: active, color: "oklch(0.65 0.16 155)" },
    {
      name: "Inactive",
      value: mockLicenses.filter((l) => l.status === "inactive").length,
      color: "oklch(0.65 0.03 258)",
    },
    { name: "Expired", value: expired, color: "oklch(0.7 0.16 70)" },
    {
      name: "Revoked",
      value: mockLicenses.filter((l) => l.status === "revoked").length,
      color: "oklch(0.6 0.23 27)",
    },
  ].filter((s) => s.value > 0);

  const planUsage = mockPlans.map((p) => ({
    name: p.name,
    licenses: mockLicenses.filter((l) => l.planId === p.id).length,
  }));

  const cards = [
    { label: "Total licenses", value: total, icon: KeyRound, hint: "All issued" },
    { label: "Active licenses", value: active, icon: CheckCircle2, hint: "Currently valid" },
    { label: "Expired licenses", value: expired, icon: Clock, hint: "Need renewal" },
    { label: "Activated devices", value: devices, icon: Monitor, hint: "Across customers" },
    { label: "Unused licenses", value: unused, icon: PackageOpen, hint: "No device bound" },
    {
      label: "Activations (30d)",
      value: mockActivationSeries.reduce((s, d) => s + d.activations, 0),
      icon: Activity,
      hint: "First-time + reactivations",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Real-time snapshot of subscription health and device activations.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="gap-2 py-4">
              <CardContent className="px-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {c.label}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{c.value}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{c.hint}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activations over time</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockActivationSeries}>
                <defs>
                  <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.22 268)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.55 0.22 268)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 255)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 258)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 258)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(1 0 0)",
                    border: "1px solid oklch(0.92 0.012 255)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="activations"
                  stroke="oklch(0.55 0.22 268)"
                  strokeWidth={2}
                  fill="url(#actFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {statusPie.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(1 0 0)",
                    border: "1px solid oklch(0.92 0.012 255)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {statusPie.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="ml-auto font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Licenses by plan</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 255)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 258)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 258)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(1 0 0)",
                    border: "1px solid oklch(0.92 0.012 255)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="licenses" fill="oklch(0.55 0.22 268)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recently activated devices</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-6 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Device</th>
                    <th className="px-3 py-2 font-medium">License</th>
                    <th className="px-6 py-2 text-right font-medium">Activated</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.deviceHash} className="border-b border-border last:border-0">
                      <td className="px-6 py-2.5 font-medium">{r.customer}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.deviceName}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {r.key}
                      </td>
                      <td className="px-6 py-2.5 text-right text-muted-foreground">
                        {formatDistanceToNow(new Date(r.activatedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col gap-1 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <StatusBadge status="active" />{" "}
            <span className="ml-2">
              Heads up: revoking a license takes effect on the device only when it next reconnects
              or its locally signed payload expires.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
