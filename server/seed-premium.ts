import { db } from "./db";
import { premiumOptions } from "@shared/schema";
import { eq } from "drizzle-orm";

const premiumFeatures = [
  {
    code: "bump",
    name: "Hochschieben",
    description: "Ihre Anzeige wird nach oben geschoben und erscheint ganz oben in der Liste",
    price: "5.00",
    currency: "CUP",
    durationDays: 7,
    order: 1,
    active: "true",
  },
  {
    code: "highlight",
    name: "Hervorhebung",
    description: "Ihre Anzeige wird farblich hervorgehoben und sticht besser hervor",
    price: "3.00",
    currency: "CUP",
    durationDays: 7,
    order: 2,
    active: "true",
  },
  {
    code: "top_placement",
    name: "Top-Platzierung",
    description: "Ihre Anzeige wird ganz oben in der Kategorie fixiert",
    price: "10.00",
    currency: "CUP",
    durationDays: 7,
    order: 3,
    active: "true",
  },
  {
    code: "more_images",
    name: "Mehr Bilder",
    description: "Laden Sie bis zu 15 Bilder hoch (statt Standard 8)",
    price: "2.00",
    currency: "CUP",
    durationDays: 30,
    order: 4,
    active: "true",
  },
  {
    code: "featured",
    name: "Featured-Status",
    description: "Premium-Badge und besondere Kennzeichnung als Top-Anzeige",
    price: "8.00",
    currency: "CUP",
    durationDays: 7,
    order: 5,
    active: "true",
  },
  {
    code: "extended_duration",
    name: "Längere Laufzeit",
    description: "Ihre Anzeige bleibt 60 Tage aktiv (statt 30)",
    price: "4.00",
    currency: "CUP",
    durationDays: 60,
    order: 6,
    active: "true",
  },
  {
    code: "statistics_plus",
    name: "Statistik-Plus",
    description: "Detaillierte Aufruf-Statistiken und Besucheranalyse",
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
        console.log(`  ⊙ Feature already exists: ${feature.name}`);
      }
    } catch (error) {
      console.error(`  ✗ Error creating feature ${feature.name}:`, error);
    }
  }

  console.log("✅ Premium features seeding complete!");
}
