import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCategorySchema, insertProductSchema, insertListingSchema, insertRatingSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { setObjectAclPolicy } from "./objectAcl";
import { randomUUID } from "crypto";

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
      res.status(201).json(listing);
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

  const httpServer = createServer(app);
  return httpServer;
}
