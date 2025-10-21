import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { storage } from "./storage";
import { insertCategorySchema, insertProductSchema, insertListingSchema, insertRatingSchema, updatePhoneSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { setObjectAclPolicy } from "./objectAcl";
import { randomUUID } from "crypto";
import { moderateContent, type ModerationResult } from "./moderation";
import sharp from 'sharp';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

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

// Configure multer for local file uploads
const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!existsSync(uploadDir)) {
  fs.mkdir(uploadDir, { recursive: true }).catch(console.error);
}

const storage_multer = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = (req.user as any)?.id || 'anonymous';
    const userDir = path.join(uploadDir, userId);
    
    // Create user-specific directory
    if (!existsSync(userDir)) {
      await fs.mkdir(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "API de Rico-Cuba funcionando" });
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
      return res.status(401).json({ message: "Debe iniciar sesión para crear categorías" });
    }

    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Error de validación", 
          details: validationError.message 
        });
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
      return res.status(401).json({ message: "Debe iniciar sesión para crear productos" });
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
        return res.status(400).json({ 
          message: "Error de validación", 
          details: validationError.message 
        });
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

  // GET /api/listings/featured - Get featured listings (original endpoint)
  app.get("/api/listings/featured", async (req, res) => {
    try {
      const listings = await storage.getFeaturedListings();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching featured listings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/listings/featured/paginated - Get featured listings with pagination
  app.get("/api/listings/featured/paginated", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const allListings = await storage.getFeaturedListings();
      const total = allListings.length;
      const listings = allListings.slice(offset, offset + limit);
      
      res.json({
        listings,
        page,
        limit,
        total,
        hasMore: offset + limit < total
      });
    } catch (error) {
      console.error("Error fetching featured listings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // GET /api/listings/following - Get listings from followed users (requires auth)
  app.get("/api/listings/following", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
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
      return res.status(401).json({ message: "Debe iniciar sesión para crear anuncios" });
    }

    try {
      // Convert empty strings to null for numeric fields
      const cleanedBody = {
        ...req.body,
        price: req.body.price === "" ? null : req.body.price,
      };
      
      const validatedData = insertListingSchema.parse(cleanedBody);
      
      // Validate that categoryId refers to a subcategory (not a main category)
      if (validatedData.categoryId) {
        const category = await storage.getCategory(validatedData.categoryId);
        if (!category) {
          return res.status(400).json({ message: "La categoría seleccionada no existe" });
        }
        if (!category.parentId) {
          return res.status(400).json({ message: "Debe seleccionar una subcategoría, no una categoría principal" });
        }
      }
      
      // Check description minimum length from moderation settings
      const minLengthSetting = await storage.getModerationSetting("description_min_length");
      const minLength = parseInt(minLengthSetting?.value || "50");
      if (validatedData.description && validatedData.description.length < minLength) {
        return res.status(400).json({ 
          message: `La descripción debe tener al menos ${minLength} caracteres. Actualmente tiene ${validatedData.description.length} caracteres.` 
        });
      }
      
      // Check if user is banned
      const user = await storage.getUserById(req.user!.id);
      if (user?.isBanned === "true") {
        return res.status(403).json({ 
          message: "Su cuenta ha sido excluida permanentemente de la plataforma por violaciones graves a nuestras políticas de contenido",
          warning: "Las violaciones repetidas de nuestras políticas resultan en la exclusión permanente de la plataforma",
          reason: user.banReason || "Múltiples violaciones a las políticas de contenido"
        });
      }

      const listingData = {
        ...validatedData,
        sellerId: req.user!.id
      };
      
      // Moderation BEFORE creating listing
      const moderationResult: ModerationResult = await moderateContent(storage, {
        title: listingData.title,
        description: listingData.description,
        images: listingData.images || [],
        contactPhone: listingData.contactPhone,
        userId: req.user!.id,
        listingId: "temp-id" // temporary, will be replaced
      });

      // If REJECTED: Create draft listing + review for appeal, add strike
      if (moderationResult.decision === "rejected") {
        // Create draft listing (not published) so user can appeal
        const listing = await storage.createListing(listingData);
        
        // CRITICAL FIX: Set status to draft so rejected listings don't appear as active
        await storage.setListingStatus(listing.id, req.user!.id, "draft");

        // Create moderation review for the rejected listing
        const review = await storage.createModerationReview({
          listingId: listing.id,
          aiDecision: moderationResult.decision,
          aiConfidence: moderationResult.confidence,
          aiReasons: moderationResult.reasons,
          aiAnalysis: JSON.stringify(moderationResult.details),
          textScore: moderationResult.textScore,
          imageScores: moderationResult.imageScores ? moderationResult.imageScores.map((s: number) => s.toString()) : []
        });

        await storage.updateModerationReview(review.id, {
          status: "rejected"
        });

        await storage.updateListingModeration(listing.id, "rejected", review.id);

        // Add strike to user (but not for admins)
        let currentStrikes = 0;
        if (user?.role !== "admin") {
          currentStrikes = (user?.moderationStrikes || 0) + 1;
          await storage.updateUserStrikes(req.user!.id, currentStrikes);
          
          // Check if user should be banned
          const maxStrikesSetting = await storage.getModerationSetting("max_strikes_before_ban");
          const maxStrikes = parseInt(maxStrikesSetting?.value || "5");
          
          if (currentStrikes >= maxStrikes) {
            await storage.banUser(req.user!.id, `Cuenta suspendida automáticamente por ${currentStrikes} violaciones de moderación`);
          }
        }

        // Create rejection log
        await storage.createModerationLog({
          action: "auto_rejected",
          targetType: "listing",
          targetId: listing.id,
          performedBy: null,
          details: JSON.stringify({ 
            userId: req.user!.id,
            title: listingData.title,
            confidence: moderationResult.confidence, 
            reasons: moderationResult.reasons,
            strikes: currentStrikes
          })
        });

        // Extract specific AI analysis
        const specificIssues = moderationResult.details.textAnalysis?.issues || [];
        const problematicWords = moderationResult.details.textAnalysis?.problematicWords || [];
        
        // Extract explanation from raw AI analysis if available
        let aiExplanation = "";
        try {
          const aiAnalysis = JSON.stringify(moderationResult.details);
          const parsedAnalysis = JSON.parse(aiAnalysis);
          aiExplanation = parsedAnalysis?.textAnalysis?.explanation || 
                          parsedAnalysis?.explanation || 
                          "Contenido detectado que viola nuestras políticas";
        } catch (e) {
          aiExplanation = "Contenido detectado que viola nuestras políticas";
        }
        
        // Return error with specific AI reasons + review ID for appeal
        const reasonsInSpanish: Record<string, string> = {
          "inappropriate_text": "Contenido inapropiado detectado en el texto",
          "cuba_policy_violation": "Violación de las políticas de contenido cubanas",
          "inappropriate_images": "Imágenes inapropiadas detectadas",
          "spam_detected": "Contenido spam detectado",
          "duplicate_listing": "Anuncio duplicado detectado"
        };

        const translatedReasons = moderationResult.reasons.map(r => reasonsInSpanish[r] || r);
        
        return res.status(400).json({ 
          message: "Su anuncio fue rechazado por violación de nuestras políticas de contenido",
          reasons: translatedReasons,
          specificIssues: specificIssues,
          problematicWords: problematicWords,
          aiExplanation: aiExplanation,
          confidence: moderationResult.confidence,
          warning: "⚠️ ADVERTENCIA: Violaciones repetidas de nuestras políticas pueden resultar en la exclusión permanente de la plataforma.",
          reviewId: review.id, // Include review ID for appeals
          listingId: listing.id
        });
      }

      // If APPROVED: Create listing and publish
      const listing = await storage.createListing(listingData);

      const review = await storage.createModerationReview({
        listingId: listing.id,
        aiDecision: moderationResult.decision,
        aiConfidence: moderationResult.confidence,
        aiReasons: moderationResult.reasons,
        aiAnalysis: JSON.stringify(moderationResult.details),
        textScore: moderationResult.textScore,
        imageScores: moderationResult.imageScores ? moderationResult.imageScores.map((s: number) => s.toString()) : []
      });

      await storage.updateModerationReview(review.id, {
        status: "approved"
      });

      await storage.updateListingModeration(listing.id, "approved", review.id);
      await storage.publishListing(listing.id);
      
      await storage.createModerationLog({
        action: "auto_approved",
        targetType: "listing",
        targetId: listing.id,
        performedBy: null,
        details: JSON.stringify({ confidence: moderationResult.confidence, reasons: moderationResult.reasons })
      });

      res.status(201).json({ 
        listing, 
        moderationReview: review,
        moderationStatus: "approved"
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Error de validación", 
          details: validationError.message 
        });
      }
      console.error("Error creating listing:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // PUT /api/listings/:id - Update listing (requires auth + ownership)
  app.put("/api/listings/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      // Convert empty strings to null for foreign keys and numeric fields
      const cleanedBody = {
        ...req.body,
        categoryId: req.body.categoryId === "" ? null : req.body.categoryId,
        price: req.body.price === "" ? null : req.body.price,
      };
      
      const validatedData = insertListingSchema.partial().parse(cleanedBody);
      
      // Validate that categoryId refers to a subcategory (not a main category)
      if (validatedData.categoryId) {
        const category = await storage.getCategory(validatedData.categoryId);
        if (!category) {
          return res.status(400).json({ message: "La categoría seleccionada no existe" });
        }
        if (!category.parentId) {
          return res.status(400).json({ message: "Debe seleccionar una subcategoría, no una categoría principal" });
        }
      }
      
      const listing = await storage.updateListing(req.params.id, req.user!.id, validatedData);
      
      if (!listing) {
        return res.status(404).json({ message: "Anuncio no encontrado o sin permiso" });
      }
      
      res.json(listing);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Error de validación", 
          details: validationError.message 
        });
      }
      console.error("Error updating listing:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // DELETE /api/listings/:id - Delete listing (requires auth + ownership)
  app.delete("/api/listings/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      // First, get the listing to retrieve its images
      const listing = await storage.getListing(req.params.id);
      
      if (!listing) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }
      
      // Check ownership
      if (listing.sellerId !== req.user!.id) {
        return res.status(403).json({ message: "No tiene permiso para eliminar este anuncio" });
      }
      
      // Delete the listing from database first
      const success = await storage.deleteListing(req.params.id, req.user!.id);
      
      if (!success) {
        return res.status(404).json({ message: "Error al eliminar el anuncio" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    const { status } = req.body;
    
    if (!status || !['active', 'paused', 'sold'].includes(status)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    try {
      const success = await storage.setListingStatus(req.params.id, req.user!.id, status);
      
      if (!success) {
        return res.status(404).json({ message: "Anuncio no encontrado o sin permiso" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      const success = await storage.markListingSold(req.params.id, req.user!.id);
      
      if (!success) {
        return res.status(404).json({ message: "Anuncio no encontrado o sin permiso" });
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
      res.json({ message: "Vista registrada" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
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
        city: req.query.city as string,
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      const { name, searchParams } = req.body;
      if (!name || searchParams === undefined) {
        return res.status(400).json({ message: "El nombre y los parámetros de búsqueda son obligatorios" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      await storage.addFavorite(req.user!.id, req.params.listingId);
      res.status(201).json({ message: "Zu Favoriten hinzugefügt" });
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // DELETE /api/favorites/:listingId - Remove from favorites (requires auth)
  app.delete("/api/favorites/:listingId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    // Prevent following self
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ message: "No puede seguirse a sí mismo" });
    }

    try {
      await storage.followUser(req.user!.id, req.params.id);
      res.status(201).json({ message: "Ahora sigue a este usuario" });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // DELETE /api/users/:id/follow - Unfollow a user (requires auth)
  app.delete("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      await storage.unfollowUser(req.user!.id, req.params.id);
      res.json({ message: "Ya no sigue a este usuario" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    // Prevent rating self
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ message: "No puede valorarse a sí mismo" });
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

  // POST /api/user/phone - Update user phone and province (requires auth)
  app.post("/api/user/phone", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      const validatedData = updatePhoneSchema.parse(req.body);
      
      // Check if phone is already used by another user
      if (validatedData.phone) {
        const existingUser = await storage.getUserByPhone(validatedData.phone);
        if (existingUser && existingUser.id !== req.user!.id) {
          return res.status(400).json({ message: "Este número de teléfono ya está registrado" });
        }
      }

      const updatedUser = await storage.updateUserPhone(
        req.user!.id,
        validatedData.phone,
        validatedData.province
      );

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        province: updatedUser.province,
        role: updatedUser.role,
        provider: updatedUser.provider,
        hasPhone: !!updatedUser.phone,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating phone:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // PATCH /api/user/profile - Update user profile (requires auth)
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      const { name, email, province } = req.body;
      
      // Validate name doesn't contain numbers
      if (name && /\d/.test(name)) {
        return res.status(400).json({ message: "El nombre no puede contener números" });
      }
      
      // Check if email is already used by another user
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.user!.id) {
          return res.status(400).json({ message: "Esta dirección de correo electrónico ya está registrada" });
        }
      }

      const updatedUser = await storage.updateUserProfile(req.user!.id, {
        name,
        email,
        province
      });

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        province: updatedUser.province,
        role: updatedUser.role,
        provider: updatedUser.provider,
        hasPhone: !!updatedUser.phone,
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // PATCH /api/user/password - Change user password (requires auth)
  app.patch("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Se requiere contraseña actual y nueva" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "La nueva contraseña debe tener al menos 8 caracteres" });
      }

      // Get current user with password
      const user = await storage.getUserById(req.user!.id);
      if (!user || !user.password) {
        return res.status(400).json({ message: "Usuario no encontrado o sin contraseña establecida" });
      }

      // Verify current password
      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "La contraseña actual es incorrecta" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password in database
      await storage.updateUserPassword(req.user!.id, hashedPassword);

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error: any) {
      console.error("Error updating password:", error);
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    const { premiumOptionId } = req.body;
    
    if (!premiumOptionId) {
      return res.status(400).json({ message: "Se requiere ID de opción premium" });
    }

    try {
      // Verify listing ownership
      const listing = await storage.getListing(req.params.id);
      if (!listing || listing.sellerId !== req.user!.id) {
        return res.status(404).json({ message: "Anuncio no encontrado o sin permiso" });
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

  // Local image upload with WebP conversion
  app.post("/api/listings/upload-image", upload.single('image'), async (req, res) => {
    // Require authentication for listing image uploads
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión para subir imágenes" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    try {
      const userId = req.user!.id;
      const originalPath = req.file.path;
      const filename = req.file.filename;
      const webpFilename = filename.replace(/\.[^.]+$/, '.webp');
      const webpPath = path.join(path.dirname(originalPath), webpFilename);
      
      // ===== WEBP CONVERSION FOR BANDWIDTH OPTIMIZATION =====
      try {
        // Convert to WebP with 85% quality and resize to max 2000px width
        // This ensures even large files get compressed significantly while maintaining quality
        await sharp(originalPath)
          .resize(2000, 2000, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .webp({ quality: 85 })
          .toFile(webpPath);
        
        // Delete original file to save storage space
        await fs.unlink(originalPath);
        
        // Return relative path for storing in database
        const objectPath = `/uploads/${userId}/${webpFilename}`;
        res.json({ objectPath });
      } catch (conversionError) {
        console.error("WebP conversion error, using original:", conversionError);
        
        // If conversion fails, keep original
        const objectPath = `/uploads/${userId}/${filename}`;
        res.json({ objectPath });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Error al subir la imagen" });
    }
  });

  // Serve uploaded images
  app.get("/uploads/:userId/:filename", async (req, res) => {
    try {
      const { userId, filename } = req.params;
      const filePath = path.join(uploadDir, userId, filename);
      
      // Check if file exists
      if (!existsSync(filePath)) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      // Determine content type
      const ext = path.extname(filename).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      };
      
      res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache images for 1 year
      
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ MODERATION ROUTES ============
  
  // Submit appeal for rejected listing (accepts listingId)
  app.post("/api/moderation/appeal", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      const { listingId, reason } = req.body;

      if (!reason || reason.trim().length < 20) {
        return res.status(400).json({ message: "El motivo de la apelación debe tener al menos 20 caracteres" });
      }

      const listing = await storage.getListing(listingId);
      if (!listing || listing.sellerId !== req.user!.id) {
        return res.status(403).json({ message: "No tiene permiso para apelar este anuncio" });
      }

      if (listing.moderationStatus !== "rejected") {
        return res.status(400).json({ message: "Solo se pueden apelar anuncios rechazados" });
      }

      // Get the moderation review for this listing
      const review = await storage.getModerationReviewByListing(listingId);
      if (!review) {
        return res.status(404).json({ message: "Moderationsprüfung nicht gefunden" });
      }

      // Check if already appealed
      if (review.status === "appealed") {
        return res.status(400).json({ message: "Ya ha apelado este anuncio. Por favor espere la revisión del administrador." });
      }

      // Update review status to appealed
      const updated = await storage.updateModerationReview(review.id, {
        status: "appealed",
        appealReason: reason,
        appealedAt: new Date()
      });

      // Update listing moderation status to appealed
      await storage.updateListingModeration(listingId, "appealed", review.id);

      await storage.createModerationLog({
        action: "appeal_submitted",
        targetType: "listing",
        targetId: listingId,
        performedBy: req.user!.id,
        details: JSON.stringify({ reviewId: review.id, reason })
      });

      res.json({ 
        success: true, 
        message: "Apelación enviada correctamente",
        review: updated 
      });
    } catch (error) {
      console.error("Error submitting appeal:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get moderation status for a listing
  app.get("/api/moderation/status/:listingId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    try {
      const { listingId } = req.params;
      const listing = await storage.getListing(listingId);
      
      if (!listing) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }

      if (listing.sellerId !== req.user!.id) {
        return res.status(403).json({ message: "No tiene permiso para ver este anuncio" });
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
      return res.status(401).json({ message: "Debe iniciar sesión para reportar" });
    }

    try {
      const { listingId, reportedUserId, reason, description } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "El motivo del reporte es obligatorio" });
      }

      if (!listingId && !reportedUserId) {
        return res.status(400).json({ message: "Debe reportar un anuncio o un usuario" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
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
      return res.status(401).json({ message: "Debe iniciar sesión para reportar" });
    }

    try {
      const { type, targetId, reason, description } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "El motivo del reporte es obligatorio" });
      }

      if (!type || !targetId) {
        return res.status(400).json({ message: "Se requiere tipo e ID de objetivo" });
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
      return res.status(401).json({ message: "Debe iniciar sesión" });
    }

    const isAdmin = await storage.isAdmin(req.user!.id);
    if (!isAdmin) {
      return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador" });
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
      const { items: rawLogs } = await storage.getModerationLogs({ limit: 10 });

      // Format logs with better information
      const recentLogs = rawLogs.map((log: any) => {
        let actionLabel = log.action;
        let details = log.details;
        
        // Parse details if it's JSON
        try {
          const parsedDetails = JSON.parse(log.details || '{}');
          
          // Create human-readable action descriptions
          switch (log.action) {
            case 'auto_approved':
              actionLabel = 'Automatisch genehmigt';
              const approveConfidence = parsedDetails.confidence || parsedDetails.aiConfidence || 'N/A';
              details = `Anzeige automatisch genehmigt (Konfidenz: ${approveConfidence}%)`;
              break;
            case 'auto_rejected':
              actionLabel = 'Automatisch abgelehnt';
              const rejectConfidence = parsedDetails.confidence || parsedDetails.aiConfidence || 'N/A';
              details = `Anzeige automatisch abgelehnt (Konfidenz: ${rejectConfidence}%)`;
              break;
            case 'manual_review':
              actionLabel = 'Manuelle Prüfung';
              if (parsedDetails.decision) {
                details = `Anzeige ${parsedDetails.decision === 'approved' ? 'genehmigt' : 'abgelehnt'}`;
              } else {
                details = 'Manuelle Überprüfung durchgeführt';
              }
              break;
            case 'appeal_submitted':
              actionLabel = 'Einspruch eingereicht';
              details = 'Benutzer hat Einspruch eingereicht';
              break;
            case 'report_created':
              actionLabel = 'Meldung erstellt';
              details = 'Neue Meldung wurde eingereicht';
              break;
            case 'listing_deleted':
              actionLabel = 'Anzeige gelöscht';
              details = 'Anzeige wurde vom Admin gelöscht';
              break;
            default:
              actionLabel = log.action;
          }
        } catch (e) {
          // Keep original details if parsing fails
        }

        return {
          id: log.id,
          action: actionLabel,
          details: details,
          performedAt: log.createdAt, // Map createdAt to performedAt for frontend
          targetType: log.targetType,
          targetId: log.targetId
        };
      });

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
        return res.status(400).json({ message: "Ungültige Entscheidung" });
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
      
      // Enrich reports with listing/user details
      const enrichedReports = await Promise.all(reports.map(async (report) => {
        let listing = null;
        let reportedUser = null;
        
        if (report.listingId) {
          listing = await storage.getListing(report.listingId);
        }
        
        if (report.reportedUserId) {
          reportedUser = await storage.getUserById(report.reportedUserId);
        }
        
        return {
          ...report,
          listing,
          reportedUser
        };
      }));
      
      res.json(enrichedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Resolve report
  app.post("/api/admin/reports/:reportId/resolve", requireAdmin, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { resolution, action } = req.body; // action: "dismiss" | "confirm"

      if (!resolution) {
        return res.status(400).json({ message: "La resolución es obligatoria" });
      }

      const resolved = await storage.resolveReport(reportId, req.user!.id, resolution);
      
      if (!resolved) {
        return res.status(404).json({ message: "Reporte no encontrado" });
      }

      // If action is "confirm" and it's a listing report, delete the listing
      if (action === "confirm" && resolved.listingId) {
        const deleted = await storage.deleteListingAsAdmin(resolved.listingId);
        
        if (!deleted) {
          return res.status(400).json({ message: "No se pudo eliminar el anuncio" });
        }
        
        await storage.createModerationLog({
          action: "listing_deleted",
          targetType: "listing",
          targetId: resolved.listingId,
          performedBy: req.user!.id,
          details: JSON.stringify({ reason: "Report confirmed by admin", reportId })
        });
      }

      await storage.createModerationLog({
        action: "report_resolved",
        targetType: "report",
        targetId: reportId,
        performedBy: req.user!.id,
        details: JSON.stringify({ resolution, action })
      });

      res.json(resolved);
    } catch (error) {
      console.error("Error resolving report:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get rejection logs (Live-Sperrungs-Log)
  app.get("/api/admin/rejections", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const timeFilter = req.query.timeFilter as string;

      // Calculate time threshold based on filter
      let createdAfter: Date | undefined;
      if (timeFilter === "24h") {
        createdAfter = new Date(Date.now() - 24 * 60 * 60 * 1000);
      } else if (timeFilter === "7d") {
        createdAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeFilter === "30d") {
        createdAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      const { items: logs, total } = await storage.getModerationLogs({ 
        action: "auto_rejected", 
        limit, 
        offset,
        createdAfter
      });
      
      // Parse the details JSON and load user info for each log
      const parsedLogs = await Promise.all(logs.map(async (log: any) => {
        let details = {};
        let user = null;
        
        try {
          details = JSON.parse(log.details || '{}');
          
          // Load user info if userId is in details
          if ((details as any).userId) {
            user = await storage.getUser((details as any).userId);
          }
        } catch (e) {
          console.error('Error parsing log details:', e);
        }
        
        return {
          ...log,
          parsedDetails: details,
          user: user ? {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email
          } : null
        };
      }));

      res.json({ items: parsedLogs, total });
    } catch (error) {
      console.error("Error fetching rejection logs:", error);
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
        return res.status(400).json({ message: "Typ, Wert und Grund sind erforderlich" });
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
        return res.status(404).json({ message: "Elemento no encontrado" });
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
        return res.status(404).json({ message: "Elemento no encontrado" });
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
        return res.status(400).json({ message: "Se requiere clave y valor" });
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

  // Update multiple moderation settings
  app.put("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ message: "Se requieren configuraciones válidas" });
      }

      const updates = [];
      for (const [key, value] of Object.entries(settings)) {
        const setting = await storage.setModerationSetting(key, value as string);
        updates.push(setting);

        await storage.createModerationLog({
          action: "setting_updated",
          targetType: "setting",
          targetId: setting.id,
          performedBy: req.user!.id,
          details: JSON.stringify({ key, value })
        });
      }

      res.json({ success: true, updated: updates.length });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get all users (for admin panel)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Block user
  app.post("/api/admin/users/:id/block", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await storage.banUser(id, reason || "Suspendido por el administrador");
      
      await storage.createModerationLog({
        action: "user_blocked",
        targetType: "user",
        targetId: id,
        performedBy: req.user!.id,
        details: JSON.stringify({ reason })
      });

      res.json({ success: true, message: "Usuario suspendido exitosamente" });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Unblock user
  app.post("/api/admin/users/:id/unblock", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      await storage.unbanUser(id);
      
      await storage.createModerationLog({
        action: "user_unblocked",
        targetType: "user",
        targetId: id,
        performedBy: req.user!.id,
        details: null
      });

      res.json({ success: true, message: "Usuario desbloqueado exitosamente" });
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Update user strikes
  app.patch("/api/admin/users/:id/strikes", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { strikes } = req.body;

      if (typeof strikes !== 'number' || strikes < 0) {
        return res.status(400).json({ message: "Ungültige Anzahl von Verwarnungen" });
      }

      await storage.updateUserStrikes(id, strikes);
      
      await storage.createModerationLog({
        action: "strikes_updated",
        targetType: "user",
        targetId: id,
        performedBy: req.user!.id,
        details: JSON.stringify({ strikes })
      });

      res.json({ success: true, message: "Advertencias actualizadas exitosamente" });
    } catch (error) {
      console.error("Error updating strikes:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Create admin user
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { userId, role, permissions } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ message: "Se requiere ID de usuario y rol" });
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

  // =============================================
  // PREMIUM FEATURES ADMIN ROUTES
  // =============================================

  // Get all premium features (including disabled)
  app.get("/api/admin/premium-features", requireAdmin, async (req, res) => {
    try {
      const features = await storage.getAllPremiumOptions();
      res.json(features);
    } catch (error) {
      console.error("Error fetching premium features:", error);
      res.status(500).json({ message: "Error al cargar las funciones premium" });
    }
  });

  // Update premium feature (enable/disable, change price, etc.)
  app.put("/api/admin/premium-features/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await storage.updatePremiumOption(id, updates);

      if (!updated) {
        return res.status(404).json({ message: "Función premium no encontrada" });
      }

      await storage.createModerationLog({
        action: "premium_feature_updated",
        targetType: "premium_feature",
        targetId: id,
        performedBy: req.user!.id,
        details: JSON.stringify(updates)
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating premium feature:", error);
      res.status(500).json({ message: "Error al actualizar la función premium" });
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

  // =============================================
  // PREMIUM FEATURES USER ROUTES
  // =============================================

  // Get active premium features (for users)
  app.get("/api/premium-features", async (req, res) => {
    try {
      const features = await storage.getPremiumOptions();
      res.json(features);
    } catch (error) {
      console.error("Error fetching premium features:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Purchase premium features for a listing
  app.post("/api/listings/:id/premium", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Debe iniciar sesión para activar funciones premium" });
    }

    try {
      const { id: listingId } = req.params;
      const { featureIds } = req.body;

      if (!Array.isArray(featureIds) || featureIds.length === 0) {
        return res.status(400).json({ message: "Sie müssen mindestens eine Premium-Funktion auswählen" });
      }

      // Verify listing belongs to user
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Anuncio no encontrado" });
      }
      if (listing.sellerId !== req.user!.id) {
        return res.status(403).json({ message: "No tiene permiso para modificar este anuncio" });
      }

      // Validate feature IDs against active options
      const activeFeatures = await storage.getPremiumOptions();
      const activeFeatureIds = activeFeatures.map(f => f.id);
      const invalidIds = featureIds.filter(id => !activeFeatureIds.includes(id));
      
      if (invalidIds.length > 0) {
        return res.status(400).json({ 
          message: "Eine oder mehrere ausgewählte Funktionen sind nicht verfügbar" 
        });
      }

      // Purchase each feature
      const purchases = [];
      for (const featureId of featureIds) {
        const purchase = await storage.purchasePremium(listingId, featureId);
        purchases.push(purchase);
      }

      res.json({ 
        success: true, 
        message: "Funciones premium activadas exitosamente",
        purchases 
      });
    } catch (error: any) {
      console.error("Error purchasing premium features:", error);
      res.status(500).json({ message: error.message || "Error al activar las funciones premium" });
    }
  });

  // =============================================
  // PUBLIC SETTINGS ROUTES
  // =============================================

  // Get description minimum length (public)
  app.get("/api/settings/description-min-length", async (req, res) => {
    try {
      const setting = await storage.getModerationSetting("description_min_length");
      res.json({ minLength: parseInt(setting?.value || "50") });
    } catch (error) {
      console.error("Error fetching description min length:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // =============================================
  // PUBLIC BANNER & SPONSORED ROUTES
  // =============================================

  // Get active banners (public)
  app.get("/api/banners/active", async (req, res) => {
    try {
      const { position } = req.query;
      const banners = await storage.getActiveBanners(position as string);
      res.json(banners);
    } catch (error) {
      console.error("Error fetching active banners:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get active sponsored listings (public)
  app.get("/api/sponsored-listings/active", async (req, res) => {
    try {
      const { categoryId } = req.query;
      const sponsored = await storage.getActiveSponsoredListings(categoryId as string);
      res.json(sponsored);
    } catch (error) {
      console.error("Error fetching active sponsored listings:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // =============================================
  // BANNER MANAGEMENT ADMIN ROUTES
  // =============================================

  // Get all banners
  app.get("/api/admin/banners", requireAdmin, async (req, res) => {
    try {
      const { position } = req.query;
      const banners = await storage.getBanners(position as string);
      res.json(banners);
    } catch (error) {
      console.error("Error fetching banners:", error);
      res.status(500).json({ message: "Error al cargar los banners" });
    }
  });

  // Create banner
  app.post("/api/admin/banners", requireAdmin, async (req, res) => {
    try {
      const validatedData = req.body;
      const banner = await storage.createBanner(validatedData);
      
      await storage.createModerationLog({
        action: "banner_created",
        targetType: "banner",
        targetId: banner.id,
        performedBy: req.user!.id,
        details: JSON.stringify(validatedData)
      });
      
      res.status(201).json(banner);
    } catch (error) {
      console.error("Error creating banner:", error);
      res.status(500).json({ message: "Error al crear el banner" });
    }
  });

  // Update banner
  app.put("/api/admin/banners/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const banner = await storage.updateBanner(id, updates);
      
      if (!banner) {
        return res.status(404).json({ message: "Banner nicht gefunden" });
      }
      
      await storage.createModerationLog({
        action: "banner_updated",
        targetType: "banner",
        targetId: id,
        performedBy: req.user!.id,
        details: JSON.stringify(updates)
      });
      
      res.json(banner);
    } catch (error) {
      console.error("Error updating banner:", error);
      res.status(500).json({ message: "Error al actualizar el banner" });
    }
  });

  // Delete banner
  app.delete("/api/admin/banners/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBanner(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Banner nicht gefunden" });
      }
      
      await storage.createModerationLog({
        action: "banner_deleted",
        targetType: "banner",
        targetId: id,
        performedBy: req.user!.id,
        details: null
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting banner:", error);
      res.status(500).json({ message: "Error al eliminar el banner" });
    }
  });

  // Toggle banner active status
  app.post("/api/admin/banners/:id/toggle", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const banner = await storage.toggleBannerActive(id);
      
      if (!banner) {
        return res.status(404).json({ message: "Banner nicht gefunden" });
      }
      
      await storage.createModerationLog({
        action: banner.isActive === "true" ? "banner_activated" : "banner_deactivated",
        targetType: "banner",
        targetId: id,
        performedBy: req.user!.id,
        details: null
      });
      
      res.json(banner);
    } catch (error) {
      console.error("Error toggling banner:", error);
      res.status(500).json({ message: "Error al alternar el banner" });
    }
  });

  // =============================================
  // SPONSORED LISTINGS ADMIN ROUTES
  // =============================================

  // Get all sponsored listings
  app.get("/api/admin/sponsored-listings", requireAdmin, async (req, res) => {
    try {
      const listings = await storage.getSponsoredListings();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching sponsored listings:", error);
      res.status(500).json({ message: "Error al cargar los anuncios patrocinados" });
    }
  });

  // Create sponsored listing
  app.post("/api/admin/sponsored-listings", requireAdmin, async (req, res) => {
    try {
      const validatedData = req.body;
      const sponsored = await storage.createSponsoredListing(validatedData);
      
      await storage.createModerationLog({
        action: "sponsored_listing_created",
        targetType: "sponsored_listing",
        targetId: sponsored.id,
        performedBy: req.user!.id,
        details: JSON.stringify(validatedData)
      });
      
      res.status(201).json(sponsored);
    } catch (error) {
      console.error("Error creating sponsored listing:", error);
      res.status(500).json({ message: "Error al crear el anuncio patrocinado" });
    }
  });

  // Update sponsored listing
  app.put("/api/admin/sponsored-listings/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const sponsored = await storage.updateSponsoredListing(id, updates);
      
      if (!sponsored) {
        return res.status(404).json({ message: "Gesponserte Anzeige nicht gefunden" });
      }
      
      await storage.createModerationLog({
        action: "sponsored_listing_updated",
        targetType: "sponsored_listing",
        targetId: id,
        performedBy: req.user!.id,
        details: JSON.stringify(updates)
      });
      
      res.json(sponsored);
    } catch (error) {
      console.error("Error updating sponsored listing:", error);
      res.status(500).json({ message: "Error al actualizar el anuncio patrocinado" });
    }
  });

  // Delete sponsored listing
  app.delete("/api/admin/sponsored-listings/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSponsoredListing(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Gesponserte Anzeige nicht gefunden" });
      }
      
      await storage.createModerationLog({
        action: "sponsored_listing_deleted",
        targetType: "sponsored_listing",
        targetId: id,
        performedBy: req.user!.id,
        details: null
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting sponsored listing:", error);
      res.status(500).json({ message: "Error al eliminar el anuncio patrocinado" });
    }
  });

  // =============================================
  // CATEGORY MANAGEMENT ADMIN ROUTES
  // =============================================

  // Create category
  app.post("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const validatedData = req.body;
      const category = await storage.createCategory(validatedData);
      
      await storage.createModerationLog({
        action: "category_created",
        targetType: "category",
        targetId: category.id,
        performedBy: req.user!.id,
        details: JSON.stringify(validatedData)
      });
      
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Error al crear la categoría" });
    }
  });

  // Update category
  app.put("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const category = await storage.updateCategory(id, updates);
      
      if (!category) {
        return res.status(404).json({ message: "Categoría no encontrada" });
      }
      
      await storage.createModerationLog({
        action: "category_updated",
        targetType: "category",
        targetId: id,
        performedBy: req.user!.id,
        details: JSON.stringify(updates)
      });
      
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Error al actualizar la categoría" });
    }
  });

  // Delete category
  app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Categoría no encontrada" });
      }
      
      await storage.createModerationLog({
        action: "category_deleted",
        targetType: "category",
        targetId: id,
        performedBy: req.user!.id,
        details: null
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Error al eliminar la categoría" });
    }
  });

  // Reorder categories
  app.post("/api/admin/categories/reorder", requireAdmin, async (req, res) => {
    try {
      const { categoryOrders } = req.body;
      
      if (!Array.isArray(categoryOrders)) {
        return res.status(400).json({ message: "Ungültiges Format" });
      }
      
      await storage.reorderCategories(categoryOrders);
      
      await storage.createModerationLog({
        action: "categories_reordered",
        targetType: "category",
        targetId: "",
        performedBy: req.user!.id,
        details: JSON.stringify(categoryOrders)
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering categories:", error);
      res.status(500).json({ message: "Error al ordenar las categorías" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
