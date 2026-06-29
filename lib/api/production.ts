import { apiFetch, buildQuery, createCrudApi } from "./client";
import type { ListParams } from "@/lib/types/common";
import type { ProductionJob } from "@/lib/types/production";

export const productionApi = {
  ...createCrudApi<ProductionJob>("/production/jobs"),
  kanban: (params?: ListParams) =>
    apiFetch<Record<string, ProductionJob[]>>(`/production/jobs/kanban${buildQuery(params)}`),
  startStage: (jobId: string, stageId: string, userId?: string) =>
    apiFetch(`/production/jobs/${jobId}/stages/${stageId}/start`, { method: "POST", body: { userId } }),
  completeStage: (jobId: string, stageId: string, data?: { notes?: string; timeSpentMinutes?: number }) =>
    apiFetch(`/production/jobs/${jobId}/stages/${stageId}/complete`, { method: "POST", body: data }),
  uploadStageImage: (jobId: string, stageId: string, formData: FormData) =>
    apiFetch(`/production/jobs/${jobId}/stages/${stageId}/images`, {
      method: "POST",
      body: formData as any,
    }),
  allocations: (jobId: string) =>
    apiFetch<any[]>(`/production/jobs/${jobId}/allocations`),
};
