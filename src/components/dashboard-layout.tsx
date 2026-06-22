import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  KeyRound,
  Monitor,
  Package,
  ScrollText,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const navGroups = [
  {
    title: "Local POS",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/licenses", label: "Licenses", icon: KeyRound },
      { to: "/devices", label: "Devices", icon: Monitor },
      { to: "/plans", label: "Plans", icon: Package },
    ],
  },
  {
    title: "SY ERP",
    items: [
      { to: "/sy-erp", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/sy-erp/licenses", label: "Licenses", icon: KeyRound },
      { to: "/sy-erp/devices", label: "Devices", icon: Monitor },
      { to: "/sy-erp/plans", label: "Plans", icon: Package },
    ],
  },
  {
    title: "TR ERP",
    items: [
      { to: "/tr-erp", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/tr-erp/licenses", label: "Licenses", icon: KeyRound },
      { to: "/tr-erp/devices", label: "Devices", icon: Monitor },
      { to: "/tr-erp/plans", label: "Plans", icon: Package },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/audit", label: "Audit log", icon: ScrollText },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = (user.email ?? "A").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 px-5 pt-5 pb-6">
          <img src={logo} alt="" className="h-8 w-8 rounded-lg shadow-sm" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">POS License</div>
            <div className="text-[11px] text-muted-foreground">Admin Console</div>
          </div>
        </div>
        <nav className="flex-1 px-3">
          {navGroups.map((group, groupIndex) => (
            <div key={group.title}>
              {groupIndex > 0 && <div className="my-4 border-t border-border" />}

              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </div>

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  const active = item.exact
                    ? location.pathname === item.to
                    : location.pathname === item.to || location.pathname.startsWith(item.to + "/");

                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to as never}
                        className={
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                          (active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="rounded-md bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
            Devices stay licensed offline. Revocations take effect on next reconnect.
          </div>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-7 w-7 rounded-md md:hidden" />
            <span className="text-sm font-medium text-muted-foreground">POS License Manager</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initials}
                </span>
                <span className="hidden text-sm sm:inline">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                  toast.success("Signed out");
                  navigate({ to: "/login" });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
          {children}
        </main>
      </div>
    </div>
  );
}
