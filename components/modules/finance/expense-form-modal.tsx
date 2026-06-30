"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { expensesApi, accountsApi } from "@/lib/api/finance";
import type { Expense, Account } from "@/lib/types/finance";
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

// Category → account subtype mapping
const CATEGORY_SUBTYPE: Record<string, string> = {
  RENT: "RENT_EXPENSE",
  UTILITIES: "UTILITIES_EXPENSE",
  SALARIES: "PAYROLL_EXPENSE",
  TRANSPORT: "DELIVERY_EXPENSE",
  MARKETING: "MARKETING_EXPENSE",
  EQUIPMENT: "GENERAL_EXPENSE",
  OTHER: "GENERAL_EXPENSE",
};

const PAID_FROM_SUBTYPES = ["CASH", "BANK", "MOBILE_WALLET"];

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  category: z.string().min(1, "Category is required"),
  expenseAccountId: z.string().uuid("Required"),
  paidFromAccountId: z.string().uuid("Required"),
  amount: z.string().min(1, "Amount is required").refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Must be a positive number"),
  payee: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExpenseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

const CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SALARIES", label: "Salaries & Wages" },
  { value: "TRANSPORT", label: "Transport & Delivery" },
  { value: "MARKETING", label: "Marketing" },
  { value: "EQUIPMENT", label: "Equipment / Other" },
  { value: "OTHER", label: "Other" },
];

export function ExpenseFormModal({ open, onOpenChange, expense }: ExpenseFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!expense;

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts-flat"],
    queryFn: () => accountsApi.list({ limit: 500 } as any),
    enabled: open,
  });

  const paidFromAccounts = React.useMemo(
    () => accounts.filter((a) => PAID_FROM_SUBTYPES.includes(a.subtype ?? "")),
    [accounts],
  );

  const expenseAccounts = React.useMemo(
    () => accounts.filter((a) => a.type === "EXPENSE"),
    [accounts],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      category: "",
      expenseAccountId: "",
      paidFromAccountId: "",
      amount: "",
      payee: "",
      description: "",
    },
  });

  // Reset form when modal opens/closes or expense changes
  React.useEffect(() => {
    if (open) {
      if (expense) {
        form.reset({
          date: expense.expenseDate?.split("T")[0] ?? format(new Date(), "yyyy-MM-dd"),
          category: expense.category ?? "",
          expenseAccountId: "",
          paidFromAccountId: "",
          amount: String(expense.amountUsd ?? ""),
          payee: "",
          description: expense.description ?? "",
        });
      } else {
        form.reset({
          date: format(new Date(), "yyyy-MM-dd"),
          category: "",
          expenseAccountId: "",
          paidFromAccountId: "",
          amount: "",
          payee: "",
          description: "",
        });
      }
    }
  }, [open, expense]);

  // Auto-select expense account when category changes
  const watchedCategory = form.watch("category");
  React.useEffect(() => {
    if (!watchedCategory || expenseAccounts.length === 0) return;
    const targetSubtype = CATEGORY_SUBTYPE[watchedCategory];
    if (!targetSubtype) return;
    const match = expenseAccounts.find((a) => a.subtype === targetSubtype);
    if (match) form.setValue("expenseAccountId", match.id);
  }, [watchedCategory, expenseAccounts]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (isEdit && expense) {
        return expensesApi.update(expense.id, {
          description: values.description,
          payee: values.payee,
          category: values.category,
        } as any);
      }
      return expensesApi.create({
        date: values.date,
        expenseAccountId: values.expenseAccountId,
        paidFromAccountId: values.paidFromAccountId,
        amount: parseFloat(values.amount),
        category: values.category,
        payee: values.payee || undefined,
        description: values.description || undefined,
      } as any);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Expense updated" : "Expense recorded");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save expense"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEdit ? "Edit Expense" : "Record Expense"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">

              {/* Date + Category */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Amount + Payee */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USD) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} disabled={isEdit} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="payee" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid to / Payee</FormLabel>
                    <FormControl><Input placeholder="e.g. Landlord, ZESA" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Paid From */}
              <FormField control={form.control} name="paidFromAccountId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid From *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
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

              {/* Expense Account (auto-selected, manual override) */}
              {!isEdit && (
                <FormField control={form.control} name="expenseAccountId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Account *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Auto-selected from category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {expenseAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Description */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Description</FormLabel>
                  <FormControl><Textarea placeholder="Optional notes…" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="shrink-0 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Record expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
