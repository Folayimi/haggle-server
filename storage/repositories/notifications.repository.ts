import { desc, eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  notificationDeliveries,
  notifications,
} from "../../src/db/schema/notifications";

export class NotificationsRepository extends BaseRepository {
  async listForUser(userId: string) {
    return this.database
      .select()
      .from(notifications)
      .where(eq(notifications.user_id, userId))
      .orderBy(desc(notifications.created_at));
  }

  async createNotification(input: typeof notifications.$inferInsert) {
    const [notification] = await this.database
      .insert(notifications)
      .values(input)
      .returning();

    return notification;
  }

  async markAsRead(notificationId: string) {
    const [notification] = await this.database
      .update(notifications)
      .set({ read_at: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();

    return notification ?? null;
  }

  async createDelivery(input: typeof notificationDeliveries.$inferInsert) {
    const [delivery] = await this.database
      .insert(notificationDeliveries)
      .values(input)
      .returning();

    return delivery;
  }
}
