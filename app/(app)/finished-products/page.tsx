"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { finishedProductsApi } from "@/lib/api/finished-products";
import type { FinishedProduct } from "@/lib/types/finished-products";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FinishedProductFormModal } from "@/components/modules/production/finished-product-form-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Star, Package, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

function safeDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
}

function FinishedProductMobileCard({ product, onClick, onPublishToggle, onFeatureToggle, onEdit, onDelete }: {
  product: FinishedProduct;
  onClick: () => void;
  onPublishToggle: () => void;
  onFeatureToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = product.customer;
  const clientName = c ? (c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ")) : null;
  return (
    <div onClick={onClick} className="rounded-xl border bg-card p-3.5 space-y-2.5">
      <div className="flex items-start gap-3">
        {product.primaryImageUrl ? (
          <img src={product.primaryImageUrl} alt="" className="h-14 w-14 rounded-lg object-cover border shrink-0" />
        ) : (
          <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{product.productNumber}</p>
          {clientName && <p className="text-xs text-muted-foreground truncate">{clientName}</p>}
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); onFeatureToggle(); }}>
          <Star className={cn("h-4 w-4", product.isFeatured ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
        </Button>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {product.widthCm && product.heightCm ? `${product.widthCm} × ${product.heightCm} cm` : "Custom size"}
        </span>
        {product.price != null && <span className="font-medium">${Number(product.price).toFixed(2)}</span>}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={product.status} />
        {product.publishedAt ? (
          <Badge variant="outline" className="border-transparent bg-green-100 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Published</Badge>
        ) : (
          <Badge variant="outline" className="border-transparent bg-slate-100 text-slate-600 text-xs"><Circle className="h-3 w-3 mr-1" />Draft</Badge>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" onClick={onPublishToggle}>
          {product.publishedAt ? "Unpublish" : "Publish"}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function FinishedProductsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<FinishedProduct | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [isPublished, setIsPublished] = useQueryState("published", { defaultValue: "" });
  const [isFeatured, setIsFeatured] = useQueryState("featured", { defaultValue: "" });
  const [shape, setShape] = useQueryState("shape", { defaultValue: "" });
  const [status, setStatus] = useQueryState("status", { defaultValue: "" });
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize, setPageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["finished-products", { search, isPublished, isFeatured, shape, status, page, pageSize }],
    queryFn: () => finishedProductsApi.list({
      search: search || undefined,
      isPublished: isPublished || undefined,
      isFeatured: isFeatured || undefined,
      shape: shape || undefined,
      status: status || undefined,
      page, pageSize,
    } as any),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => finishedProductsApi.remove(id),
    onSuccess: () => { toast.success("Finished product deleted"); qc.invalidateQueries({ queryKey: ["finished-products"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const publishMut = useMutation({
    mutationFn: (p: FinishedProduct) => (p.publishedAt ? finishedProductsApi.unpublish(p.id) : finishedProductsApi.publish(p.id)),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["finished-products"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const featureMut = useMutation({
    mutationFn: (p: FinishedProduct) => (p.isFeatured ? finishedProductsApi.unfeature(p.id) : finishedProductsApi.feature(p.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finished-products"] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const columns: ColumnDef<FinishedProduct>[] = [
    {
      header: "Product",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3">
            {p.primaryImageUrl ? (
              <img src={p.primaryImageUrl} alt="" className="h-10 w-10 rounded-md object-cover border shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{p.productNumber}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Client",
      cell: ({ row }) => {
        const c = row.original.customer;
        const name = c ? (c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ")) : null;
        return <span className="text-sm">{name || "—"}</span>;
      },
    },
    {
      header: "Order",
      cell: ({ row }) => row.original.order
        ? <span className="text-xs font-mono">{row.original.order.orderNumber}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      header: "Size",
      cell: ({ row }) => {
        const p = row.original;
        return p.widthCm && p.heightCm ? <span className="text-sm">{p.widthCm} × {p.heightCm} cm</span> : <span className="text-muted-foreground text-sm">Custom</span>;
      },
    },
    {
      header: "Shape",
      cell: ({ row }) => row.original.shape
        ? <span className="text-xs capitalize">{row.original.shape.toLowerCase()}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      header: "Price",
      cell: ({ row }) => row.original.price != null
        ? <span className="text-sm tabular-nums">${Number(row.original.price).toFixed(2)}</span>
        : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      header: "Published",
      cell: ({ row }) => row.original.publishedAt
        ? <Badge variant="outline" className="border-transparent bg-green-100 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Published</Badge>
        : <Badge variant="outline" className="border-transparent bg-slate-100 text-slate-600 text-xs"><Circle className="h-3 w-3 mr-1" />Draft</Badge>,
    },
    {
      header: "Featured",
      cell: ({ row }) => (
        <Button
          size="icon" variant="ghost" className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); featureMut.mutate(row.original); }}
          title={row.original.isFeatured ? "Remove from featured" : "Feature on homepage"}
        >
          <Star className={cn("h-4 w-4", row.original.isFeatured ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
        </Button>
      ),
    },
    {
      header: "Created",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{safeDate(row.original.createdAt)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); publishMut.mutate(row.original); }}
          >
            {row.original.publishedAt ? "Unpublish" : "Publish"}
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setEditingProduct(row.original); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); setDeletingId(row.original.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const total = (data as any)?.meta?.total ?? 0;
  const rows: FinishedProduct[] = (data as any)?.data ?? [];

  return (
    <div className="flex flex-col">
      <PageHeader title="Finished Products" description={`${total} products · showcased on the public website`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />New Finished Product
        </Button>
      </PageHeader>

      <FinishedProductFormModal open={showCreate} onOpenChange={setShowCreate} />
      <FinishedProductFormModal
        open={!!editingProduct}
        onOpenChange={(o) => { if (!o) setEditingProduct(null); }}
        product={editingProduct}
      />
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="Delete finished product?"
        description="This removes it from the public website. This cannot be undone."
        destructive
        confirmLabel="Delete"
        onConfirm={() => { if (deletingId) deleteMut.mutate(deletingId); setDeletingId(null); }}
      />

      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-6 py-3">
        <div className="relative max-w-xs flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products…"
            className="h-8 pl-8 text-sm"
          />
        </div>

        <Select value={isPublished || "ALL"} onValueChange={(v) => { setIsPublished(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Published" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="true">Published</SelectItem>
            <SelectItem value="false">Draft</SelectItem>
          </SelectContent>
        </Select>

        <Select value={isFeatured || "ALL"} onValueChange={(v) => { setIsFeatured(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Featured" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="true">Featured</SelectItem>
          </SelectContent>
        </Select>

        <Select value={shape || "ALL"} onValueChange={(v) => { setShape(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Shape" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All shapes</SelectItem>
            {["RECTANGLE", "SQUARE", "CIRCLE", "OVAL", "RUNNER", "IRREGULAR", "CUSTOM"].map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || "ALL"} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="RESERVED">Reserved</SelectItem>
            <SelectItem value="SOLD">Sold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading}
        onRowClick={(r) => setEditingProduct(r)}
        mobileCard={(r) => (
          <FinishedProductMobileCard
            product={r}
            onClick={() => setEditingProduct(r)}
            onPublishToggle={() => publishMut.mutate(r)}
            onFeatureToggle={() => featureMut.mutate(r)}
            onEdit={() => setEditingProduct(r)}
            onDelete={() => setDeletingId(r.id)}
          />
        )}
      />
    </div>
  );
}
