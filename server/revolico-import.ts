/**
 * Revolico Import Service
 * Importiert gescrapte Listings vom rico-scraper in Rico-Cuba
 */

import { db } from "./db";
import { listings, categories } from "../shared/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Kategorie-Mapping: Revolico -> Rico-Cuba
const CATEGORY_MAPPING: Record<string, string> = {
  // Comprar & Vender
  'movil': 'Móviles',
  'telefono': 'Móviles',
  'smartphone': 'Móviles',
  'celular': 'Móviles',
  'foto': 'Foto / Video',
  'camara': 'Foto / Video',
  'video': 'Foto / Video',
  'tv': 'TV / Accesorios',
  'television': 'TV / Accesorios',
  'computadora': 'Computadoras',
  'laptop': 'Computadoras',
  'pc': 'Computadoras',
  'electrodomestico': 'Electrodomésticos',
  'nevera': 'Electrodomésticos',
  'refrigerador': 'Electrodomésticos',
  'lavadora': 'Electrodomésticos',
  'microondas': 'Electrodomésticos',
  'ventilador': 'Electrodomésticos',
  'plancha': 'Electrodomésticos',
  'mueble': 'Muebles y Decoración',
  'decoracion': 'Muebles y Decoración',
  'sofa': 'Muebles y Decoración',
  'ropa': 'Ropa / Zapatos / Accesorios',
  'zapato': 'Ropa / Zapatos / Accesorios',
  'mascota': 'Mascotas / Animales',
  'perro': 'Mascotas / Animales',
  'gato': 'Mascotas / Animales',
  'libro': 'Libros & Revistas',
  'joya': 'Joyas / Relojes',
  'reloj': 'Joyas / Relojes',
  'deporte': 'Equipamiento Deportivo',
  'bicicleta': 'Bicicletas',
  'bici': 'Bicicletas',

  // Vehículos
  'auto': 'Autos / Camiones / Remolques',
  'carro': 'Autos / Camiones / Remolques',
  'vehiculo': 'Autos / Camiones / Remolques',
  'moto': 'Motocicletas & Triciclos',
  'motocicleta': 'Motocicletas & Triciclos',
  'mecanico': 'Mecánico',
  'pieza': 'Piezas & Accesorios',
  'repuesto': 'Piezas & Accesorios',
  'taxi': 'Taxi & Servicio de Mensajería',

  // Inmobiliaria
  'casa': 'Ofertas & Búsquedas',
  'apartamento': 'Ofertas & Búsquedas',
  'alquiler': 'Alquiler a Cubanos',
  'renta': 'Alquiler a Cubanos',
  'playa': 'Casa en la Playa',

  // Energía
  'solar': 'Paneles Solares / Accesorios',
  'panel': 'Paneles Solares / Accesorios',
  'generador': 'Generadores & Accesorios',

  // Servicios
  'construccion': 'Trabajos de Construcción / Renovación / Mantenimiento',
  'renovacion': 'Trabajos de Construcción / Renovación / Mantenimiento',
  'mantenimiento': 'Trabajos de Construcción / Renovación / Mantenimiento',
  'albanil': 'Trabajos de Construcción / Renovación / Mantenimiento',
  'programacion': 'IT / Programación',
  'informatica': 'IT / Programación',
  'reparacion': 'Reparaciones Electrónicas',
  'curso': 'Cursos & Clases',
  'clase': 'Cursos & Clases',
  'fotografia': 'Servicio de Foto & Video',
  'peluqueria': 'Peluquería / Barbería / Belleza',
  'barberia': 'Peluquería / Barbería / Belleza',
  'belleza': 'Peluquería / Barbería / Belleza',
  'gimnasio': 'Gimnasio / Masaje / Entrenador',
  'masaje': 'Gimnasio / Masaje / Entrenador',
  'restaurante': 'Restaurantes / Gastronomía',
  'gastronomia': 'Restaurantes / Gastronomía',
  'comida': 'Restaurantes / Gastronomía',
  'pizza': 'Restaurantes / Gastronomía',
  'hamburguesa': 'Restaurantes / Gastronomía',
  'diseno': 'Diseño / Decoración',
  'musica': 'Música / Animación / Shows',

  // Material de Construcción
  'aire': 'Aires Acondicionados & Accesorios',
  'acondicionado': 'Aires Acondicionados & Accesorios',
  'split': 'Aires Acondicionados & Accesorios',
  'cemento': 'Cemento / Pegamento / Masilla',
  'puerta': 'Puertas / Ventanas & Portones',
  'ventana': 'Puertas / Ventanas & Portones',
  'azulejo': 'Mármol / Granito / Azulejos',
  'marmol': 'Mármol / Granito / Azulejos',

  // Empleo
  'empleo': 'Ofertas de Empleo',
  'trabajo': 'Ofertas de Empleo',
};

function mapCategory(revolicoCategory: string | null): string | null {
  if (!revolicoCategory) return null;

  const categoryLower = revolicoCategory.toLowerCase();

  for (const [keyword, ricoCategory] of Object.entries(CATEGORY_MAPPING)) {
    if (categoryLower.includes(keyword)) {
      return ricoCategory;
    }
  }

  return null; // Will map to "Otros" later
}

/**
 * Downloads and saves a profile picture from the scraper
 * @param profilePictureId - The image ID from scraper
 * @param scraperApiUrl - Base URL of scraper API
 * @returns Local file path or null if download fails
 */
async function downloadProfilePicture(
  profilePictureId: string,
  scraperApiUrl: string
): Promise<string | null> {
  try {
    // Check if profile_picture_id is a direct URL or a hash
    let imageUrl: string;
    if (profilePictureId.startsWith('http://') || profilePictureId.startsWith('https://')) {
      // Direct URL from Revolico (e.g., https://pic.revolico.com/users/...jpg?class=thumb)
      imageUrl = profilePictureId;
    } else {
      // Hash/ID → load via scraper proxy
      imageUrl = `${scraperApiUrl}/api/image-proxy/${profilePictureId}`;
    }
    console.log(`Downloading profile picture from ${imageUrl}...`);

    // Fetch image from scraper
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch profile picture: ${response.statusText}`);
      return null;
    }

    // Get image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from content-type
    const contentType = response.headers.get('content-type') || 'image/png';
    const extension = contentType.split('/')[1] || 'png';

    // Create unique filename using hash
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const filename = `${hash}.${extension}`;

    // Save to uploads/revolico-profiles/
    const uploadsDir = path.join(process.cwd(), 'uploads', 'revolico-profiles');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filepath = path.join(uploadsDir, filename);

    // Only save if file doesn't exist yet
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, buffer);
      console.log(`✓ Saved profile picture to ${filepath}`);
    } else {
      console.log(`  ⊙ Profile picture already exists: ${filepath}`);
    }

    // Return relative path for database
    return `/uploads/revolico-profiles/${filename}`;
  } catch (error) {
    console.error(`Error downloading profile picture:`, error);
    return null;
  }
}

interface ScrapedListing {
  id: number;
  revolico_id: string;
  title: string;
  description: string;
  url: string;
  price: number | null;
  currency: string;
  phone_numbers: string[];
  seller_name?: string;
  profile_picture_id?: string;
  image_ids: string[];
  category: string;
  location: string;
  condition: string;
  scraped_at: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
  details: Array<{
    revolico_id: string;
    status: 'imported' | 'skipped' | 'error';
    reason?: string;
  }>;
}

export async function importRevolicoListings(
  scraperApiUrl: string = 'http://localhost:5000',
  scraperPublicUrl: string = 'http://217.154.105.67:5000'
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  try {
    // 1. Fetch scraped listings from rico-scraper API
    console.log(`Fetching listings from ${scraperApiUrl}/api/scraped-listings?exported=false`);

    const response = await fetch(`${scraperApiUrl}/api/scraped-listings?exported=false&limit=100`);

    if (!response.ok) {
      throw new Error(`Failed to fetch listings: ${response.statusText}`);
    }

    const data = await response.json();
    const scrapedListings: ScrapedListing[] = data.listings || [];

    console.log(`Found ${scrapedListings.length} listings to import`);

    // 2. Get all categories for mapping
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));

    // 3. Process each listing
    for (const scraped of scrapedListings) {
      try {
        // Check if already imported (by revolico_id)
        const existing = await db
          .select()
          .from(listings)
          .where(eq(listings.revolicoId, scraped.revolico_id))
          .limit(1);

        if (existing.length > 0) {
          result.skipped++;
          result.details.push({
            revolico_id: scraped.revolico_id,
            status: 'skipped',
            reason: 'Already imported',
          });
          continue;
        }

        // Map category
        const mappedCategoryName = mapCategory(scraped.category);
        const categoryId = mappedCategoryName
          ? categoryMap.get(mappedCategoryName) || categoryMap.get('Otros')
          : categoryMap.get('Otros');

        // Convert image hashes to URLs (use PUBLIC URL for browser access)
        const imageUrls = scraped.image_ids.map(
          hash => `${scraperPublicUrl}/api/image-proxy/${hash}`
        );

        // Extract primary phone number
        const primaryPhone = scraped.phone_numbers[0] || '';

        // Download profile picture if available
        let profilePicturePath: string | null = null;
        if (scraped.profile_picture_id) {
          profilePicturePath = await downloadProfilePicture(
            scraped.profile_picture_id,
            scraperApiUrl
          );
        }

        // Split location into city and province
        let locationCity = null;
        let locationRegion = null;

        if (scraped.location) {
          const parts = scraped.location.split(',').map(p => p.trim());
          if (parts.length >= 2) {
            locationCity = parts[0];      // "Arroyo Naranjo"
            locationRegion = parts[1];    // "La Habana"
          } else {
            // Wenn kein Komma, als Region behandeln
            locationRegion = scraped.location;
          }
        }

        // Create listing
        await db.insert(listings).values({
          title: scraped.title.substring(0, 500), // Truncate if needed
          description: scraped.description || 'Importado desde Revolico',
          price: scraped.price ? scraped.price.toString() : null,
          currency: scraped.currency || 'USD',
          priceType: scraped.price ? 'fixed' : 'consult',
          categoryId: categoryId || null,
          sellerId: null, // Not assigned yet - will be assigned when user registers
          locationCity: locationCity,
          locationRegion: locationRegion || 'Cuba',
          images: imageUrls.slice(0, 10), // Max 10 images
          condition: scraped.condition || 'used',
          contactPhone: primaryPhone,
          contactWhatsApp: 'true', // Revolico listings are WhatsApp
          status: 'active',
          moderationStatus: 'pending', // Needs moderation
          isPublished: 'false', // Not published until claimed and moderated
          source: 'revolico_scraped',
          revolicoId: scraped.revolico_id,
          scrapedAt: new Date(scraped.scraped_at),
          scrapedSellerName: scraped.seller_name || null,
          scrapedSellerPhone: primaryPhone || null, // Fix: use phone_numbers[0]
          scrapedSellerProfilePicture: profilePicturePath,
        });

        result.imported++;
        result.details.push({
          revolico_id: scraped.revolico_id,
          status: 'imported',
        });

        // Mark as exported in scraper
        try {
          await fetch(`${scraperApiUrl}/api/scraped-listings/${scraped.id}/mark-exported`, {
            method: 'POST',
          });
        } catch (e) {
          console.warn(`Failed to mark listing ${scraped.id} as exported:`, e);
        }

      } catch (error) {
        console.error(`Error importing listing ${scraped.revolico_id}:`, error);
        result.errors++;
        result.details.push({
          revolico_id: scraped.revolico_id,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors`);
    return result;

  } catch (error) {
    console.error('Fatal error during import:', error);
    result.success = false;
    return result;
  }
}

/**
 * Normalize phone number for flexible matching
 * Removes all non-digits and handles Cuban country code (53)
 * Returns 8-digit Cuban mobile number for comparison
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Handle country code 53
  if (digits.startsWith('53') && digits.length > 8) {
    // Remove country code to get 8-digit local number
    digits = digits.substring(2);
  }

  // Return normalized 8-digit number (or original if not valid Cuban format)
  return digits.length === 8 && digits.startsWith('5') ? digits : phone;
}

/**
 * Assign scraped listings to a user by phone number
 * Also copies the seller's profile picture to the user if they don't have one
 * Uses normalized phone matching to handle different formats (+53, spaces, etc.)
 */
export async function assignListingsByPhone(phone: string, userId: string): Promise<number> {
  try {
    // Import users table
    const { users } = await import("../shared/schema");

    // Normalize the user's phone number
    const normalizedUserPhone = normalizePhoneNumber(phone);

    // Get all unassigned Revolico listings
    const allUnassignedListings = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.source, 'revolico_scraped'),
          isNull(listings.sellerId)
        )
      );

    // Filter by normalized phone matching
    const unassignedListings = allUnassignedListings.filter(listing => {
      const normalizedListingPhone = normalizePhoneNumber(listing.contactPhone);
      return normalizedListingPhone === normalizedUserPhone;
    });

    if (unassignedListings.length === 0) {
      console.log(`No unassigned listings found for phone ${phone} (normalized: ${normalizedUserPhone})`);
      return 0;
    }

    console.log(`Found ${unassignedListings.length} listings matching phone ${phone} (normalized: ${normalizedUserPhone})`)

    // Get first listing's scraped profile picture (if exists)
    const firstListing = unassignedListings[0];
    const scrapedProfilePicture = firstListing.scrapedSellerProfilePicture;

    // Update user profile picture if they don't have one and scraped data exists
    if (scrapedProfilePicture) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user && !user.profilePicture) {
        await db.update(users).set({ profilePicture: scrapedProfilePicture }).where(eq(users.id, userId));
        console.log(`✓ Set profile picture for user ${userId} from scraped data: ${scrapedProfilePicture}`);
      }
    }

    // Assign matched listings to user
    const listingIds = unassignedListings.map(l => l.id);
    const result = await db
      .update(listings)
      .set({
        sellerId: userId,
        isPublished: 'false', // Still needs moderation
        updatedAt: new Date(),
      })
      .where(inArray(listings.id, listingIds));

    console.log(`✓ Assigned ${result.rowCount || 0} listings with phone ${phone} to user ${userId}`);
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error assigning listings:', error);
    throw error;
  }
}
