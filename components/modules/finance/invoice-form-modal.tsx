"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { invoicesApi } from "@/lib/api/finance";
import { customersApi } from "@/lib/api/crm";
import { ordersApi } from "@/lib/api/sales";
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

const lineSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.string().refine((v) => parseFloat(v) > 0, "Must be > 0"),
  unitPrice: z.string().refine((v) => parseFloat(v) >= 0, "Must be ≥ 0"),
});

const INVOICE_TYPES = [
  { value: "INVOICE",  label: "Regular Invoice",  desc: "Standard invoice for goods or services" },
  { value: "DEPOSIT",  label: "Deposit Invoice",   desc: "Invoice requesting a deposit before work starts" },
  { value: "CREDIT_NOTE", label: "Credit Note",   desc: "Credit against a previous invoice" },
] as const;

const schema = z.object({
  type: z.enum(["INVOICE", "DEPOSIT", "CREDIT_NOTE"]).default("INVOICE"),
  customerId: z.string().uuid("Customer is required"),
  orderId: z.string().optional(),
  issueDate: z.string().min(1, "Required"),
  dueDate: z.string().min(1, "Required"),
  items: z.array(lineSchema).min(1, "At least one line item is required"),
  discountTotal: z.string().optional(),
  taxTotal: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface InvoiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceFormModal({ open, onOpenChange }: InvoiceFormModalProps) {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const due = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const { data: customersResult } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => customersApi.list({ limit: 200 } as any),
    enabled: open,
  });
  const customers = (customersResult as any)?.data ?? customersResult ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "INVOICE",
      customerId: "",
      orderId: "",
      issueDate: today,
      dueDate: due,
      items: [{ description: "", quantity: "1", unitPrice: "" }],
      discountTotal: "",
      taxTotal: "",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  React.useEffect(() => {
    if (open) {
      form.reset({
        type: "INVOICE",
        customerId: "",
        orderId: "",
        issueDate: today,
        dueDate: due,
        items: [{ description: "", quantity: "1", unitPrice: "" }],
        discountTotal: "",
        taxTotal: "",
        notes: "",
      });
    }
  }, [open]);

  const watchedCustomerId = form.watch("customerId");
  const { data: ordersResult } = useQuery({
    queryKey: ["orders-by-customer", watchedCustomerId],
    queryFn: () => ordersApi.list({ customerId: watchedCustomerId, limit: 50 } as any),
    enabled: open && !!watchedCustomerId,
  });
  const orders = (ordersResult as any)?.data ?? [];

  // Live totals
  const watchedItems = form.watch("items");
  const subtotal = watchedItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const discount = parseFloat(form.watch("discountTotal") ?? "0") || 0;
  const tax = parseFloat(form.watch("taxTotal") ?? "0") || 0;
  const total = subtotal - discount + tax;

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      invoicesApi.create({
        type: values.type,
        customerId: values.customerId,
        orderId: values.orderId || undefined,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        discountTotal: parseFloat(values.discountTotal ?? "0") || undefined,
        taxTotal: parseFloat(values.taxTotal ?? "0") || undefined,
        notes: values.notes || undefined,
        items: values.items.map((item, idx) => ({
          lineNo: idx + 1,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
      } as any),
    onSuccess: () => {
      toast.success("Invoice created");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create invoice"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>New Invoice</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">

              {/* Invoice Type */}
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {INVOICE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="font-medium">{t.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">— {t.desc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Customer + Order */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="customerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {customers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.firstName ? `${c.firstName} ${c.lastName ?? ""}`.trim() : c.companyName ?? c.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="orderId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order (optional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                      value={field.value ?? "__none__"}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Link to order…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {orders.map((o: any) => (
                          <SelectItem key={o.id} value={o.id}>{o.orderNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="issueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Separator />

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Line Items</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ description: "", quantity: "1", unitPrice: "" })}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Add line
                  </Button>
                </div>

                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2 text-xs text-muted-foreground px-1 mb-1">
                  <span>Description</span><span>Qty</span><span>Unit Price</span><span />
                </div>

                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-start">
                      <FormField control={form.control} name={`items.${idx}.description`} render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl><Input placeholder="Description" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`items.${idx}.quantity`} render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl><Input type="number" min="0.01" step="0.01" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`items.${idx}.unitPrice`} render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)} disabled={fields.length === 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="discountTotal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount ($)</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="taxTotal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ($)</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Running total */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>−${discount.toFixed(2)}</span></div>}
                {tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>+${tax.toFixed(2)}</span></div>}
                <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>

              {/* Notes */}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Optional notes…" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="shrink-0 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Create invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
