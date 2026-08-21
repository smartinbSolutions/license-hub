import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard, generateLicenseKey } from "@/lib/license-utils";
import type { License, LicenseStatus, Plan } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: License | null;
  plans: Plan[];
  onSubmit: (data: Partial<License>) => Promise<void> | void;
}

function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * 86400_000);
}

export function LicenseFormDialog({ open, onOpenChange, initial, plans, onSubmit }: Props) {
  const isEdit = !!initial;
  const defaultPlan = useMemo(() => initial?.planId ?? plans[0]?.id ?? "", [initial, plans]);
  const [licenseKey, setLicenseKey] = useState(initial?.licenseKey ?? generateLicenseKey());
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customerEmail ?? "");
  const [planId, setPlanId] = useState(defaultPlan);
  const [status, setStatus] = useState<LicenseStatus>(initial?.status ?? "active");
  const [maxDevices, setMaxDevices] = useState(initial?.maxDevices ?? 1);
  const [startsAt, setStartsAt] = useState(
    (initial?.startsAt ?? new Date().toISOString()).slice(0, 10),
  );
  const [perpetual, setPerpetual] = useState(initial?.perpetual ?? false);
  const [expiresAt, setExpiresAt] = useState(
    perpetual
      ? ""
      : (initial?.expiresAt ?? new Date(Date.now() + 365 * 86400_000).toISOString()).slice(0, 10),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const nextPlanId = initial?.planId ?? plans[0]?.id ?? "";
    const nextPlan = plans.find((p) => p.id === nextPlanId);
    const nextStartsAt = (initial?.startsAt ?? new Date().toISOString()).slice(0, 10);
    const nextPerpetual = Boolean(nextPlan?.perpetual);
    const nextExpiresAt = nextPerpetual
      ? ""
      : (
          initial?.expiresAt ??
          addDays(new Date(nextStartsAt), nextPlan?.durationDays ?? 365).toISOString()
        ).slice(0, 10);

    setLicenseKey(initial?.licenseKey ?? generateLicenseKey());
    setCustomerName(initial?.customerName ?? "");
    setCustomerEmail(initial?.customerEmail ?? "");
    setPlanId(nextPlanId);
    setStatus(initial?.status ?? "active");
    setMaxDevices(initial?.maxDevices ?? nextPlan?.maxDevices ?? 1);
    setStartsAt(nextStartsAt);
    setPerpetual(nextPerpetual);
    setExpiresAt(nextExpiresAt);
    setNotes(initial?.notes ?? "");
  }, [initial, open, plans]);

  function regen() {
    const k = generateLicenseKey();
    setLicenseKey(k);
    toast.success("New license key generated");
  }

  function copyKey() {
    copyToClipboard(licenseKey);
    toast.success("License key copied");
  }

  function changePlan(nextPlanId: string) {
    const plan = plans.find((p) => p.id === nextPlanId);
    setPlanId(nextPlanId);
    if (!plan) return;

    setMaxDevices(plan.maxDevices);
    setPerpetual(Boolean(plan.perpetual));

    if (plan.perpetual) {
      setExpiresAt("");
    } else {
      const start = new Date(startsAt);
      const expiry = addDays(start, plan.durationDays ?? 365);
      setExpiresAt(expiry.toISOString().slice(0, 10));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const plan = plans.find((p) => p.id === planId);

    if (!customerName.trim() || !customerEmail.trim()) {
      toast.error("Customer name and email are required");
      return;
    }
    if (!licenseKey.trim()) {
      toast.error("License key is required");
      return;
    }
    if (!plan) {
      toast.error("Select a valid plan");
      return;
    }
    if (!Number.isFinite(Number(maxDevices)) || Number(maxDevices) < 1) {
      toast.error("Max devices must be at least 1");
      return;
    }
    if (!perpetual) {
      if (!expiresAt) {
        toast.error("Expiry date is required");
        return;
      }
      if (new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
        toast.error("Expiry date must be after the start date");
        return;
      }
    }

    setSaving(true);
    try {
      await onSubmit({
        licenseKey: licenseKey.trim().toUpperCase(),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        planId,
        planName: plan.name,
        status,
        maxDevices: Number(maxDevices),
        startsAt: new Date(startsAt).toISOString(),
        perpetual,
        expiresAt: perpetual ? null : new Date(expiresAt).toISOString(),
        notes: notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit license" : "Create license"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the license details below."
              : "Issue a new license. The dashboard never signs payloads — signing happens server-side."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="key">License key</Label>
            <div className="flex gap-2">
              <Input
                id="key"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={regen}
                title="Regenerate"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={copyKey} title="Copy">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cn">Customer name</Label>
              <Input
                id="cn"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce">Customer email</Label>
              <Input
                id="ce"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={planId} onValueChange={changePlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.perpetual ? " (Lifetime)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LicenseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md">Max devices</Label>
              <Input
                id="md"
                type="number"
                min={1}
                value={maxDevices}
                onChange={(e) => setMaxDevices(Number(e.target.value))}
              />
            </div>
          </div>

          {perpetual && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
              <span className="font-medium">Lifetime license</span>
              <span className="text-muted-foreground">— this plan has no expiry.</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sa">Starts at</Label>
              <Input
                id="sa"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ea">Expires at</Label>
              <Input
                id="ea"
                type="date"
                value={expiresAt}
                disabled={perpetual}
                placeholder={perpetual ? "Never expires" : undefined}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Internal notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Visible only to admins"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create license"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
