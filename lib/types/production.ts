export const PRODUCTION_STAGES = [
  "MATERIAL_ALLOCATION",
  "FRAME_PREPARATION",
  "DESIGN_TRANSFER",
  "TUFTING",
  "GLUE_APPLICATION",
  "DRYING",
  "BACKING_INSTALLATION",
  "BINDING",
  "TRIMMING",
  "CARVING",
  "QUALITY_INSPECTION",
  "PACKAGING",
  "READY_FOR_COLLECTION",
] as const;

export type ProductionStageCode = (typeof PRODUCTION_STAGES)[number];

export type JobStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

export type StageStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export interface ProductionJobStage {
  id: string;
  code: ProductionStageCode;
  name: string;
  status: StageStatus;
  startedAt: string | null;
  endedAt: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  notes: string | null;
}

export interface ProductionJob {
  id: string;
  jobNumber: string;
  orderId: string;
  orderNumber: string;
  orderItemId: string | null;
  rugName: string;
  widthCm: number;
  heightCm: number;
  customerName: string;
  status: JobStatus;
  currentStage: ProductionStageCode;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  stages: ProductionJobStage[];
  queuePosition: number | null;
  startedAt: string | null;
  dueDate: string | null;
  completedAt: string | null;
  isDelayed: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function stageLabel(code: ProductionStageCode): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
