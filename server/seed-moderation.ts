import { storage } from "./storage";

export async function seedModerationSystem() {
  try {
    console.log("🌱 Seeding moderation system...");

  const settings = [
    {
      key: "ai_confidence_threshold",
      value: "70",
      type: "number",
      description: "Umbral de confianza mínimo para aprobación automática (0-100)"
    },
    {
      key: "strictness_level",
      value: "high",
      type: "string",
      description: "Nivel de rigidez de moderación: low, medium, high, ultra"
    },
    {
      key: "auto_approve_enabled",
      value: "true",
      type: "boolean",
      description: "Permitir aprobación automática de anuncios"
    },
    {
      key: "manual_review_required",
      value: "false",
      type: "boolean",
      description: "Requerir revisión manual para todos los anuncios"
    },
    {
      key: "max_appeals_per_listing",
      value: "2",
      type: "number",
      description: "Número máximo de apelaciones permitidas por anuncio"
    },
    {
      key: "blacklist_enabled",
      value: "true",
      type: "boolean",
      description: "Activar sistema de lista negra"
    },
    {
      key: "spam_detection_enabled",
      value: "true",
      type: "boolean",
      description: "Activar detección automática de spam"
    },
    {
      key: "duplicate_detection_enabled",
      value: "true",
      type: "boolean",
      description: "Activar detección de anuncios duplicados"
    },
    {
      key: "image_moderation_enabled",
      value: "true",
      type: "boolean",
      description: "Activar moderación de imágenes con AI"
    },
    {
      key: "cuba_rules_enforcement",
      value: "strict",
      type: "string",
      description: "Nivel de aplicación de reglas cubanas: relaxed, standard, strict"
    }
  ];

  console.log("📋 Creating default moderation settings...");
  for (const setting of settings) {
    try {
      const existing = await storage.getModerationSetting(setting.key);
      if (!existing) {
        await storage.setModerationSetting(
          setting.key,
          setting.value,
          setting.type,
          setting.description
        );
        console.log(`  ✓ Created setting: ${setting.key}`);
      } else {
        console.log(`  ⊙ Setting already exists: ${setting.key}`);
      }
    } catch (error) {
      console.error(`  ✗ Error creating setting ${setting.key}:`, error);
    }
  }

  const prohibitedWords = [
    { value: "golpe de estado", reason: "Contenido político prohibido" },
    { value: "contra revolución", reason: "Contenido antipatriótico" },
    { value: "disidente", reason: "Contenido político prohibido" },
    { value: "oposición política", reason: "Contenido político prohibido" },
    { value: "libertad de prensa", reason: "Contenido subversivo" },
    { value: "censura gobierno", reason: "Propaganda enemiga" },
    { value: "narcotrafico", reason: "Actividad ilegal" },
    { value: "trafico de armas", reason: "Actividad ilegal" },
    { value: "trafico humano", reason: "Actividad ilegal" },
    { value: "pornografia", reason: "Contenido inmoral" }
  ];

  console.log("🚫 Creating blacklist entries...");
  for (const word of prohibitedWords) {
    try {
      const exists = await storage.checkBlacklist("word", word.value);
      if (!exists) {
        await storage.createBlacklistItem({
          type: "word",
          value: word.value.toLowerCase(),
          reason: word.reason,
          addedBy: null,
          isActive: "true"
        });
        console.log(`  ✓ Blacklisted word: ${word.value}`);
      } else {
        console.log(`  ⊙ Word already blacklisted: ${word.value}`);
      }
    } catch (error) {
      console.error(`  ✗ Error blacklisting word ${word.value}:`, error);
    }
  }

    console.log("✅ Moderation system seeding complete!");
  } catch (error) {
    console.error("❌ Fatal error during moderation system seeding:", error);
    throw error;
  }
}
