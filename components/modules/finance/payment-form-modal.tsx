"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { paymentsApi, journalsApi, accountsApi } from "@/lib/api/finance";
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

const PAYMENT_TYPES = [
  { value: "ORDER_DEPOSIT",    label: "Order Deposit",    desc: "Customer deposit for an order" },
  { value: "BALANCE_PAYMENT",  label: "Balance Payment",  desc: "Customer invoice or balance payment" },
  { value: "CAPITAL_INJECTION",label: "Capital Injection",desc: "Owner funds added to the business" },
] as const;

type PaymentTypeValue = typeof PAYMENT_TYPES[number]["value"];

const PAYMENT_METHODS = [
  { value: "CASH",          label: "Cash (USD)" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "MOBILE_MONEY",  label: "EcoCash / InnBucks" },
  { value: "PAYNOW",        label: "Paynow" },
  { value: "CHEQUE",        label: "Cheque" },
  { value: "OTHER",         label: "Other" },
];

const CASH_SUBTYPES = ["CASH", "BANK", "MOBILE_WALLET"];

const schema = z.object({
  paymentType:   z.enum(["ORDER_DEPOSIT", "BALANCE_PAYMENT", "CAPITAL_INJECTION"]),
  customerId:    z.string().optional(),
  orderId:       z.string().optional(),
  cashAccountId: z.string().optional(),
  method:        z.string().optional(),
  amount:        z.string().min(1, "Amount is required").refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    "Must be positive",
  ),
  paymentDate:   z.string().min(1, "Date is required"),
  reference:     z.string().optional(),
  notes:         z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentType !== "CAPITAL_INJECTION") {
    if (!data.customerId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Customer is required", path: ["customerId"] });
    }
    if (!data.method) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payment method is required", path: ["method"] });
    }
  }
  if (data.paymentType === "CAPITAL_INJECTION" && !data.cashAccountId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select the account funds were received into", path: ["cashAccountId"] });
  }
  if (data.paymentType === "ORDER_DEPOSIT" && !data.orderId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Order is required for a deposit", path: ["orderId"] });
  }
});

type FormValues = z.infer<typeof schema>;

interface PaymentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: {
    customerId?: string;
    orderId?: string;
    isDeposit?: boolean;
    amount?: string;
  };
  onSuccess?: () => void;
}

export function PaymentFormModal({ open, onOpenChange, prefill, onSuccess }: PaymentFormModalProps) {
  const qc = useQueryClient();

  const { data: customersResult } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => customersApi.list({ limit: 200 } as any),
    enabled: open,
  });
  const customers = (customersResult as any)?.data ?? customersResult ?? [];

  const { data: accountsResult } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: () => accountsApi.list({ limit: 500 } as any),
    enabled: open,
  });
  const accounts: any[] = (accountsResult as any)?.data ?? accountsResult ?? [];
  const cashAccounts = accounts.filter((a) => CASH_SUBTYPES.includes(a.subtype));

  const defaultType: PaymentTypeValue = prefill?.isDeposit ? "ORDER_DEPOSIT" : "BALANCE_PAYMENT";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentType:   defaultType,
      customerId:    prefill?.customerId ?? "",
      orderId:       prefill?.orderId ?? "",
      cashAccountId: "",
      method:        "CASH",
      amount:        prefill?.amount ?? "",
      paymentDate:   format(new Date(), "yyyy-MM-dd"),
      reference:     "",
      notes:         "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        paymentType:   prefill?.isDeposit ? "ORDER_DEPOSIT" : "BALANCE_PAYMENT",
        customerId:    prefill?.customerId ?? "",
        orderId:       prefill?.orderId ?? "",
        cashAccountId: "",
        method:        "CASH",
        amount:        prefill?.amount ?? "",
        paymentDate:   format(new Date(), "yyyy-MM-dd"),
        reference:     "",
        notes:         "",
      });
    }
  }, [open, prefill]);

  const watchedType       = form.watch("paymentType");
  const watchedCustomerId = form.watch("customerId");
  const isCustomerPayment = watchedType !== "CAPITAL_INJECTION";

  const { data: ordersResult } = useQuery({
    queryKey: ["orders-by-customer", watchedCustomerId],
    queryFn: () => ordersApi.list({ customerId: watchedCustomerId, limit: 50 } as any),
    enabled: open && !!watchedCustomerId && isCustomerPayment,
  });
  const orders = (ordersResult as any)?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (values.paymentType === "CAPITAL_INJECTION") {
        const capitalAccount = accounts.find((a) => a.subtype === "CAPITAL");
        if (!capitalAccount) throw new Error("Owner Capital account not found in chart of accounts");
        return journalsApi.create({
          memo:      `Capital injection${values.notes ? `: ${values.notes}` : ""}`,
          entryDate: values.paymentDate,
          lines: [
            { accountId: values.cashAccountId, debit:  parseFloat(values.amount) },
            { accountId: capitalAccount.id,     credit: parseFloat(values.amount) },
          ],
        } as any);
      }
      return paymentsApi.create({
        customerId:  values.customerId,
        method:      values.method,
        amount:      parseFloat(values.amount),
        paymentDate: values.paymentDate,
        isDeposit:   values.paymentType === "ORDER_DEPOSIT",
        orderId:     values.orderId || undefined,
        reference:   values.reference || undefined,
        notes:       values.notes || undefined,
      } as any);
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["journal-entries"] });
      qc.invalidateQueries({ queryKey: ["order"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to record payment"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">

              {/* Payment Type */}
              <FormField control={form.control} name="paymentType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type *</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue("orderId", "");
                      form.setValue("cashAccountId", "");
                      if (v === "CAPITAL_INJECTION") form.setValue("customerId", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_TYPES.map((t) => (
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

              {/* Customer (not for capital injection) */}
              {isCustomerPayment && (
                <FormField control={form.control} name="customerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
                      </FormControl>
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
              )}

              {/* Order (for deposit and balance payments) */}
              {isCustomerPayment && (
                <FormField control={form.control} name="orderId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order {watchedType === "ORDER_DEPOSIT" ? "*" : "(optional)"}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                      value={field.value || (watchedType === "ORDER_DEPOSIT" ? undefined : "__none__")}
                      disabled={!watchedCustomerId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={watchedCustomerId ? "Select order…" : "Select a customer first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {watchedType !== "ORDER_DEPOSIT" && (
                          <SelectItem value="__none__">None</SelectItem>
                        )}
                        {orders.map((o: any) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.orderNumber} — ${Number(o.balance ?? 0).toFixed(2)} due
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Capital: Received Into account */}
              {watchedType === "CAPITAL_INJECTION" && (
                <FormField control={form.control} name="cashAccountId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received Into *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cashAccounts.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Method + Amount */}
              {isCustomerPayment ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="method" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Method *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "CASH"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (USD) *</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              ) : (
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USD) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Date + Reference */}
              {isCustomerPayment ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="paymentDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="reference" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl><Input placeholder="Ref / receipt no." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              ) : (
                <FormField control={form.control} name="paymentDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

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
                {mutation.isPending ? "Saving…" : "Record payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
