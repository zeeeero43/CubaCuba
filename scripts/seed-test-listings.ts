import { db } from "../server/db";
import { listings, categories, users } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

async function seedTestListings() {
  console.log("🌱 Seeding test listings...");

  try {
    // Delete existing test listings (idempotent)
    console.log("🗑️  Deleting existing test listings...");
    await db.delete(listings).where(eq(listings.title, "iPhone 14 Pro Max 256GB"));
    await db.delete(listings).where(eq(listings.title, "Casa 3 habitaciones Vedado"));
    await db.delete(listings).where(eq(listings.title, "Auto Chevrolet 2015"));
    await db.delete(listings).where(eq(listings.title, "Laptop Dell Inspiron 15"));
    await db.delete(listings).where(eq(listings.title, "Generador Eléctrico 5KW"));
    
    // Get first user (admin or any user)
    const allUsers = await db.select().from(users).limit(1);
    if (allUsers.length === 0) {
      console.error("❌ No users found! Create a user first.");
      process.exit(1);
    }
    const sellerId = allUsers[0].id;
    console.log(`✅ Using user: ${allUsers[0].email}`);

    // Get some categories (main categories without parent)
    const cats = await db.select().from(categories).where(isNull(categories.parentId)).limit(3);
    if (cats.length === 0) {
      console.error("❌ No categories found! Run seed-categories.ts first.");
      process.exit(1);
    }
    console.log(`✅ Found ${cats.length} categories`);

    // Test listings
    const testListings = [
      {
        title: "iPhone 14 Pro Max 256GB",
        description: "iPhone 14 Pro Max en excelente condición, 256GB de almacenamiento. Incluye cargador y caja original.",
        price: "850",
        currency: "USD" as const,
        priceType: "fixed" as const,
        categoryId: cats[0].id,
        sellerId,
        status: "active" as const,
        condition: "used" as const,
        locationProvince: "La Habana",
        locationCity: "Vedado",
        images: [],
        moderationStatus: "approved" as const,
      },
      {
        title: "Casa 3 habitaciones Vedado",
        description: "Casa colonial de 3 habitaciones en el corazón del Vedado. 120m², con patio y garaje.",
        price: "150000",
        currency: "USD" as const,
        priceType: "negotiable" as const,
        categoryId: cats[0].id,
        sellerId,
        status: "active" as const,
        condition: "used" as const,
        locationProvince: "La Habana",
        locationCity: "Vedado",
        images: [],
        moderationStatus: "approved" as const,
      },
      {
        title: "Auto Chevrolet 2015",
        description: "Chevrolet Cruze 2015 en buen estado. Motor 1.8L, aire acondicionado, transmisión automática.",
        price: "12000",
        currency: "USD" as const,
        priceType: "negotiable" as const,
        categoryId: cats[1] ? cats[1].id : cats[0].id,
        sellerId,
        status: "active" as const,
        condition: "used" as const,
        locationProvince: "La Habana",
        locationCity: "Plaza",
        images: [],
        moderationStatus: "approved" as const,
      },
      {
        title: "Laptop Dell Inspiron 15",
        description: "Laptop Dell Inspiron 15, Intel i5, 8GB RAM, 256GB SSD. Ideal para trabajo y estudio.",
        price: "450",
        currency: "USD" as const,
        priceType: "fixed" as const,
        categoryId: cats[0].id,
        sellerId,
        status: "active" as const,
        condition: "used" as const,
        locationProvince: "La Habana",
        locationCity: "Centro Habana",
        images: [],
        moderationStatus: "approved" as const,
      },
      {
        title: "Generador Eléctrico 5KW",
        description: "Generador eléctrico de 5KW, marca Honda. Poco uso, en perfecto estado.",
        price: "800",
        currency: "USD" as const,
        priceType: "negotiable" as const,
        categoryId: cats[2] ? cats[2].id : cats[0].id,
        sellerId,
        status: "active" as const,
        condition: "new" as const,
        locationProvince: "Matanzas",
        locationCity: "Varadero",
        images: [],
        moderationStatus: "approved" as const,
      },
    ];

    for (const listing of testListings) {
      await db.insert(listings).values(listing);
      console.log(`  ✓ Created listing: ${listing.title}`);
    }

    console.log(`✅ Seeded ${testListings.length} test listings!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding test listings:", error);
    process.exit(1);
  }
}

seedTestListings();
