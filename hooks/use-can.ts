"use client";

import * as React from "react";

import { useAuthStore } from "@/stores/auth-store";

/**
 * Permission check against the auth store. Returns a `can` function:
 *   can() -> true (no permission required)
 *   can("orders.create") -> true if the user has it (or the "*" wildcard)
 *   can(["orders.create", "orders.manage"]) -> true if the user has ANY
 */
export function useCan() {
  const permissions = useAuthStore((state) => state.permissions);

  return React.useCallback(
    (required?: string | string[]) => {
      if (!required || (Array.isArray(required) && required.length === 0)) {
        return true;
      }
      if (permissions.includes("*")) return true;
      const list = Array.isArray(required) ? required : [required];
      return list.some((permission) => permissions.includes(permission));
    },
    [permissions]
  );
}
