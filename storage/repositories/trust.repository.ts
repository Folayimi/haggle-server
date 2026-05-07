import { desc, eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  blocks,
  reports,
  reviews,
  verificationSubmissions,
} from "../../src/db/schema/trust";

export class TrustRepository extends BaseRepository {
  async createReview(input: typeof reviews.$inferInsert) {
    const [review] = await this.database.insert(reviews).values(input).returning();
    return review;
  }

  async getRatingsForUser(userId: string) {
    return this.database
      .select()
      .from(reviews)
      .where(eq(reviews.reviewed_user_id, userId))
      .orderBy(desc(reviews.created_at));
  }

  async createVerificationSubmission(
    input: typeof verificationSubmissions.$inferInsert,
  ) {
    const [submission] = await this.database
      .insert(verificationSubmissions)
      .values(input)
      .returning();

    return submission;
  }

  async createReport(input: typeof reports.$inferInsert) {
    const [report] = await this.database.insert(reports).values(input).returning();
    return report;
  }

  async createBlock(input: typeof blocks.$inferInsert) {
    const [block] = await this.database.insert(blocks).values(input).returning();
    return block;
  }
}
