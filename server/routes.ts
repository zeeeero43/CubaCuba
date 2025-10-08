import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCategorySchema, insertProductSchema, insertListingSchema, insertRatingSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { setObjectAclPolicy } from "./objectAcl";
import { randomUUID } from "crypto";
import { moderateContent, type ModerationResult } from "./moderation";

// Helper function to parse object path
function parseObjectPath(fullPath: string): { bucketName: string; objectName: string } {
  const pathParts = fullPath.split("/");
  if (pathParts.length < 3 || pathParts[0] !== "") {
    throw new Error(`Invalid object path: ${fullPath}`);
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Rico-Cuba API funcionando" });
  });

  // Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/categories/tree", async (req, res) => {
    try {
      const tree = await storage.getCategoriesTree();
      res.json(tree);
    } catch (error) {
      console.error("Error fetching categories tree:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/categories/:id/subcategories", async (req, res) => {
    try {
      const { id } = req.params;
      const subcategories = await storage.getSubcategories(id);
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Categoría no encontrada" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    // SECURITY: Only authenticated users can create categories
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión para crear categorías" });
    }

    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Products endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching featured products:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/products/category/:categoryId", async (req, res) => {
    try {
      const products = await storage.getProductsByCategory(req.params.categoryId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products by category:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión para crear productos" });
    }

    try {
      const validatedData = insertProductSchema.parse(req.body);
      const productData = {
        ...validatedData,
        sellerId: req.user!.id
      };
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Listings endpoints
  // GET /api/listings - Get listings with filters
  app.get("/api/listings", async (req, res) => {
    try {
      const filters = {
        q: req.query.q as string,
        categoryId: req.query.categoryId as string,
        region: req.query.region as string,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
        condition: req.query.condition as string,
        sellerId: req.query.sellerId as string,
        status: (req.query.status as string) || 'active',
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
      };
      
      const result = await storage.getListings(filters);
      
      // Transform to match frontend expectations
      const response = {
        listings: result.listings,
        totalCount: result.total,
        currentPage: filters.page,
        totalPages: Math.ceil(result.total / filters.pageSize)
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/listings/featured - Get featured listings
  app.get("/api/listings/featured", async (req, res) => {
    try {
      const listings = await storage.getFeaturedListings();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching featured listings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/listings/following - Get listings from followed users (requires auth)
  app.get("/api/listings/following", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const listings = await storage.getFollowedListings(req.user!.id);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching followed listings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/listings/:id - Get single listing
  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // POST /api/listings - Create new listing (requires auth)
  app.post("/api/listings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión para crear anuncios" });
    }

    try {
      console.log('Received request body:', JSON.stringify(req.body, null, 2));
      const validatedData = insertListingSchema.parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      
      // Validate that categoryId refers to a subcategory (not a main category)
      if (validatedData.categoryId) {
        const category = await storage.getCategory(validatedData.categoryId);
        if (!category) {
          return res.status(400).json({ message: "La categoría seleccionada no existe" });
        }
        if (!category.parentId) {
          return res.status(400).json({ message: "Debes seleccionar una subcategoría, no una categoría principal" });
        }
      }
      
      const listingData = {
        ...validatedData,
        sellerId: req.user!.id
      };
      
      const listing = await storage.createListing(listingData);
      
      const moderationResult: ModerationResult = await moderateContent(storage, {
        title: listing.title,
        description: listing.description,
        images: listing.images || [],
        contactPhone: listing.contactPhone,
        userId: listing.sellerId,
        listingId: listing.id
      });
      console.log("✅ Moderation complete. Decision:", moderationResult.decision);

      const review = await storage.createModerationReview({
        listingId: listing.id,
        aiDecision: moderationResult.decision,
        aiConfidence: moderationResult.confidence,
        aiReasons: moderationResult.reasons,
        aiAnalysis: JSON.stringify(moderationResult.details),
        textScore: moderationResult.textScore,
        imageScores: moderationResult.imageScores ? moderationResult.imageScores.map((s: number) => s.toString()) : []
      });
      console.log("✅ Review created:", review.id);

      await storage.updateModerationReview(review.id, {
        status: moderationResult.decision === "approved" ? "approved" : "rejected"
      });
      console.log("✅ Review status updated");

      await storage.updateListingModeration(listing.id, moderationResult.decision, review.id);
      console.log("✅ Listing moderation updated");

      if (moderationResult.decision === "approved") {
        await storage.publishListing(listing.id);
        console.log("✅ Listing published");
        await storage.createModerationLog({
          action: "auto_approved",
          targetType: "listing",
          targetId: listing.id,
          performedBy: null,
          details: JSON.stringify({ confidence: moderationResult.confidence, reasons: moderationResult.reasons })
        });
        console.log("✅ Auto-approved log created");
      } else {
        await storage.createModerationLog({
          action: "auto_rejected",
          targetType: "listing",
          targetId: listing.id,
          performedBy: null,
          details: JSON.stringify({ confidence: moderationResult.confidence, reasons: moderationResult.reasons })
        });
        console.log("✅ Auto-rejected log created");
      }

      console.log("📤 Sending response...");
      res.status(201).json({ 
        listing, 
        moderationReview: review,
        moderationStatus: moderationResult.decision
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        console.error('Zod validation error:', error.errors);
        console.error('Request body that failed:', JSON.stringify(req.body, null, 2));
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating listing:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // PUT /api/listings/:id - Update listing (requires auth + ownership)
  app.put("/api/listings/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const validatedData = insertListingSchema.partial().parse(req.body);
      
      // Validate that categoryId refers to a subcategory (not a main category)
      if (validatedData.categoryId) {
        const category = await storage.getCategory(validatedData.categoryId);
        if (!category) {
          return res.status(400).json({ message: "La categoría seleccionada no existe" });
        }
        if (!category.parentId) {
          return res.status(400).json({ message: "Debes seleccionar una subcategoría, no una categoría principal" });
        }
      }
      
      const listing = await storage.updateListing(req.params.id, req.user!.id, validatedData);
      
      if (!listing) {
        return res.status(404).json({ message: "Anuncio no encontrado o sin permisos" });
      }
      
      res.json(listing);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating listing:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // DELETE /api/listings/:id - Delete listing (requires auth + ownership)
  app.delete("/api/listings/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      // First, get the listing to retrieve its images
      const listing = await storage.getListing(req.params.id);
      
      if (!listing) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }
      
      // Check ownership
      if (listing.sellerId !== req.user!.id) {
        return res.status(403).json({ message: "Sin permisos para eliminar este anuncio" });
      }
      
      // Delete the listing from database first
      const success = await storage.deleteListing(req.params.id, req.user!.id);
      
      if (!success) {
        return res.status(404).json({ message: "Error eliminando anuncio" });
      }
      
      // Delete associated images from object storage (non-blocking)
      if (listing.images && listing.images.length > 0) {
        const objectStorageService = new ObjectStorageService();
        
        // Delete images in background - don't wait for completion
        Promise.all(
          listing.images.map(imagePath => objectStorageService.deleteObject(imagePath))
        ).catch(error => {
          console.error("Error deleting listing images:", error);
          // Log error but don't fail the response since listing is already deleted
        });
        
        console.log(`Initiated deletion of ${listing.images.length} images for listing ${req.params.id}`);
      }
      
      res.json({ message: "Anuncio eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // PATCH /api/listings/:id/status - Update listing status (requires auth + ownership)
  app.patch("/api/listings/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    const { status } = req.body;
    
    if (!status || !['active', 'paused', 'sold'].includes(status)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    try {
      const success = await storage.setListingStatus(req.params.id, req.user!.id, status);
      
      if (!success) {
        return res.status(404).json({ message: "Anuncio no encontrado o sin permisos" });
      }
      
      res.json({ message: "Estado actualizado exitosamente" });
    } catch (error) {
      console.error("Error updating listing status:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // PATCH /api/listings/:id/sold - Mark listing as sold (requires auth + ownership)
  app.patch("/api/listings/:id/sold", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const success = await storage.markListingSold(req.params.id, req.user!.id);
      
      if (!success) {
        return res.status(404).json({ message: "Anuncio no encontrado o sin permisos" });
      }
      
      res.json({ message: "Anuncio marcado como vendido" });
    } catch (error) {
      console.error("Error marking listing as sold:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // POST /api/listings/:id/view - Increment view count (public)
  app.post("/api/listings/:id/view", async (req, res) => {
    try {
      await storage.incrementViews(req.params.id);
      res.json({ message: "Visualización registrada" });
    } catch (error) {
      console.error("Error incrementing views:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // POST /api/listings/:id/contact - Increment contact count (public)
  app.post("/api/listings/:id/contact", async (req, res) => {
    try {
      await storage.incrementContacts(req.params.id);
      res.json({ message: "Contacto registrado" });
    } catch (error) {
      console.error("Error incrementing contacts:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/me/listings - Get current user's listings (requires auth)
  app.get("/api/me/listings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const listings = await storage.getMyListings(req.user!.id);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Search endpoints
  // GET /api/search - Advanced search with filters
  app.get("/api/search", async (req, res) => {
    try {
      const params = {
        q: req.query.q as string,
        categoryId: req.query.categoryId as string,
        subcategoryId: req.query.subcategoryId as string,
        region: req.query.region as string,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
        condition: req.query.condition as string,
        priceType: req.query.priceType as string,
        dateFilter: req.query.dateFilter as string,
        hasImages: req.query.hasImages === 'true' ? true : req.query.hasImages === 'false' ? false : undefined,
        excludeTerms: req.query.excludeTerms as string,
        latitude: req.query.latitude ? Number(req.query.latitude) : undefined,
        longitude: req.query.longitude ? Number(req.query.longitude) : undefined,
        radiusKm: req.query.radiusKm ? Number(req.query.radiusKm) : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
        sortBy: req.query.sortBy as string || 'recent',
      };

      const result = await storage.searchListings(params);

      const response = {
        listings: result.listings,
        totalCount: result.total,
        currentPage: params.page,
        totalPages: Math.ceil(result.total / params.pageSize),
        appliedFilters: params
      };

      res.json(response);
    } catch (error) {
      console.error("Error searching listings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/search/suggestions - Autocomplete suggestions
  app.get("/api/search/suggestions", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }

      const suggestions = await storage.getSearchSuggestions(query);
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting search suggestions:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/search/saved - Get user's saved searches (requires auth)
  app.get("/api/search/saved", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const savedSearches = await storage.getSavedSearches(req.user!.id);
      res.json(savedSearches);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // POST /api/search/saved - Save a search (requires auth)
  app.post("/api/search/saved", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const { name, searchParams } = req.body;
      if (!name || searchParams === undefined) {
        return res.status(400).json({ message: "Nombre y parámetros de búsqueda son requeridos" });
      }

      // Ensure searchParams is stored as a string (it should already be a query string)
      const paramsString = typeof searchParams === 'string' 
        ? searchParams 
        : String(searchParams);

      const savedSearch = await storage.saveSearch(req.user!.id, {
        name,
        searchParams: paramsString
      });

      res.status(201).json(savedSearch);
    } catch (error) {
      console.error("Error saving search:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // DELETE /api/search/saved/:id - Delete a saved search (requires auth)
  app.delete("/api/search/saved/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const success = await storage.deleteSavedSearch(req.params.id, req.user!.id);
      if (!success) {
        return res.status(404).json({ message: "Búsqueda guardada no encontrada" });
      }

      res.json({ message: "Búsqueda eliminada" });
    } catch (error) {
      console.error("Error deleting saved search:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Favorites endpoints
  // POST /api/favorites/:listingId - Add listing to favorites (requires auth)
  app.post("/api/favorites/:listingId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      await storage.addFavorite(req.user!.id, req.params.listingId);
      res.status(201).json({ message: "Añadido a favoritos" });
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // DELETE /api/favorites/:listingId - Remove from favorites (requires auth)
  app.delete("/api/favorites/:listingId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      await storage.removeFavorite(req.user!.id, req.params.listingId);
      res.json({ message: "Eliminado de favoritos" });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/favorites - Get user's favorite listings (requires auth)
  app.get("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const favorites = await storage.getFavoriteListings(req.user!.id);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/favorites/:listingId/check - Check if listing is favorited (requires auth)
  app.get("/api/favorites/:listingId/check", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const isFavorite = await storage.isFavorite(req.user!.id, req.params.listingId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // User Profile & Follow endpoints
  // GET /api/users/:id/public - Get public user profile
  app.get("/api/users/:id/public", async (req, res) => {
    try {
      const profile = await storage.getUserPublicProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // If authenticated and not same user, check if following
      let isFollowing = false;
      if (req.isAuthenticated() && req.user!.id !== req.params.id) {
        isFollowing = await storage.isFollowing(req.user!.id, req.params.id);
      }

      res.json({ ...profile, isFollowing });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // POST /api/users/:id/follow - Follow a user (requires auth)
  app.post("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    // Prevent following self
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ message: "No puedes seguirte a ti mismo" });
    }

    try {
      await storage.followUser(req.user!.id, req.params.id);
      res.status(201).json({ message: "Ahora sigues a este usuario" });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // DELETE /api/users/:id/follow - Unfollow a user (requires auth)
  app.delete("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      await storage.unfollowUser(req.user!.id, req.params.id);
      res.json({ message: "Has dejado de seguir a este usuario" });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Ratings endpoints
  // GET /api/users/:id/ratings - Get user's ratings
  app.get("/api/users/:id/ratings", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const ratings = await storage.getUserRatings(req.params.id, { limit, offset });
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // POST /api/users/:id/ratings - Rate a user (requires auth)
  app.post("/api/users/:id/ratings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    // Prevent rating self
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ message: "No puedes calificarte a ti mismo" });
    }

    try {
      const validatedData = insertRatingSchema.parse({
        ...req.body,
        rateeId: req.params.id
      });
      
      const rating = await storage.createRating({
        ...validatedData,
        raterId: req.user!.id
      });
      
      res.status(201).json(rating);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating rating:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Premium Features endpoints
  // GET /api/premium-options - Get available premium options
  app.get("/api/premium-options", async (req, res) => {
    try {
      const options = await storage.getPremiumOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching premium options:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // POST /api/listings/:id/premium - Purchase premium feature (requires auth + ownership)
  app.post("/api/listings/:id/premium", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    const { premiumOptionId } = req.body;
    
    if (!premiumOptionId) {
      return res.status(400).json({ message: "ID de opción premium requerido" });
    }

    try {
      // Verify listing ownership
      const listing = await storage.getListing(req.params.id);
      if (!listing || listing.sellerId !== req.user!.id) {
        return res.status(404).json({ message: "Anuncio no encontrado o sin permisos" });
      }

      const purchase = await storage.purchasePremium(req.params.id, premiumOptionId);
      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error purchasing premium:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/listings/:id/premium - Get listing's premium features
  app.get("/api/listings/:id/premium", async (req, res) => {
    try {
      const features = await storage.getActivePremiumFeatures(req.params.id);
      res.json(features);
    } catch (error) {
      console.error("Error fetching premium features:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Object Storage Routes
  
  // Public objects serving endpoint
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Private objects serving endpoint (for listing images)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Simplified image upload endpoint with user-specific folders
  app.post("/api/listings/upload-image", async (req, res) => {
    // Require authentication for listing image uploads
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión para subir imágenes" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      
      // Get upload URL and objectId from the service
      const { uploadURL, objectId } = await objectStorageService.getObjectEntityUploadURL();
      
      res.json({ 
        uploadURL,
        objectId,
        userId: req.user!.id
      });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Finalize image upload and set ACL (secure version)
  app.post("/api/listings/finalize-upload", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión para gestionar imágenes" });
    }

    const { objectId } = req.body;
    
    if (!objectId) {
      return res.status(400).json({ error: "objectId is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      
      // Construct the expected object path using server-controlled logic
      const privateDir = objectStorageService.getPrivateObjectDir();
      const tempObjectPath = `${privateDir}/uploads/${objectId}`;
      
      // Verify the object exists at the expected location
      const { bucketName, objectName } = parseObjectPath(tempObjectPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const tempFile = bucket.file(objectName);
      
      const [exists] = await tempFile.exists();
      if (!exists) {
        return res.status(404).json({ error: "Uploaded file not found" });
      }
      
      // Create user-specific final path: users/{userId}/listings/images/{objectId}
      const userId = req.user!.id;
      const finalObjectPath = `${privateDir}/users/${userId}/listings/images/${objectId}`;
      const { bucketName: finalBucketName, objectName: finalObjectName } = parseObjectPath(finalObjectPath);
      const finalFile = bucket.file(finalObjectName);
      
      // Move/copy the file to the user-specific location
      await tempFile.copy(finalFile);
      await tempFile.delete(); // Remove temp file
      
      // Set public ACL policy for the final image location
      await setObjectAclPolicy(finalFile, {
        owner: userId,
        visibility: "public", // Public so listing images can be viewed by everyone
      });
      
      // Return normalized object path for frontend use
      const normalizedPath = `/objects/users/${userId}/listings/images/${objectId}`;
      
      res.json({ objectPath: normalizedPath });
    } catch (error) {
      console.error("Error finalizing upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ MODERATION ROUTES ============
  
  // Submit appeal for rejected listing
  app.post("/api/moderation/appeal/:reviewId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const { reviewId } = req.params;
      const { appealReason } = req.body;

      if (!appealReason || appealReason.trim().length < 10) {
        return res.status(400).json({ message: "La razón del apelación debe tener al menos 10 caracteres" });
      }

      const review = await storage.getModerationReview(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Revisión no encontrada" });
      }

      const listing = await storage.getListing(review.listingId);
      if (!listing || listing.sellerId !== req.user!.id) {
        return res.status(403).json({ message: "No tienes permiso para apelar esta revisión" });
      }

      if (review.status !== "rejected") {
        return res.status(400).json({ message: "Solo se pueden apelar anuncios rechazados" });
      }

      const updated = await storage.updateModerationReview(reviewId, {
        status: "appealed",
        appealReason,
        appealedAt: new Date()
      });

      await storage.createModerationLog({
        action: "appeal_submitted",
        targetType: "listing",
        targetId: review.listingId,
        performedBy: req.user!.id,
        details: JSON.stringify({ reviewId, appealReason })
      });

      res.json(updated);
    } catch (error) {
      console.error("Error submitting appeal:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get moderation status for a listing
  app.get("/api/moderation/status/:listingId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const { listingId } = req.params;
      const listing = await storage.getListing(listingId);
      
      if (!listing) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }

      if (listing.sellerId !== req.user!.id) {
        return res.status(403).json({ message: "No tienes permiso para ver este anuncio" });
      }

      const review = await storage.getModerationReviewByListing(listingId);
      
      res.json({
        moderationStatus: listing.moderationStatus,
        isPublished: listing.isPublished,
        review
      });
    } catch (error) {
      console.error("Error getting moderation status:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Submit user report
  app.post("/api/moderation/report", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión para reportar" });
    }

    try {
      const { listingId, reportedUserId, reason, description } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "El motivo del reporte es requerido" });
      }

      if (!listingId && !reportedUserId) {
        return res.status(400).json({ message: "Debes reportar un anuncio o un usuario" });
      }

      const report = await storage.createModerationReport({
        reporterId: req.user!.id,
        listingId: listingId || null,
        reportedUserId: reportedUserId || null,
        reason,
        description: description || null,
        status: "pending"
      });

      await storage.createModerationLog({
        action: "report_created",
        targetType: listingId ? "listing" : "user",
        targetId: listingId || reportedUserId,
        performedBy: req.user!.id,
        details: JSON.stringify({ reportId: report.id, reason })
      });

      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get user's reports
  app.get("/api/moderation/my-reports", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    try {
      const reports = await storage.getUserReports(req.user!.id);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching user reports:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // User-friendly report endpoint (used by ReportDialog)
  app.post("/api/reports", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión para reportar" });
    }

    try {
      const { type, targetId, reason, description } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "El motivo del reporte es requerido" });
      }

      if (!type || !targetId) {
        return res.status(400).json({ message: "Tipo y ID del objetivo son requeridos" });
      }

      const report = await storage.createModerationReport({
        reporterId: req.user!.id,
        listingId: type === "listing" ? targetId : null,
        reportedUserId: type === "user" ? targetId : null,
        reason,
        description: description || null,
        status: "pending"
      });

      await storage.createModerationLog({
        action: "report_created",
        targetType: type,
        targetId: targetId,
        performedBy: req.user!.id,
        details: JSON.stringify({ reportId: report.id, reason })
      });

      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // ============ ADMIN ROUTES ============
  
  // Middleware to check admin access
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debes iniciar sesión" });
    }

    const isAdmin = await storage.isAdmin(req.user!.id);
    if (!isAdmin) {
      return res.status(403).json({ message: "Acceso denegado. Se requiere permisos de administrador" });
    }

    next();
  };

  // Check if user is admin
  app.get("/api/admin/check", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ isAdmin: false });
    }

    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      const admin = isAdmin ? await storage.getAdminUser(req.user!.id) : null;
      res.json({ isAdmin, admin });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Admin Dashboard Stats
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      const moderationStats = await storage.getModerationStats();
      const { items: pendingReviews } = await storage.getPendingReviews({ limit: 5 });
      const { items: appealedReviews } = await storage.getAppealedReviews({ limit: 5 });
      const { items: pendingReports } = await storage.getPendingReports({ limit: 5 });
      const { items: recentLogs } = await storage.getModerationLogs({ limit: 10 });

      res.json({
        stats: moderationStats,
        pendingReviews,
        appealedReviews,
        pendingReports,
        recentLogs
      });
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get pending reviews queue
  app.get("/api/admin/reviews/pending", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await storage.getPendingReviews({ limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get appealed reviews queue
  app.get("/api/admin/reviews/appealed", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await storage.getAppealedReviews({ limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching appealed reviews:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Manual review decision
  app.post("/api/admin/reviews/:reviewId/decide", requireAdmin, async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { decision, notes } = req.body;

      if (!decision || !["approved", "rejected"].includes(decision)) {
        return res.status(400).json({ message: "Decisión inválida" });
      }

      const review = await storage.getModerationReview(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Revisión no encontrada" });
      }

      const updated = await storage.updateModerationReview(reviewId, {
        status: decision,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        aiAnalysis: notes ? `${review.aiAnalysis || ''}\n\nNotas del moderador: ${notes}` : review.aiAnalysis
      });

      await storage.updateListingModeration(review.listingId, decision, reviewId);

      if (decision === "approved") {
        await storage.publishListing(review.listingId);
      }

      await storage.createModerationLog({
        action: "manual_review",
        targetType: "listing",
        targetId: review.listingId,
        performedBy: req.user!.id,
        details: JSON.stringify({ reviewId, decision, notes })
      });

      res.json(updated);
    } catch (error) {
      console.error("Error making review decision:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get all reports (filtered by status)
  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string || "pending";
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const reports = await storage.getReportsByStatus(status, { limit, offset });
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Resolve report
  app.post("/api/admin/reports/:reportId/resolve", requireAdmin, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { resolution } = req.body;

      if (!resolution) {
        return res.status(400).json({ message: "La resolución es requerida" });
      }

      const resolved = await storage.resolveReport(reportId, req.user!.id, resolution);
      
      if (!resolved) {
        return res.status(404).json({ message: "Reporte no encontrado" });
      }

      await storage.createModerationLog({
        action: "report_resolved",
        targetType: "report",
        targetId: reportId,
        performedBy: req.user!.id,
        details: JSON.stringify({ resolution })
      });

      res.json(resolved);
    } catch (error) {
      console.error("Error resolving report:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get blacklist
  app.get("/api/admin/blacklist", requireAdmin, async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const blacklist = await storage.getBlacklist(type);
      res.json(blacklist);
    } catch (error) {
      console.error("Error fetching blacklist:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Add blacklist item
  app.post("/api/admin/blacklist", requireAdmin, async (req, res) => {
    try {
      const { type, value, reason } = req.body;

      if (!type || !value || !reason) {
        return res.status(400).json({ message: "Tipo, valor y razón son requeridos" });
      }

      const item = await storage.createBlacklistItem({
        type,
        value: value.toLowerCase(),
        reason,
        addedBy: req.user!.id,
        isActive: "true"
      });

      await storage.createModerationLog({
        action: "blacklist_added",
        targetType: "blacklist",
        targetId: item.id,
        performedBy: req.user!.id,
        details: JSON.stringify({ type, value, reason })
      });

      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding blacklist item:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Update blacklist item
  app.patch("/api/admin/blacklist/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await storage.updateBlacklistItem(id, updates);
      
      if (!updated) {
        return res.status(404).json({ message: "Item no encontrado" });
      }

      await storage.createModerationLog({
        action: "blacklist_updated",
        targetType: "blacklist",
        targetId: id,
        performedBy: req.user!.id,
        details: JSON.stringify(updates)
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating blacklist item:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Delete blacklist item
  app.delete("/api/admin/blacklist/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBlacklistItem(id);

      if (!deleted) {
        return res.status(404).json({ message: "Item no encontrado" });
      }

      await storage.createModerationLog({
        action: "blacklist_deleted",
        targetType: "blacklist",
        targetId: id,
        performedBy: req.user!.id,
        details: null
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blacklist item:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get moderation settings
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getModerationSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Update moderation setting
  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { key, value, type, description } = req.body;

      if (!key || !value) {
        return res.status(400).json({ message: "Clave y valor son requeridos" });
      }

      const setting = await storage.setModerationSetting(key, value, type, description);

      await storage.createModerationLog({
        action: "setting_updated",
        targetType: "setting",
        targetId: setting.id,
        performedBy: req.user!.id,
        details: JSON.stringify({ key, value })
      });

      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get admin users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const admins = await storage.getAdminUsers();
      res.json(admins);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Create admin user
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { userId, role, permissions } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ message: "ID de usuario y rol son requeridos" });
      }

      const admin = await storage.createAdminUser({
        userId,
        role,
        permissions: permissions || [],
        createdBy: req.user!.id
      });

      await storage.createModerationLog({
        action: "admin_created",
        targetType: "admin",
        targetId: admin.id,
        performedBy: req.user!.id,
        details: JSON.stringify({ userId, role })
      });

      res.status(201).json(admin);
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Update admin user
  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await storage.updateAdminUser(id, updates);
      
      if (!updated) {
        return res.status(404).json({ message: "Administrador no encontrado" });
      }

      await storage.createModerationLog({
        action: "admin_updated",
        targetType: "admin",
        targetId: id,
        performedBy: req.user!.id,
        details: JSON.stringify(updates)
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating admin user:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Delete admin user
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAdminUser(id);

      if (!deleted) {
        return res.status(404).json({ message: "Administrador no encontrado" });
      }

      await storage.createModerationLog({
        action: "admin_deleted",
        targetType: "admin",
        targetId: id,
        performedBy: req.user!.id,
        details: null
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting admin user:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get moderation logs
  app.get("/api/admin/logs", requireAdmin, async (req, res) => {
    try {
      const { targetType, targetId, performedBy, action } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const result = await storage.getModerationLogs({
        targetType: targetType as string | undefined,
        targetId: targetId as string | undefined,
        performedBy: performedBy as string | undefined,
        action: action as string | undefined,
        limit,
        offset
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching moderation logs:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
