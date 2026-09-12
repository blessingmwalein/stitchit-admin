import {
  LayoutDashboard, Users, ShoppingBag, Factory, Package,
  Truck, Wallet, BarChart3, Settings, ClipboardList, Bell,
  MessageSquare, Images, LayoutGrid, FileText,
} from "lucide-react";
import type { ElementType } from "react";

export interface NavChild {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: ElementType;
  permission?: string;
  /** Eligible for the mobile bottom nav's primary slots (max 4). */
  primary?: boolean;
  children?: NavChild[];
}

/**
 * Single source of truth for every nav destination in the app — consumed by
 * the desktop Sidebar, the Command Palette, and the mobile BottomNav/MoreSheet.
 * Previously these were three separately hand-maintained lists that had
 * already drifted (e.g. Quotations was reachable only via Command Palette).
 */
export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, primary: true },
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
    permission: "orders.read", primary: true,
  },
  {
    label: "Production", href: "/production", icon: Factory,
    permission: "production.read", primary: true,
  },
  {
    label: "Inventory", href: "/inventory", icon: Package,
    permission: "inventory.read",
  },
  {
    label: "Finished Products", href: "/finished-products", icon: Images,
    permission: "finishedProducts.read",
  },
  {
    label: "Content", href: "/content", icon: LayoutGrid,
    permission: "roomShowcase.read",
    children: [
      { label: "Room Showcase", href: "/content/room-showcase" },
    ],
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

export const PRIMARY_NAV = NAV.filter((item) => item.primary);
export const SECONDARY_NAV = NAV.filter((item) => !item.primary);

/** Flattened for the Command Palette — each item plus its children as separate entries. */
export function flattenNavForSearch(): { label: string; href: string; icon: ElementType }[] {
  const out: { label: string; href: string; icon: ElementType }[] = [];
  for (const item of NAV) {
    if (item.children?.length) {
      for (const child of item.children) {
        out.push({ label: child.label, href: child.href, icon: item.icon });
      }
    } else {
      out.push({ label: item.label, href: item.href, icon: item.icon });
    }
  }
  return out;
}
