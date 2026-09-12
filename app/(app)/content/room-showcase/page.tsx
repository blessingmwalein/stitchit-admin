"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { roomShowcaseApi } from "@/lib/api/room-showcase";
import { ROOM_SHOWCASE_CATEGORY_LABELS, type RoomShowcase } from "@/lib/types/room-showcase";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RoomShowcaseFormModal } from "@/components/modules/content/room-showcase-form-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";

export default function RoomShowcasePage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<RoomShowcase | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["room-showcase"],
    queryFn: () => roomShowcaseApi.list({ pageSize: 100 } as any),
  });
  const rows: RoomShowcase[] = ((data as any)?.data ?? []).slice().sort((a: RoomShowcase, b: RoomShowcase) => a.displayOrder - b.displayOrder);

  const deleteMut = useMutation({
    mutationFn: (id: string) => roomShowcaseApi.remove(id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["room-showcase"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const publishMut = useMutation({
    mutationFn: (item: RoomShowcase) => roomShowcaseApi.update(item.id, { isPublished: !item.isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room-showcase"] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => roomShowcaseApi.reorder(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room-showcase"] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed to reorder"),
  });

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= rows.length) return;
    const next = rows.map((r) => r.id);
    [next[idx], next[target]] = [next[target], next[idx]];
    reorderMut.mutate(next);
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Room Showcase" description={'Manages the homepage "Perfect for Every Room" section'}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />New Item
        </Button>
      </PageHeader>

      <RoomShowcaseFormModal open={showCreate} onOpenChange={setShowCreate} />
      <RoomShowcaseFormModal
        open={!!editingItem}
        onOpenChange={(o) => { if (!o) setEditingItem(null); }}
        item={editingItem}
      />
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="Delete this item?"
        description="This removes it from the public website. This cannot be undone."
        destructive
        confirmLabel="Delete"
        onConfirm={() => { if (deletingId) deleteMut.mutate(deletingId); setDeletingId(null); }}
      />

      <div className="p-6 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No room showcase items yet — add one to populate the homepage section.
          </div>
        ) : (
          rows.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl border bg-card">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover border shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{item.title}</p>
                  {item.category && (
                    <Badge variant="outline" className="text-xs">{ROOM_SHOWCASE_CATEGORY_LABELS[item.category] ?? item.category}</Badge>
                  )}
                </div>
                {item.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" disabled={idx === 0} onClick={() => move(idx, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" disabled={idx === rows.length - 1} onClick={() => move(idx, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 shrink-0 pl-2 border-l">
                <Switch checked={item.isPublished} onCheckedChange={() => publishMut.mutate(item)} />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingItem(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeletingId(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
