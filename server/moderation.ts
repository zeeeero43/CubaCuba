import type { InsertListing } from "@shared/schema";
import type { IStorage } from "./storage";
import { readFileSync } from 'fs';
import path from 'path';

interface CubaContentRules {
  prohibitedKeywords: string[];
  suspiciousPatterns: string[];
  requiresManualReview: string[];
}

const cubaContentRules: CubaContentRules = {
  prohibitedKeywords: [
    "contra revolucion", "contra-revolucion", "contrarevolucion",
    "disidente", "oposicion politica", "libertad de prensa",
    "derechos humanos violados", "censura gobierno",
    "protestas ilegales", "manifestacion ilegal",
    "cambio de regimen", "golpe de estado",
    "propaganda enemiga", "subversion",
    "anti gobierno", "anti-gobierno", "anticastrista"
  ],
  suspiciousPatterns: [
    "vende dolares", "cambio divisa ilegal", "dolares baratos",
    "servicio vpn", "acceso internet libre", "internet sin restriccion",
    "medio independiente", "periodismo libre",
    "armas", "drogas", "narcotrafico", "trafico de personas",
    "pornografia", "contenido sexual explicito",
    "secta", "culto satanico", "brujeria comercial"
  ],
  requiresManualReview: [
    "politica", "politico", "gobierno", "revolucion",
    "libertad", "derechos", "censura", "prensa",
    "internet", "vpn", "proxy", "acceso"
  ]
};

// Funktion zur Normalisierung von Akzenten
function normalizeAccents(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export interface ModerationResult {
  decision: "approved" | "rejected";
  confidence: number;
  reasons: string[];
  details: {
    textAnalysis: {
      score: number;
      issues: string[];
      cubaViolations: string[];
      problematicWords?: string[];
    };
    imageAnalysis: {
      scores: number[];
      issues: string[];
    };
    duplicateCheck: {
      isDuplicate: boolean;
      similarListings: string[];
    };
    spamCheck: {
      isSpam: boolean;
      indicators: string[];
    };
  };
  textScore?: number;
  imageScores?: number[];
  requiresManualReview: boolean;
}

export class ModerationService {
  private apiKey: string;
  private apiUrl = "https://api.deepseek.com/v1/chat/completions";
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    this.storage = storage;
    if (!this.apiKey) {
      console.warn("DEEPSEEK_API_KEY not set. AI moderation will be disabled.");
    }
  }

  async moderate(content: {
    title: string;
    description: string;
    images: string[];
    contactPhone: string;
    userId: string;
    listingId: string;
  }): Promise<ModerationResult> {
    if (!this.apiKey) {
      return this.getFallbackResult();
    }
    
    const listing = {
      title: content.title,
      description: content.description,
      images: content.images,
      contactPhone: content.contactPhone,
      sellerId: content.userId,
      price: "0",
      currency: "USD" as const,
      priceType: "fixed" as const,
      categoryId: "",
      locationCity: "",
      locationRegion: "",
      condition: "used" as const,
      contactWhatsApp: "false" as const
    };
    
    return this.moderateListing(listing);
  }

  async moderateListing(listing: InsertListing & { sellerId: string }): Promise<ModerationResult> {
    if (!this.apiKey) {
      console.log("⚠️  DEEPSEEK_API_KEY not set - using fallback");
      return this.getFallbackResult();
    }

    try {
      console.log("🔍 Starting moderation for:", listing.title);
      const textAnalysis = await this.analyzeText(listing);
      console.log("📝 Text analysis:", textAnalysis);
      
      const imageAnalysis = await this.analyzeImages(listing.images || []);
      const duplicateCheck = await this.checkDuplicates(listing);
      const spamCheck = this.detectSpam(listing);

      const cubaViolations = await this.checkCubaRules(listing);
      console.log("🇨🇺 Cuba violations found:", cubaViolations);
      
      const requiresManualReview = this.shouldRequireManualReview(listing, cubaViolations);

      const score = this.calculateOverallScore(textAnalysis, imageAnalysis, spamCheck);
      const confidence = Math.min(95, Math.max(60, score));

      const decision = score >= 70 && cubaViolations.length === 0 && !spamCheck.isSpam && !duplicateCheck.isDuplicate
        ? "approved"
        : "rejected";

      const reasons: string[] = [];
      if (textAnalysis.issues.length > 0) reasons.push("inappropriate_text");
      if (cubaViolations.length > 0) reasons.push("cuba_policy_violation");
      if (imageAnalysis.issues.length > 0) reasons.push("inappropriate_images");
      if (spamCheck.isSpam) reasons.push("spam_detected");
      if (duplicateCheck.isDuplicate) reasons.push("duplicate_listing");

      return {
        decision,
        confidence,
        reasons: reasons.length > 0 ? reasons : ["approved"],
        textScore: textAnalysis.score,
        imageScores: imageAnalysis.scores,
        details: {
          textAnalysis: {
            score: textAnalysis.score,
            issues: textAnalysis.issues,
            cubaViolations,
            problematicWords: textAnalysis.problematicWords
          },
          imageAnalysis: {
            scores: imageAnalysis.scores,
            issues: imageAnalysis.issues
          },
          duplicateCheck,
          spamCheck
        },
        requiresManualReview
      };
    } catch (error) {
      console.error("Moderation error:", error);
      return this.getFallbackResult();
    }
  }

  private async analyzeText(listing: InsertListing & { sellerId: string }): Promise<{ score: number; issues: string[]; problematicWords?: string[] }> {
    const text = `${listing.title}\n${listing.description}`;
    
    // Load AI system prompt from settings
    let systemPrompt = `You are an ULTRA-STRICT content moderator for a Cuban marketplace platform. You enforce Cuban content regulations with ZERO tolerance. Analyze text in ANY language and reject violations immediately.

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
}`;

    try {
      const promptSetting = await this.storage.getModerationSetting("ai_system_prompt");
      if (promptSetting && promptSetting.value) {
        systemPrompt = promptSetting.value;
        console.log("✓ Using custom AI system prompt from settings");
      }
    } catch (error) {
      console.log("⚠️ Using default AI system prompt (settings not available)");
    }

    try {
      console.log("🤖 Calling DeepSeek AI for text analysis...");
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analiza este texto:\n\n${text}` }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          score: result.score || 50,
          issues: result.issues || [],
          problematicWords: result.problematic_words || []
        };
      }

      return { score: 50, issues: ["ai_parse_error"] };
    } catch (error) {
      console.error("Text analysis error:", error);
      return { score: 50, issues: ["ai_error"] };
    }
  }

  private async analyzeImages(imageUrls: string[]): Promise<{ scores: number[]; issues: string[] }> {
    if (!this.apiKey) {
      console.log("⚠️ DEEPSEEK_API_KEY not set - skipping image analysis");
      return { scores: [], issues: [] };
    }

    if (imageUrls.length === 0) {
      return { scores: [], issues: [] };
    }

    const scores: number[] = [];
    const issues: string[] = [];

    console.log(`🖼️  Analyzing ${imageUrls.length} images with DeepSeek Vision...`);

    // Process up to 8 images
    for (const imageUrl of imageUrls.slice(0, 8)) {
      try {
        let base64Image: string;
        let mimeType: string;

        // Check if the image is already Base64 encoded (legacy data)
        if (imageUrl.startsWith('data:image/')) {
          // Extract MIME type and base64 data from data URL
          const matches = imageUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
          if (!matches) {
            console.error(`❌ Invalid Base64 image format: ${imageUrl.substring(0, 50)}...`);
            scores.push(0);
            issues.push('invalid_base64_format');
            continue;
          }
          
          mimeType = matches[1];
          base64Image = matches[2];
          console.log(`📦 Processing legacy Base64 image (${mimeType})`);
        } else {
          // Process file path (new format)
          // Validate image URL to prevent path traversal attacks
          if (!imageUrl.startsWith('/uploads/')) {
            console.error(`❌ Invalid image URL (must start with /uploads/): ${imageUrl}`);
            scores.push(0); // Reject invalid URLs
            issues.push('invalid_image_url');
            continue;
          }
          
          // Check for path traversal attempts (..)
          if (imageUrl.includes('..')) {
            console.error(`❌ Path traversal attempt detected in image URL: ${imageUrl}`);
            scores.push(0); // Reject path traversal
            issues.push('path_traversal_attempt');
            continue;
          }
          
          // Convert image to base64
          // Remove leading slash and join with process.cwd()
          const relativePath = imageUrl.replace(/^\//, '');
          const imagePath = path.join(process.cwd(), relativePath);
          
          // Verify the resolved path is still within uploads directory
          const uploadsDir = path.join(process.cwd(), 'uploads');
          const resolvedPath = path.resolve(imagePath);
          if (!resolvedPath.startsWith(uploadsDir)) {
            console.error(`❌ Resolved path outside uploads directory: ${resolvedPath}`);
            scores.push(0);
            issues.push('invalid_image_path');
            continue;
          }
          
          const imageBuffer = readFileSync(imagePath);
          base64Image = imageBuffer.toString('base64');
          
          // Determine MIME type from file extension
          const ext = path.extname(imageUrl).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
          };
          mimeType = mimeTypes[ext] || 'image/jpeg';
        }

        const systemPrompt = `Eres un moderador de contenido visual ULTRA-ESTRICTO para una plataforma cubana. 
Analiza la imagen y determina si es apropiada.

⛔ RECHAZA SI LA IMAGEN CONTIENE:
- Contenido sexual explícito o desnudez
- Violencia gráfica o sangre
- Símbolos políticos anti-gobierno o propaganda opositora
- Banderas o símbolos de oposición política
- Contenido que incita al odio o discriminación
- Armas, drogas o productos ilegales visibles
- Contenido pornográfico o de adultos
- Símbolos satánicos o de cultos

✅ APRUEBA SOLO:
- Imágenes de productos legales (ropa, electrónica, vehículos, etc.)
- Imágenes de inmuebles (casas, apartamentos)
- Imágenes de servicios legales
- Fotos de identificación de productos

⚠️ EN CASO DE DUDA → RECHAZA

Responde SOLO con un JSON:
{
  "score": <0-100, donde 100 es completamente apropiado, <70 = rechazar>,
  "issues": [<lista de problemas encontrados>],
  "explanation": "<breve explicación>"
}`;

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: "deepseek-reasoner",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`
                    }
                  },
                  {
                    type: "text",
                    text: systemPrompt + "\n\nAnaliza esta imagen según las reglas de moderación."
                  }
                ]
              }
            ],
            temperature: 0.2,
            max_tokens: 400
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0].message.content;
          
          console.log(`📊 Image analysis result: ${content.substring(0, 100)}...`);
          
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            scores.push(result.score || 50);
            if (result.issues && result.issues.length > 0) {
              issues.push(...result.issues);
              console.log(`⚠️ Image issues found: ${result.issues.join(', ')}`);
            }
          } else {
            console.log("⚠️ Could not parse AI response, using default score");
            scores.push(70);
          }
        } else {
          console.error(`❌ DeepSeek Vision API error: ${response.statusText}`);
          scores.push(70);
        }
      } catch (error) {
        console.error("❌ Image analysis error:", error);
        scores.push(70);
      }
    }

    console.log(`✅ Image analysis complete. Scores: ${scores.join(', ')}`);
    return { scores, issues };
  }

  private async checkDuplicates(listing: InsertListing & { sellerId: string }): Promise<{ isDuplicate: boolean; similarListings: string[] }> {
    return {
      isDuplicate: false,
      similarListings: []
    };
  }

  private detectSpam(listing: InsertListing & { sellerId: string }): { isSpam: boolean; indicators: string[] } {
    const indicators: string[] = [];
    const text = `${listing.title} ${listing.description}`.toLowerCase();

    const repetitivePattern = /(.{10,})\1{2,}/;
    if (repetitivePattern.test(text)) {
      indicators.push("repetitive_text");
    }

    const uppercaseRatio = (listing.title.match(/[A-Z]/g) || []).length / listing.title.length;
    if (uppercaseRatio > 0.7 && listing.title.length > 10) {
      indicators.push("excessive_caps");
    }

    const specialCharsRatio = (text.match(/[!@#$%^&*()]/g) || []).length / text.length;
    if (specialCharsRatio > 0.15) {
      indicators.push("excessive_special_chars");
    }

    const phoneMatches = listing.description.match(/\+?[0-9]{8,15}/g) || [];
    if (phoneMatches.length > 3) {
      indicators.push("multiple_phone_numbers");
    }

    const urlMatches = text.match(/https?:\/\/|www\./g) || [];
    if (urlMatches.length > 2) {
      indicators.push("multiple_urls");
    }

    return {
      isSpam: indicators.length >= 2,
      indicators
    };
  }

  private async checkCubaRules(listing: InsertListing & { sellerId: string }): Promise<string[]> {
    const violations: string[] = [];
    const rawText = `${listing.title} ${listing.description}`;
    const normalizedText = normalizeAccents(rawText);

    // Hardcoded Rules prüfen
    for (const keyword of cubaContentRules.prohibitedKeywords) {
      const normalizedKeyword = normalizeAccents(keyword);
      if (normalizedText.includes(normalizedKeyword)) {
        violations.push(`prohibited_keyword:${keyword}`);
      }
    }

    for (const pattern of cubaContentRules.suspiciousPatterns) {
      const normalizedPattern = normalizeAccents(pattern);
      if (normalizedText.includes(normalizedPattern)) {
        violations.push(`suspicious_pattern:${pattern}`);
      }
    }

    // Datenbank-Blacklist prüfen
    try {
      const blacklistWords = await this.storage.getBlacklist("prohibited_word");
      for (const entry of blacklistWords) {
        const normalizedBlacklistValue = normalizeAccents(entry.value);
        if (normalizedText.includes(normalizedBlacklistValue)) {
          violations.push(`blacklist_word:${entry.value}`);
        }
      }
    } catch (error) {
      console.error("Error checking blacklist:", error);
    }

    return violations;
  }

  private shouldRequireManualReview(listing: InsertListing & { sellerId: string }, cubaViolations: string[]): boolean {
    if (cubaViolations.length > 0) return true;

    const rawText = `${listing.title} ${listing.description}`;
    const normalizedText = normalizeAccents(rawText);
    
    for (const keyword of cubaContentRules.requiresManualReview) {
      const normalizedKeyword = normalizeAccents(keyword);
      if (normalizedText.includes(normalizedKeyword)) {
        return true;
      }
    }

    return false;
  }

  private calculateOverallScore(
    textAnalysis: { score: number; issues: string[] },
    imageAnalysis: { scores: number[]; issues: string[] },
    spamCheck: { isSpam: boolean; indicators: string[] }
  ): number {
    let score = textAnalysis.score * 0.6;

    if (imageAnalysis.scores.length > 0) {
      const avgImageScore = imageAnalysis.scores.reduce((a, b) => a + b, 0) / imageAnalysis.scores.length;
      score += avgImageScore * 0.3;
    } else {
      score += 85 * 0.3;
    }

    if (spamCheck.isSpam) {
      score = Math.min(score, 40);
    } else {
      score += 10 * 0.1;
    }

    return Math.round(score);
  }

  private getFallbackResult(): ModerationResult {
    return {
      decision: "approved",
      confidence: 50,
      reasons: ["ai_unavailable"],
      textScore: 50,
      imageScores: [],
      details: {
        textAnalysis: {
          score: 50,
          issues: ["ai_unavailable"],
          cubaViolations: []
        },
        imageAnalysis: {
          scores: [],
          issues: []
        },
        duplicateCheck: {
          isDuplicate: false,
          similarListings: []
        },
        spamCheck: {
          isSpam: false,
          indicators: []
        }
      },
      requiresManualReview: false
    };
  }
}

export function createModerationService(storage: IStorage): ModerationService {
  return new ModerationService(storage);
}

export async function moderateContent(
  storage: IStorage,
  content: {
    title: string;
    description: string;
    images: string[];
    contactPhone: string;
    userId: string;
    listingId: string;
  }
): Promise<ModerationResult> {
  const moderationService = new ModerationService(storage);
  return moderationService.moderate(content);
}
