import { createFileRoute, useNavigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { License, LicenseStatus, Plan } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  Copy,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Power,
  Ban,
  RotateCcw,
  Eye,
  Search,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/license-utils";
import { LicenseFormDialog } from "@/components/license-form-dialog";
import { format } from "date-fns";
import {
  createLicense,
  deleteLicense,
  resetLicenseDevices,
  subscribeToLicenses,
  updateLicense,
} from "@/lib/license-service";
import { listPlans } from "@/lib/plan-service";

export const Route = createFileRoute("/licenses")({
  component: () => (
    <DashboardLayout>
      <Licenses />
    </DashboardLayout>
  ),
});

function Licenses() {
  const location = useLocation();

  if (location.pathname !== "/licenses") {
    return null;
  }
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [expiryFilter, setExpiryFilter] = useState<string>("all");
  const [usageFilter, setUsageFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 8;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [confirm, setConfirm] = useState<{
    id: string;
    action: "delete" | "revoke" | "reset";
  } | null>(null);

  function showWriteError(error: unknown) {
    toast.error(error instanceof Error ? error.message : "Unable to save license");
  }

  useEffect(() => {
    return subscribeToLicenses(
      (next) => {
        setLicenses(next);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        toast.error(error.message);
      },
    );
  }, []);

  useEffect(() => {
    listPlans()
      .then((next) => setPlans(next.filter((plan) => plan.status === "active")))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Unable to load plans"),
      );
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return licenses.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (planFilter !== "all" && l.planId !== planFilter) return false;
      if (expiryFilter === "expiring") {
        const days = (new Date(l.expiresAt).getTime() - Date.now()) / 86400_000;
        if (!(days > 0 && days < 30)) return false;
      } else if (expiryFilter === "past") {
        if (new Date(l.expiresAt).getTime() >= Date.now()) return false;
      }
      if (usageFilter === "full" && l.activations.length < l.maxDevices) return false;
      if (usageFilter === "unused" && l.activations.length > 0) return false;
      if (!q) return true;
      return (
        l.licenseKey.toLowerCase().includes(q) ||
        l.customerName.toLowerCase().includes(q) ||
        l.customerEmail.toLowerCase().includes(q) ||
        l.activations.some((a) => a.deviceHash.toLowerCase().includes(q))
      );
    });
  }, [licenses, search, statusFilter, planFilter, expiryFilter, usageFilter]);

  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(l: License) {
    setEditing(l);
    setFormOpen(true);
  }

  async function handleSubmit(data: Partial<License>) {
    try {
      if (editing) {
        await updateLicense(editing.id, data);
        toast.success("License updated");
      } else {
        await createLicense(data);
        toast.success("License created");
      }
      setFormOpen(false);
    } catch (error) {
      showWriteError(error);
    }
  }

  async function toggleStatus(l: License) {
    const next: LicenseStatus = l.status === "active" ? "inactive" : "active";
    try {
      await updateLicense(l.id, { status: next });
      toast.success(`License ${next === "active" ? "activated" : "deactivated"}`);
    } catch (error) {
      showWriteError(error);
    }
  }

  async function performConfirm() {
    if (!confirm) return;
    try {
      if (confirm.action === "delete") {
        await deleteLicense(confirm.id);
        toast.success("License deleted");
      } else if (confirm.action === "revoke") {
        await updateLicense(confirm.id, { status: "revoked" as LicenseStatus });
        toast.success("License revoked. Devices will lose access at next reconnect.");
      } else if (confirm.action === "reset") {
        await resetLicenseDevices(confirm.id);
        toast.success("Devices reset");
      }
      setConfirm(null);
    } catch (error) {
      showWriteError(error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Licenses</h1>
          <p className="text-sm text-muted-foreground">
            Issue and manage subscription license keys.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Create license
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by key, customer, email, device hash…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-8"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={planFilter}
            onValueChange={(v) => {
              setPlanFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={expiryFilter}
            onValueChange={(v) => {
              setExpiryFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Expiry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any expiry</SelectItem>
              <SelectItem value="expiring">Expiring (30d)</SelectItem>
              <SelectItem value="past">Past expiry</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={usageFilter}
            onValueChange={(v) => {
              setUsageFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Device usage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any usage</SelectItem>
              <SelectItem value="unused">Unused</SelectItem>
              <SelectItem value="full">At limit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">License key</th>
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 font-medium">Plan</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Devices</th>
                <th className="px-3 py-2.5 font-medium">Expires</th>
                <th className="px-3 py-2.5 font-medium">Last activation</th>
                <th className="w-12 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                      <KeyRound className="h-8 w-8" />
                      <div className="text-sm font-medium text-foreground">
                        {loading ? "Loading licenses..." : "No licenses"}
                      </div>
                      <p className="text-xs">Adjust filters or create a license to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
              {paged.map((l) => {
                const last = l.activations
                  .map((a) => a.activatedAt)
                  .sort()
                  .pop();
                return (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() =>
                          navigate({ to: "/licenses/$id", params: { id: l.id } as never })
                        }
                        className="font-mono text-[11px] text-foreground hover:text-primary"
                      >
                        {l.licenseKey}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium leading-tight">{l.customerName}</div>
                      <div className="text-[11px] text-muted-foreground">{l.customerEmail}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{l.planName}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{l.activations.length}</span>
                      <span className="text-muted-foreground"> / {l.maxDevices}</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {format(new Date(l.expiresAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {last ? format(new Date(last), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({ to: "/licenses/$id", params: { id: l.id } as never })
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(l)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              copyToClipboard(l.licenseKey);
                              toast.success("License key copied");
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" /> Copy key
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleStatus(l)}>
                            <Power className="mr-2 h-4 w-4" />
                            {l.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setConfirm({ id: l.id, action: "reset" })}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" /> Reset devices
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setConfirm({ id: l.id, action: "revoke" })}
                            className="text-status-revoked"
                          >
                            <Ban className="mr-2 h-4 w-4" /> Revoke
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setConfirm({ id: l.id, action: "delete" })}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <div>
            {filtered.length} {filtered.length === 1 ? "license" : "licenses"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <LicenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        plans={plans}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "delete" && "Delete license?"}
              {confirm?.action === "revoke" && "Revoke license?"}
              {confirm?.action === "reset" && "Reset all devices?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "delete" &&
                "This permanently removes the license record. Already-activated devices will keep working until they reconnect or their local payload expires."}
              {confirm?.action === "revoke" &&
                "Revoking blocks future activations and signals existing devices to stop on next reconnect."}
              {confirm?.action === "reset" &&
                "This clears all device activations. The customer will need to re-activate each device."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performConfirm}
              className={
                confirm?.action === "delete" ? "bg-destructive hover:bg-destructive/90" : ""
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
