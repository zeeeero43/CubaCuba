import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
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
  phone: z.string().regex(/^[567]\d{7}$/, "Formato de teléfono cubano inválido"),
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
