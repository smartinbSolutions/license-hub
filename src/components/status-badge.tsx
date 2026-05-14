import type { LicenseStatus } from "@/lib/types";

const map: Record<LicenseStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-status-active/15 text-status-active ring-status-active/30",
  },
  inactive: {
    label: "Inactive",
    className: "bg-status-inactive/15 text-status-inactive ring-status-inactive/30",
  },
  expired: {
    label: "Expired",
    className: "bg-status-expired/15 text-status-expired ring-status-expired/30",
  },
  revoked: {
    label: "Revoked",
    className: "bg-status-revoked/15 text-status-revoked ring-status-revoked/30",
  },
};

export function StatusBadge({ status }: { status: LicenseStatus }) {
  const m = map[status];
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset " +
        m.className
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}
