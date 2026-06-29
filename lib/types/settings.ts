export interface CompanySettings {
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxNumber: string | null;
  currency: "USD";
  logoUrl: string | null;
}

export interface NumberingSetting {
  id: string;
  entity: string;
  prefix: string;
  nextNumber: number;
  padding: number;
  example: string;
}

export interface PricingSetting {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: string;
  description: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  usersCount: number;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  roleId: string | null;
  roleName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
