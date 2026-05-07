import { and, desc, eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  categories,
  listingInventory,
  listingMedia,
  listings,
  listingServiceMeta,
} from "../../src/db/schema/catalog";
import { savedListings } from "../../src/db/schema/sessions";
import { CategoryKind, ListingStatus, ListingType } from "../../src/db/schema";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  kind: (typeof CategoryKind)[keyof typeof CategoryKind];
  parent_id?: string;
}

export interface CreateListingInput {
  seller_id: string;
  listing_type: (typeof ListingType)[keyof typeof ListingType];
  category_id: string;
  title: string;
  slug?: string;
  description: string;
  price_amount: string;
  price_currency?: string;
  status?: (typeof ListingStatus)[keyof typeof ListingStatus];
  is_negotiable?: boolean;
  cover_media_id?: string;
}

export class CatalogRepository extends BaseRepository {
  async listCategories() {
    return this.database.select().from(categories).orderBy(categories.name);
  }

  async createCategory(input: CreateCategoryInput) {
    const [category] = await this.database
      .insert(categories)
      .values({
        ...input,
        slug: input.slug ?? slugify(input.name),
      })
      .returning();

    return category;
  }

  async listListings(sellerId?: string) {
    if (sellerId) {
      return this.database
        .select()
        .from(listings)
        .where(eq(listings.seller_id, sellerId))
        .orderBy(desc(listings.created_at));
    }

    return this.database.select().from(listings).orderBy(desc(listings.created_at));
  }

  async getListingById(listingId: string) {
    const [listing, media, inventory, serviceMeta] = await Promise.all([
      this.database.select().from(listings).where(eq(listings.id, listingId)),
      this.database
        .select()
        .from(listingMedia)
        .where(eq(listingMedia.listing_id, listingId))
        .orderBy(listingMedia.sort_order),
      this.database
        .select()
        .from(listingInventory)
        .where(eq(listingInventory.listing_id, listingId)),
      this.database
        .select()
        .from(listingServiceMeta)
        .where(eq(listingServiceMeta.listing_id, listingId)),
    ]);

    if (listing.length === 0) {
      return null;
    }

    return {
      ...listing[0],
      media,
      inventory: inventory[0] ?? null,
      service_meta: serviceMeta[0] ?? null,
    };
  }

  async createListing(input: CreateListingInput) {
    const [listing] = await this.database
      .insert(listings)
      .values({
        ...input,
        slug: input.slug ?? slugify(input.title),
      })
      .returning();

    return listing;
  }

  async updateListing(
    listingId: string,
    input: Partial<typeof listings.$inferInsert>,
  ) {
    const [listing] = await this.database
      .update(listings)
      .set({
        ...this.pickDefined(input),
        ...(input.title && !input.slug ? { slug: slugify(input.title) } : {}),
        updated_at: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning();

    return listing ?? null;
  }

  async deleteListing(listingId: string) {
    const deleted = await this.database
      .delete(listings)
      .where(eq(listings.id, listingId))
      .returning();

    return deleted.length > 0;
  }

  async addListingMedia(input: typeof listingMedia.$inferInsert) {
    const [media] = await this.database.insert(listingMedia).values(input).returning();
    return media;
  }

  async setListingInventory(
    listingId: string,
    input: Omit<typeof listingInventory.$inferInsert, "listing_id">,
  ) {
    const existing = await this.database
      .select()
      .from(listingInventory)
      .where(eq(listingInventory.listing_id, listingId));

    if (existing.length === 0) {
      const [inventory] = await this.database
        .insert(listingInventory)
        .values({ listing_id: listingId, ...input })
        .returning();

      return inventory;
    }

    const [inventory] = await this.database
      .update(listingInventory)
      .set({ ...input, updated_at: new Date() })
      .where(eq(listingInventory.listing_id, listingId))
      .returning();

    return inventory;
  }

  async setListingServiceMeta(
    listingId: string,
    input: Omit<typeof listingServiceMeta.$inferInsert, "listing_id">,
  ) {
    const existing = await this.database
      .select()
      .from(listingServiceMeta)
      .where(eq(listingServiceMeta.listing_id, listingId));

    if (existing.length === 0) {
      const [serviceMeta] = await this.database
        .insert(listingServiceMeta)
        .values({ listing_id: listingId, ...input })
        .returning();

      return serviceMeta;
    }

    const [serviceMeta] = await this.database
      .update(listingServiceMeta)
      .set({ ...input, updated_at: new Date() })
      .where(eq(listingServiceMeta.listing_id, listingId))
      .returning();

    return serviceMeta;
  }

  async saveListing(userId: string, listingId: string) {
    const existing = await this.database
      .select()
      .from(savedListings)
      .where(
        and(
          eq(savedListings.user_id, userId),
          eq(savedListings.listing_id, listingId),
        ),
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [saved] = await this.database
      .insert(savedListings)
      .values({ user_id: userId, listing_id: listingId })
      .returning();

    return saved;
  }

  async unsaveListing(userId: string, listingId: string) {
    const deleted = await this.database
      .delete(savedListings)
      .where(
        and(
          eq(savedListings.user_id, userId),
          eq(savedListings.listing_id, listingId),
        ),
      )
      .returning();

    return deleted.length > 0;
  }
}
