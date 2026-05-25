export type AccountType = 'credit_card' | 'debit' | 'cash' | 'savings' | 'other';
export type RefreshType = 'automatic' | 'manual';

export interface IAccount {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  type: AccountType;
  bankName?: string;
  currency: string;
  balance: number;
  creditLimit?: number;
  color: string;
  icon: string;
  refreshType: RefreshType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountInput {
  name: string;
  description?: string;
  type: AccountType;
  bankName?: string;
  currency?: string;
  balance?: number;
  creditLimit?: number;
  color?: string;
  icon?: string;
  refreshType?: RefreshType;
}

export interface UpdateAccountInput {
  name?: string;
  description?: string;
  type?: AccountType;
  bankName?: string;
  currency?: string;
  balance?: number;
  creditLimit?: number;
  color?: string;
  icon?: string;
  refreshType?: RefreshType;
  isActive?: boolean;
}
