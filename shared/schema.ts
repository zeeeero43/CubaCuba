import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  province: text("province").notNull(),
  password: text("password").notNull(),
  isVerified: text("is_verified").notNull().default("false"),
  verificationCode: text("verification_code"),
  verificationCodeExpiry: timestamp("verification_code_expiry"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Formato de teléfono inválido. Use formato internacional (+1 305123456) o local"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  province: z.string().min(1, "Debe seleccionar una provincia"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
}).pick({
  phone: true,
  name: true, 
  province: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull().default("#10b981"),
  order: integer("order").notNull().default(0),
  parentId: varchar("parent_id").references((): any => categories.id),
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
  categoryId: varchar("category_id").references(() => categories.id),
  sellerId: varchar("seller_id").references(() => users.id),
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
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("CUP"),
  priceType: text("price_type").notNull().default("fixed"), // "fixed" | "negotiable"
  categoryId: varchar("category_id").references(() => categories.id),
  sellerId: varchar("seller_id").references(() => users.id).notNull(),
  locationCity: text("location_city").notNull(),
  locationRegion: text("location_region").notNull(), // province
  images: text("images").array().default(sql`ARRAY[]::text[]`), // max 8 image URLs
  condition: text("condition").notNull().default("used"), // "new" | "used" | "defective"
  contactPhone: text("contact_phone").notNull(),
  contactWhatsApp: text("contact_whatsapp").notNull().default("false"), // "true" | "false"
  status: text("status").notNull().default("active"), // "active" | "paused" | "sold"
  featured: text("featured").notNull().default("false"), // "true" | "false"
  views: integer("views").notNull().default(0),
  contacts: integer("contacts").notNull().default(0),
  favorites: integer("favorites").notNull().default(0),
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
  listingId: varchar("listing_id").references(() => listings.id).notNull(),
  premiumOptionId: varchar("premium_option_id").references(() => premiumOptions.id).notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
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
  userId: varchar("user_id").references(() => users.id).notNull(),
  listingId: varchar("listing_id").references(() => listings.id).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// User follows
export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").references(() => users.id).notNull(),
  followeeId: varchar("followee_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  uniqueFollow: uniqueIndex("unique_follow").on(table.followerId, table.followeeId),
  followerIdx: index("follower_idx").on(table.followerId),
  followeeIdx: index("followee_idx").on(table.followeeId),
}));

// User ratings/reviews
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raterId: varchar("rater_id").references(() => users.id).notNull(),
  rateeId: varchar("ratee_id").references(() => users.id).notNull(),
  listingId: varchar("listing_id").references(() => listings.id),
  score: integer("score").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
}, (table) => ({
  uniqueRating: uniqueIndex("unique_rating").on(table.raterId, table.rateeId),
  raterIdx: index("rater_idx").on(table.raterId),
  rateeIdx: index("ratee_idx").on(table.rateeId),
}));

// Insert schemas with validation
export const insertListingSchema = createInsertSchema(listings, {
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").max(100, "El título no puede exceder 100 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres").max(2000, "La descripción no puede exceder 2000 caracteres"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Precio inválido"),
  priceType: z.enum(["fixed", "negotiable"], { message: "Tipo de precio inválido" }),
  locationCity: z.string().min(2, "La ciudad es requerida"),
  locationRegion: z.string().min(1, "La región es requerida"),
  images: z.array(z.string().min(1, "Imagen inválida")).max(8, "Máximo 8 imágenes permitidas").default([]),
  condition: z.enum(["new", "used", "defective"], { message: "Condición inválida" }),
  contactPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Formato de teléfono inválido"),
  contactWhatsApp: z.enum(["true", "false"], { message: "Valor WhatsApp inválido" }),
}).pick({
  title: true,
  description: true,
  price: true,
  priceType: true,
  categoryId: true,
  locationCity: true,
  locationRegion: true,
  images: true,
  condition: true,
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

// Type exports
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertPremiumOption = z.infer<typeof insertPremiumOptionSchema>;
export type PremiumOption = typeof premiumOptions.$inferSelect;
export type ListingPremium = typeof listingPremium.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;
