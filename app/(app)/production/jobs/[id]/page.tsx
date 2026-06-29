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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Circle, Clock, PlayCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ["production-job", id],
    queryFn: () => productionApi.get(id),
  });

  const startMut = useMutation({
    mutationFn: (stageId: string) => productionApi.startStage(id, stageId),
    onSuccess: () => { toast.success("Stage started"); qc.invalidateQueries({ queryKey: ["production-job", id] }); },
  });

  const completeMut = useMutation({
    mutationFn: (stageId: string) => productionApi.completeStage(id, stageId),
    onSuccess: () => { toast.success("Stage completed"); qc.invalidateQueries({ queryKey: ["production-job", id] }); },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!job) return <div className="p-6 text-sm text-red-600">Job not found</div>;

  const stages: any[] = job.stages ?? [];
  const completedCount = stages.filter((s: any) => s.status === "COMPLETED").length;
  const progress = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader title={job.jobNumber} description={job.rugName}>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />Back
        </Button>
      </PageHeader>

      <div className="px-6 grid grid-cols-4 gap-3">
        <KpiCard label="Progress" value={`${progress}%`} />
        <KpiCard label="Current stage" value={stageLabel(job.currentStage)} />
        <KpiCard label="Size" value={`${job.widthCm} × ${job.heightCm} cm`} />
        <KpiCard label={job.isDelayed ? "Status" : "Customer"} value={job.isDelayed ? "⚠ Delayed" : job.customerName} />
      </div>

      <div className="px-6">
        <Progress value={progress} className="h-2 mb-6" />

        <div className="space-y-2">
          {stages.map((stage: any) => (
            <StageRow
              key={stage.id}
              stage={stage}
              onStart={() => startMut.mutate(stage.id)}
              onComplete={() => completeMut.mutate(stage.id)}
              mutating={startMut.isPending || completeMut.isPending}
            />
          ))}
        </div>
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
          </div>
        </div>
        <div className="shrink-0">
          {isPending && <Button size="sm" variant="outline" onClick={onStart} disabled={mutating}>Start</Button>}
          {isInProgress && <Button size="sm" onClick={onComplete} disabled={mutating}>Complete</Button>}
          {isCompleted && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Done</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
