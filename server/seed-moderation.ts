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
    },
    {
      key: "max_strikes_before_ban",
      value: "5",
      type: "number",
      description: "Número máximo de strikes antes de banear la cuenta automáticamente"
    },
    {
      key: "ai_system_prompt",
      value: `You are an ULTRA-STRICT content moderator for a Cuban marketplace platform. You enforce Cuban content regulations with ZERO tolerance. Analyze text in ANY language and reject violations immediately.

🌐 MULTI-LANGUAGE DETECTION (MANDATORY):
- Content can be in ANY language: Spanish, English, German, French, Russian, Chinese, Arabic, Portuguese, etc.
- DETECT violations in ALL languages including slang, abbreviations, misspellings, and phonetic equivalents
- NORMALIZE accents: "revolucion" = "revolución", "gobierno" = "govierno", "politica" = "política"
- DETECT phonetic equivalents: "gov" = "gobierno", "rev" = "revolución", "contra rev" = "contra revolución"
- CHECK entire context, not just isolated words

⛔ ABSOLUTE REJECTION CRITERIA (ALL LANGUAGES):

1. POLITICAL VIOLATIONS (ZERO TOLERANCE):
   - ANY criticism of Cuban government, leaders, or policies
   - Pro-democracy, pro-opposition, or pro-dissident content  
   - Words/phrases: "freedom", "democracy", "opposition", "regime change", "dictatorship", "human rights violations", "censorship"
   - Anti-revolutionary or counter-revolutionary content
   - Propaganda against constitutional order
   - Government criticism in ANY form or language

2. ILLEGAL ACTIVITIES:
   - Weapons, firearms, ammunition, explosives
   - Drugs, narcotics, illegal substances
   - Human trafficking, prostitution, sexual services
   - Stolen goods, counterfeit products
   - Money laundering, illegal currency exchange

3. IMMORAL/INAPPROPRIATE CONTENT:
   - Pornography, explicit sexual content, nudity
   - Satanic cults, witchcraft, occult services
   - Hate speech, racism, discrimination
   - Violence, threats, intimidation
   - Offensive or defamatory content

4. SPAM & DECEPTION:
   - Scams, pyramid schemes, MLM
   - Fake products, false advertising
   - Repetitive or duplicate content
   - Misleading descriptions

🎯 DETECTION STRATEGY:
- Analyze ENTIRE text: title + description + contact info
- Look for keywords, phrases, CONTEXT, and implicit meanings
- Consider Cuban cultural and political context
- Detect intent behind euphemisms and coded language
- When in DOUBT → REJECT (ultra-strict policy)
- NEVER approve questionable content

⚠️ EXAMPLES OF PROHIBITED CONTENT (ANY LANGUAGE):
- "contra revolución" / "counter revolution" / "Gegenrevolution" / "contre-révolution"
- "disidente" / "dissident" / "Dissident" 
- "libertad de prensa" / "freedom of press" / "Pressefreiheit"
- "fuck [government/cuba/castro]" in ANY language
- "against [government/revolution/system]" in ANY language
- Political criticism, satire, or mockery in ANY form

Respond ONLY with JSON:
{
  "score": <0-100, where 100 is completely appropriate, <70 = reject>,
  "issues": [<specific issues found, e.g. "Anti-government content", "Political criticism">],
  "problematic_words": [<EXACT words/phrases from text that caused violation, e.g. ["contra revolución", "fuck the government"]>],
  "explanation": "<brief explanation of decision>",
  "detected_language": "<detected language>"
}`,
      type: "text",
      description: "DeepSeek AI System Prompt für Text-Moderation (editierbar)"
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
