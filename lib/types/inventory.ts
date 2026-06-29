export type MaterialCategory =
  | "YARN"
  | "BACKING_CLOTH"
  | "GLUE"
  | "FRAME"
  | "TOOLS"
  | "PACKAGING"
  | "OTHER";

export type UnitOfMeasure =
  | "KG"
  | "G"
  | "M"
  | "CM"
  | "SQM"
  | "L"
  | "ML"
  | "PCS"
  | "ROLL"
  | "CONE";

export interface Material {
  id: string;
  sku: string;
  name: string;
  category: MaterialCategory;
  color: string | null;
  uom: UnitOfMeasure;
  avgCost: number;
  lastCost: number | null;
  reorderLevel: number;
  qtyOnHand: number;
  qtyAllocated: number;
  qtyAvailable: number;
  supplierId: string | null;
  supplierName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MovementType =
  | "PURCHASE_RECEIPT"
  | "PRODUCTION_ISSUE"
  | "PRODUCTION_RETURN"
  | "ADJUSTMENT"
  | "WRITE_OFF"
  | "TRANSFER";

export interface StockMovement {
  id: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  type: MovementType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference: string | null;
  referenceType: string | null;
  notes: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface ValuationLine {
  materialId: string;
  sku: string;
  name: string;
  category: MaterialCategory;
  uom: UnitOfMeasure;
  qtyOnHand: number;
  avgCost: number;
  totalValue: number;
}

export interface ValuationSummary {
  asOf: string;
  totalValue: number;
  byCategory: { category: MaterialCategory; value: number }[];
  lines: ValuationLine[];
}
