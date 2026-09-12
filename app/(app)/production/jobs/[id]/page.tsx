"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { productionApi } from "@/lib/api/production";
import { stageLabel, type ProductionJob, type ProductionJobStage } from "@/lib/types/production";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { MaterialAllocationModal } from "@/components/modules/production/material-allocation-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, Circle, Clock, PlayCircle, Boxes, PackageCheck } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [completingStage, setCompletingStage] = React.useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = React.useState("");
  const [completeMinutes, setCompleteMinutes] = React.useState("");
  const [allocationsOpen, setAllocationsOpen] = React.useState(false);
  const [finalizeOpen, setFinalizeOpen] = React.useState(false);
  const [finalWidth, setFinalWidth] = React.useState("");
  const [finalHeight, setFinalHeight] = React.useState("");
  const [finalNotes, setFinalNotes] = React.useState("");

  const { data: job, isLoading } = useQuery({
    queryKey: ["production-job", id],
    queryFn: () => productionApi.get(id),
  });

  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: ["job-allocations", id],
    queryFn: () => productionApi.allocations(id),
  });

  const startMut = useMutation({
    mutationFn: (stageId: string) => productionApi.startStage(id, stageId),
    onSuccess: () => { toast.success("Stage started"); qc.invalidateQueries({ queryKey: ["production-job", id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to start stage"),
  });

  const completeMut = useMutation({
    mutationFn: (vars: { stageId: string; notes?: string; timeSpentMinutes?: number }) =>
      productionApi.completeStage(id, vars.stageId, { notes: vars.notes, timeSpentMinutes: vars.timeSpentMinutes }),
    onSuccess: () => {
      toast.success("Stage completed");
      qc.invalidateQueries({ queryKey: ["production-job", id] });
      setCompletingStage(null);
      setCompleteNotes("");
      setCompleteMinutes("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to complete stage"),
  });

  const finalizeMut = useMutation({
    mutationFn: () =>
      productionApi.finalize(id, {
        actualWidthCm: finalWidth ? Number(finalWidth) : undefined,
        actualHeightCm: finalHeight ? Number(finalHeight) : undefined,
        finalNotes: finalNotes || undefined,
      }),
    onSuccess: (result) => {
      toast.success("Finished product created");
      setFinalizeOpen(false);
      router.push(`/finished-products?highlight=${result.finishedProduct.id}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to finalize job"),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!job) return <div className="p-6 text-sm text-red-600">Job not found</div>;

  const stages: any[] = job.stages ?? [];
  const completedCount = stages.filter((s: any) => s.status === "COMPLETED").length;
  const progress = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;
  const canFinalize = job.status === "COMPLETED";

  return (
    <div className="flex flex-col gap-4 pb-8">
      <MaterialAllocationModal open={allocationsOpen} onOpenChange={setAllocationsOpen} jobId={id} />

      <Dialog open={!!completingStage} onOpenChange={(o) => !o && setCompletingStage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Complete Stage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Time spent (minutes)</Label>
              <Input
                type="number" min="0" placeholder="Auto-calculated if left blank"
                value={completeMinutes} onChange={(e) => setCompleteMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3} placeholder="Optional notes for this stage…"
                value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingStage(null)}>Cancel</Button>
            <Button
              disabled={completeMut.isPending}
              onClick={() => completingStage && completeMut.mutate({
                stageId: completingStage,
                notes: completeNotes || undefined,
                timeSpentMinutes: completeMinutes ? Number(completeMinutes) : undefined,
              })}
            >
              {completeMut.isPending ? "Completing…" : "Complete Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalize &amp; Create Finished Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Capture the actual finished dimensions if they differ from the order — this creates a draft
            Finished Product you can add media to and publish afterward.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Actual width (cm)</Label>
              <Input type="number" placeholder={String(job.widthCm)} value={finalWidth} onChange={(e) => setFinalWidth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Actual height (cm)</Label>
              <Input type="number" placeholder={String(job.heightCm)} value={finalHeight} onChange={(e) => setFinalHeight(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Final notes</Label>
            <Textarea rows={3} value={finalNotes} onChange={(e) => setFinalNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeOpen(false)}>Cancel</Button>
            <Button disabled={finalizeMut.isPending} onClick={() => finalizeMut.mutate()}>
              {finalizeMut.isPending ? "Finalizing…" : "Finalize"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeader title={job.jobNumber} description={job.rugName}>
        {canFinalize && (
          <Button size="sm" onClick={() => setFinalizeOpen(true)}>
            <PackageCheck className="mr-1.5 h-4 w-4" />Finalize &amp; Create Finished Product
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />Back
        </Button>
      </PageHeader>

      <div className="px-6 grid grid-cols-4 gap-3">
        <KpiCard title="Progress" value={`${progress}%`} />
        <KpiCard title="Current stage" value={job.currentStage ? stageLabel(job.currentStage) : "—"} />
        <KpiCard title="Size" value={`${job.widthCm} × ${job.heightCm} cm`} />
        <KpiCard title={job.isDelayed ? "Status" : "Customer"} value={job.isDelayed ? "⚠ Delayed" : job.customerName} />
      </div>

      <div className="px-6">
        <Progress value={progress} className="h-2 mb-6" />

        <div className="space-y-2">
          {stages.map((stage: any) => (
            <StageRow
              key={stage.id}
              stage={stage}
              onStart={() => startMut.mutate(stage.id)}
              onComplete={() => setCompletingStage(stage.id)}
              mutating={startMut.isPending}
            />
          ))}
        </div>
      </div>

      <div className="px-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="h-4 w-4 text-muted-foreground" />Materials Used
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAllocationsOpen(true)}>
              + Record material
            </Button>
          </CardHeader>
          <CardContent>
            {allocations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No materials recorded yet</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {["Material", "Planned", "Issued", "Waste", "Cost"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a: any) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="px-3 py-2.5">
                          {a.material?.name}{a.material?.color ? ` (${a.material.color})` : ""}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{Number(a.plannedQty ?? 0)} {a.material?.uom}</td>
                        <td className="px-3 py-2.5 tabular-nums">{Number(a.actualQtyIssued ?? 0)} {a.material?.uom}</td>
                        <td className="px-3 py-2.5 tabular-nums">{Number(a.wasteQty ?? 0)} {a.material?.uom}</td>
                        <td className="px-3 py-2.5 tabular-nums">${Number(a.actualCost ?? a.plannedCost ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StageRow({ stage, onStart, onComplete, mutating }: {
  stage: ProductionJobStage;
  onStart: () => void;
  onComplete: () => void;
  mutating: boolean;
}) {
  const isCompleted = stage.status === "COMPLETED";
  const isInProgress = stage.status === "IN_PROGRESS";
  const isPending = stage.status === "PENDING";

  return (
    <Card className={cn("transition-colors", isCompleted && "opacity-60", isInProgress && "border-primary/40 bg-primary/5")}>
      <CardContent className="py-3 px-4 flex items-center gap-4">
        <div className="shrink-0">
          {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          {isInProgress && <PlayCircle className="h-5 w-5 text-primary" />}
          {isPending && <Circle className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{stageLabel(stage.code)}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            {stage.assignedToName && <span>→ {stage.assignedToName}</span>}
            {stage.startedAt && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{format(new Date(stage.startedAt), "dd MMM HH:mm")}</span>}
            {stage.endedAt && <span>ended {formatDistanceToNow(new Date(stage.endedAt), { addSuffix: true })}</span>}
            {stage.notes && <span className="italic">"{stage.notes}"</span>}
          </div>
        </div>
        <div className="shrink-0">
          {isPending && <Button size="sm" variant="outline" onClick={onStart} disabled={mutating}>Start</Button>}
          {isInProgress && <Button size="sm" onClick={onComplete}>Complete</Button>}
          {isCompleted && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Done</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
