export type NotificationType =
  | "ORDER_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PRODUCTION_STAGE_COMPLETED"
  | "ORDER_DELAYED"
  | "LOW_STOCK"
  | "QUOTATION_EXPIRING"
  | "INVOICE_OVERDUE"
  | "SYSTEM";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}
