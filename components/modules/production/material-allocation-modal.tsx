"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Boxes } from "lucide-react";
import { productionApi } from "@/lib/api/production";
import { materialsApi, warehousesApi } from "@/lib/api/inventory";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const ACTIONS = [
  { value: "plan", label: "Plan (allocate, no stock movement)" },
  { value: "issue", label: "Issue to Production (deducts stock)" },
  { value: "waste", label: "Record Waste (deducts stock)" },
] as const;

const lineSchema = z.object({
  materialId: z.string().uuid("Select a material"),
  qty: z.string().refine((v) => parseFloat(v) > 0, "Must be > 0"),
});

const schema = z.object({
  action: z.enum(["plan", "issue", "waste"]),
  warehouseId: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Add at least one material"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface MaterialAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
}

export function MaterialAllocationModal({ open, onOpenChange, jobId }: MaterialAllocationModalProps) {
  const qc = useQueryClient();

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

  const materialMap = React.useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const defaultWarehouse = React.useMemo(
    () => (warehouses as any[]).find((w) => w.isDefault) ?? (warehouses as any[])[0],
    [warehouses],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      action: "plan",
      warehouseId: "",
      lines: [{ materialId: "", qty: "" }],
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  React.useEffect(() => {
    if (open) {
      form.reset({
        action: "plan",
        warehouseId: defaultWarehouse?.id ?? "",
        lines: [{ materialId: "", qty: "" }],
        note: "",
      });
    }
  }, [open, defaultWarehouse]);

  const action = form.watch("action");
  const needsWarehouse = action !== "plan";

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (needsWarehouse && !values.warehouseId) {
        throw new Error("Select a warehouse");
      }
      const errors: string[] = [];
      for (const line of values.lines) {
        const qty = parseFloat(line.qty);
        const mat = materialMap.get(line.materialId);
        try {
          if (values.action === "plan") {
            await productionApi.planAllocation(jobId, { materialId: line.materialId, plannedQty: qty });
          } else if (values.action === "issue") {
            await productionApi.issueAllocation(jobId, {
              materialId: line.materialId, warehouseId: values.warehouseId!, qty, note: values.note,
            });
          } else {
            await productionApi.recordWaste(jobId, {
              materialId: line.materialId, warehouseId: values.warehouseId!, wasteQty: qty, note: values.note,
            });
          }
        } catch (err: any) {
          errors.push(`${mat?.name ?? line.materialId}: ${err?.message ?? "failed"}`);
        }
      }
      if (errors.length) throw new Error(errors.join("; "));
    },
    onSuccess: () => {
      toast.success("Materials recorded");
      qc.invalidateQueries({ queryKey: ["job-allocations", jobId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to record materials"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl overflow-hidden flex flex-col p-0 max-h-[90vh]">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            <DialogTitle>Record Materials</DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="action" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {needsWarehouse && (
                  <FormField control={form.control} name="warehouseId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select warehouse…" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(warehouses as any[]).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Materials</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ materialId: "", qty: "" })}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Add line
                  </Button>
                </div>

                <div className="space-y-2">
                  {fields.map((field, idx) => {
                    const mat = materialMap.get(form.watch(`lines.${idx}.materialId`) ?? "");
                    return (
                      <div key={field.id} className="grid grid-cols-[1.6fr_1fr_36px] gap-2 items-start">
                        <FormField control={form.control} name={`lines.${idx}.materialId`} render={({ field }) => (
                          <FormItem className="space-y-0">
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Select material…" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {materials.map((m: any) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    <span className="font-medium">{m.name}</span>
                                    {m.color && <span className="text-muted-foreground ml-1">({m.color})</span>}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name={`lines.${idx}.qty`} render={({ field }) => (
                          <FormItem className="space-y-0">
                            <div className="relative">
                              <FormControl>
                                <Input type="number" min="0.001" step="0.001" placeholder="Qty" className="h-9 pr-10 text-sm" {...field} />
                              </FormControl>
                              {mat?.uom && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                                  {mat.uom}
                                </span>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

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
              </div>
            </div>

            <DialogFooter className="shrink-0 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
