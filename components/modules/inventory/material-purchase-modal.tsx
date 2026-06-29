"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { expensesApi, accountsApi } from "@/lib/api/finance";
import { materialsApi, stockApi, warehousesApi } from "@/lib/api/inventory";
import { suppliersApi } from "@/lib/api/procurement";
import type { Account } from "@/lib/types/finance";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MaterialFormModal } from "@/components/modules/inventory/material-form-modal";

const PAID_FROM_SUBTYPES = ["CASH", "BANK", "MOBILE_WALLET"];

const lineSchema = z.object({
  materialId:  z.string().uuid("Select a material"),
  quantity:    z.string().refine((v) => parseFloat(v) > 0, "Must be > 0"),
  unitCost:    z.string().refine((v) => parseFloat(v) >= 0, "Must be ≥ 0"),
  supplierId:  z.string().optional(),
});

const schema = z.object({
  lines:             z.array(lineSchema).min(1, "Add at least one material"),
  paidFromAccountId: z.string().uuid("Required"),
  date:              z.string().min(1, "Required"),
  note:              z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface MaterialPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialPurchaseModal({ open, onOpenChange }: MaterialPurchaseModalProps) {
  const qc = useQueryClient();
  const [creatingForIdx, setCreatingForIdx] = React.useState<number | null>(null);

  const { data: accountsRaw } = useQuery<Account[]>({
    queryKey: ["accounts-flat"],
    queryFn: () => accountsApi.list({ limit: 500 } as any),
    enabled: open,
  });
  const accounts: Account[] = Array.isArray(accountsRaw)
    ? accountsRaw
    : (accountsRaw as any)?.data ?? [];

  const { data: materialsResult } = useQuery({
    queryKey: ["materials-all"],
    queryFn: () => materialsApi.list({ limit: 500 } as any),
    enabled: open,
  });
  const materials: any[] = (materialsResult as any)?.data ?? materialsResult ?? [];

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ["warehouses"],
    queryFn: warehousesApi.list,
    enabled: open,
  });

  const { data: suppliersResult } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () => suppliersApi.list({ limit: 200 } as any),
    enabled: open,
  });
  const suppliers: any[] = (suppliersResult as any)?.data ?? suppliersResult ?? [];

  const paidFromAccounts = React.useMemo(
    () => accounts.filter((a) => PAID_FROM_SUBTYPES.includes(a.subtype ?? "")),
    [accounts],
  );
  const rawMaterialsAccount = React.useMemo(
    () => accounts.find((a) => a.subtype === "INVENTORY_RAW"),
    [accounts],
  );
  const defaultWarehouse = React.useMemo(
    () => (warehouses as any[]).find((w) => w.isDefault) ?? (warehouses as any[])[0],
    [warehouses],
  );

  // Fast lookup maps
  const materialMap = React.useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const supplierMap = React.useMemo(() => new Map(suppliers.map((s: any) => [s.id, s])), [suppliers]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lines: [{ materialId: "", quantity: "", unitCost: "", supplierId: "" }],
      paidFromAccountId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  React.useEffect(() => {
    if (open) {
      form.reset({
        lines: [{ materialId: "", quantity: "", unitCost: "", supplierId: "" }],
        paidFromAccountId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        note: "",
      });
    }
  }, [open]);

  const watchedLines = form.watch("lines");

  const grandTotal = watchedLines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const cost = parseFloat(l.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  function lineTotal(idx: number) {
    const l = watchedLines[idx];
    return (parseFloat(l?.quantity) || 0) * (parseFloat(l?.unitCost) || 0);
  }

  function buildDescription(mat: any, qty: number, supplierName?: string) {
    const name = mat ? `${mat.name}${mat.color ? ` (${mat.color})` : ""}` : "material";
    const uom = mat?.uom ?? "";
    const from = supplierName ? ` from ${supplierName}` : "";
    return `Purchase: ${name} × ${qty} ${uom}${from}`;
  }

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!rawMaterialsAccount) throw new Error("Raw Materials inventory account not found in chart of accounts");
      if (!defaultWarehouse) throw new Error("No warehouse configured — add one in Settings");

      const errors: string[] = [];

      for (const line of values.lines) {
        const qty = parseFloat(line.quantity);
        const unitCost = parseFloat(line.unitCost);
        const amount = qty * unitCost;
        const mat = materialMap.get(line.materialId);
        const supplier = line.supplierId ? supplierMap.get(line.supplierId) : undefined;
        const supplierName = supplier?.name ?? undefined;

        try {
          await expensesApi.create({
            date: values.date,
            expenseAccountId: rawMaterialsAccount.id,
            paidFromAccountId: values.paidFromAccountId,
            amount,
            category: "MATERIALS",
            payee: supplierName,
            description: buildDescription(mat, qty, supplierName),
          } as any);

          await stockApi.adjust({
            materialId: line.materialId,
            warehouseId: defaultWarehouse.id,
            qty,
            unitCost,
            note: values.note || `Purchased on ${values.date}${supplierName ? ` from ${supplierName}` : ""}`,
          });
        } catch (err: any) {
          errors.push(`${mat?.name ?? line.materialId}: ${err?.message ?? "failed"}`);
        }
      }

      if (errors.length) throw new Error(errors.join("; "));
    },
    onSuccess: () => {
      toast.success("Purchase recorded — stock and expenses updated");
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["materials-all"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to record purchase"),
  });

  function handleMaterialCreated(newMaterial: any) {
    if (creatingForIdx !== null) {
      form.setValue(`lines.${creatingForIdx}.materialId`, newMaterial.id, { shouldValidate: true });
    }
    setCreatingForIdx(null);
  }

  return (
    <>
    <MaterialFormModal
      open={creatingForIdx !== null}
      onOpenChange={(o) => { if (!o) setCreatingForIdx(null); }}
      onCreated={handleMaterialCreated}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl overflow-hidden flex flex-col p-0 max-h-[90vh]">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <DialogTitle>Buy Materials</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add all materials bought in this trip. Each line posts an expense and updates stock automatically.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">

              {/* Purchase header */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="paidFromAccountId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid From *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Cash / Bank / EcoCash…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {paidFromAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Separator />

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Materials Purchased</p>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => append({ materialId: "", quantity: "", unitCost: "", supplierId: "" })}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />Add line
                  </Button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1.4fr_1fr_90px_100px_72px_36px] gap-2 text-xs text-muted-foreground px-1 mb-1.5">
                  <span>Material</span>
                  <span>Supplier</span>
                  <span>Qty</span>
                  <span>Unit Cost (USD)</span>
                  <span className="text-right">Total</span>
                  <span />
                </div>

                <div className="space-y-2">
                  {fields.map((field, idx) => {
                    const mat = materialMap.get(watchedLines[idx]?.materialId ?? "");
                    const uom = mat?.uom ?? "";
                    const lt = lineTotal(idx);

                    return (
                      <div key={field.id} className="grid grid-cols-[1.4fr_1fr_90px_100px_72px_36px] gap-2 items-start">
                        {/* Material picker + create new */}
                        <FormField control={form.control} name={`lines.${idx}.materialId`} render={({ field }) => (
                          <FormItem className="space-y-0">
                            <div className="flex items-center gap-1">
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger className="h-9 text-sm flex-1">
                                    <SelectValue placeholder="Select material…" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {materials.map((m: any) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      <span className="font-medium">{m.name}</span>
                                      {m.color && <span className="text-muted-foreground ml-1">({m.color})</span>}
                                      <span className="text-muted-foreground ml-1.5 text-xs">· {m.uom}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 shrink-0"
                                title="Create new material"
                                onClick={() => setCreatingForIdx(idx)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Supplier per line */}
                        <FormField control={form.control} name={`lines.${idx}.supplierId`} render={({ field }) => (
                          <FormItem className="space-y-0">
                            <Select
                              onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                              value={field.value || "__none__"}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Supplier…" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__none__">No supplier</SelectItem>
                                {suppliers.map((s: any) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Quantity with UOM */}
                        <FormField control={form.control} name={`lines.${idx}.quantity`} render={({ field }) => (
                          <FormItem className="space-y-0">
                            <div className="relative">
                              <FormControl>
                                <Input type="number" min="0.001" step="0.001" placeholder="0" className="h-9 pr-8 text-sm" {...field} />
                              </FormControl>
                              {uom && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                                  {uom}
                                </span>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Unit cost */}
                        <FormField control={form.control} name={`lines.${idx}.unitCost`} render={({ field }) => (
                          <FormItem className="space-y-0">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                              <FormControl>
                                <Input type="number" min="0" step="0.001" placeholder="0.00" className="h-9 pl-5 text-sm" {...field} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Line total */}
                        <div className="h-9 flex items-center justify-end text-sm font-medium tabular-nums text-muted-foreground">
                          {lt > 0 ? `$${lt.toFixed(2)}` : "—"}
                        </div>

                        {/* Remove */}
                        <Button
                          type="button" size="icon" variant="ghost"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Totals breakdown */}
                {grandTotal > 0 && (
                  <div className="mt-4 rounded-lg border bg-muted/30 overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 border-b">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Purchase Summary</p>
                    </div>
                    <div className="divide-y">
                      {watchedLines.map((line, i) => {
                        const lt = lineTotal(i);
                        if (lt <= 0) return null;
                        const mat = materialMap.get(line.materialId ?? "");
                        if (!mat) return null;
                        const qty = parseFloat(line.quantity) || 0;
                        const cost = parseFloat(line.unitCost) || 0;
                        return (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {mat.name}{mat.color ? ` (${mat.color})` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {qty.toFixed(3)} {mat.uom} × ${cost.toFixed(3)}
                              </p>
                            </div>
                            <span className="text-sm font-semibold tabular-nums ml-4">${lt.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 py-3 border-t bg-primary/5 flex items-center justify-between">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="text-xl font-bold tabular-nums">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Optional notes for this purchase…" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {!rawMaterialsAccount && accounts.length > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Warning: Raw Materials Inventory account (subtype INVENTORY_RAW) not found. Contact your administrator.
                </p>
              )}
            </div>

            <DialogFooter className="shrink-0 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending || !rawMaterialsAccount}>
                {mutation.isPending ? "Recording…" : `Record ${fields.length > 1 ? `${fields.length} purchases` : "purchase"}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
