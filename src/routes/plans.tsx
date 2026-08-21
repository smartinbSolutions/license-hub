import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import type { Plan } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Power, Trash2, Infinity as InfinityIcon, PackageOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createPlan, deletePlan, listPlans, updatePlan } from "@/lib/plan-service";
import GlobalDeleteModal from "@/components/ui/global-delete-modal";

export const Route = createFileRoute("/plans")({
  component: () => (
    <DashboardLayout>
      <Plans />
    </DashboardLayout>
  ),
});

function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [deletePlanItem, setDeletePlanItem] = useState<Plan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function refreshPlans() {
    try {
      setPlans(await listPlans());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load plans");
    } finally {
      setLoading(false);
    }
  }
  console.log(plans, "plans");
  useEffect(() => {
    void refreshPlans();
  }, []);

  function startCreate() {
    setEditing({
      id: "",
      name: "",
      maxDevices: 1,
      perpetual: false,
      durationDays: 365,
      price: 0,
      currency: "USD",
      features: [],
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setOpen(true);
  }

  async function save(p: Plan) {
    try {
      if (p?.id) {
        await updatePlan(p?.id, p);
      } else {
        await createPlan(p);
      }
      await refreshPlans();
      toast.success("Plan saved");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save plan");
    }
  }

  async function removePlan(id: string) {
    setDeleteLoading(true);

    try {
      await deletePlan(id);
      await refreshPlans();

      toast.success("Plan removed");
      setDeletePlanItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove plan");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function togglePlan(p: Plan) {
    try {
      await updatePlan(p?.id, { status: p?.status === "active" ? "inactive" : "active" });
      await refreshPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update plan");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
          <p className="text-sm text-muted-foreground">
            Define subscription or lifetime tiers used when issuing licenses.
          </p>
        </div>
        <Button onClick={startCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> New plan
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-lg border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <PackageOpen className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">No plans yet</p>
            <p className="text-sm text-muted-foreground">
              Create a plan to start issuing licenses under it.
            </p>
          </div>
          <Button onClick={startCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p?.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{p?.name}</CardTitle>
                    <div className="text-xs text-muted-foreground">{p?.id}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant={p?.status === "active" ? "default" : "secondary"}>
                      {p?.status}
                    </Badge>
                    {p?.perpetual && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <InfinityIcon className="h-3 w-3" /> Lifetime
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <span className="text-3xl font-semibold">
                    {p?.currency} {p?.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {p?.perpetual ? " one-time" : ` / ${p?.durationDays}d`}
                  </span>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max devices</span>
                    <span className="font-medium">{p?.maxDevices}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">
                      {p?.perpetual ? "Never expires" : `${p?.durationDays} days`}
                    </span>
                  </div>
                </div>
                {p?.features?.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {p?.features?.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex gap-2 border-t border-border pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      void togglePlan(p);
                    }}
                    title={p?.status === "active" ? "Deactivate plan" : "Activate plan"}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive"
                    onClick={() => {
                      setDeletePlanItem(p);
                    }}
                    title="Delete plan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlanDialog open={open} onOpenChange={setOpen} plan={editing} onSave={save} />

      <GlobalDeleteModal
        open={!!deletePlanItem}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePlanItem(null);
          }
        }}
        title="Delete Plan"
        description={`Are you sure you want to delete "${deletePlanItem?.name}"? This action cannot be undone.`}
        confirmText="Delete Plan"
        loading={deleteLoading}
        onDelete={() => {
          if (!deletePlanItem) return;

          return removePlan(deletePlanItem.id);
        }}
      />
    </div>
  );
}

function PlanDialog({
  open,
  onOpenChange,
  plan,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: Plan | null;
  onSave: (p: Plan) => void;
}) {
  const [draft, setDraft] = useState<Plan | null>(plan);
  const [featuresText, setFeaturesText] = useState("");
  // Remembers the last non-perpetual duration so toggling perpetual off
  // and back on doesn't lose whatever the admin had typed.
  const [lastDuration, setLastDuration] = useState(365);

  useEffect(() => {
    setDraft(plan);
    setFeaturesText(plan?.features?.join("\n") ?? "");
    if (plan?.durationDays) setLastDuration(plan.durationDays);
  }, [plan]);
  if (!draft) return null;

  function togglePerpetual(checked: boolean) {
    if (!draft) return;
    if (checked) {
      if (draft.durationDays) setLastDuration(draft.durationDays);
      setDraft({ ...draft, perpetual: true, durationDays: null });
    } else {
      setDraft({ ...draft, perpetual: false, durationDays: lastDuration || 365 });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan?.name ? "Edit plan" : "New plan"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Monthly, Lifetime"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input
                value={draft.currency}
                onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                placeholder="USD"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="cursor-pointer">Lifetime license</Label>
              <div className="text-xs text-muted-foreground">
                One-time purchase. Licenses issued under this plan never expire.
              </div>
            </div>
            <Switch checked={draft.perpetual} onCheckedChange={togglePerpetual} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Price</Label>
              <Input
                type="number"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max devices</Label>
              <Input
                type="number"
                value={draft.maxDevices}
                onChange={(e) => setDraft({ ...draft, maxDevices: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (days)</Label>
              <Input
                type="number"
                value={draft.perpetual ? "" : (draft.durationDays ?? "")}
                disabled={draft.perpetual}
                placeholder={draft.perpetual ? "Never expires" : undefined}
                onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Features (one per line)</Label>
            <Textarea
              rows={4}
              value={featuresText}
              onChange={(e) => {
                const nextFeaturesText = e.target.value;
                setFeaturesText(nextFeaturesText);
                setDraft({
                  ...draft,
                  features: nextFeaturesText
                    .split("\n")
                    .map((f) => f.trim())
                    .filter(Boolean),
                });
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="cursor-pointer">Active</Label>
              <div className="text-xs text-muted-foreground">
                Inactive plans are hidden from the create-license form.
              </div>
            </div>
            <Switch
              checked={draft.status === "active"}
              onCheckedChange={(v) => setDraft({ ...draft, status: v ? "active" : "inactive" })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                ...draft,
                features: featuresText
                  .split("\n")
                  .map((f) => f.trim())
                  .filter(Boolean),
                updatedAt: new Date().toISOString(),
              })
            }
          >
            Save plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
