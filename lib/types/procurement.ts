export interface Supplier {
  id: string;
  supplierNumber: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxNumber: string | null;
  paymentTermsDays: number;
  outstandingBalance: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface PurchaseOrderItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  quantity: number;
  qtyReceived: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  expectedDate: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrnItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number;
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: GrnItem[];
  receivedAt: string;
  receivedBy: string;
  receivedByName: string;
  notes: string | null;
  createdAt: string;
}

export type BillStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";

export interface Bill {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string | null;
  poNumber: string | null;
  status: BillStatus;
  total: number;
  amountPaid: number;
  balance: number;
  billDate: string;
  dueDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
