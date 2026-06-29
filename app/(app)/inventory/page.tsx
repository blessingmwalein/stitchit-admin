"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { materialsApi, stockApi } from "@/lib/api/inventory";
import type { Material } from "@/lib/types/inventory";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Search, AlertTriangle, Pencil, Trash2, ShoppingCart, PackageSearch } from "lucide-react";
import { MaterialFormModal } from "@/components/modules/inventory/material-form-modal";
import { MaterialPurchaseModal } from "@/components/modules/inventory/material-purchase-modal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE:   "Purchase",
  ISSUE:      "Issue",
  RETURN:     "Return",
  ADJUSTMENT: "Adjustment",
  WASTE:      "Waste",
  TRANSFER:   "Transfer",
};

// ── Material Drawer ───────────────────────────────────────────────────────────

function MaterialDrawer({
  materialId,
  open,
  onClose,
  onEdit,
}: {
  materialId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data: mat, isLoading } = useQuery({
    queryKey: ["material", materialId],
    queryFn: () => materialsApi.get(materialId!),
    enabled: open && !!materialId,
  });

  const { data: movementsResult } = useQuery({
    queryKey: ["stock-movements", materialId],
    queryFn: () => stockApi.movements({ materialId: materialId!, pageSize: 12 } as any),
    enabled: open && !!materialId,
  });
  const movements: any[] = (movementsResult as any)?.data ?? [];

  const m = mat as any;
  if (!m && !isLoading) return null;

  const category = typeof m?.category === "string" ? m.category : (m?.category as any)?.name ?? "—";
  const onHand = Number(m?.qtyOnHand ?? 0);
  const avgCost = Number(m?.avgCost ?? 0);
  const value = onHand * avgCost;
  const reorderLevel = Number(m?.reorderLevel ?? 0);
  const isLow = onHand <= reorderLevel && reorderLevel > 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="shrink-0 px-6 py-5 border-b">
          {isLoading ? (
            <SheetTitle className="text-muted-foreground">Loading…</SheetTitle>
          ) : m ? (
            <div className="flex items-start justify-between gap-2">
              <div>
                <SheetTitle className="text-lg">{m.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {m.color && <Badge variant="outline" className="text-xs">{m.color}</Badge>}
                  <Badge variant="outline" className="text-xs font-mono">{m.sku}</Badge>
                  {!m.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  {isLow && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />Low stock
                    </Badge>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" />Edit
              </Button>
            </div>
          ) : null}
        </SheetHeader>

        {m && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">

            {/* Material Info */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Material Info</h3>
              <div className="rounded-lg border bg-card divide-y">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="text-sm font-medium">{category}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Unit of Measure</span>
                  <span className="text-sm font-medium">{m.uom}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">SKU</span>
                  <span className="text-sm font-mono">{m.sku}</span>
                </div>
              </div>
            </section>

            {/* Stock Levels */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Stock Levels</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card px-4 py-3 text-center">
                  <p className={`text-2xl font-bold tabular-nums ${isLow ? "text-amber-600" : ""}`}>{onHand.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">On Hand ({m.uom})</p>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3 text-center">
                  <p className="text-2xl font-bold tabular-nums">${avgCost.toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Avg Cost / {m.uom}</p>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3 text-center">
                  <p className="text-2xl font-bold tabular-nums">${value.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Stock Value</p>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3 text-center">
                  <p className="text-2xl font-bold tabular-nums">{reorderLevel.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Reorder Level</p>
                </div>
              </div>
            </section>

            {/* Recent Movements */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Recent Movements</h3>
              {movements.length === 0 ? (
                <div className="rounded-lg border bg-card px-4 py-6 text-center">
                  <PackageSearch className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No movements yet</p>
                </div>
              ) : (
                <div className="rounded-lg border bg-card divide-y">
                  {movements.map((mv: any) => {
                    const isIn = Number(mv.qty) > 0;
                    return (
                      <div key={mv.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">
                            {MOVEMENT_TYPE_LABELS[mv.type] ?? mv.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {safeDate(mv.movementDate ?? mv.createdAt)}
                            {mv.note ? ` · ${mv.note}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold tabular-nums ${isIn ? "text-green-600" : "text-red-600"}`}>
                            {isIn ? "+" : ""}{Number(mv.qty).toFixed(3)} {m.uom}
                          </p>
                          {mv.unitCost && Number(mv.unitCost) > 0 && (
                            <p className="text-xs text-muted-foreground">${Number(mv.unitCost).toFixed(4)}/unit</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState<Material | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize, setPageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["materials", { search, page, pageSize }],
    queryFn: () => materialsApi.list({ search, page, pageSize } as any),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => materialsApi.remove(id),
    onSuccess: () => { toast.success("Material deleted"); qc.invalidateQueries({ queryKey: ["materials"] }); },
    onError: () => toast.error("Failed to delete material"),
  });

  const columns: ColumnDef<Material>[] = [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.sku}</span>,
    },
    {
      header: "Material",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.color && <p className="text-xs text-muted-foreground">{row.original.color}</p>}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const cat = row.original.category;
        const name = typeof cat === "string" ? cat : (cat as any)?.name ?? "—";
        return <span className="text-xs">{name}</span>;
      },
    },
    { accessorKey: "uom", header: "UOM" },
    {
      header: "On Hand",
      cell: ({ row }) => {
        const onHand = row.original.qtyOnHand ?? 0;
        const reorder = row.original.reorderLevel ?? 0;
        return (
          <div className="flex items-center gap-1">
            <span className="font-medium tabular-nums">{Number(onHand).toFixed(2)}</span>
            {onHand <= reorder && reorder > 0 && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "avgCost",
      header: "Avg Cost",
      cell: ({ row }) => <span className="tabular-nums text-sm">${Number(row.original.avgCost ?? 0).toFixed(4)}</span>,
    },
    {
      header: "Value",
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-medium">
          ${((row.original.qtyOnHand ?? 0) * Number(row.original.avgCost ?? 0)).toFixed(2)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setEditingMaterial(row.original); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this material? This cannot be undone.")) {
                deleteMut.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const total = (data as any)?.meta?.total ?? 0;
  const rows: Material[] = (data as any)?.data ?? [];

  return (
    <div className="flex flex-col">
      <PageHeader title="Inventory" description={`${total} materials`}>
        <Button size="sm" variant="outline" onClick={() => setShowBuy(true)}>
          <ShoppingCart className="mr-1 h-4 w-4" />Buy materials
        </Button>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />New material
        </Button>
      </PageHeader>

      <MaterialFormModal open={showCreate} onOpenChange={setShowCreate} />
      <MaterialFormModal
        open={!!editingMaterial}
        onOpenChange={(o) => { if (!o) setEditingMaterial(null); }}
        material={editingMaterial}
      />
      <MaterialPurchaseModal open={showBuy} onOpenChange={setShowBuy} />

      <MaterialDrawer
        materialId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onEdit={() => {
          const mat = rows.find((r) => r.id === selectedId);
          if (mat) { setEditingMaterial(mat); setSelectedId(null); }
        }}
      />

      <div className="flex items-center gap-2 border-b bg-card px-6 py-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search materials…"
            className="h-8 pl-8 text-sm"
          />
        </div>
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
        onRowClick={(r) => setSelectedId(r.id)}
      />
    </div>
  );
}
