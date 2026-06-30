// Shared data shapes for all order PDFs

export interface CompanyPdf {
  name: string;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
  footerText?: string | null;
}

export interface CustomerPdf {
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface PaymentPdf {
  paymentNumber: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  receivedAt: string;
  isDeposit?: boolean;
}

export interface OrderItemPdf {
  rugName: string;
  description?: string | null;
  widthCm: number;
  heightCm: number;
  shape: string;
  complexity: string;
  colors: string[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  designFileUrl?: string | null;
}

export interface OrderPdfPayload {
  company: CompanyPdf;
  customer: CustomerPdf;
  orderNumber: string;
  status: string;
  priority: string;
  items: OrderItemPdf[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  depositRequired: number;
  actualPaid: number;
  balance: number;
  payments: PaymentPdf[];
  promisedDate?: string | null;
  createdAt: string;
  notes?: string | null;
  generatedAt: string;
  /** Pre-generated QR code as a data: URI (png) */
  qrCodeDataUrl?: string;
}
