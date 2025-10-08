import type { InsertListing } from "@shared/schema";
import type { IStorage } from "./storage";

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
      priceType: "fixed" as const,
      categoryId: null,
      locationCity: "",
      locationRegion: "",
      condition: "used" as const,
      contactWhatsApp: "false" as const
    };
    
    return this.moderateListing(listing);
  }

  async moderateListing(listing: InsertListing & { sellerId: string }): Promise<ModerationResult> {
    if (!this.apiKey) {
      return this.getFallbackResult();
    }

    try {
      const textAnalysis = await this.analyzeText(listing);
      const imageAnalysis = await this.analyzeImages(listing.images || []);
      const duplicateCheck = await this.checkDuplicates(listing);
      const spamCheck = this.detectSpam(listing);

      const cubaViolations = await this.checkCubaRules(listing);
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
            cubaViolations
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

  private async analyzeText(listing: InsertListing & { sellerId: string }): Promise<{ score: number; issues: string[] }> {
    const text = `${listing.title}\n${listing.description}`;
    
    const systemPrompt = `You are a content moderator for a Cuban marketplace platform. Analyze the text in ANY LANGUAGE and determine if it is appropriate.

CRITICAL: This text can be in ANY language (Spanish, English, German, French, Russian, Chinese, etc.). You MUST detect and analyze content in ALL languages.

Rejection criteria (applies to ALL languages):
1. Anti-government political content or pro-dissident content
2. Propaganda against the constitutional order
3. Offensive, defamatory, or hate-inciting content
4. Spam or deceptive content
5. Sale of illegal products (weapons, drugs, human trafficking)
6. Explicit sexual or pornographic content
7. Content promoting satanic cults or illegal activities
8. Content violating Cuban social communication laws

Examples of prohibited content in ANY language:
- "contra revolución", "counter revolution", "Gegenrevolution", "contre-révolution"
- "dissidente", "dissident", "Dissident"
- "libertad de prensa", "freedom of press", "Pressefreiheit"
- Political criticism in ANY language

Respond ONLY with JSON in this format:
{
  "score": <number 0-100, where 100 is completely appropriate>,
  "issues": [<array of issues found, empty if no issues>],
  "explanation": "<brief explanation>",
  "detected_language": "<detected language>"
}`;

    try {
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
          issues: result.issues || []
        };
      }

      return { score: 50, issues: ["ai_parse_error"] };
    } catch (error) {
      console.error("Text analysis error:", error);
      return { score: 50, issues: ["ai_error"] };
    }
  }

  private async analyzeImages(imageUrls: string[]): Promise<{ scores: number[]; issues: string[] }> {
    if (imageUrls.length === 0) {
      return { scores: [], issues: [] };
    }

    const scores: number[] = [];
    const issues: string[] = [];

    for (const imageUrl of imageUrls.slice(0, 8)) {
      const systemPrompt = `Eres un moderador de contenido visual. Analiza la imagen y determina si es apropiada para una plataforma de clasificados.

Rechazar si contiene:
- Contenido sexual o desnudez
- Violencia gráfica
- Símbolos políticos anti-gobierno
- Contenido ofensivo o que incita al odio
- Productos ilegales visibles

Responde SOLO con un JSON:
{
  "score": <0-100, donde 100 es apropiado>,
  "issues": [<problemas encontrados>]
}`;

      try {
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
              { role: "user", content: `Analiza esta imagen: ${imageUrl}` }
            ],
            temperature: 0.3,
            max_tokens: 300
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0].message.content;
          
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            scores.push(result.score || 80);
            if (result.issues && result.issues.length > 0) {
              issues.push(...result.issues);
            }
          } else {
            scores.push(80);
          }
        } else {
          scores.push(80);
        }
      } catch (error) {
        console.error("Image analysis error:", error);
        scores.push(80);
      }
    }

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
