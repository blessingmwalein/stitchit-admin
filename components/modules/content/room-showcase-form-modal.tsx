"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadDesignImage } from "@/lib/supabase";
import { roomShowcaseApi } from "@/lib/api/room-showcase";
import { ROOM_SHOWCASE_CATEGORIES, ROOM_SHOWCASE_CATEGORY_LABELS, type RoomShowcase } from "@/lib/types/room-showcase";
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
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Loader2 } from "lucide-react";

const MAX_IMAGE_MB = 5;

const schema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  description: z.string().optional(),
  category: z.string().optional(),
  isPublished: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface RoomShowcaseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: RoomShowcase | null;
}

export function RoomShowcaseFormModal({ open, onOpenChange, item }: RoomShowcaseFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", category: "", isPublished: true },
  });

  React.useEffect(() => {
    if (!open) return;
    if (item) {
      form.reset({
        title: item.title, description: item.description ?? "",
        category: item.category ?? "", isPublished: item.isPublished,
      });
      setImageUrl(item.imageUrl);
    } else {
      form.reset({ title: "", description: "", category: "", isPublished: true });
      setImageUrl(null);
    }
  }, [open, item]);

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return toast.error(`Images must be under ${MAX_IMAGE_MB}MB`);
    setUploading(true);
    try {
      const url = await uploadDesignImage(file, "room-showcase");
      setImageUrl(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!imageUrl) throw new Error("An image is required");
      const payload: any = {
        title: values.title,
        description: values.description || undefined,
        category: values.category || undefined,
        isPublished: values.isPublished,
        imageUrl,
      };
      return isEdit ? roomShowcaseApi.update(item!.id, payload) : roomShowcaseApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Updated" : "Created");
      qc.invalidateQueries({ queryKey: ["room-showcase"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEdit ? "Edit Room Showcase" : "New Room Showcase Item"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Image *</p>
                <input
                  ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
                />
                {imageUrl ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                    <img src={imageUrl} alt="" className="h-12 w-12 rounded object-cover border shrink-0" />
                    <p className="flex-1 text-xs text-muted-foreground truncate">{imageUrl.split("/").pop()}</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>Replace</Button>
                  </div>
                ) : (
                  <button
                    type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 w-full rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    Upload image
                  </button>
                )}
              </div>

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input placeholder="e.g. Living Rooms" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Short tagline shown on the homepage" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROOM_SHOWCASE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{ROOM_SHOWCASE_CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="isPublished" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <FormLabel className="!mt-0">Published on website</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>

            <DialogFooter className="shrink-0 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
