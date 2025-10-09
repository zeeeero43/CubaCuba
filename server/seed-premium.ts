import { db } from "./db";
import { premiumOptions } from "@shared/schema";
import { eq } from "drizzle-orm";

const premiumFeatures = [
  {
    code: "bump",
    name: "Impulsar",
    description: "Tu anuncio se impulsará hacia arriba y aparecerá en la parte superior de la lista",
    price: "5.00",
    currency: "CUP",
    durationDays: 7,
    order: 1,
    active: "true",
  },
  {
    code: "highlight",
    name: "Destacar",
    description: "Tu anuncio será destacado con color y resaltará mejor",
    price: "3.00",
    currency: "CUP",
    durationDays: 7,
    order: 2,
    active: "true",
  },
  {
    code: "top_placement",
    name: "Ubicación Superior",
    description: "Tu anuncio se fijará en la parte superior de la categoría",
    price: "10.00",
    currency: "CUP",
    durationDays: 7,
    order: 3,
    active: "true",
  },
  {
    code: "more_images",
    name: "Más Imágenes",
    description: "Sube hasta 15 imágenes (en lugar de 8 estándar)",
    price: "2.00",
    currency: "CUP",
    durationDays: 30,
    order: 4,
    active: "true",
  },
  {
    code: "featured",
    name: "Estado Destacado",
    description: "Insignia premium y destacado especial como anuncio destacado",
    price: "8.00",
    currency: "CUP",
    durationDays: 7,
    order: 5,
    active: "true",
  },
  {
    code: "extended_duration",
    name: "Mayor Duración",
    description: "Tu anuncio permanecerá activo 60 días (en lugar de 30)",
    price: "4.00",
    currency: "CUP",
    durationDays: 60,
    order: 6,
    active: "true",
  },
  {
    code: "statistics_plus",
    name: "Estadísticas Plus",
    description: "Estadísticas detalladas de visitas y análisis de visitantes",
    price: "3.00",
    currency: "CUP",
    durationDays: 30,
    order: 7,
    active: "true",
  },
];

export async function seedPremiumFeatures() {
  console.log("🎯 Seeding premium features...");

  for (const feature of premiumFeatures) {
    try {
      // Check if feature already exists
      const existing = await db
        .select()
        .from(premiumOptions)
        .where(eq(premiumOptions.code, feature.code))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(premiumOptions).values(feature);
        console.log(`  ✓ Created premium feature: ${feature.name}`);
      } else {
        // Update existing feature to latest values (for translations)
        await db
          .update(premiumOptions)
          .set({
            name: feature.name,
            description: feature.description,
          })
          .where(eq(premiumOptions.code, feature.code));
        console.log(`  ↻ Updated premium feature: ${feature.name}`);
      }
    } catch (error) {
      console.error(`  ✗ Error creating feature ${feature.name}:`, error);
    }
  }

  console.log("✅ Premium features seeding complete!");
}
