export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionCategory = string;

export interface ICategory {
  _id: string;
  value: string;
  label: string;
  icon: string;
  isDefault?: boolean;
}

export const TRANSACTION_CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'food', label: 'Comida', icon: '🍔' },
  { value: 'transport', label: 'Transporte', icon: '🚗' },
  { value: 'entertainment', label: 'Entretenimiento', icon: '🎬' },
  { value: 'health', label: 'Salud', icon: '💊' },
  { value: 'education', label: 'Educación', icon: '🎓' },
  { value: 'housing', label: 'Vivienda', icon: '🏠' },
  { value: 'utilities', label: 'Servicios', icon: '💡' },
  { value: 'shopping', label: 'Compras', icon: '🛍️' },
  { value: 'travel', label: 'Viajes', icon: '✈️' },
  { value: 'personal', label: 'Personal', icon: '👤' },
  { value: 'atm', label: 'Retiro Cajero', icon: '🏧' },
  { value: 'delivery', label: 'Delivery', icon: '🏍️' },
  { value: 'shipping', label: 'Pedidos / Envíos', icon: '🚚' },
  { value: 'other', label: 'Otro', icon: '📁' },
];

export interface ITransaction {
  _id: string;
  accountId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  accountId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: Date;
  notes?: string;
}

export interface UpdateTransactionInput {
  accountId?: string;
  description?: string;
  amount?: number;
  type?: TransactionType;
  category?: TransactionCategory;
  date?: Date;
  notes?: string;
}

export interface MonthlyExpenseSummary {
  accountId: string;
  accountName: string;
  accountColor: string;
  total: number;
  count: number;
}

export interface ExpenseFilters {
  accountId?: string;
  category?: TransactionCategory;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
}
