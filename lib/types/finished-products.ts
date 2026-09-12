import type { RugShape } from "./sales";

export type FinishedProductStatus = "AVAILABLE" | "RESERVED" | "SOLD";

export interface FinishedProduct {
  id: string;
  productNumber: string;
  orderId: string | null;
  productionJobId: string | null;
  customerId: string | null;
  customer?: { id: string; firstName: string | null; lastName: string | null; companyName: string | null } | null;
  order?: { id: string; orderNumber: string } | null;
  name: string;
  description: string | null;
  widthCm: number | null;
  heightCm: number | null;
  shape: RugShape | null;
  price: number | null;
  primaryImageUrl: string | null;
  images: string[];
  videoUrl: string | null;
  completedAt: string | null;
  status: FinishedProductStatus;
  isFeatured: boolean;
  publishedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
