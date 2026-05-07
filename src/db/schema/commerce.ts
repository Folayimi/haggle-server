/**
 * Commerce & Order Management Schema
 *
 * Core tables for:
 * - Order creation from accepted deals
 * - Payment processing and reconciliation
 * - Shipment and delivery tracking
 * - Seller payouts after order completion
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  decimal,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { listings } from "./catalog";
import { liveSessions } from "./sessions";
import { negotiationThreads, offers } from "./negotiation";
import {
  DeliveryMode,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PayoutStatus,
  ShipmentStatus,
} from "./enums";
import { userAddresses } from "./users";

/**
 * ORDERS TABLE
 * Created only when a deal is accepted or instant buy succeeds.
 * Represents a finalized transaction between buyer and seller.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyer_id: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    seller_id: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    session_id: uuid("session_id").references(() => liveSessions.id, {
      onDelete: "set null",
    }),
    thread_id: uuid("thread_id").references(() => negotiationThreads.id, {
      onDelete: "set null",
    }),
    accepted_offer_id: uuid("accepted_offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "restrict" }),

    // Order status
    status: text("status", {
      enum: [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ],
    })
      .notNull()
      .default(OrderStatus.PENDING_PAYMENT),

    // Pricing breakdown
    subtotal_amount: decimal("subtotal_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    shipping_amount: decimal("shipping_amount", { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    platform_fee_amount: decimal("platform_fee_amount", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    total_amount: decimal("total_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    currency: text("currency").notNull().default("USD"),

    // Fulfillment
    shipping_address_id: uuid("shipping_address_id").references(
      () => userAddresses.id,
      {
        onDelete: "set null",
      },
    ),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    buyerStatusIdx: index("orders_buyer_id_status_created_at_idx").on(
      table.buyer_id,
      table.status,
      table.created_at,
    ),
    sellerStatusIdx: index("orders_seller_id_status_created_at_idx").on(
      table.seller_id,
      table.status,
      table.created_at,
    ),
  }),
);

/**
 * ORDER_ITEMS TABLE
 * Line items attached to an order.
 * Stores title/price snapshots so historical records don't depend on mutable listing rows.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    listing_id: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),

    // Snapshot of listing data at time of purchase
    title_snapshot: text("title_snapshot").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unit_price_amount: decimal("unit_price_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    total_price_amount: decimal("total_price_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
  },
  (table) => ({
    orderIdIdx: index("order_items_order_id_idx").on(table.order_id),
  }),
);

/**
 * PAYMENTS TABLE
 * Payment provider records and reconciliation.
 * Tracks payments processed through external providers like Stripe or Paystack.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: [PaymentProvider.STRIPE, PaymentProvider.PAYSTACK],
    }).notNull(),
    provider_payment_id: text("provider_payment_id").notNull(),
    status: text("status", {
      enum: [
        PaymentStatus.PENDING,
        PaymentStatus.PROCESSING,
        PaymentStatus.COMPLETED,
        PaymentStatus.FAILED,
        PaymentStatus.REFUNDED,
      ],
    })
      .notNull()
      .default(PaymentStatus.PENDING),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    paid_at: timestamp("paid_at", { withTimezone: true }),

    // Raw response from provider for debugging
    raw_response_json: jsonb("raw_response_json"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    orderIdIdx: index("payments_order_id_idx").on(table.order_id),
    providerPaymentIdIdx: index("payments_provider_payment_id_idx").on(
      table.provider_payment_id,
    ),
  }),
);

/**
 * SHIPMENTS TABLE
 * Delivery/pickup fulfillment tracking.
 * Tracks the physical movement of goods from seller to buyer.
 */
export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    delivery_mode: text("delivery_mode", {
      enum: [DeliveryMode.SHIPPING, DeliveryMode.PICKUP, DeliveryMode.DIGITAL],
    }).notNull(),
    carrier: text("carrier"), // e.g., 'FedEx', 'UPS', 'DHL'
    tracking_number: text("tracking_number"),
    shipped_at: timestamp("shipped_at", { withTimezone: true }),
    delivered_at: timestamp("delivered_at", { withTimezone: true }),
    status: text("status", {
      enum: [
        ShipmentStatus.PENDING,
        ShipmentStatus.SHIPPED,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.DELIVERED,
        ShipmentStatus.FAILED,
      ],
    })
      .notNull()
      .default(ShipmentStatus.PENDING),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    orderIdIdx: index("shipments_order_id_idx").on(table.order_id),
  }),
);

/**
 * SELLER_PAYOUTS TABLE
 * Release seller funds after escrow or delivery confirmation.
 * Represents money being paid out to the seller.
 */
export const sellerPayouts = pgTable(
  "seller_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seller_id: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status", {
      enum: [
        PayoutStatus.PENDING,
        PayoutStatus.PROCESSING,
        PayoutStatus.COMPLETED,
        PayoutStatus.FAILED,
      ],
    })
      .notNull()
      .default(PayoutStatus.PENDING),
    released_at: timestamp("released_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    sellerIdStatusIdx: index(
      "seller_payouts_seller_id_status_created_at_idx",
    ).on(table.seller_id, table.status, table.created_at),
  }),
);

// Type inference for INSERT and SELECT operations
export type InsertOrder = typeof orders.$inferInsert;
export type SelectOrder = typeof orders.$inferSelect;

export type InsertOrderItem = typeof orderItems.$inferInsert;
export type SelectOrderItem = typeof orderItems.$inferSelect;

export type InsertPayment = typeof payments.$inferInsert;
export type SelectPayment = typeof payments.$inferSelect;

export type InsertShipment = typeof shipments.$inferInsert;
export type SelectShipment = typeof shipments.$inferSelect;

export type InsertSellerPayout = typeof sellerPayouts.$inferInsert;
export type SelectSellerPayout = typeof sellerPayouts.$inferSelect;
