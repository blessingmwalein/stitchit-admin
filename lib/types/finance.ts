export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  customerId: string;
  customerName: string;
  orderId: string | null;
  orderNumber: string | null;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod =
  | "CASH_USD"
  | "CASH_ZWG"
  | "BANK_TRANSFER"
  | "ECOCASH"
  | "INNBUCKS"
  | "CARD"
  | "OTHER";

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  orderId: string | null;
  orderNumber: string | null;
  amount: number;
  currency: "USD" | "ZWG";
  exchangeRate: number | null;
  amountUsd: number;
  method: PaymentMethod;
  reference: string | null;
  receivedAt: string;
  receivedBy: string;
  receivedByName: string | null;
  notes: string | null;
  createdAt: string;
}

export type ExpenseCategory =
  | "RENT"
  | "UTILITIES"
  | "SALARIES"
  | "MATERIALS"
  | "TRANSPORT"
  | "MARKETING"
  | "EQUIPMENT"
  | "OTHER";

export interface Expense {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: "USD" | "ZWG";
  amountUsd: number;
  paymentMethod: PaymentMethod;
  supplierId: string | null;
  supplierName: string | null;
  expenseDate: string;
  receiptUrl: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
}

export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string | null;
  parentId: string | null;
  balance: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string | null;
}

export interface JournalEntry {
  id: string;
  journalNumber: string;
  date: string;
  memo: string | null;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  sourceType: string | null;
  sourceId: string | null;
  postedBy: string;
  postedByName: string | null;
  createdAt: string;
}

export interface AgingBucketRow {
  customerId: string;
  customerName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  total: number;
}

export interface AgingReport {
  asOf: string;
  rows: AgingBucketRow[];
  totals: Omit<AgingBucketRow, "customerId" | "customerName">;
}

export interface StatementLine {
  id: string;
  date: string;
  type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "ADJUSTMENT";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface CustomerStatement {
  customerId: string;
  customerName: string;
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  lines: StatementLine[];
}
