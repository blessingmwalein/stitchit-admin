"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { quotationsApi } from "@/lib/api/sales";
import { customersApi } from "@/lib/api/crm";
import type { Quotation, RugShape, Complexity } from "@/lib/types/sales";
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
import { Trash2, Plus } from "lucide-react";

const SHAPES: { value: RugShape; label: string }[] = [
  { value: "RECTANGLE", label: "Rectangle" },
  { value: "CIRCLE", label: "Circle" },
  { value: "OVAL", label: "Oval" },
  { value: "RUNNER", label: "Runner" },
  { value: "CUSTOM", label: "Custom" },
];

const COMPLEXITY_OPTS: { value: Complexity; label: string }[] = [
  { value: "SIMPLE", label: "Simple" },
  { value: "MEDIUM", label: "Moderate" },
  { value: "COMPLEX", label: "Complex" },
  { value: "VERY_COMPLEX", label: "Very Complex" },
];

// Backend QuotationItemDto:
//   lineNo (auto)
//   description: string (required)
//   rugSpec?: { rugName, widthCm, heightCm, unit, shape, colors, complexity }
//   quantity: number (required)
//   unitPrice: number (required)
//   discount?: number (per line)
const itemSchema = z.object({
  description: z.string().min(1, "Description required"),
  rugName: z.string().optional(),
  widthCm: z.string().optional(),
  heightCm: z.string().optional(),
  shape: z.enum(["RECTANGLE", "CIRCLE", "OVAL", "RUNNER", "CUSTOM"]).optional(),
  complexity: z.enum(["SIMPLE", "MEDIUM", "COMPLEX", "VERY_COMPLEX"]).optional(),
  colors: z.string().optional(),
  quantity: z.string().min(1, "Required"),
  unitPrice: z.string().min(1, "Required"),
  discount: z.string().default("0"),
});

const schema = z.object({
  customerId: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item required"),
});

type FormValues = z.infer<typeof schema>;

const BLANK_ITEM: FormValues["items"][number] = {
  description: "",
  rugName: "",
  widthCm: "",
  heightCm: "",
  shape: "RECTANGLE",
  complexity: "MEDIUM",
  colors: "",
  quantity: "1",
  unitPrice: "",
  discount: "0",
};

// Default expiry: 30 days from today
function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().substring(0, 10);
}

interface QuotationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Quotation;
}

export function QuotationFormModal({ open, onOpenChange, quotation }: QuotationFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!quotation;

  const { data: customersData } = useQuery({
    queryKey: ["customers-dropdown"],
    queryFn: () => customersApi.list({ pageSize: 200 }),
    enabled: open,
  });

  const buildDefaults = (): FormValues => ({
    customerId: quotation?.customerId ?? "",
    expiryDate: quotation?.expiryDate
      ? quotation.expiryDate.substring(0, 10)
      : defaultExpiry(),
    notes: quotation?.notes ?? "",
    terms: "",
    items: quotation?.items?.length
      ? quotation.items.map((i) => ({
          description: i.description ?? i.rugName ?? "",
          rugName: i.rugName ?? "",
          widthCm: String(i.widthCm ?? ""),
          heightCm: String(i.heightCm ?? ""),
          shape: (i.shape as RugShape) ?? "RECTANGLE",
          complexity: (i.complexity as Complexity) ?? "MEDIUM",
          colors: i.colors?.join(", ") ?? "",
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice),
          discount: "0",
        }))
      : [{ ...BLANK_ITEM }],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  React.useEffect(() => {
    if (open) form.reset(buildDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quotation]);

  const watchedItems = form.watch("items");

  const subtotal = watchedItems.reduce((acc, item) => {
    const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
    const lineDis = parseFloat(item.discount) || 0;
    return acc + lineTotal - lineDis;
  }, 0);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        customerId: values.customerId || undefined,
        expiryDate: values.expiryDate || undefined,
        notes: values.notes || undefined,
        terms: values.terms || undefined,
        items: values.items.map((item, idx) => {
          const hasRugSpec =
            item.rugName || item.widthCm || item.heightCm || item.colors;
          return {
            lineNo: idx + 1,
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice),
            discount: parseFloat(item.discount) || undefined,
            ...(hasRugSpec
              ? {
                  rugSpec: {
                    rugName: item.rugName || undefined,
                    widthCm: item.widthCm ? parseFloat(item.widthCm) : undefined,
                    heightCm: item.heightCm ? parseFloat(item.heightCm) : undefined,
                    shape: item.shape,
                    complexity: item.complexity,
                    colors: item.colors
                      ? item.colors.split(",").map((c) => c.trim()).filter(Boolean)
                      : undefined,
                  },
                }
              : {}),
          };
        }),
      };
      return isEdit ? quotationsApi.update(quotation!.id, payload as any) : quotationsApi.create(payload as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["quotation", quotation!.id] });
      toast.success(isEdit ? "Quotation updated" : "Quotation created");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const customers = customersData?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>{isEdit ? "Edit Quotation" : "New Quotation"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
          <Form {...form}>
            <form id="quotation-form" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5">

              {/* Customer + expiry */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select customer (optional)…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">— No customer —</SelectItem>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.type === "CORPORATE"
                                ? c.companyName
                                : [c.firstName, c.lastName].filter(Boolean).join(" ") || c.customerNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Line items */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line Items</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ ...BLANK_ITEM })}>
                    <Plus className="mr-1 h-3 w-3" />Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                        {fields.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Description + qty + price + discount */}
                      <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Description *</FormLabel>
                          <FormControl><Input placeholder="e.g. Custom Tufted Rug — Living Room" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-3 gap-3">
                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty *</FormLabel>
                            <FormControl><Input type="number" min="0" step="0.01" placeholder="1" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Unit Price ($) *</FormLabel>
                            <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.discount`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Discount ($)</FormLabel>
                            <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>

                      {/* Rug spec (collapsible feel — just show inline) */}
                      <p className="text-xs font-medium text-muted-foreground pt-1">Rug Specifications (optional)</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <FormField control={form.control} name={`items.${index}.rugName`} render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-xs">Rug Name</FormLabel>
                            <FormControl><Input placeholder="e.g. Living Room Floral" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <FormField control={form.control} name={`items.${index}.widthCm`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Width (cm)</FormLabel>
                            <FormControl><Input type="number" min="1" step="0.1" placeholder="150" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.heightCm`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Height (cm)</FormLabel>
                            <FormControl><Input type="number" min="1" step="0.1" placeholder="200" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.shape`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Shape</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? "RECTANGLE"}>
                              <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {SHAPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.complexity`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Complexity</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? "MEDIUM"}>
                              <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {COMPLEXITY_OPTS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name={`items.${index}.colors`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Colors (comma-separated)</FormLabel>
                          <FormControl><Input placeholder="Ivory, Rust, Sage" {...field} /></FormControl>
                        </FormItem>
                      )} />

                      <p className="text-right text-xs text-muted-foreground">
                        Line total:{" "}
                        <span className="font-medium text-foreground">
                          ${(
                            (parseFloat(watchedItems[index]?.quantity || "0") || 0) *
                            (parseFloat(watchedItems[index]?.unitPrice || "0") || 0) -
                            (parseFloat(watchedItems[index]?.discount || "0") || 0)
                          ).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Total + notes + terms */}
              <div className="flex justify-end">
                <div className="rounded-lg bg-muted/50 p-3 text-sm w-52">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea placeholder="Additional notes…" className="min-h-[80px] resize-y" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="terms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms &amp; Conditions</FormLabel>
                    <FormControl><Textarea placeholder="Payment terms, delivery…" className="min-h-[80px] resize-y" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

            </form>
          </Form>
        </div>

        <div className="border-t px-6 py-4 shrink-0">
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="quotation-form" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Quotation"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
