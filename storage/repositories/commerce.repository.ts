import { desc, eq, or } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  orderItems,
  orders,
  payments,
  sellerPayouts,
  shipments,
} from "../../src/db/schema/commerce";

type OrderInsert = typeof orders.$inferInsert;
type OrderItemInsert = typeof orderItems.$inferInsert;
type PaymentInsert = typeof payments.$inferInsert;
type ShipmentInsert = typeof shipments.$inferInsert;
type PayoutInsert = typeof sellerPayouts.$inferInsert;

export type CreateOrderInput = OrderInsert & {
  items?: Array<Omit<typeof orderItems.$inferInsert, "order_id">>;
};

export class CommerceRepository extends BaseRepository {
  async listOrdersForUser(userId: string) {
    return this.database
      .select()
      .from(orders)
      .where(or(eq(orders.buyer_id, userId), eq(orders.seller_id, userId)))
      .orderBy(desc(orders.created_at));
  }

  async createOrder(input: CreateOrderInput) {
    const { items = [], ...orderValues } = input;
    const [order] = await this.database.insert(orders).values(orderValues).returning();

    if (items.length > 0) {
      await this.database.insert(orderItems).values(
        items.map((item) => ({
          ...item,
          order_id: order.id,
        })),
      );
    }

    return this.getOrderById(order.id);
  }

  async getOrderById(orderId: string) {
    const [order, items, paymentRows, shipmentRows, payouts] = await Promise.all([
      this.database.select().from(orders).where(eq(orders.id, orderId)),
      this.database.select().from(orderItems).where(eq(orderItems.order_id, orderId)),
      this.database.select().from(payments).where(eq(payments.order_id, orderId)),
      this.database.select().from(shipments).where(eq(shipments.order_id, orderId)),
      this.database
        .select()
        .from(sellerPayouts)
        .where(eq(sellerPayouts.order_id, orderId)),
    ]);

    if (order.length === 0) {
      return null;
    }

    return {
      ...order[0],
      items,
      payments: paymentRows,
      shipments: shipmentRows,
      payouts,
    };
  }

  async addPayment(input: PaymentInsert) {
    const [payment] = await this.database.insert(payments).values(input).returning();
    return payment;
  }

  async updatePaymentStatus(
    paymentId: string,
    input: Partial<PaymentInsert>,
  ) {
    const [payment] = await this.database
      .update(payments)
      .set({ ...this.pickDefined(input), updated_at: new Date() })
      .where(eq(payments.id, paymentId))
      .returning();

    return payment ?? null;
  }

  async addShipment(input: ShipmentInsert) {
    const [shipment] = await this.database
      .insert(shipments)
      .values(input)
      .returning();

    return shipment;
  }

  async updateShipmentStatus(
    shipmentId: string,
    input: Partial<ShipmentInsert>,
  ) {
    const [shipment] = await this.database
      .update(shipments)
      .set({ ...this.pickDefined(input), updated_at: new Date() })
      .where(eq(shipments.id, shipmentId))
      .returning();

    return shipment ?? null;
  }

  async createPayout(input: PayoutInsert) {
    const [payout] = await this.database
      .insert(sellerPayouts)
      .values(input)
      .returning();

    return payout;
  }
}
