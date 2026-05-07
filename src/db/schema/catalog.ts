/**
 * Catalog & Marketplace Schema
 *
 * Core tables for:
 * - Products and services marketplace catalog
 * - Categories and taxonomy
 * - Media (images, videos) for listings
 * - Inventory and stock management
 * - Service-specific metadata
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  index,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import {
  CategoryKind,
  ListingStatus,
  ListingType,
  MediaType,
  ServiceDeliveryMode,
} from "./enums";

/**
 * CATEGORIES TABLE
 * Marketplace grouping for products and services.
 * Supports hierarchical categories with parent-child relationships.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parent_id: uuid("parent_id"),
    // .references(() => categories.id, {
    //   onDelete: "set null",
    // }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    kind: text("kind", {
      enum: [CategoryKind.PRODUCT, CategoryKind.SERVICE, CategoryKind.BOTH],
    })
      .notNull()
      .default(CategoryKind.BOTH),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    parentIdIdx: index("categories_parent_id_idx").on(table.parent_id),
    slugIdx: index("categories_slug_idx").on(table.slug),
  }),
);

/**
 * LISTINGS TABLE
 * Base table for anything sellable in the app (products or services).
 * This is the core marketplace entity with denormalized counters for feed performance.
 */
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seller_id: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listing_type: text("listing_type", {
      enum: [ListingType.PRODUCT, ListingType.SERVICE],
    }).notNull(),
    category_id: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),

    // Pricing
    price_amount: decimal("price_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    price_currency: text("price_currency").notNull().default("USD"),

    // Listing state
    status: text("status", {
      enum: [
        ListingStatus.DRAFT,
        ListingStatus.ACTIVE,
        ListingStatus.PAUSED,
        ListingStatus.ARCHIVED,
      ],
    })
      .notNull()
      .default(ListingStatus.DRAFT),
    is_negotiable: boolean("is_negotiable").notNull().default(true),

    // Media
    cover_media_id: uuid("cover_media_id"),

    // Denormalized metrics for feed optimization
    view_count: integer("view_count").notNull().default(0),
    save_count: integer("save_count").notNull().default(0),
    share_count: integer("share_count").notNull().default(0),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    sellerIdStatusIdx: index("listings_seller_id_status_created_at_idx").on(
      table.seller_id,
      table.status,
      table.created_at,
    ),
    categoryIdStatusIdx: index("listings_category_id_status_created_at_idx").on(
      table.category_id,
      table.status,
      table.created_at,
    ),
    listingTypeStatusIdx: index("listings_listing_type_status_idx").on(
      table.listing_type,
      table.status,
    ),
  }),
);

/**
 * LISTING_MEDIA TABLE
 * Product images, videos, thumbnails, and seller-uploaded preview assets.
 * Supports multiple media per listing with ordering.
 */
export const listingMedia = pgTable(
  "listing_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listing_id: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    media_type: text("media_type", {
      enum: [MediaType.IMAGE, MediaType.VIDEO],
    }).notNull(),
    url: text("url").notNull(),
    thumbnail_url: text("thumbnail_url"), // For videos, display a thumbnail
    sort_order: integer("sort_order").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    duration_seconds: integer("duration_seconds"), // For videos
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    listingIdIdx: index("listing_media_listing_id_sort_order_idx").on(
      table.listing_id,
      table.sort_order,
    ),
  }),
);

/**
 * LISTING_INVENTORY TABLE
 * Stock and availability for product listings.
 * Service listings typically won't have inventory records.
 */
export const listingInventory = pgTable("listing_inventory", {
  listing_id: uuid("listing_id")
    .primaryKey()
    .references(() => listings.id, { onDelete: "cascade" }),
  sku: text("sku"),
  quantity_available: integer("quantity_available").notNull().default(1),
  reserved_quantity: integer("reserved_quantity").notNull().default(0),
  allow_backorder: boolean("allow_backorder").notNull().default(false),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * LISTING_SERVICE_META TABLE
 * Extra service-specific metadata for service listings.
 * Not used for product listings.
 */
export const listingServiceMeta = pgTable("listing_service_meta", {
  listing_id: uuid("listing_id")
    .primaryKey()
    .references(() => listings.id, { onDelete: "cascade" }),
  service_duration_minutes: integer("service_duration_minutes"),
  delivery_mode: text("delivery_mode", {
    enum: [
      ServiceDeliveryMode.REMOTE,
      ServiceDeliveryMode.ONSITE,
      ServiceDeliveryMode.HYBRID,
    ],
  }).notNull(),
  service_area_json: jsonb("service_area_json"), // Geographic areas where service is available
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Type inference for INSERT and SELECT operations
export type InsertCategory = typeof categories.$inferInsert;
export type SelectCategory = typeof categories.$inferSelect;

export type InsertListing = typeof listings.$inferInsert;
export type SelectListing = typeof listings.$inferSelect;

export type InsertListingMedia = typeof listingMedia.$inferInsert;
export type SelectListingMedia = typeof listingMedia.$inferSelect;

export type InsertListingInventory = typeof listingInventory.$inferInsert;
export type SelectListingInventory = typeof listingInventory.$inferSelect;

export type InsertListingServiceMeta = typeof listingServiceMeta.$inferInsert;
export type SelectListingServiceMeta = typeof listingServiceMeta.$inferSelect;
