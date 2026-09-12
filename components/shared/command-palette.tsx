"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useUiStore } from "@/stores/ui-store";
import { flattenNavForSearch } from "@/lib/nav-config";

const LINKS = flattenNavForSearch();

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
