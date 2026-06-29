export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export type RugShape =
  | "RECTANGLE"
  | "CIRCLE"
  | "OVAL"
  | "RUNNER"
  | "CUSTOM";

export type Complexity = "SIMPLE" | "MEDIUM" | "COMPLEX" | "VERY_COMPLEX";

export interface QuotationItem {
  id: string;
  description: string;
  rugName: string | null;
  widthCm: number;
  heightCm: number;
  shape: RugShape;
  colors: string[];
  complexity: Complexity;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  customerId: string | null;
  customerName: string | null;
  leadId: string | null;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  validityDays: number;
  expiryDate: string;
  notes: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "DRAFT"
  | "QUOTED"
  | "AWAITING_DEPOSIT"
  | "DEPOSIT_PAID"
  | "IN_PRODUCTION"
  | "QUALITY_CHECK"
  | "READY"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELLED";

export type OrderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface OrderItem {
  id: string;
  rugName: string;
  description: string | null;
  widthCm: number;
  heightCm: number;
  shape: RugShape;
  colors: string[];
  complexity: Complexity;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  designFileUrl: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  priority: OrderPriority;
  customerId: string;
  customerName: string;
  quotationId: string | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  depositRequired: number;
  promisedDate: string | null;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
