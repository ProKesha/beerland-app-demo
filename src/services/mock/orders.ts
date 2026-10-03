import { z } from 'zod';
import type { OrderRepository } from '@/repositories/contracts';
import {
  orderInputSchema,
  placedOrderSchema,
  type PlacedOrder,
} from '@/features/orders/model';
export interface OrderStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
}
export interface MockOrderOptions {
  now?: () => Date;
  seedOrders?: PlacedOrder[];
  demoAccount?: boolean;
  authEnabled?: boolean;
  beforeCreate?: () => Promise<void>;
  storage?: OrderStorage;
}
/** Injectable clock/failure/storage; serializes writes and deduplicates retries by request key. */
export function createMockOrderRepository({
  now = () => new Date(),
  seedOrders = [],
  beforeCreate,
  storage,
}: MockOrderOptions = {}): OrderRepository {
  let orders: PlacedOrder[] = [];
  let loaded = false;
  let queue: Promise<unknown> = Promise.resolve();
  const key = 'beerland:mock-orders:v1';
  async function load() {
    if (loaded) return;
    const raw = await storage?.getItem(key);
    if (raw) orders = z.array(placedOrderSchema).parse(JSON.parse(raw));
    const persistedIds = new Set(orders.map((order) => order.id));
    orders = [
      ...orders,
      ...seedOrders.filter((order) => !persistedIds.has(order.id)),
    ];
    loaded = true;
  }
  return {
    list: async () => {
      await queue;
      await load();
      return JSON.parse(JSON.stringify(orders));
    },
    getById: async (id) => {
      await queue;
      await load();
      return JSON.parse(
        JSON.stringify(orders.find((order) => order.id === id) ?? null),
      );
    },
    create: (input) => {
      const task = queue.then(async () => {
        await load();
        const data = orderInputSchema.parse(input);
        const existing = orders.find(
          (order) => order.idempotencyKey === data.idempotencyKey,
        );
        if (existing)
          return JSON.parse(JSON.stringify(existing)) as PlacedOrder;
        await beforeCreate?.();
        const sequence =
          1042 +
          orders.filter((order) => !order.id.startsWith('demo-history-'))
            .length;
        const order: PlacedOrder = {
          ...data,
          id: `mock-order-${sequence}`,
          orderNumber: `BL-${sequence}`,
          createdAt: now().toISOString(),
          fulfillment: data.fulfillmentType,
          status: 'created',
          paymentStatus: 'unpaid',
        };
        const next = [...orders, order];
        // Commit only after durable storage succeeds. An error preserves both cart and ledger.
        await storage?.setItem(key, JSON.stringify(next));
        orders = next;
        return JSON.parse(JSON.stringify(order)) as PlacedOrder;
      });
      queue = task.catch(() => undefined);
      return task;
    },
  };
}
