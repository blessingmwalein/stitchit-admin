"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { productionApi } from "@/lib/api/production";
import { PRODUCTION_STAGES, stageLabel, type ProductionJob, type ProductionStageCode } from "@/lib/types/production";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function ProductionPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: kanban = {}, isLoading } = useQuery({
    queryKey: ["production-kanban"],
    queryFn: () => productionApi.kanban(),
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Production" />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Production" description="Active jobs by stage" />

      <ScrollArea className="flex-1 p-4">
        <div className="flex gap-3 pb-4" style={{ minWidth: `${PRODUCTION_STAGES.length * 220}px` }}>
          {PRODUCTION_STAGES.map((stage) => {
            const jobs: ProductionJob[] = kanban[stage] ?? [];
            return (
              <div key={stage} className="w-52 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
                    {stageLabel(stage)}
                  </span>
                  <Badge variant="secondary" className="h-5 min-w-5 justify-center rounded-full text-xs shrink-0">
                    {jobs.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} onClick={() => router.push(`/production/jobs/${job.id}`)} />
                  ))}
                  {jobs.length === 0 && (
                    <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function JobCard({ job, onClick }: { job: ProductionJob; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer shadow-none transition-shadow hover:shadow-sm"
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium leading-tight truncate">{job.rugName}</p>
          {job.isDelayed && (
            <Badge variant="outline" className="shrink-0 border-transparent bg-red-100 text-red-700 text-xs">
              Late
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{job.jobNumber}</p>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground">{job.customerName}</p>
        <p className="text-xs mt-1">{job.widthCm} × {job.heightCm} cm</p>
        {job.dueDate && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Due {new Date(job.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
