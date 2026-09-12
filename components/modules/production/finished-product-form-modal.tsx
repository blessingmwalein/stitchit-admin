"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadDesignImage, deleteDesignImage } from "@/lib/supabase";
import { finishedProductsApi } from "@/lib/api/finished-products";
import { customersApi } from "@/lib/api/crm";
import type { FinishedProduct } from "@/lib/types/finished-products";
import type { RugShape } from "@/lib/types/sales";
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
import { ImagePlus, X, ArrowUp, ArrowDown, Loader2, Video } from "lucide-react";

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 50;

const SHAPES: { value: RugShape; label: string }[] = [
  { value: "RECTANGLE", label: "Rectangle" },
  { value: "SQUARE", label: "Square" },
  { value: "CIRCLE", label: "Circle" },
  { value: "OVAL", label: "Oval" },
  { value: "RUNNER", label: "Runner" },
  { value: "IRREGULAR", label: "Irregular" },
  { value: "CUSTOM", label: "Custom" },
];

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  widthCm: z.string().optional(),
  heightCm: z.string().optional(),
  shape: z.string().optional(),
  price: z.string().optional(),
  completedAt: z.string().optional(),
  customerId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function blank(): FormValues {
  return {
    name: "", description: "", widthCm: "", heightCm: "", shape: "",
    price: "", completedAt: "", customerId: "", notes: "",
  };
}

interface FinishedProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: FinishedProduct | null;
}

export function FinishedProductFormModal({ open, onOpenChange, product }: FinishedProductFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!product;

  const [primaryImageUrl, setPrimaryImageUrl] = React.useState<string | null>(null);
  const [images, setImages] = React.useState<string[]>([]);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [uploadingPrimary, setUploadingPrimary] = React.useState(false);
  const [uploadingGallery, setUploadingGallery] = React.useState(false);
  const [uploadingVideo, setUploadingVideo] = React.useState(false);

  const primaryInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const { data: customersResult } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => customersApi.list({ limit: 500 } as any),
    enabled: open,
  });
  const customers: any[] = (customersResult as any)?.data ?? [];

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: blank() });

  React.useEffect(() => {
    if (!open) return;
    if (product) {
      form.reset({
        name: product.name ?? "",
        description: product.description ?? "",
        widthCm: product.widthCm != null ? String(product.widthCm) : "",
        heightCm: product.heightCm != null ? String(product.heightCm) : "",
        shape: product.shape ?? "",
        price: product.price != null ? String(product.price) : "",
        completedAt: product.completedAt ? product.completedAt.slice(0, 10) : "",
        customerId: product.customerId ?? "",
        notes: product.notes ?? "",
      });
      setPrimaryImageUrl(product.primaryImageUrl ?? null);
      setImages(product.images ?? []);
      setVideoUrl(product.videoUrl ?? null);
    } else {
      form.reset(blank());
      setPrimaryImageUrl(null);
      setImages([]);
      setVideoUrl(null);
    }
  }, [open, product]);

  function validateFile(file: File, kind: "image" | "video"): string | null {
    if (kind === "image") {
      if (!file.type.startsWith("image/")) return "Please choose an image file";
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `Images must be under ${MAX_IMAGE_MB}MB`;
    } else {
      if (!file.type.startsWith("video/")) return "Please choose a video file";
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) return `Videos must be under ${MAX_VIDEO_MB}MB`;
    }
    return null;
  }

  async function handlePrimaryUpload(file: File) {
    const err = validateFile(file, "image");
    if (err) return toast.error(err);
    setUploadingPrimary(true);
    try {
      const url = await uploadDesignImage(file, "finished-products");
      setPrimaryImageUrl(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploadingPrimary(false);
    }
  }

  async function handleGalleryUpload(files: FileList) {
    for (const file of Array.from(files)) {
      const err = validateFile(file, "image");
      if (err) { toast.error(err); continue; }
      setUploadingGallery(true);
      try {
        const url = await uploadDesignImage(file, "finished-products");
        setImages((prev) => [...prev, url]);
      } catch (e: any) {
        toast.error(e?.message ?? "Upload failed");
      } finally {
        setUploadingGallery(false);
      }
    }
  }

  async function handleVideoUpload(file: File) {
    const err = validateFile(file, "video");
    if (err) return toast.error(err);
    setUploadingVideo(true);
    try {
      const url = await uploadDesignImage(file, "finished-products");
      setVideoUrl(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploadingVideo(false);
    }
  }

  function moveImage(idx: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const url = prev[idx];
      deleteDesignImage(url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: any = {
        name: values.name,
        description: values.description || undefined,
        widthCm: values.widthCm ? parseFloat(values.widthCm) : undefined,
        heightCm: values.heightCm ? parseFloat(values.heightCm) : undefined,
        shape: values.shape || undefined,
        price: values.price ? parseFloat(values.price) : undefined,
        completedAt: values.completedAt ? new Date(values.completedAt).toISOString() : undefined,
        customerId: values.customerId || undefined,
        notes: values.notes || undefined,
        primaryImageUrl: primaryImageUrl || undefined,
        images,
        videoUrl: videoUrl || undefined,
      };
      return isEdit ? finishedProductsApi.update(product!.id, payload) : finishedProductsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Finished product updated" : "Finished product created");
      qc.invalidateQueries({ queryKey: ["finished-products"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save finished product"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl overflow-hidden flex flex-col p-0 max-h-[90vh]">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEdit ? "Edit Finished Product" : "New Finished Product"}</DialogTitle>
          {!isEdit && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Leave client blank for a standalone showcase piece not tied to a specific order.
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Heather Diamond Rug" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Shown on the public gallery" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="widthCm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (cm)</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="heightCm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="shape" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shape</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {SHAPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (USD)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Optional" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="completedAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    value={field.value || "__none__"}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="No client — standalone piece" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No client — standalone piece</SelectItem>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal notes</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Separator />

              {/* Media */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Media</p>

                {/* Primary image */}
                <div>
                  <p className="text-xs font-medium mb-1.5 text-muted-foreground">Primary Image *</p>
                  <input
                    ref={primaryInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePrimaryUpload(f); e.target.value = ""; }}
                  />
                  {primaryImageUrl ? (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                      <img src={primaryImageUrl} alt="Primary" className="h-12 w-12 rounded object-cover border shrink-0" />
                      <p className="flex-1 text-xs text-muted-foreground truncate">{primaryImageUrl.split("/").pop()}</p>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => primaryInputRef.current?.click()}>
                        <ImagePlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setPrimaryImageUrl(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => primaryInputRef.current?.click()}
                      disabled={uploadingPrimary}
                      className="flex items-center gap-2 w-full rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {uploadingPrimary ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      Upload primary image (required to publish)
                    </button>
                  )}
                </div>

                {/* Gallery */}
                <div>
                  <p className="text-xs font-medium mb-1.5 text-muted-foreground">Gallery Images</p>
                  <input
                    ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { if (e.target.files?.length) handleGalleryUpload(e.target.files); e.target.value = ""; }}
                  />
                  <div className="space-y-1.5">
                    {images.map((url, idx) => (
                      <div key={url} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
                        <img src={url} alt="" className="h-9 w-9 rounded object-cover border shrink-0" />
                        <p className="flex-1 text-xs text-muted-foreground truncate">{url.split("/").pop()}</p>
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" disabled={idx === 0} onClick={() => moveImage(idx, -1)}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" disabled={idx === images.length - 1} onClick={() => moveImage(idx, 1)}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeImage(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingGallery}
                    className="mt-1.5 flex items-center gap-2 w-full rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {uploadingGallery ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    Add gallery image(s)
                  </button>
                </div>

                {/* Video */}
                <div>
                  <p className="text-xs font-medium mb-1.5 text-muted-foreground">Video (optional)</p>
                  <input
                    ref={videoInputRef} type="file" accept="video/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ""; }}
                  />
                  {videoUrl ? (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                      <Video className="h-8 w-8 text-muted-foreground shrink-0" />
                      <p className="flex-1 text-xs text-muted-foreground truncate">{videoUrl.split("/").pop()}</p>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setVideoUrl(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="flex items-center gap-2 w-full rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                      Upload video (max {MAX_VIDEO_MB}MB)
                    </button>
                  )}
                </div>
              </div>
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
