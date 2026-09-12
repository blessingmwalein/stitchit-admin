"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCan } from "@/hooks/use-can";
import { SECONDARY_NAV } from "@/lib/nav-config";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

interface MobileMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMoreSheet({ open, onOpenChange }: MobileMoreSheetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const can = useCan();
  const { logout } = useAuthStore();

  const items = SECONDARY_NAV.filter((item) => can(item.permission));

  async function handleLogout() {
    onOpenChange(false);
    await logout();
    router.push("/login");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {items.map((item) => {
            const Icon = item.icon;
            if (item.children?.length) {
              return (
                <div key={item.href}>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </p>
                  <div className="rounded-xl border divide-y overflow-hidden">
                    {item.children.map((child) => {
                      const active = pathname === child.href || pathname.startsWith(child.href + "/");
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => onOpenChange(false)}
                          className={cn(
                            "block px-4 py-3 text-sm",
                            active ? "bg-accent font-medium" : "bg-card"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
                  active ? "bg-accent" : "bg-card"
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </Link>
            );
          })}

          <Button
            variant="outline"
            className="w-full justify-center text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
