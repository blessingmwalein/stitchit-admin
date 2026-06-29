export interface RevenueTrendPoint {
  date: string;
  amount: number;
}

export interface PipelineStageCount {
  stage: string;
  count: number;
}

export interface RecentPayment {
  id: string;
  paymentNumber: string;
  customerName: string;
  amount: number;
  method: string;
  receivedAt: string;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  description: string;
  userName: string | null;
  createdAt: string;
}

export interface DashboardData {
  todayRevenue: number;
  monthRevenue: number;
  outstandingBalance: number;
  ordersInProduction: number;
  delayedOrders: number;
  inventoryAlerts: number;
  revenueTrend: RevenueTrendPoint[];
  pipeline: PipelineStageCount[];
  recentPayments: RecentPayment[];
  recentActivity: RecentActivityItem[];
}
