export const LEAD_STAGES = [
  "NEW_LEAD",
  "CONTACTED",
  "DESIGN_DISCUSSION",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "DEPOSIT_RECEIVED",
  "PRODUCTION",
  "DELIVERED",
  "LOST",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export type LeadSource =
  | "WHATSAPP"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "WEBSITE"
  | "REFERRAL"
  | "WALK_IN"
  | "OTHER";

export interface Lead {
  id: string;
  leadNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  source: LeadSource;
  stage: LeadStage;
  estimatedValue: number | null;
  assignedTo: string | null;
  assignedToName: string | null;
  notes: string | null;
  lostReason: string | null;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: "NOTE" | "CALL" | "WHATSAPP" | "EMAIL" | "MEETING" | "STAGE_CHANGE";
  description: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export type CustomerType = "INDIVIDUAL" | "CORPORATE";

export interface Customer {
  id: string;
  customerNumber: string;
  type: CustomerType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxNumber: string | null;
  creditLimit: number | null;
  outstandingBalance: number;
  totalSpend: number;
  ordersCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function customerDisplayName(customer: Customer): string {
  if (customer.type === "CORPORATE" && customer.companyName) {
    return customer.companyName;
  }
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.customerNumber
  );
}
