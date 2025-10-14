import { 
  users, categories, products, listings, premiumOptions, listingPremium, settings, favorites, follows, ratings, savedSearches,
  moderationReviews, moderationBlacklist, moderationReports, moderationSettings, adminUsers, moderationLogs,
  banners, sponsoredListings,
  type User, type InsertUser, 
  type Category, type InsertCategory, 
  type Product, type InsertProduct,
  type Listing, type InsertListing,
  type PremiumOption, type InsertPremiumOption,
  type ListingPremium,
  type Setting, type InsertSetting,
  type Favorite,
  type Follow,
  type Rating, type InsertRating,
  type SavedSearch, type InsertSavedSearch,
  type ModerationReview, type InsertModerationReview,
  type ModerationBlacklist, type InsertModerationBlacklist,
  type ModerationReport, type InsertModerationReport,
  type ModerationSetting, type InsertModerationSetting,
  type AdminUser, type InsertAdminUser,
  type ModerationLog, type InsertModerationLog,
  type Banner, type InsertBanner,
  type SponsoredListing, type InsertSponsoredListing
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, gte, lte, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderId(provider: string, providerId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  createOAuthUser(user: { email: string; name: string; provider: string; providerId: string; providerEmail: string }): Promise<User>;
  updateUserOAuth(id: string, oauth: { provider: string; providerId: string; providerEmail: string }): Promise<User>;
  updateUserPhone(id: string, phone: string, province: string): Promise<User>;
  updateUserProfile(id: string, updates: { name?: string; email?: string; province?: string }): Promise<User>;
  updateUserPassword(id: string, password: string): Promise<void>;
  updateUserStrikes(id: string, strikes: number): Promise<void>;
  banUser(id: string, reason: string): Promise<void>;
  unbanUser(id: string): Promise<void>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoriesTree(): Promise<{ mainCategories: Category[]; subcategories: Record<string, Category[]> }>;
  getCategory(id: string): Promise<Category | undefined>;
  getSubcategories(parentId: string): Promise<Category[]>;
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
    sellerId?: string;
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
  deleteListingAsAdmin(id: string): Promise<boolean>;
  setListingStatus(id: string, userId: string, status: string): Promise<boolean>;
  markListingSold(id: string, userId: string): Promise<boolean>;
  incrementViews(id: string): Promise<void>;
  incrementContacts(id: string): Promise<void>;
  
  // Premium Features
  getPremiumOptions(): Promise<PremiumOption[]>;
  getAllPremiumOptions(): Promise<PremiumOption[]>; // Admin: get all including disabled
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
  
  // Follows
  followUser(followerId: string, followeeId: string): Promise<Follow>;
  unfollowUser(followerId: string, followeeId: string): Promise<boolean>;
  isFollowing(followerId: string, followeeId: string): Promise<boolean>;
  getFollowedListings(userId: string, limit?: number): Promise<Listing[]>;
  
  // User Profile
  getUserPublicProfile(userId: string): Promise<{
    user: Pick<User, 'id' | 'name' | 'createdAt'>;
    followersCount: number;
    followingCount: number;
    avgRating: number;
    ratingsCount: number;
  } | undefined>;
  
  // Ratings
  createRating(rating: InsertRating & { raterId: string }): Promise<Rating>;
  getUserRatings(rateeId: string, options?: { limit?: number; offset?: number }): Promise<{ items: Rating[]; total: number; avg: number; }>;
  getUserRatingSummary(rateeId: string): Promise<{ avg: number; count: number; }>
  
  // Search
  searchListings(params: {
    q?: string;
    categoryId?: string;
    subcategoryId?: string;
    region?: string;
    priceMin?: number;
    priceMax?: number;
    condition?: string;
    priceType?: string;
    dateFilter?: string;
    hasImages?: boolean;
    excludeTerms?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
  }): Promise<{ listings: Listing[]; total: number; }>;
  getSearchSuggestions(query: string, limit?: number): Promise<string[]>;
  
  // Saved Searches
  saveSearch(userId: string, search: InsertSavedSearch): Promise<SavedSearch>;
  getSavedSearches(userId: string): Promise<SavedSearch[]>;
  deleteSavedSearch(id: string, userId: string): Promise<boolean>;
  
  // Moderation Reviews
  createModerationReview(review: InsertModerationReview): Promise<ModerationReview>;
  getModerationReview(id: string): Promise<ModerationReview | undefined>;
  getModerationReviewByListing(listingId: string): Promise<ModerationReview | undefined>;
  updateModerationReview(id: string, updates: Partial<ModerationReview>): Promise<ModerationReview | undefined>;
  getPendingReviews(options?: { limit?: number; offset?: number }): Promise<{ items: ModerationReview[]; total: number }>;
  getAppealedReviews(options?: { limit?: number; offset?: number }): Promise<{ items: ModerationReview[]; total: number }>;
  getModerationStats(): Promise<{
    totalReviews: number;
    pending: number;
    approved: number;
    rejected: number;
    appealed: number;
  }>;
  
  // Moderation Blacklist
  createBlacklistItem(item: InsertModerationBlacklist): Promise<ModerationBlacklist>;
  getBlacklist(type?: string): Promise<ModerationBlacklist[]>;
  getBlacklistItem(id: string): Promise<ModerationBlacklist | undefined>;
  updateBlacklistItem(id: string, updates: Partial<ModerationBlacklist>): Promise<ModerationBlacklist | undefined>;
  deleteBlacklistItem(id: string): Promise<boolean>;
  checkBlacklist(type: string, value: string): Promise<boolean>;
  
  // Moderation Reports
  createModerationReport(report: InsertModerationReport): Promise<ModerationReport>;
  getModerationReport(id: string): Promise<ModerationReport | undefined>;
  getUserReports(userId: string): Promise<ModerationReport[]>;
  getListingReports(listingId: string): Promise<ModerationReport[]>;
  getPendingReports(options?: { limit?: number; offset?: number }): Promise<{ items: ModerationReport[]; total: number }>;
  resolveReport(id: string, resolvedBy: string, resolution: string): Promise<ModerationReport | undefined>;
  
  // Moderation Settings
  getModerationSetting(key: string): Promise<ModerationSetting | undefined>;
  setModerationSetting(key: string, value: string, type?: string, description?: string): Promise<ModerationSetting>;
  getModerationSettings(): Promise<ModerationSetting[]>;
  
  // Admin Users
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  getAdminUser(userId: string): Promise<AdminUser | undefined>;
  getAdminUsers(): Promise<AdminUser[]>;
  updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined>;
  deleteAdminUser(id: string): Promise<boolean>;
  isAdmin(userId: string): Promise<boolean>;
  
  // Moderation Logs
  createModerationLog(log: InsertModerationLog): Promise<ModerationLog>;
  getModerationLogs(options?: { 
    targetType?: string;
    targetId?: string;
    performedBy?: string;
    action?: string;
    limit?: number;
    offset?: number;
    createdAfter?: Date;
  }): Promise<{ items: ModerationLog[]; total: number }>;
  
  // Listing Moderation
  updateListingModeration(listingId: string, status: string, reviewId?: string): Promise<Listing | undefined>;
  publishListing(listingId: string): Promise<Listing | undefined>;
  unpublishListing(listingId: string): Promise<Listing | undefined>;
  
  // Banners
  getBanners(position?: string): Promise<Banner[]>;
  getActiveBanners(position?: string): Promise<Banner[]>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: string, updates: Partial<InsertBanner>): Promise<Banner | undefined>;
  deleteBanner(id: string): Promise<boolean>;
  toggleBannerActive(id: string): Promise<Banner | undefined>;
  
  // Sponsored Listings
  getSponsoredListings(): Promise<SponsoredListing[]>;
  getActiveSponsoredListings(categoryId?: string): Promise<SponsoredListing[]>;
  createSponsoredListing(sponsored: InsertSponsoredListing): Promise<SponsoredListing>;
  updateSponsoredListing(id: string, updates: Partial<InsertSponsoredListing>): Promise<SponsoredListing | undefined>;
  deleteSponsoredListing(id: string): Promise<boolean>;
  
  // Category Management
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  reorderCategories(categoryOrders: { id: string; order: number }[]): Promise<void>;
  
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id));
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id); // Alias for getUser
  }

  async updateUserStrikes(id: string, strikes: number): Promise<void> {
    await db
      .update(users)
      .set({ moderationStrikes: strikes })
      .where(eq(users.id, id));
  }

  async banUser(id: string, reason: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        isBanned: "true",
        bannedAt: new Date(),
        banReason: reason
      })
      .where(eq(users.id, id));
  }

  async unbanUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        isBanned: "false",
        bannedAt: null,
        banReason: null
      })
      .where(eq(users.id, id));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(and(
        eq(users.provider, provider),
        eq(users.providerId, providerId)
      ));
    return user || undefined;
  }

  async createOAuthUser(user: { 
    email: string; 
    name: string; 
    provider: string; 
    providerId: string; 
    providerEmail: string 
  }): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        email: user.email,
        name: user.name,
        provider: user.provider,
        providerId: user.providerId,
        providerEmail: user.providerEmail,
      })
      .returning();
    return newUser;
  }

  async updateUserOAuth(id: string, oauth: { 
    provider: string; 
    providerId: string; 
    providerEmail: string 
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        provider: oauth.provider,
        providerId: oauth.providerId,
        providerEmail: oauth.providerEmail,
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPhone(id: string, phone: string, province: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ phone, province })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserProfile(id: string, updates: { name?: string; email?: string; province?: string }): Promise<User> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.province !== undefined) updateData.province = updates.province;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Categories implementation
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.order, categories.name);
  }

  async getCategoriesTree(): Promise<{ mainCategories: Category[]; subcategories: Record<string, Category[]> }> {
    const allCategories = await db.select().from(categories).orderBy(categories.order, categories.name);
    
    const mainCategories = allCategories.filter(cat => !cat.parentId);
    const subcategories: Record<string, Category[]> = {};
    
    // Group subcategories by parent
    for (const cat of allCategories) {
      if (cat.parentId) {
        if (!subcategories[cat.parentId]) {
          subcategories[cat.parentId] = [];
        }
        subcategories[cat.parentId].push(cat);
      }
    }
    
    return { mainCategories, subcategories };
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getSubcategories(parentId: string): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.parentId, parentId)).orderBy(categories.order, categories.name);
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
    sellerId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ listings: Listing[]; total: number; }> {
    const { q, categoryId, region, priceMin, priceMax, condition, sellerId, status = 'active', page = 1, pageSize = 20 } = filters;
    
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

    if (sellerId) {
      conditions.push(eq(listings.sellerId, sellerId));
    }

    if (priceMin !== undefined) {
      conditions.push(gte(sql`CAST(${listings.price} AS DECIMAL)`, priceMin));
    }

    if (priceMax !== undefined) {
      conditions.push(lte(sql`CAST(${listings.price} AS DECIMAL)`, priceMax));
    }

    // Build query with conditions
    const whereClause = and(...conditions);

    // Get total count
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(listings)
      .where(whereClause);

    // Apply pagination and ordering
    const offset = (page - 1) * pageSize;
    const result = await db
      .select()
      .from(listings)
      .where(whereClause)
      .orderBy(desc(listings.featured), desc(listings.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { listings: result, total };
  }

  async getFeaturedListings(): Promise<Listing[]> {
    return await db.select().from(listings)
      .where(eq(listings.status, "active"))
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

  async deleteListingAsAdmin(id: string): Promise<boolean> {
    const result = await db
      .delete(listings)
      .where(eq(listings.id, id));
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

  async getAllPremiumOptions(): Promise<PremiumOption[]> {
    return await db.select().from(premiumOptions)
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

  // Follows implementation
  async followUser(followerId: string, followeeId: string): Promise<Follow> {
    // Check if already following
    const existing = await db.select().from(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followeeId, followeeId)
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }

    // Add follow
    const [follow] = await db.insert(follows)
      .values({ followerId, followeeId })
      .returning();
    
    return follow;
  }

  async unfollowUser(followerId: string, followeeId: string): Promise<boolean> {
    const result = await db.delete(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followeeId, followeeId)
      ))
      .returning();

    return result.length > 0;
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const result = await db.select().from(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followeeId, followeeId)
      ));
    
    return result.length > 0;
  }

  async getFollowedListings(userId: string, limit: number = 20): Promise<Listing[]> {
    // Get list of followed user IDs
    const followedUsers = await db.select({ followeeId: follows.followeeId })
      .from(follows)
      .where(eq(follows.followerId, userId));
    
    if (followedUsers.length === 0) {
      return [];
    }

    const followedIds = followedUsers.map(f => f.followeeId);

    // Get active listings from followed users
    const result = await db.select().from(listings)
      .where(and(
        eq(listings.status, 'active'),
        sql`${listings.sellerId} = ANY(${followedIds})`
      ))
      .orderBy(desc(listings.createdAt))
      .limit(limit);

    return result;
  }

  // User Profile implementation
  async getUserPublicProfile(userId: string): Promise<{
    user: Pick<User, 'id' | 'name' | 'createdAt'>;
    followersCount: number;
    followingCount: number;
    avgRating: number;
    ratingsCount: number;
  } | undefined> {
    // Get user
    const user = await this.getUser(userId);
    if (!user) return undefined;

    // Get followers count
    const [followersResult] = await db.select({ count: count() })
      .from(follows)
      .where(eq(follows.followeeId, userId));
    
    // Get following count
    const [followingResult] = await db.select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, userId));

    // Get rating summary
    const ratingSummary = await this.getUserRatingSummary(userId);

    return {
      user: {
        id: user.id,
        name: user.name,
        createdAt: user.createdAt
      },
      followersCount: followersResult.count,
      followingCount: followingResult.count,
      avgRating: ratingSummary.avg,
      ratingsCount: ratingSummary.count
    };
  }

  // Ratings implementation
  async createRating(ratingData: InsertRating & { raterId: string }): Promise<Rating> {
    const [rating] = await db.insert(ratings)
      .values(ratingData)
      .returning();
    
    return rating;
  }

  async getUserRatings(rateeId: string, options: { limit?: number; offset?: number } = {}): Promise<{ items: Rating[]; total: number; avg: number; }> {
    const { limit = 10, offset = 0 } = options;

    // Get total count and average
    const [summaryResult] = await db.select({ 
      count: count(),
      avg: sql<number>`COALESCE(AVG(${ratings.score}), 0)`
    })
      .from(ratings)
      .where(eq(ratings.rateeId, rateeId));

    // Get ratings with pagination
    const items = await db.select().from(ratings)
      .where(eq(ratings.rateeId, rateeId))
      .orderBy(desc(ratings.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total: summaryResult.count,
      avg: Number(summaryResult.avg) || 0
    };
  }

  async getUserRatingSummary(rateeId: string): Promise<{ avg: number; count: number; }> {
    const [result] = await db.select({ 
      count: count(),
      avg: sql<number>`COALESCE(AVG(${ratings.score}), 0)`
    })
      .from(ratings)
      .where(eq(ratings.rateeId, rateeId));

    return {
      avg: Number(result.avg) || 0,
      count: result.count
    };
  }

  // Search implementation
  async searchListings(params: {
    q?: string;
    categoryId?: string;
    subcategoryId?: string;
    region?: string;
    city?: string;
    priceMin?: number;
    priceMax?: number;
    condition?: string;
    priceType?: string;
    dateFilter?: string;
    hasImages?: boolean;
    excludeTerms?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    page?: number;
    pageSize?: number;
    sortBy?: string;
  }): Promise<{ listings: Listing[]; total: number; }> {
    const {
      q,
      categoryId,
      subcategoryId,
      region,
      city,
      priceMin,
      priceMax,
      condition,
      priceType,
      dateFilter,
      hasImages,
      excludeTerms,
      latitude,
      longitude,
      radiusKm,
      page = 1,
      pageSize = 20,
      sortBy = 'recent'
    } = params;

    const conditions = [eq(listings.status, 'active')];

    // Full-text search with fuzzy matching using pg_trgm
    if (q && q.trim()) {
      // Use both full-text search AND similarity search for better results
      // Full-text search for exact matches, similarity for typo tolerance
      conditions.push(
        or(
          sql`to_tsvector('spanish', ${listings.title} || ' ' || ${listings.description}) @@ plainto_tsquery('spanish', ${q})`,
          sql`similarity(${listings.title} || ' ' || ${listings.description}, ${q}) > 0.3`
        )!
      );
    }

    // Category filter - handle both main categories and subcategories
    if (subcategoryId) {
      conditions.push(eq(listings.categoryId, subcategoryId));
    } else if (categoryId) {
      // Get all subcategories for this main category
      const subcats = await db.select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, categoryId));
      
      if (subcats.length > 0) {
        const subcatIds = subcats.map(s => s.id);
        conditions.push(
          or(
            eq(listings.categoryId, categoryId),
            sql`${listings.categoryId} = ANY(${subcatIds})`
          )!
        );
      } else {
        conditions.push(eq(listings.categoryId, categoryId));
      }
    }

    // Region filter
    if (region) {
      conditions.push(eq(listings.locationRegion, region));
    }

    // City filter
    if (city) {
      conditions.push(eq(listings.locationCity, city));
    }

    // Price range filter - use SQL to cast decimal to numeric for comparison
    if (priceMin !== undefined) {
      conditions.push(sql`CAST(${listings.price} AS NUMERIC) >= ${priceMin}`);
    }
    if (priceMax !== undefined) {
      conditions.push(sql`CAST(${listings.price} AS NUMERIC) <= ${priceMax}`);
    }

    // Condition filter
    if (condition) {
      conditions.push(eq(listings.condition, condition));
    }

    // Price type filter
    if (priceType) {
      conditions.push(eq(listings.priceType, priceType));
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      let dateCondition;
      
      switch (dateFilter) {
        case 'today':
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          dateCondition = sql`${listings.createdAt} >= ${startOfDay}`;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateCondition = sql`${listings.createdAt} >= ${weekAgo}`;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateCondition = sql`${listings.createdAt} >= ${monthAgo}`;
          break;
      }
      
      if (dateCondition) {
        conditions.push(dateCondition);
      }
    }

    // Has images filter
    if (hasImages !== undefined) {
      if (hasImages) {
        conditions.push(sql`array_length(${listings.images}, 1) > 0`);
      } else {
        conditions.push(sql`(${listings.images} IS NULL OR array_length(${listings.images}, 1) IS NULL OR array_length(${listings.images}, 1) = 0)`);
      }
    }

    // Exclude terms filter
    if (excludeTerms && excludeTerms.trim()) {
      const terms = excludeTerms.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (terms.length > 0) {
        const excludeConditions = terms.map(term => 
          sql`NOT (${listings.title} ILIKE ${'%' + term + '%'} OR ${listings.description} ILIKE ${'%' + term + '%'})`
        );
        conditions.push(and(...excludeConditions)!);
      }
    }

    // Radius-based location search using Haversine formula
    // Only apply if all required parameters are provided
    if (latitude !== undefined && longitude !== undefined && radiusKm !== undefined) {
      // Filter listings that have coordinates set
      conditions.push(sql`${listings.latitude} IS NOT NULL AND ${listings.longitude} IS NOT NULL`);
      
      // Haversine formula: calculates distance between two points on Earth
      // distance = 2 * R * asin(sqrt(sin²((lat2-lat1)/2) + cos(lat1) * cos(lat2) * sin²((lon2-lon1)/2)))
      // R = 6371 km (Earth's radius)
      const haversineDistance = sql`
        (6371 * acos(
          cos(radians(${latitude})) 
          * cos(radians(CAST(${listings.latitude} AS NUMERIC))) 
          * cos(radians(CAST(${listings.longitude} AS NUMERIC)) - radians(${longitude})) 
          + sin(radians(${latitude})) 
          * sin(radians(CAST(${listings.latitude} AS NUMERIC)))
        ))
      `;
      
      conditions.push(sql`${haversineDistance} <= ${radiusKm}`);
    }

    // Get total count
    const [totalResult] = await db.select({ count: count() })
      .from(listings)
      .where(and(...conditions));

    // Get listings with sorting
    let orderClause;
    switch (sortBy) {
      case 'price_asc':
        orderClause = sql`CAST(${listings.price} AS NUMERIC) ASC`;
        break;
      case 'price_desc':
        orderClause = sql`CAST(${listings.price} AS NUMERIC) DESC`;
        break;
      case 'popular':
        orderClause = desc(listings.views);
        break;
      case 'relevance':
        // Sort by relevance using similarity score (only useful when search query exists)
        if (q && q.trim()) {
          orderClause = sql`similarity(${listings.title} || ' ' || ${listings.description}, ${q}) DESC`;
        } else {
          orderClause = desc(listings.createdAt);
        }
        break;
      case 'recent':
      default:
        orderClause = desc(listings.createdAt);
        break;
    }

    const offset = (page - 1) * pageSize;
    const results = await db.select()
      .from(listings)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(pageSize)
      .offset(offset);

    return {
      listings: results,
      total: totalResult.count
    };
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    // Get unique titles that match the query using full-text search
    const results = await db.selectDistinct({ title: listings.title })
      .from(listings)
      .where(
        and(
          eq(listings.status, 'active'),
          sql`to_tsvector('spanish', ${listings.title}) @@ plainto_tsquery('spanish', ${query})`
        )
      )
      .limit(limit);

    return results.map(r => r.title);
  }

  // Saved searches implementation
  async saveSearch(userId: string, search: InsertSavedSearch): Promise<SavedSearch> {
    const [savedSearch] = await db.insert(savedSearches)
      .values({
        ...search,
        userId
      })
      .returning();
    
    return savedSearch;
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    return await db.select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
  }

  async deleteSavedSearch(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(savedSearches)
      .where(and(
        eq(savedSearches.id, id),
        eq(savedSearches.userId, userId)
      ))
      .returning();
    
    return result.length > 0;
  }

  async createModerationReview(review: InsertModerationReview): Promise<ModerationReview> {
    const [created] = await db.insert(moderationReviews).values(review).returning();
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
    const [updated] = await db.update(moderationReviews).set(updates).where(eq(moderationReviews.id, id)).returning();
    return updated || undefined;
  }

  async getPendingReviews(options: { limit?: number; offset?: number } = {}): Promise<{ items: ModerationReview[]; total: number }> {
    const { limit = 20, offset = 0 } = options;
    const [{ count: total }] = await db.select({ count: count() }).from(moderationReviews).where(eq(moderationReviews.status, "pending"));
    const items = await db.select().from(moderationReviews).where(eq(moderationReviews.status, "pending")).orderBy(desc(moderationReviews.createdAt)).limit(limit).offset(offset);
    return { items, total };
  }

  async getAppealedReviews(options: { limit?: number; offset?: number } = {}): Promise<{ items: any[]; total: number }> {
    const { limit = 20, offset = 0 } = options;
    const [{ count: total }] = await db.select({ count: count() }).from(moderationReviews).where(eq(moderationReviews.status, "appealed"));
    
    const items = await db
      .select({
        id: moderationReviews.id,
        listingId: moderationReviews.listingId,
        decision: moderationReviews.aiDecision,
        status: moderationReviews.status,
        aiConfidence: moderationReviews.aiConfidence,
        reasons: moderationReviews.aiReasons,
        appealReason: moderationReviews.appealReason,
        appealedAt: moderationReviews.appealedAt,
        createdAt: moderationReviews.createdAt,
        listing: {
          id: listings.id,
          title: listings.title,
          description: listings.description,
        }
      })
      .from(moderationReviews)
      .leftJoin(listings, eq(moderationReviews.listingId, listings.id))
      .where(eq(moderationReviews.status, "appealed"))
      .orderBy(desc(moderationReviews.appealedAt))
      .limit(limit)
      .offset(offset);
    
    return { items, total };
  }

  async getModerationStats(): Promise<{ totalReviews: number; pending: number; approved: number; rejected: number; appealed: number }> {
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
    const [created] = await db.insert(moderationBlacklist).values(item).returning();
    return created;
  }

  async getBlacklist(type?: string): Promise<ModerationBlacklist[]> {
    if (type) {
      return await db.select().from(moderationBlacklist).where(and(eq(moderationBlacklist.type, type), eq(moderationBlacklist.isActive, "true"))).orderBy(desc(moderationBlacklist.createdAt));
    }
    return await db.select().from(moderationBlacklist).where(eq(moderationBlacklist.isActive, "true")).orderBy(desc(moderationBlacklist.createdAt));
  }

  async getBlacklistItem(id: string): Promise<ModerationBlacklist | undefined> {
    const [item] = await db.select().from(moderationBlacklist).where(eq(moderationBlacklist.id, id));
    return item || undefined;
  }

  async updateBlacklistItem(id: string, updates: Partial<ModerationBlacklist>): Promise<ModerationBlacklist | undefined> {
    const [updated] = await db.update(moderationBlacklist).set(updates).where(eq(moderationBlacklist.id, id)).returning();
    return updated || undefined;
  }

  async deleteBlacklistItem(id: string): Promise<boolean> {
    const result = await db.delete(moderationBlacklist).where(eq(moderationBlacklist.id, id));
    return (result.rowCount || 0) > 0;
  }

  async checkBlacklist(type: string, value: string): Promise<boolean> {
    const items = await db.select().from(moderationBlacklist).where(and(eq(moderationBlacklist.type, type), eq(moderationBlacklist.value, value.toLowerCase()), eq(moderationBlacklist.isActive, "true")));
    return items.length > 0;
  }

  async createModerationReport(report: InsertModerationReport): Promise<ModerationReport> {
    const [created] = await db.insert(moderationReports).values(report).returning();
    return created;
  }

  async getModerationReport(id: string): Promise<ModerationReport | undefined> {
    const [report] = await db.select().from(moderationReports).where(eq(moderationReports.id, id));
    return report || undefined;
  }

  async getUserReports(userId: string): Promise<ModerationReport[]> {
    return await db.select().from(moderationReports).where(eq(moderationReports.reporterId, userId)).orderBy(desc(moderationReports.createdAt));
  }

  async getListingReports(listingId: string): Promise<ModerationReport[]> {
    return await db.select().from(moderationReports).where(eq(moderationReports.listingId, listingId)).orderBy(desc(moderationReports.createdAt));
  }

  async getPendingReports(options: { limit?: number; offset?: number } = {}): Promise<{ items: ModerationReport[]; total: number }> {
    const { limit = 20, offset = 0 } = options;
    const [{ count: total }] = await db.select({ count: count() }).from(moderationReports).where(eq(moderationReports.status, "pending"));
    const items = await db.select().from(moderationReports).where(eq(moderationReports.status, "pending")).orderBy(desc(moderationReports.createdAt)).limit(limit).offset(offset);
    return { items, total };
  }

  async getReportsByStatus(status: string, options: { limit?: number; offset?: number } = {}): Promise<ModerationReport[]> {
    const { limit = 50, offset = 0 } = options;
    return await db.select().from(moderationReports)
      .where(eq(moderationReports.status, status))
      .orderBy(desc(moderationReports.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async resolveReport(id: string, resolvedBy: string, resolution: string): Promise<ModerationReport | undefined> {
    const [updated] = await db.update(moderationReports).set({ status: "resolved", resolvedBy, resolvedAt: new Date(), resolution }).where(eq(moderationReports.id, id)).returning();
    return updated || undefined;
  }

  async getModerationSetting(key: string): Promise<ModerationSetting | undefined> {
    const [setting] = await db.select().from(moderationSettings).where(eq(moderationSettings.key, key));
    return setting || undefined;
  }

  async setModerationSetting(key: string, value: string, type: string = 'string', description?: string): Promise<ModerationSetting> {
    const existing = await this.getModerationSetting(key);
    if (existing) {
      const [updated] = await db.update(moderationSettings).set({ value, type, description: description || existing.description, updatedAt: new Date() }).where(eq(moderationSettings.key, key)).returning();
      return updated;
    } else {
      const [created] = await db.insert(moderationSettings).values({ key, value, type, description }).returning();
      return created;
    }
  }

  async getModerationSettings(): Promise<ModerationSetting[]> {
    return await db.select().from(moderationSettings).orderBy(moderationSettings.key);
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db.insert(adminUsers).values(admin).returning();
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
    const [updated] = await db.update(adminUsers).set(updates).where(eq(adminUsers.id, id)).returning();
    return updated || undefined;
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    const result = await db.delete(adminUsers).where(eq(adminUsers.id, id));
    return (result.rowCount || 0) > 0;
  }

  async isAdmin(userId: string): Promise<boolean> {
    // Check users.role first
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user && user.role === 'admin') {
      return true;
    }
    
    // Then check admin_users table
    const admin = await this.getAdminUser(userId);
    return !!admin;
  }

  async createModerationLog(log: InsertModerationLog): Promise<ModerationLog> {
    const [created] = await db.insert(moderationLogs).values(log).returning();
    return created;
  }

  async getModerationLogs(options: { targetType?: string; targetId?: string; performedBy?: string; action?: string; limit?: number; offset?: number; createdAfter?: Date } = {}): Promise<{ items: ModerationLog[]; total: number }> {
    const { targetType, targetId, performedBy, action, limit = 50, offset = 0, createdAfter } = options;
    const conditions = [];
    if (targetType) conditions.push(eq(moderationLogs.targetType, targetType));
    if (targetId) conditions.push(eq(moderationLogs.targetId, targetId));
    if (performedBy) conditions.push(eq(moderationLogs.performedBy, performedBy));
    if (action) conditions.push(eq(moderationLogs.action, action));
    if (createdAfter) conditions.push(gte(moderationLogs.createdAt, createdAfter));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ count: total }] = await db.select({ count: count() }).from(moderationLogs).where(whereClause);
    const items = await db.select().from(moderationLogs).where(whereClause).orderBy(desc(moderationLogs.createdAt)).limit(limit).offset(offset);
    return { items, total };
  }

  async updateListingModeration(listingId: string, status: string, reviewId?: string): Promise<Listing | undefined> {
    const [updated] = await db.update(listings).set({ moderationStatus: status, moderationReviewId: reviewId || null, updatedAt: new Date() }).where(eq(listings.id, listingId)).returning();
    return updated || undefined;
  }

  async publishListing(listingId: string): Promise<Listing | undefined> {
    const [updated] = await db.update(listings).set({ isPublished: "true", moderationStatus: "approved", updatedAt: new Date() }).where(eq(listings.id, listingId)).returning();
    return updated || undefined;
  }

  async unpublishListing(listingId: string): Promise<Listing | undefined> {
    const [updated] = await db.update(listings).set({ isPublished: "false", updatedAt: new Date() }).where(eq(listings.id, listingId)).returning();
    return updated || undefined;
  }

  // Banners
  async getBanners(position?: string): Promise<Banner[]> {
    if (position) {
      return await db.select().from(banners).where(eq(banners.position, position)).orderBy(banners.displayOrder);
    }
    return await db.select().from(banners).orderBy(banners.displayOrder);
  }

  async getActiveBanners(position?: string): Promise<Banner[]> {
    const conditions = [eq(banners.isActive, "true")];
    if (position) {
      conditions.push(eq(banners.position, position));
    }
    return await db.select().from(banners).where(and(...conditions)).orderBy(banners.displayOrder);
  }

  async createBanner(banner: InsertBanner): Promise<Banner> {
    const [created] = await db.insert(banners).values(banner).returning();
    return created;
  }

  async updateBanner(id: string, updates: Partial<InsertBanner>): Promise<Banner | undefined> {
    const [updated] = await db.update(banners).set({ ...updates, updatedAt: new Date() }).where(eq(banners.id, id)).returning();
    return updated || undefined;
  }

  async deleteBanner(id: string): Promise<boolean> {
    const result = await db.delete(banners).where(eq(banners.id, id));
    return (result.rowCount || 0) > 0;
  }

  async toggleBannerActive(id: string): Promise<Banner | undefined> {
    const [banner] = await db.select().from(banners).where(eq(banners.id, id));
    if (!banner) return undefined;
    const newStatus = banner.isActive === "true" ? "false" : "true";
    const [updated] = await db.update(banners).set({ isActive: newStatus, updatedAt: new Date() }).where(eq(banners.id, id)).returning();
    return updated || undefined;
  }

  // Sponsored Listings
  async getSponsoredListings(): Promise<SponsoredListing[]> {
    return await db.select().from(sponsoredListings).orderBy(sponsoredListings.displayOrder);
  }

  async getActiveSponsoredListings(categoryId?: string): Promise<SponsoredListing[]> {
    const now = new Date();
    const conditions = [
      eq(sponsoredListings.isActive, "true"),
      gte(sponsoredListings.expiresAt, now)
    ];
    if (categoryId) {
      conditions.push(eq(sponsoredListings.categoryId, categoryId));
    }
    return await db.select().from(sponsoredListings).where(and(...conditions)).orderBy(sponsoredListings.displayOrder);
  }

  async createSponsoredListing(sponsored: InsertSponsoredListing): Promise<SponsoredListing> {
    const [created] = await db.insert(sponsoredListings).values(sponsored).returning();
    return created;
  }

  async updateSponsoredListing(id: string, updates: Partial<InsertSponsoredListing>): Promise<SponsoredListing | undefined> {
    const [updated] = await db.update(sponsoredListings).set(updates).where(eq(sponsoredListings.id, id)).returning();
    return updated || undefined;
  }

  async deleteSponsoredListing(id: string): Promise<boolean> {
    const result = await db.delete(sponsoredListings).where(eq(sponsoredListings.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Category Management
  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return updated || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount || 0) > 0;
  }

  async reorderCategories(categoryOrders: { id: string; order: number }[]): Promise<void> {
    await Promise.all(
      categoryOrders.map(({ id, order }) =>
        db.update(categories).set({ order }).where(eq(categories.id, id))
      )
    );
  }
}

export const storage = new DatabaseStorage();
