"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useUiStore } from "@/stores/ui-store";
import {
  LayoutDashboard, Users, FileText, ShoppingBag, Factory, Package,
  Truck, Wallet, BarChart3, Settings, ClipboardList, Bell, MessageSquare,
} from "lucide-react";

const LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/crm/leads", icon: Users },
  { label: "Customers", href: "/crm/customers", icon: Users },
  { label: "Quotations", href: "/quotations", icon: FileText },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Production", href: "/production", icon: Factory },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Procurement", href: "/procurement", icon: Truck },
  { label: "Invoices", href: "/finance/invoices", icon: Wallet },
  { label: "Payments", href: "/finance/payments", icon: Wallet },
  { label: "Expenses", href: "/finance/expenses", icon: Wallet },
  { label: "Journals", href: "/finance/journals", icon: Wallet },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageSquare },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Audit Logs", href: "/audit", icon: ClipboardList },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useUiStore();
  const router = useRouter();

  React.useEffect(() => {
    function down(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setCommandOpen]);

  function go(href: string) {
    setCommandOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {LINKS.map((link) => (
            <CommandItem key={link.href} value={link.label} onSelect={() => go(link.href)}>
              <link.icon className="mr-2 h-4 w-4" />
              {link.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
