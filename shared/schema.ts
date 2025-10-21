import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  phone: text("phone").unique(),
  name: text("name").notNull(),
  province: text("province"),
  role: text("role").notNull().default("user"), // "user" | "admin"
  password: text("password"),
  provider: text("provider").notNull().default("local"), // "google" | "facebook" | "local"
  providerId: text("provider_id"),
  providerEmail: text("provider_email"),
  moderationStrikes: integer("moderation_strikes").notNull().default(0),
  isBanned: text("is_banned").notNull().default("false"), // "true" | "false"
  bannedAt: timestamp("banned_at"),
  banReason: text("ban_reason"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Schema for local (email/password) registration
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Email inválido"),
  name: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .regex(/^[^0-9]*$/, "El nombre no puede contener números"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
}).pick({
  email: true,
  name: true, 
  password: true,
});

// Schema for adding phone after OAuth login
export const updatePhoneSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Formato de teléfono inválido. Use formato internacional (+53 5xxxxxxx) o local"),
  province: z.string().min(1, "Debe seleccionar una provincia"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdatePhone = z.infer<typeof updatePhoneSchema>;
export type User = typeof users.$inferSelect;

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull().default("#10b981"),
  order: integer("order").notNull().default(0),
  parentId: varchar("parent_id").references((): any => categories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  parentIdx: index("parent_idx").on(table.parentId),
}));

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("CUP"),
  imageUrl: text("image_url"),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  sellerId: varchar("seller_id").references(() => users.id, { onDelete: "cascade" }),
  province: text("province").notNull(),
  featured: text("featured").notNull().default("false"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  icon: true,
  order: true,
});

export const insertProductSchema = createInsertSchema(products, {
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Precio inválido"),
  province: z.string().min(1, "Debe seleccionar una provincia"),
}).pick({
  title: true,
  description: true,
  price: true,
  currency: true,
  imageUrl: true,
  categoryId: true,
  province: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Listings table - Main listing system
export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }), // Optional - can be null for "Precio a consultar"
  currency: text("currency").notNull().default("USD"), // "USD" | "CUP" | "EUR" | "Zelle" | "PayPal" | "Transfer"
  priceType: text("price_type").notNull().default("fixed"), // "fixed" | "consult"
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  sellerId: varchar("seller_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  locationCity: text("location_city"),
  locationRegion: text("location_region").notNull(), // province
  latitude: decimal("latitude", { precision: 10, scale: 8 }),  // Geographical coordinates
  longitude: decimal("longitude", { precision: 11, scale: 8 }), // for distance-based search
  images: text("images").array().default(sql`ARRAY[]::text[]`), // max 10 image URLs
  condition: text("condition").notNull().default("new"), // "new" | "used" | "defective"
  deliveryOption: text("delivery_option"), // "free_50km" | "paid" | "pickup" (optional)
  hasWarranty: text("has_warranty"), // "true" | "false" (optional)
  hasReceipt: text("has_receipt"), // "true" | "false" (optional)
  contactPhone: text("contact_phone").notNull(),
  contactWhatsApp: text("contact_whatsapp").notNull().default("false"), // "true" | "false"
  status: text("status").notNull().default("active"), // "active" | "paused" | "sold"
  featured: text("featured").notNull().default("false"), // "true" | "false"
  views: integer("views").notNull().default(0),
  contacts: integer("contacts").notNull().default(0),
  favorites: integer("favorites").notNull().default(0),
  moderationStatus: text("moderation_status").notNull().default("pending"), // "pending" | "approved" | "rejected" | "appealed"
  moderationReviewId: varchar("moderation_review_id"),
  isPublished: text("is_published").notNull().default("false"), // "true" | "false"
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Premium options configuration
export const premiumOptions = pgTable("premium_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // "highlight", "top", "urgent", "bump"
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("CUP"),
  durationDays: integer("duration_days").notNull().default(7),
  order: integer("order").notNull().default(0),
  active: text("active").notNull().default("true"), // "true" | "false"
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Purchased premium features
export const listingPremium = pgTable("listing_premium", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").references(() => listings.id, { onDelete: "cascade" }).notNull(),
  premiumOptionId: varchar("premium_option_id").references(() => premiumOptions.id, { onDelete: "cascade" }).notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Premium transactions (payment history)
export const premiumTransactions = pgTable("premium_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  listingId: varchar("listing_id").references(() => listings.id, { onDelete: "cascade" }).notNull(),
  premiumOptionId: varchar("premium_option_id").references(() => premiumOptions.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("CUP"),
  paymentMethod: text("payment_method").notNull().default("pending"), // "stripe" | "paypal" | "pending"
  paymentStatus: text("payment_status").notNull().default("pending"), // "pending" | "completed" | "failed" | "refunded"
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paypalOrderId: text("paypal_order_id"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  completedAt: timestamp("completed_at"),
});

// System settings
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  type: text("type").notNull().default("string"), // "string" | "number" | "boolean"
  description: text("description"),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// User favorites
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  listingId: varchar("listing_id").references(() => listings.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// User follows
export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  followeeId: varchar("followee_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  uniqueFollow: uniqueIndex("unique_follow").on(table.followerId, table.followeeId),
  followerIdx: index("follower_idx").on(table.followerId),
  followeeIdx: index("followee_idx").on(table.followeeId),
}));

// User ratings/reviews
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raterId: varchar("rater_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rateeId: varchar("ratee_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  listingId: varchar("listing_id").references(() => listings.id, { onDelete: "set null" }),
  score: integer("score").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  uniqueRating: uniqueIndex("unique_rating").on(table.raterId, table.rateeId),
  raterIdx: index("rater_idx").on(table.raterId),
  rateeIdx: index("ratee_idx").on(table.rateeId),
}));

// Saved searches
export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  searchParams: text("search_params").notNull(), // JSON string
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  userIdx: index("saved_searches_user_idx").on(table.userId),
}));

// Moderation Reviews - AI moderation results
export const moderationReviews = pgTable("moderation_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").references(() => listings.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected" | "appealed"
  aiDecision: text("ai_decision").notNull(), // "approved" | "rejected"
  aiConfidence: integer("ai_confidence").notNull(), // 0-100
  aiReasons: text("ai_reasons").array().default(sql`ARRAY[]::text[]`), // reason codes
  aiAnalysis: text("ai_analysis"), // JSON string with full AI response
  textScore: integer("text_score"), // 0-100
  imageScores: text("image_scores").array().default(sql`ARRAY[]::text[]`), // array of scores
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }), // admin ID if manual review
  reviewedAt: timestamp("reviewed_at"),
  appealReason: text("appeal_reason"),
  appealedAt: timestamp("appealed_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  listingIdx: index("moderation_reviews_listing_idx").on(table.listingId),
  statusIdx: index("moderation_reviews_status_idx").on(table.status),
}));

// Moderation Blacklist - Blocked content/users
export const moderationBlacklist = pgTable("moderation_blacklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "word" | "phone" | "user" | "email"
  value: text("value").notNull(),
  reason: text("reason").notNull(),
  isActive: text("is_active").notNull().default("true"), // "true" | "false"
  addedBy: varchar("added_by").references(() => users.id, { onDelete: "set null" }), // Nullable for system entries
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  typeIdx: index("moderation_blacklist_type_idx").on(table.type),
  valueIdx: index("moderation_blacklist_value_idx").on(table.value),
}));

// Moderation Reports - User reports
export const moderationReports = pgTable("moderation_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  listingId: varchar("listing_id").references(() => listings.id, { onDelete: "set null" }),
  reportedUserId: varchar("reported_user_id").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull(), // "spam" | "scam" | "inappropriate" | "duplicate" | "other"
  description: text("description"),
  status: text("status").notNull().default("pending"), // "pending" | "resolved" | "dismissed"
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  reporterIdx: index("moderation_reports_reporter_idx").on(table.reporterId),
  listingIdx: index("moderation_reports_listing_idx").on(table.listingId),
  statusIdx: index("moderation_reports_status_idx").on(table.status),
}));

// Moderation Settings - AI configuration
export const moderationSettings = pgTable("moderation_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  type: text("type").notNull().default("string"), // "string" | "number" | "boolean"
  description: text("description"),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Admin Users - Admin permissions
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  role: text("role").notNull().default("moderator"), // "moderator" | "admin" | "super_admin"
  permissions: text("permissions").array().default(sql`ARRAY[]::text[]`), // array of permission codes
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  userIdx: index("admin_users_user_idx").on(table.userId),
}));

// Moderation Logs - Audit trail
export const moderationLogs = pgTable("moderation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(), // "approve" | "reject" | "appeal" | "blacklist_add" | "report_create" | etc
  targetType: text("target_type").notNull(), // "listing" | "user" | "blacklist" | "report"
  targetId: varchar("target_id").notNull(),
  performedBy: varchar("performed_by").references(() => users.id, { onDelete: "set null" }), // nullable for system actions
  details: text("details"), // JSON string with additional details
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  targetIdx: index("moderation_logs_target_idx").on(table.targetType, table.targetId),
  performerIdx: index("moderation_logs_performer_idx").on(table.performedBy),
  actionIdx: index("moderation_logs_action_idx").on(table.action),
}));

// Insert schemas with validation
export const insertListingSchema = createInsertSchema(listings, {
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").max(100, "El título no puede exceder 100 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres").max(2000, "La descripción no puede exceder 2000 caracteres"),
  price: z.union([
    z.string().regex(/^\d+(\.\d{1,2})?$/, "Precio inválido"),
    z.literal(""),
    z.null()
  ]),
  currency: z.enum(["USD", "CUP", "EUR", "Zelle", "PayPal", "Transfer"], { message: "Moneda inválida" }),
  priceType: z.enum(["fixed", "consult"], { message: "Tipo de precio inválido" }),
  deliveryOption: z.enum(["free_50km", "paid", "pickup"], { message: "Opción de entrega inválida" }).optional(),
  hasWarranty: z.enum(["true", "false"], { message: "Valor de garantía inválido" }).optional(),
  hasReceipt: z.enum(["true", "false"], { message: "Valor de factura inválido" }).optional(),
  categoryId: z.string().min(1, "La categoría es requerida"),
  locationCity: z.union([
    z.string().min(2, "La ciudad debe tener al menos 2 caracteres"),
    z.literal(""),
    z.null()
  ]).optional(),
  locationRegion: z.string().min(1, "La región es requerida"),
  images: z.array(z.string().min(1, "Imagen inválida")).max(10, "Máximo 10 imágenes permitidas").default([]),
  condition: z.enum(["new", "used", "defective"], { message: "Condición inválida" }),
  contactPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Formato de teléfono inválido"),
  contactWhatsApp: z.enum(["true", "false"], { message: "Valor WhatsApp inválido" }),
}).pick({
  title: true,
  description: true,
  price: true,
  currency: true,
  priceType: true,
  categoryId: true,
  locationCity: true,
  locationRegion: true,
  images: true,
  condition: true,
  deliveryOption: true,
  hasWarranty: true,
  hasReceipt: true,
  contactPhone: true,
  contactWhatsApp: true,
});

export const insertPremiumOptionSchema = createInsertSchema(premiumOptions).pick({
  code: true,
  name: true,
  description: true,
  price: true,
  currency: true,
  durationDays: true,
  order: true,
});

export const insertPremiumTransactionSchema = createInsertSchema(premiumTransactions).pick({
  userId: true,
  listingId: true,
  premiumOptionId: true,
  amount: true,
  currency: true,
  paymentMethod: true,
  paymentStatus: true,
});

export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
  type: true,
  description: true,
});

export const insertRatingSchema = createInsertSchema(ratings, {
  score: z.number().int().min(1, "La calificación debe ser al menos 1").max(5, "La calificación no puede exceder 5"),
  comment: z.string().max(500, "El comentario no puede exceder 500 caracteres").optional(),
}).pick({
  rateeId: true,
  listingId: true,
  score: true,
  comment: true,
});

export const insertSavedSearchSchema = createInsertSchema(savedSearches, {
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede exceder 100 caracteres"),
  searchParams: z.string().min(1, "Los parámetros de búsqueda son requeridos"),
}).pick({
  name: true,
  searchParams: true,
});

export const insertModerationReviewSchema = createInsertSchema(moderationReviews, {
  aiConfidence: z.number().int().min(0).max(100),
  textScore: z.number().int().min(0).max(100).optional(),
}).pick({
  listingId: true,
  aiDecision: true,
  aiConfidence: true,
  aiReasons: true,
  aiAnalysis: true,
  textScore: true,
  imageScores: true,
});

export const insertModerationBlacklistSchema = createInsertSchema(moderationBlacklist, {
  value: z.string().min(1, "El valor es requerido"),
  reason: z.string().min(1, "La razón es requerida"),
  isActive: z.enum(["true", "false"]).default("true"),
  addedBy: z.string().nullable().optional(),
}).pick({
  type: true,
  value: true,
  reason: true,
  addedBy: true,
  isActive: true,
});

export const insertModerationReportSchema = createInsertSchema(moderationReports, {
  reason: z.enum(["spam", "scam", "inappropriate", "duplicate", "other"], { message: "Razón inválida" }),
  description: z.string().max(500, "La descripción no puede exceder 500 caracteres").optional(),
  status: z.enum(["pending", "resolved", "dismissed"]).default("pending"),
}).pick({
  reporterId: true,
  listingId: true,
  reportedUserId: true,
  reason: true,
  description: true,
  status: true,
});

export const insertModerationSettingSchema = createInsertSchema(moderationSettings).pick({
  key: true,
  value: true,
  type: true,
  description: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers, {
  role: z.enum(["moderator", "admin", "super_admin"], { message: "Rol inválido" }),
}).pick({
  userId: true,
  role: true,
  permissions: true,
  createdBy: true,
});

export const insertModerationLogSchema = createInsertSchema(moderationLogs).pick({
  action: true,
  targetType: true,
  targetId: true,
  performedBy: true,
  details: true,
});

// Type exports
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertPremiumOption = z.infer<typeof insertPremiumOptionSchema>;
export type PremiumOption = typeof premiumOptions.$inferSelect;
export type ListingPremium = typeof listingPremium.$inferSelect;
export type InsertPremiumTransaction = z.infer<typeof insertPremiumTransactionSchema>;
export type PremiumTransaction = typeof premiumTransactions.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertModerationReview = z.infer<typeof insertModerationReviewSchema>;
export type ModerationReview = typeof moderationReviews.$inferSelect;
export type InsertModerationBlacklist = z.infer<typeof insertModerationBlacklistSchema>;
export type ModerationBlacklist = typeof moderationBlacklist.$inferSelect;
export type InsertModerationReport = z.infer<typeof insertModerationReportSchema>;
export type ModerationReport = typeof moderationReports.$inferSelect;
export type InsertModerationSetting = z.infer<typeof insertModerationSettingSchema>;
export type ModerationSetting = typeof moderationSettings.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;
export type ModerationLog = typeof moderationLogs.$inferSelect;

// Banners table - Advertisement banners
export const banners = pgTable("banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  position: text("position").notNull(), // "header" | "sidebar" | "footer" | "mobile" | "category"
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  isActive: text("is_active").notNull().default("true"), // "true" | "false"
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
}, (table) => ({
  positionIdx: index("banner_position_idx").on(table.position),
}));

export const insertBannerSchema = createInsertSchema(banners, {
  position: z.enum(["header", "sidebar", "footer", "category"], { message: "Position inválida" }),
  imageUrl: z.string().url("URL de imagen inválida"),
  linkUrl: z.string().url("URL de enlace inválida").optional(),
  isActive: z.enum(["true", "false"]).default("true"),
  displayOrder: z.number().int().min(0).default(0),
}).pick({
  position: true,
  imageUrl: true,
  linkUrl: true,
  isActive: true,
  displayOrder: true,
});

// Sponsored listings table
export const sponsoredListings = pgTable("sponsored_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").references(() => listings.id, { onDelete: "cascade" }).notNull(),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: text("is_active").notNull().default("true"), // "true" | "false"
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  listingIdx: index("sponsored_listing_idx").on(table.listingId),
  categoryIdx: index("sponsored_category_idx").on(table.categoryId),
  expiresIdx: index("sponsored_expires_idx").on(table.expiresAt),
}));

export const insertSponsoredListingSchema = createInsertSchema(sponsoredListings, {
  expiresAt: z.coerce.date(),
  isActive: z.enum(["true", "false"]).default("true"),
  displayOrder: z.number().int().min(0).default(0),
}).pick({
  listingId: true,
  categoryId: true,
  expiresAt: true,
  isActive: true,
  displayOrder: true,
});

export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;
export type InsertSponsoredListing = z.infer<typeof insertSponsoredListingSchema>;
export type SponsoredListing = typeof sponsoredListings.$inferSelect;
