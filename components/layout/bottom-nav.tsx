"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/use-can";
import { PRIMARY_NAV } from "@/lib/nav-config";
import { MobileMoreSheet } from "./mobile-more-sheet";

export function BottomNav() {
  const pathname = usePathname();
  const can = useCan();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const items = PRIMARY_NAV.filter((item) => can(item.permission));

  return (
    <>
      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </nav>
    </>
  );
}
