import { db } from "./db";
import { eq, desc, and, or, count, sql } from "drizzle-orm";
import {
  moderationReviews, moderationBlacklist, moderationReports, moderationSettings, adminUsers, moderationLogs, listings,
  type ModerationReview, type InsertModerationReview,
  type ModerationBlacklist, type InsertModerationBlacklist,
  type ModerationReport, type InsertModerationReport,
  type ModerationSetting, type InsertModerationSetting,
  type AdminUser, type InsertAdminUser,
  type ModerationLog, type InsertModerationLog,
  type Listing
} from "@shared/schema";

export class ModerationStorage {
  async createModerationReview(review: InsertModerationReview): Promise<ModerationReview> {
    const [created] = await db.insert(moderationReviews)
      .values(review)
      .returning();
    return created;
  }

  async getModerationReview(id: string): Promise<ModerationReview | undefined> {
    const [review] = await db.select().from(moderationReviews).where(eq(moderationReviews.id, id));
    return review || undefined;
  }

  async getModerationReviewByListing(listingId: string): Promise<ModerationReview | undefined> {
    const [review] = await db.select().from(moderationReviews)
      .where(eq(moderationReviews.listingId, listingId))
      .orderBy(desc(moderationReviews.createdAt))
      .limit(1);
    return review || undefined;
  }

  async updateModerationReview(id: string, updates: Partial<ModerationReview>): Promise<ModerationReview | undefined> {
    const [updated] = await db.update(moderationReviews)
      .set(updates)
      .where(eq(moderationReviews.id, id))
      .returning();
    return updated || undefined;
  }

  async getPendingReviews(options: { limit?: number; offset?: number } = {}): Promise<{ items: ModerationReview[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [{ count: total }] = await db.select({ count: count() })
      .from(moderationReviews)
      .where(eq(moderationReviews.status, "pending"));

    const items = await db.select().from(moderationReviews)
      .where(eq(moderationReviews.status, "pending"))
      .orderBy(desc(moderationReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, total };
  }

  async getAppealedReviews(options: { limit?: number; offset?: number } = {}): Promise<{ items: ModerationReview[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [{ count: total }] = await db.select({ count: count() })
      .from(moderationReviews)
      .where(eq(moderationReviews.status, "appealed"));

    const items = await db.select().from(moderationReviews)
      .where(eq(moderationReviews.status, "appealed"))
      .orderBy(desc(moderationReviews.appealedAt))
      .limit(limit)
      .offset(offset);

    return { items, total };
  }

  async getModerationStats(): Promise<{
    totalReviews: number;
    pending: number;
    approved: number;
    rejected: number;
    appealed: number;
  }> {
    const [stats] = await db.select({
      totalReviews: count(),
      pending: sql<number>`COUNT(*) FILTER (WHERE ${moderationReviews.status} = 'pending')`,
      approved: sql<number>`COUNT(*) FILTER (WHERE ${moderationReviews.status} = 'approved')`,
      rejected: sql<number>`COUNT(*) FILTER (WHERE ${moderationReviews.status} = 'rejected')`,
      appealed: sql<number>`COUNT(*) FILTER (WHERE ${moderationReviews.status} = 'appealed')`,
    }).from(moderationReviews);

    return stats || { totalReviews: 0, pending: 0, approved: 0, rejected: 0, appealed: 0 };
  }

  async createBlacklistItem(item: InsertModerationBlacklist): Promise<ModerationBlacklist> {
    const [created] = await db.insert(moderationBlacklist)
      .values(item)
      .returning();
    return created;
  }

  async getBlacklist(type?: string): Promise<ModerationBlacklist[]> {
    if (type) {
      return await db.select().from(moderationBlacklist)
        .where(and(
          eq(moderationBlacklist.type, type),
          eq(moderationBlacklist.isActive, "true")
        ))
        .orderBy(desc(moderationBlacklist.createdAt));
    }

    return await db.select().from(moderationBlacklist)
      .where(eq(moderationBlacklist.isActive, "true"))
      .orderBy(desc(moderationBlacklist.createdAt));
  }

  async getBlacklistItem(id: string): Promise<ModerationBlacklist | undefined> {
    const [item] = await db.select().from(moderationBlacklist).where(eq(moderationBlacklist.id, id));
    return item || undefined;
  }

  async updateBlacklistItem(id: string, updates: Partial<ModerationBlacklist>): Promise<ModerationBlacklist | undefined> {
    const [updated] = await db.update(moderationBlacklist)
      .set(updates)
      .where(eq(moderationBlacklist.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBlacklistItem(id: string): Promise<boolean> {
    const result = await db.delete(moderationBlacklist)
      .where(eq(moderationBlacklist.id, id));
    return (result.rowCount || 0) > 0;
  }

  async checkBlacklist(type: string, value: string): Promise<boolean> {
    const items = await db.select().from(moderationBlacklist)
      .where(and(
        eq(moderationBlacklist.type, type),
        eq(moderationBlacklist.value, value.toLowerCase()),
        eq(moderationBlacklist.isActive, "true")
      ));
    return items.length > 0;
  }

  async createModerationReport(report: InsertModerationReport): Promise<ModerationReport> {
    const [created] = await db.insert(moderationReports)
      .values(report)
      .returning();
    return created;
  }

  async getModerationReport(id: string): Promise<ModerationReport | undefined> {
    const [report] = await db.select().from(moderationReports).where(eq(moderationReports.id, id));
    return report || undefined;
  }

  async getUserReports(userId: string): Promise<ModerationReport[]> {
    return await db.select().from(moderationReports)
      .where(eq(moderationReports.reporterId, userId))
      .orderBy(desc(moderationReports.createdAt));
  }

  async getListingReports(listingId: string): Promise<ModerationReport[]> {
    return await db.select().from(moderationReports)
      .where(eq(moderationReports.listingId, listingId))
      .orderBy(desc(moderationReports.createdAt));
  }

  async getPendingReports(options: { limit?: number; offset?: number } = {}): Promise<{ items: ModerationReport[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [{ count: total }] = await db.select({ count: count() })
      .from(moderationReports)
      .where(eq(moderationReports.status, "pending"));

    const items = await db.select().from(moderationReports)
      .where(eq(moderationReports.status, "pending"))
      .orderBy(desc(moderationReports.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, total };
  }

  async resolveReport(id: string, resolvedBy: string, resolution: string): Promise<ModerationReport | undefined> {
    const [updated] = await db.update(moderationReports)
      .set({
        status: "resolved",
        resolvedBy,
        resolvedAt: new Date(),
        resolution
      })
      .where(eq(moderationReports.id, id))
      .returning();
    return updated || undefined;
  }

  async getModerationSetting(key: string): Promise<ModerationSetting | undefined> {
    const [setting] = await db.select().from(moderationSettings).where(eq(moderationSettings.key, key));
    return setting || undefined;
  }

  async setModerationSetting(key: string, value: string, type: string = 'string', description?: string): Promise<ModerationSetting> {
    const existing = await this.getModerationSetting(key);

    if (existing) {
      const [updated] = await db.update(moderationSettings)
        .set({ 
          value, 
          type, 
          description: description || existing.description,
          updatedAt: new Date()
        })
        .where(eq(moderationSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(moderationSettings)
        .values({ key, value, type, description })
        .returning();
      return created;
    }
  }

  async getModerationSettings(): Promise<ModerationSetting[]> {
    return await db.select().from(moderationSettings).orderBy(moderationSettings.key);
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db.insert(adminUsers)
      .values(admin)
      .returning();
    return created;
  }

  async getAdminUser(userId: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.userId, userId));
    return admin || undefined;
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined> {
    const [updated] = await db.update(adminUsers)
      .set(updates)
      .where(eq(adminUsers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    const result = await db.delete(adminUsers).where(eq(adminUsers.id, id));
    return (result.rowCount || 0) > 0;
  }

  async isAdmin(userId: string): Promise<boolean> {
    const admin = await this.getAdminUser(userId);
    return !!admin;
  }

  async createModerationLog(log: InsertModerationLog): Promise<ModerationLog> {
    const [created] = await db.insert(moderationLogs)
      .values(log)
      .returning();
    return created;
  }

  async getModerationLogs(options: { 
    targetType?: string;
    targetId?: string;
    performedBy?: string;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: ModerationLog[]; total: number }> {
    const { targetType, targetId, performedBy, action, limit = 50, offset = 0 } = options;

    const conditions = [];
    if (targetType) conditions.push(eq(moderationLogs.targetType, targetType));
    if (targetId) conditions.push(eq(moderationLogs.targetId, targetId));
    if (performedBy) conditions.push(eq(moderationLogs.performedBy, performedBy));
    if (action) conditions.push(eq(moderationLogs.action, action));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db.select({ count: count() })
      .from(moderationLogs)
      .where(whereClause);

    const items = await db.select().from(moderationLogs)
      .where(whereClause)
      .orderBy(desc(moderationLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, total };
  }

  async updateListingModeration(listingId: string, status: string, reviewId?: string): Promise<Listing | undefined> {
    const [updated] = await db.update(listings)
      .set({
        moderationStatus: status,
        moderationReviewId: reviewId || null,
        updatedAt: new Date()
      })
      .where(eq(listings.id, listingId))
      .returning();
    return updated || undefined;
  }

  async publishListing(listingId: string): Promise<Listing | undefined> {
    const [updated] = await db.update(listings)
      .set({
        isPublished: "true",
        moderationStatus: "approved",
        updatedAt: new Date()
      })
      .where(eq(listings.id, listingId))
      .returning();
    return updated || undefined;
  }

  async unpublishListing(listingId: string): Promise<Listing | undefined> {
    const [updated] = await db.update(listings)
      .set({
        isPublished: "false",
        updatedAt: new Date()
      })
      .where(eq(listings.id, listingId))
      .returning();
    return updated || undefined;
  }
}
