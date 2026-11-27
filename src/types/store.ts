export type ProductUnit = 'kg' | 'pack' | 'L' | 'pouch';

export interface Product {
  id?: number;
  name: string;
  aliases: string[];
  unit: ProductUnit;
  selling_price: number;
  wholesale_cost: number;
  stock: number;
  low_stock_threshold: number;
  expiry_date?: string; // YYYY-MM-DD
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  khata_balance: number;
  updated_at: string;
}

export interface LineItem {
  product_id?: number;
  name: string;
  qty: number;
  unit: string;
  price: number;
  subtotal: number;
}

export interface KhataTransaction {
  id?: number;
  client_tx_id: string; // Unique ID for offline deduplication
  customer_id: number;
  type: 'credit' | 'payment';
  items: LineItem[];
  amount: number;
  payment_mode?: 'Cash' | 'UPI' | 'Khata';
  created_at: string;
  synced: boolean;
}

export interface UpiEvent {
  id?: number;
  sender: string;
  amount: number;
  app: 'PhonePe' | 'GPay' | 'Paytm';
  transaction_id: string;
  status: 'VERIFIED' | 'FAKE' | 'FAILED' | 'UNKNOWN';
  received_at: string;
  is_simulated?: boolean;
}

export interface Bill {
  id?: number;
  counter: 'A' | 'B';
  items: LineItem[];
  total: number;
  payment_mode: 'Cash' | 'UPI' | 'Khata';
  created_at: string;
}