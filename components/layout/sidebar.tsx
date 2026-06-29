"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { useCan } from "@/hooks/use-can";
import {
  LayoutDashboard, Users, FileText, ShoppingBag, Factory, Package,
  Truck, Wallet, BarChart3, Settings, ClipboardList, Bell,
  ChevronLeft, ChevronRight, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  children?: { label: string; href: string }[];
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "CRM", href: "/crm", icon: Users,
    children: [
      { label: "Leads", href: "/crm/leads" },
      { label: "Customers", href: "/crm/customers" },
    ],
  },
  {
    label: "Quotations", href: "/quotations", icon: FileText,
    permission: "quotations.read",
  },
  {
    label: "Orders", href: "/orders", icon: ShoppingBag,
    permission: "orders.read",
  },
  {
    label: "Production", href: "/production", icon: Factory,
    permission: "production.read",
  },
  {
    label: "Inventory", href: "/inventory", icon: Package,
    permission: "inventory.read",
  },
  {
    label: "Procurement", href: "/procurement", icon: Truck,
    permission: "procurement.read",
  },
  {
    label: "Finance", href: "/finance", icon: Wallet,
    permission: "finance.read",
    children: [
      { label: "Invoices", href: "/finance/invoices" },
      { label: "Payments", href: "/finance/payments" },
      { label: "Expenses", href: "/finance/expenses" },
      { label: "Journals", href: "/finance/journals" },
      { label: "Accounts", href: "/finance/accounts" },
    ],
  },
  {
    label: "Reports", href: "/reports", icon: BarChart3,
    permission: "reports.read",
  },
  {
    label: "WhatsApp", href: "/whatsapp", icon: MessageSquare,
    permission: "whatsapp.read",
  },
  { label: "Audit", href: "/audit", icon: ClipboardList, permission: "audit.read" },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings.read" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const can = useCan();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col border-r bg-card transition-all duration-200",
          sidebarOpen ? "w-56" : "w-14"
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-14 items-center border-b px-3", sidebarOpen ? "justify-between" : "justify-center")}>
          {sidebarOpen && (
            <span className="text-base font-bold tracking-tight">Stitch&apos;t</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-0.5 px-2">
            {NAV.map((item) => {
              if (item.permission && !can(item.permission)) return null;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <NavEntry key={item.href} item={item} active={active} collapsed={!sidebarOpen} pathname={pathname} />
              );
            })}
          </nav>
        </ScrollArea>
      </aside>
    </TooltipProvider>
  );
}

function NavEntry({
  item,
  active,
  collapsed,
  pathname,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  pathname: string;
}) {
  const [open, setOpen] = React.useState(active);
  const Icon = item.icon;

  if (item.children) {
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.children[0].href}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        </button>
        {open && (
          <div className="ml-6 mt-0.5 space-y-0.5 border-l pl-3">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm transition-colors",
                  pathname === child.href || pathname.startsWith(child.href + "/")
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
              active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            <Icon className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}
