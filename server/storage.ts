import { 
  users, categories, products, listings, premiumOptions, listingPremium, settings, favorites,
  type User, type InsertUser, 
  type Category, type InsertCategory, 
  type Product, type InsertProduct,
  type Listing, type InsertListing,
  type PremiumOption, type InsertPremiumOption,
  type ListingPremium,
  type Setting, type InsertSetting,
  type Favorite
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, gte, lte, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserVerification(id: string, isVerified: boolean): Promise<void>;
  updateUserPassword(id: string, password: string): Promise<void>;
  setVerificationCode(id: string, code: string, expiry: Date): Promise<void>;
  clearVerificationCode(id: string): Promise<void>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  // Listings CRUD
  getListings(filters?: {
    q?: string;
    categoryId?: string;
    region?: string;
    priceMin?: number;
    priceMax?: number;
    condition?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ listings: Listing[]; total: number; }>;
  getFeaturedListings(): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  getMyListings(userId: string): Promise<Listing[]>;
  createListing(listing: InsertListing & { sellerId: string }): Promise<Listing>;
  updateListing(id: string, userId: string, updates: Partial<InsertListing>): Promise<Listing | undefined>;
  deleteListing(id: string, userId: string): Promise<boolean>;
  setListingStatus(id: string, userId: string, status: string): Promise<boolean>;
  markListingSold(id: string, userId: string): Promise<boolean>;
  incrementViews(id: string): Promise<void>;
  incrementContacts(id: string): Promise<void>;
  
  // Premium Features
  getPremiumOptions(): Promise<PremiumOption[]>;
  createPremiumOption(option: InsertPremiumOption): Promise<PremiumOption>;
  updatePremiumOption(id: string, updates: Partial<InsertPremiumOption>): Promise<PremiumOption | undefined>;
  purchasePremium(listingId: string, premiumOptionId: string): Promise<ListingPremium>;
  getListingPremiumFeatures(listingId: string): Promise<ListingPremium[]>;
  getActivePremiumFeatures(listingId: string): Promise<ListingPremium[]>;
  
  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string, type?: string, description?: string): Promise<Setting>;
  getSettings(): Promise<Setting[]>;
  
  // Favorites
  addFavorite(userId: string, listingId: string): Promise<Favorite>;
  removeFavorite(userId: string, listingId: string): Promise<boolean>;
  getFavoriteListings(userId: string): Promise<Listing[]>;
  isFavorite(userId: string, listingId: string): Promise<boolean>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserVerification(id: string, isVerified: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isVerified: isVerified.toString() })
      .where(eq(users.id, id));
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id));
  }

  async setVerificationCode(id: string, code: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        verificationCode: code,
        verificationCodeExpiry: expiry 
      })
      .where(eq(users.id, id));
  }

  async clearVerificationCode(id: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        verificationCode: null,
        verificationCodeExpiry: null 
      })
      .where(eq(users.id, id));
  }

  // Categories implementation
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.order, categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  // Products implementation
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.featured, "true"))
      .orderBy(desc(products.createdAt))
      .limit(6);
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.categoryId, categoryId))
      .orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  // Listings implementation
  async getListings(filters: {
    q?: string;
    categoryId?: string;
    region?: string;
    priceMin?: number;
    priceMax?: number;
    condition?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ listings: Listing[]; total: number; }> {
    const { q, categoryId, region, priceMin, priceMax, condition, status = 'active', page = 1, pageSize = 20 } = filters;
    
    let query = db.select().from(listings);
    let conditions = [eq(listings.status, status)];

    // Search filters
    if (q) {
      conditions.push(
        or(
          like(listings.title, `%${q}%`),
          like(listings.description, `%${q}%`)
        )!
      );
    }

    if (categoryId) {
      conditions.push(eq(listings.categoryId, categoryId));
    }

    if (region) {
      conditions.push(eq(listings.locationRegion, region));
    }

    if (condition) {
      conditions.push(eq(listings.condition, condition));
    }

    if (priceMin !== undefined) {
      conditions.push(gte(sql`CAST(${listings.price} AS DECIMAL)`, priceMin));
    }

    if (priceMax !== undefined) {
      conditions.push(lte(sql`CAST(${listings.price} AS DECIMAL)`, priceMax));
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count
    const totalQuery = db.select({ count: count() }).from(listings);
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }
    const [{ count: total }] = await totalQuery;

    // Apply pagination and ordering
    const offset = (page - 1) * pageSize;
    const result = await query
      .orderBy(desc(listings.featured), desc(listings.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { listings: result, total };
  }

  async getFeaturedListings(): Promise<Listing[]> {
    return await db.select().from(listings)
      .where(and(
        eq(listings.featured, "true"),
        eq(listings.status, "active")
      ))
      .orderBy(desc(listings.createdAt))
      .limit(6);
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing || undefined;
  }

  async getMyListings(userId: string): Promise<Listing[]> {
    return await db.select().from(listings)
      .where(eq(listings.sellerId, userId))
      .orderBy(desc(listings.createdAt));
  }

  async createListing(insertListing: InsertListing & { sellerId: string }): Promise<Listing> {
    const [listing] = await db
      .insert(listings)
      .values({
        ...insertListing,
        updatedAt: new Date()
      })
      .returning();
    return listing;
  }

  async updateListing(id: string, userId: string, updates: Partial<InsertListing>): Promise<Listing | undefined> {
    const [listing] = await db
      .update(listings)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(listings.id, id),
        eq(listings.sellerId, userId)
      ))
      .returning();
    return listing || undefined;
  }

  async deleteListing(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(listings)
      .where(and(
        eq(listings.id, id),
        eq(listings.sellerId, userId)
      ));
    return (result.rowCount || 0) > 0;
  }

  async setListingStatus(id: string, userId: string, status: string): Promise<boolean> {
    const result = await db
      .update(listings)
      .set({ 
        status,
        updatedAt: new Date() 
      })
      .where(and(
        eq(listings.id, id),
        eq(listings.sellerId, userId)
      ));
    return (result.rowCount || 0) > 0;
  }

  async markListingSold(id: string, userId: string): Promise<boolean> {
    return this.setListingStatus(id, userId, 'sold');
  }

  async incrementViews(id: string): Promise<void> {
    await db
      .update(listings)
      .set({ 
        views: sql`${listings.views} + 1` 
      })
      .where(eq(listings.id, id));
  }

  async incrementContacts(id: string): Promise<void> {
    await db
      .update(listings)
      .set({ 
        contacts: sql`${listings.contacts} + 1` 
      })
      .where(eq(listings.id, id));
  }

  // Premium Features implementation
  async getPremiumOptions(): Promise<PremiumOption[]> {
    return await db.select().from(premiumOptions)
      .where(eq(premiumOptions.active, "true"))
      .orderBy(premiumOptions.order, premiumOptions.name);
  }

  async createPremiumOption(insertPremiumOption: InsertPremiumOption): Promise<PremiumOption> {
    const [option] = await db
      .insert(premiumOptions)
      .values(insertPremiumOption)
      .returning();
    return option;
  }

  async updatePremiumOption(id: string, updates: Partial<InsertPremiumOption>): Promise<PremiumOption | undefined> {
    const [option] = await db
      .update(premiumOptions)
      .set(updates)
      .where(eq(premiumOptions.id, id))
      .returning();
    return option || undefined;
  }

  async purchasePremium(listingId: string, premiumOptionId: string): Promise<ListingPremium> {
    // Get the premium option to calculate expiry
    const option = await db.select().from(premiumOptions)
      .where(eq(premiumOptions.id, premiumOptionId))
      .limit(1);
    
    if (!option.length) {
      throw new Error('Premium option not found');
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + option[0].durationDays);

    const [purchase] = await db
      .insert(listingPremium)
      .values({
        listingId,
        premiumOptionId,
        expiryDate
      })
      .returning();
    return purchase;
  }

  async getListingPremiumFeatures(listingId: string): Promise<ListingPremium[]> {
    return await db.select().from(listingPremium)
      .where(eq(listingPremium.listingId, listingId))
      .orderBy(desc(listingPremium.createdAt));
  }

  async getActivePremiumFeatures(listingId: string): Promise<ListingPremium[]> {
    return await db.select().from(listingPremium)
      .where(and(
        eq(listingPremium.listingId, listingId),
        gte(listingPremium.expiryDate, new Date())
      ))
      .orderBy(desc(listingPremium.createdAt));
  }

  // Settings implementation
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string, type: string = 'string', description?: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ 
          value, 
          type, 
          description: description || existing.description,
          updatedAt: new Date()
        })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({ 
          key, 
          value, 
          type, 
          description 
        })
        .returning();
      return created;
    }
  }

  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings).orderBy(settings.key);
  }

  // Favorites implementation
  async addFavorite(userId: string, listingId: string): Promise<Favorite> {
    // Check if already favorited
    const existing = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.listingId, listingId)
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }

    // Add favorite
    const [favorite] = await db.insert(favorites)
      .values({ userId, listingId })
      .returning();

    // Increment favorites count on listing
    await db.update(listings)
      .set({ favorites: sql`${listings.favorites} + 1` })
      .where(eq(listings.id, listingId));

    return favorite;
  }

  async removeFavorite(userId: string, listingId: string): Promise<boolean> {
    const result = await db.delete(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.listingId, listingId)
      ))
      .returning();

    if (result.length > 0) {
      // Decrement favorites count on listing
      await db.update(listings)
        .set({ favorites: sql`GREATEST(0, ${listings.favorites} - 1)` })
        .where(eq(listings.id, listingId));
      return true;
    }
    return false;
  }

  async getFavoriteListings(userId: string): Promise<Listing[]> {
    const results = await db.select({ listing: listings })
      .from(favorites)
      .innerJoin(listings, eq(favorites.listingId, listings.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    return results.map(r => r.listing);
  }

  async isFavorite(userId: string, listingId: string): Promise<boolean> {
    const result = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.listingId, listingId)
      ));
    
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
