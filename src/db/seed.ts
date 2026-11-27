import { db } from './database';
import type { Customer, Product, UpiEvent } from '../types/store';

function getDateOffsetISO(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getMinutesAgoISO(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

export async function seedDatabase(): Promise<void> {
  const tomorrow = getDateOffsetISO(1);
  const nextMonth = getDateOffsetISO(30);
  const now = new Date().toISOString();

  const products: Product[] = [
    {
      name: 'Sugar',
      aliases: ['chini', 'panchadara', 'shakkar'],
      unit: 'kg',
      selling_price: 48,
      wholesale_cost: 41,
      stock: 25,
      low_stock_threshold: 5,
      expiry_date: nextMonth,
    },
    {
      name: 'Surf Excel',
      aliases: ['surf', 'detergent', 'washing powder'],
      unit: 'pack',
      selling_price: 120,
      wholesale_cost: 100,
      stock: 14,
      low_stock_threshold: 4,
      expiry_date: nextMonth,
    },
    {
      name: 'Milk',
      aliases: ['doodh', 'paalu', 'packet milk'],
      unit: 'L',
      selling_price: 50,
      wholesale_cost: 44,
      stock: 12,
      low_stock_threshold: 5,
      expiry_date: tomorrow, // Expires tomorrow
    },
    {
      name: 'Jeera',
      aliases: ['jeelakarra', 'jira', 'cumin'],
      unit: 'kg',
      selling_price: 400,
      wholesale_cost: 320,
      stock: 0.4, // Low stock
      low_stock_threshold: 1,
      expiry_date: nextMonth,
    },
    {
      name: 'Maggi',
      aliases: ['noodles', 'magi'],
      unit: 'pack',
      selling_price: 14,
      wholesale_cost: 11.5,
      stock: 40,
      low_stock_threshold: 10,
      expiry_date: nextMonth,
    },
    {
      name: 'Sunflower Oil',
      aliases: ['oil', 'tel', 'nune', 'sunflower'],
      unit: 'pouch',
      selling_price: 135,
      wholesale_cost: 115,
      stock: 18,
      low_stock_threshold: 5,
      expiry_date: nextMonth,
    },
    {
      name: 'Good Day',
      aliases: ['biscuit', 'goodday', 'good day biscuit'],
      unit: 'pack',
      selling_price: 20,
      wholesale_cost: 16.5,
      stock: 30,
      low_stock_threshold: 8,
      expiry_date: nextMonth,
    },
    {
      name: 'Atta',
      aliases: ['wheat', 'pindi', 'aata', 'flour'],
      unit: 'kg',
      selling_price: 45,
      wholesale_cost: 38,
      stock: 35,
      low_stock_threshold: 10,
      expiry_date: nextMonth,
    },
    {
      name: 'Toor Dal',
      aliases: ['pappu', 'tour dal', 'arhar', 'dal'],
      unit: 'kg',
      selling_price: 160,
      wholesale_cost: 132,
      stock: 15,
      low_stock_threshold: 4,
      expiry_date: nextMonth,
    },
  ];

  // Fictional demo phone numbers only
  const customers: Customer[] = [
    { name: 'Sharma ji', phone: '9000000001', khata_balance: 450, updated_at: now },
    { name: 'Suresh Kumar', phone: '9000000002', khata_balance: 340, updated_at: now },
    { name: 'Ramesh', phone: '9000000003', khata_balance: 180, updated_at: now },
  ];

  // Suresh ₹340 is intentionally omitted so checking Suresh triggers Fraud Alert until Simulator sends it
  const upiEvents: UpiEvent[] = [
    {
      sender: 'Ankit',
      amount: 120,
      app: 'GPay',
      transaction_id: 'UTR409281736451',
      status: 'VERIFIED',
      received_at: getMinutesAgoISO(4),
      is_simulated: true,
    },
    {
      sender: 'Neha',
      amount: 55,
      app: 'Paytm',
      transaction_id: 'UTR409281736112',
      status: 'VERIFIED',
      received_at: getMinutesAgoISO(9),
      is_simulated: true,
    },
  ];

  await db.transaction(
    'rw',
    [db.products, db.customers, db.khata_transactions, db.upi_events, db.bills],
    async () => {
      await db.products.bulkAdd(products);
      await db.customers.bulkAdd(customers);
      await db.upi_events.bulkAdd(upiEvents);
    }
  );
}

export async function resetAndReseed(): Promise<void> {
  await db.transaction(
    'rw',
    [db.products, db.customers, db.khata_transactions, db.upi_events, db.bills],
    async () => {
      await db.products.clear();
      await db.customers.clear();
      await db.khata_transactions.clear();
      await db.upi_events.clear();
      await db.bills.clear();
    }
  );
  await seedDatabase();
}
