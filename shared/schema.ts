import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer } from "drizzle-orm/pg-core";
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
  nameEn: text("name_en").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull().default("#10b981"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

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
  nameEn: true,
  icon: true,
  color: true,
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
