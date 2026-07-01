"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ordersApi } from "@/lib/api/sales";
import { customersApi } from "@/lib/api/crm";
import type { Order, OrderPriority, RugShape, Complexity } from "@/lib/types/sales";
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
import { Trash2, Plus, ImagePlus, X, ExternalLink, Loader2, UserPlus, ChevronDown } from "lucide-react";
import { uploadDesignImage } from "@/lib/supabase";

const SHAPES: { value: RugShape; label: string }[] = [
  { value: "RECTANGLE", label: "Rectangle" },
  { value: "CIRCLE", label: "Circle" },
  { value: "OVAL", label: "Oval" },
  { value: "RUNNER", label: "Runner" },
  { value: "CUSTOM", label: "Custom" },
];

const COMPLEXITY_OPTS: { value: Complexity; label: string }[] = [
  { value: "SIMPLE", label: "Simple" },
  { value: "MEDIUM", label: "Medium" },
  { value: "COMPLEX", label: "Complex" },
  { value: "VERY_COMPLEX", label: "Very Complex" },
];

const PRIORITIES: { value: OrderPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const itemSchema = z.object({
  rugName: z.string().min(1, "Rug name required"),
  description: z.string().optional(),
  widthCm: z.string().min(1, "Required"),
  heightCm: z.string().min(1, "Required"),
  shape: z.enum(["RECTANGLE", "CIRCLE", "OVAL", "RUNNER", "CUSTOM"]).optional(),
  complexity: z.enum(["SIMPLE", "MEDIUM", "COMPLEX", "VERY_COMPLEX"]).optional(),
  colors: z.string().optional(),
  quantity: z.string().default("1"),
  unitPrice: z.string().min(1, "Required"),
  designFileUrl: z.string().optional(),
});

const schema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  orderDate: z.string().optional(),
  promisedDate: z.string().optional(),
  depositRequired: z.string().default("0"),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item required"),
});

type FormValues = z.infer<typeof schema>;

const BLANK_ITEM: FormValues["items"][number] = {
  rugName: "",
  description: "",
  widthCm: "",
  heightCm: "",
  shape: "RECTANGLE",
  complexity: "MEDIUM",
  colors: "",
  quantity: "1",
  unitPrice: "",
  designFileUrl: "",
};

interface OrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order;
}

const quickCustomerSchema = z.object({
  type: z.enum(["INDIVIDUAL", "CORPORATE"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
}).superRefine((v, ctx) => {
  if (v.type === "INDIVIDUAL" && !v.firstName) {
    ctx.addIssue({ code: "custom", path: ["firstName"], message: "First name required" });
  }
  if (v.type === "CORPORATE" && !v.companyName) {
    ctx.addIssue({ code: "custom", path: ["companyName"], message: "Company name required" });
  }
});
type QuickCustomerValues = z.infer<typeof quickCustomerSchema>;

export function OrderFormModal({ open, onOpenChange, order }: OrderFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!order;
  const [uploading, setUploading] = React.useState<Record<number, boolean>>({});
  const [showQuickCreate, setShowQuickCreate] = React.useState(false);
  const fileInputRefs = React.useRef<Record<number, HTMLInputElement | null>>({});

  const { data: customersData } = useQuery({
    queryKey: ["customers-dropdown"],
    queryFn: () => customersApi.list({ pageSize: 200 }),
    enabled: open,
  });

  const buildDefaults = (): FormValues => ({
    customerId: order?.customerId ?? "",
    priority: (order?.priority as OrderPriority) ?? "NORMAL",
    orderDate: "",
    promisedDate: order?.promisedDate ? order.promisedDate.substring(0, 10) : "",
    depositRequired: order ? String(order.depositRequired) : "0",
    deliveryAddress: "",
    notes: order?.notes ?? "",
    items: order?.items?.length
      ? order.items.map((i) => ({
          rugName: i.rugName ?? "",
          description: i.description ?? "",
          widthCm: String(i.widthCm),
          heightCm: String(i.heightCm),
          shape: (i.shape as RugShape) ?? "RECTANGLE",
          complexity: (i.complexity as Complexity) ?? "MODERATE",
          colors: i.colors?.join(", ") ?? "",
          quantity: String(i.quantity ?? 1),
          unitPrice: String(i.unitPrice),
          designFileUrl: (i as any).designFileUrl ?? "",
        }))
      : [{ ...BLANK_ITEM }],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  React.useEffect(() => {
    if (open) {
      form.reset(buildDefaults());
      setShowQuickCreate(false);
      quickForm.reset({ type: "INDIVIDUAL", firstName: "", lastName: "", companyName: "", phone: "", email: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  const quickForm = useForm<QuickCustomerValues>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: { type: "INDIVIDUAL", firstName: "", lastName: "", companyName: "", phone: "", email: "" },
  });

  const quickType = quickForm.watch("type");

  const quickCreateMutation = useMutation({
    mutationFn: (values: QuickCustomerValues) =>
      customersApi.create({
        type: values.type,
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
        companyName: values.companyName || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
      } as any),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ["customers-dropdown"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      form.setValue("customerId", created.id, { shouldValidate: true });
      setShowQuickCreate(false);
      quickForm.reset({ type: "INDIVIDUAL", firstName: "", lastName: "", companyName: "", phone: "", email: "" });
      const name = created.type === "CORPORATE"
        ? created.companyName
        : [created.firstName, created.lastName].filter(Boolean).join(" ");
      toast.success(`Customer "${name}" created and selected`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create customer"),
  });

  const watchedItems = form.watch("items");

  async function handleDesignUpload(idx: number, file: File) {
    setUploading((prev) => ({ ...prev, [idx]: true }));
    try {
      const url = await uploadDesignImage(file);
      form.setValue(`items.${idx}.designFileUrl`, url, { shouldDirty: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Image upload failed — check that the 'orders' bucket exists in Supabase");
    } finally {
      setUploading((prev) => ({ ...prev, [idx]: false }));
    }
  }

  const subtotal = watchedItems.reduce(
    (acc, item) => acc + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
    0,
  );

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        customerId: values.customerId,
        priority: values.priority,
        createdAt: values.orderDate || undefined,
        promisedDate: values.promisedDate || undefined,
        depositRequired: parseFloat(values.depositRequired) || 0,
        deliveryAddress: values.deliveryAddress || undefined,
        notes: values.notes || undefined,
        items: values.items.map((item, idx) => ({
          lineNo: idx + 1,
          rugName: item.rugName,
          description: item.description || undefined,
          widthCm: parseFloat(item.widthCm),
          heightCm: parseFloat(item.heightCm),
          shape: item.shape,
          complexity: item.complexity,
          colors: item.colors ? item.colors.split(",").map((c) => c.trim()).filter(Boolean) : undefined,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice),
          designFileUrl: item.designFileUrl || undefined,
        })),
      };
      return isEdit ? ordersApi.update(order!.id, payload as any) : ordersApi.create(payload as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["order", order!.id] });
      toast.success(isEdit ? "Order updated" : "Order created");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const customers = customersData?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>{isEdit ? "Edit Order" : "New Order"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
          <Form {...form}>
            <form id="order-form" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5">

              {/* Customer */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Customer <span className="text-destructive">*</span></FormLabel>
                      <button
                        type="button"
                        onClick={() => setShowQuickCreate((v) => !v)}
                        className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        {showQuickCreate ? (
                          <><ChevronDown className="h-3 w-3" />Cancel</>
                        ) : (
                          <><UserPlus className="h-3 w-3" />New customer</>
                        )}
                      </button>
                    </div>
                    <Select onValueChange={field.onChange} value={field.value} disabled={showQuickCreate}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select customer…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

              {/* Quick create customer inline panel */}
              {showQuickCreate && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">New Customer</p>

                  {/* Type toggle */}
                  <div className="flex gap-2">
                    {(["INDIVIDUAL", "CORPORATE"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => quickForm.setValue("type", t)}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                          quickType === t
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-border bg-background text-muted-foreground hover:border-orange-300"
                        }`}
                      >
                        {t === "INDIVIDUAL" ? "Individual" : "Company"}
                      </button>
                    ))}
                  </div>

                  {quickType === "INDIVIDUAL" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">First Name *</label>
                        <Input
                          placeholder="First name"
                          {...quickForm.register("firstName")}
                          className="h-8 text-sm"
                        />
                        {quickForm.formState.errors.firstName && (
                          <p className="text-xs text-destructive mt-1">{quickForm.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Last Name</label>
                        <Input placeholder="Last name" {...quickForm.register("lastName")} className="h-8 text-sm" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-medium mb-1 block">Company Name *</label>
                      <Input
                        placeholder="Company name"
                        {...quickForm.register("companyName")}
                        className="h-8 text-sm"
                      />
                      {quickForm.formState.errors.companyName && (
                        <p className="text-xs text-destructive mt-1">{quickForm.formState.errors.companyName.message}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Phone</label>
                      <Input placeholder="+263…" {...quickForm.register("phone")} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Email</label>
                      <Input type="email" placeholder="email@example.com" {...quickForm.register("email")} className="h-8 text-sm" />
                      {quickForm.formState.errors.email && (
                        <p className="text-xs text-destructive mt-1">{quickForm.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setShowQuickCreate(false); quickForm.reset(); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={quickCreateMutation.isPending}
                      onClick={quickForm.handleSubmit((v) => quickCreateMutation.mutate(v))}
                    >
                      {quickCreateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Create & Select
                    </Button>
                  </div>
                </div>
              )}

              {/* Priority + Order Date + Promised Date + Deposit */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orderDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Order Date
                        <span className="ml-1 text-[10px] text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <p className="text-[10px] text-muted-foreground">Leave blank to use today</p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="promisedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promised Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depositRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Required ($)</FormLabel>
                      <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Address</FormLabel>
                    <FormControl><Input placeholder="Optional delivery address" {...field} /></FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              {/* Line items */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rug Items</p>
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

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <FormField control={form.control} name={`items.${index}.rugName`} render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-xs">Rug Name *</FormLabel>
                            <FormControl><Input placeholder="e.g. Custom Bedroom Rug" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty</FormLabel>
                            <FormControl><Input type="number" min="1" placeholder="1" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <FormField control={form.control} name={`items.${index}.widthCm`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Width (cm) *</FormLabel>
                            <FormControl><Input type="number" min="1" step="0.1" placeholder="150" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.heightCm`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Height (cm) *</FormLabel>
                            <FormControl><Input type="number" min="1" step="0.1" placeholder="200" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.shape`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Shape</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {COMPLEXITY_OPTS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name={`items.${index}.colors`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Colors (comma-separated)</FormLabel>
                            <FormControl><Input placeholder="Ivory, Rust, Sage" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Unit Price (USD) *</FormLabel>
                            <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* Design image upload */}
                      <div>
                        <p className="text-xs font-medium mb-1.5">Design Image</p>
                        <input
                          ref={(el) => { fileInputRefs.current[index] = el; }}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDesignUpload(index, file);
                            e.target.value = "";
                          }}
                        />
                        {watchedItems[index]?.designFileUrl ? (
                          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                            <img
                              src={watchedItems[index].designFileUrl}
                              alt="Design"
                              className="h-10 w-10 rounded object-cover border shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate text-foreground">Design uploaded</p>
                              <p className="text-xs text-muted-foreground truncate">{watchedItems[index].designFileUrl?.split("/").pop()}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button" size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => window.open(watchedItems[index].designFileUrl, "_blank")}
                                title="View full size"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button" size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => fileInputRefs.current[index]?.click()}
                                title="Replace image"
                              >
                                <ImagePlus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => form.setValue(`items.${index}.designFileUrl`, "", { shouldDirty: true })}
                                title="Remove image"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50"
                            onClick={() => fileInputRefs.current[index]?.click()}
                            disabled={uploading[index]}
                          >
                            {uploading[index] ? (
                              <><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading…</span></>
                            ) : (
                              <><ImagePlus className="h-4 w-4" /><span>Upload design image or PDF</span></>
                            )}
                          </button>
                        )}
                      </div>

                      <p className="text-right text-xs text-muted-foreground">
                        Line total: <span className="font-medium text-foreground">
                          ${((parseFloat(watchedItems[index]?.quantity || "0") || 0) *
                            (parseFloat(watchedItems[index]?.unitPrice || "0") || 0)).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Total summary */}
              <div className="flex justify-end">
                <div className="rounded-lg bg-muted/50 p-3 text-sm w-48">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Special instructions, delivery details…" className="min-h-[80px] resize-y" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

            </form>
          </Form>
        </div>

        <div className="border-t px-6 py-4 shrink-0">
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="order-form" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Order"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
