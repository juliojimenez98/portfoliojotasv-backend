export type BillingCycle = 'monthly' | 'yearly';

export type SubscriptionCategory =
  | 'streaming'
  | 'music'
  | 'software'
  | 'gaming'
  | 'cloud'
  | 'fitness'
  | 'news'
  | 'productivity'
  | 'other';

export const SUBSCRIPTION_CATEGORIES: { value: SubscriptionCategory; label: string }[] = [
  { value: 'streaming', label: 'Streaming' },
  { value: 'music', label: 'Música' },
  { value: 'software', label: 'Software' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'cloud', label: 'Cloud/Storage' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'news', label: 'Noticias' },
  { value: 'productivity', label: 'Productividad' },
  { value: 'other', label: 'Otro' },
];

export interface ISubscription {
  _id: string;
  accountId: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  billingDay: number;
  category: SubscriptionCategory;
  isActive: boolean;
  startDate: Date;
  nextBillingDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionInput {
  accountId: string;
  name: string;
  amount: number;
  currency?: string;
  billingCycle: BillingCycle;
  billingDay: number;
  category: SubscriptionCategory;
  startDate: Date;
  notes?: string;
}

export interface UpdateSubscriptionInput {
  accountId?: string;
  name?: string;
  amount?: number;
  currency?: string;
  billingCycle?: BillingCycle;
  billingDay?: number;
  category?: SubscriptionCategory;
  isActive?: boolean;
  notes?: string;
}
