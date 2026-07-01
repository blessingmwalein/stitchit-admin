"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { materialsApi, categoriesApi } from "@/lib/api/inventory";
import type { Material } from "@/lib/types/inventory";
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

const UOM_OPTIONS = [
  { value: "G",     label: "Gram (g)" },
  { value: "KG",    label: "Kilogram (kg)" },
  { value: "M",     label: "Metre (m)" },
  { value: "SQM",   label: "Square Metre (sqm)" },
  { value: "ROLL",  label: "Roll" },
  { value: "CONE",  label: "Cone" },
  { value: "LITRE", label: "Litre (L)" },
  { value: "PIECE", label: "Piece / Each" },
];

const schema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  categoryId: z.string().uuid("Category is required"),
  uom: z.string().min(1, "Unit of measure is required"),
  color: z.string().optional(),
  reorderLevel: z.string().optional(),
  reorderQty: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface MaterialFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
  onCreated?: (material: any) => void;
}

export function MaterialFormModal({ open, onOpenChange, material, onCreated }: MaterialFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!material;

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["material-categories"],
    queryFn: categoriesApi.list,
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: "",
      name: "",
      categoryId: "",
      uom: "KG",
      color: "",
      reorderLevel: "",
      reorderQty: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      if (material) {
        form.reset({
          sku: material.sku ?? "",
          name: material.name ?? "",
          categoryId: (material as any).categoryId ?? "",
          uom: material.uom ?? "KG",
          color: material.color ?? "",
          reorderLevel: material.reorderLevel != null ? String(material.reorderLevel) : "",
          reorderQty: (material as any).reorderQty != null ? String((material as any).reorderQty) : "",
        });
      } else {
        form.reset({ sku: "", name: "", categoryId: "", uom: "KG", color: "", reorderLevel: "", reorderQty: "" });
      }
    }
  }, [open, material]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: any = {
        sku: values.sku,
        name: values.name,
        categoryId: values.categoryId,
        uom: values.uom,
        color: values.color || undefined,
        reorderLevel: values.reorderLevel ? parseFloat(values.reorderLevel) : undefined,
        reorderQty: values.reorderQty ? parseFloat(values.reorderQty) : undefined,
      };
      if (isEdit && material) {
        return materialsApi.update(material.id, payload);
      }
      return materialsApi.create(payload);
    },
    onSuccess: (created) => {
      toast.success(isEdit ? "Material updated" : "Material created");
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["materials-all"] });
      if (!isEdit && onCreated) onCreated(created);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save material"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEdit ? "Edit Material" : "New Material"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">

              {/* SKU + Name */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl><Input placeholder="e.g. YARN-001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input placeholder="e.g. Acrylic Yarn 4-ply" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Category + UOM */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="categoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="uom" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measure *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {UOM_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Color */}
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color / Variant</FormLabel>
                  <FormControl><Input placeholder="e.g. Red, Natural, Mixed" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Reorder */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="reorderLevel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" placeholder="Min qty before alert" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reorderQty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Qty</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" placeholder="Qty to reorder" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <DialogFooter className="shrink-0 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create material"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
