# Rico-Cuba E-commerce Platform

## Overview
Rico-Cuba is a full-stack e-commerce platform designed for the Cuban market. It features a modern React frontend and an Express.js backend, providing user authentication, product catalog management, a mobile-responsive shopping experience, and a comprehensive AI-powered moderation system. The platform is localized in Spanish, supports Cuban phone number formats, and uses Cuban provinces for user registration.

## Recent Changes (October 21, 2025)

### DeepSeek Vision Integration ✅
**Implemented AI-powered image content moderation** using DeepSeek Vision API:
- **Base64 Conversion**: Images are read from uploads directory and converted to Base64
- **Multimodal Analysis**: DeepSeek analyzes each image for inappropriate content
- **Ultra-Strict Rules**: Rejects nudity, violence, political symbols, illegal content
- **Security**: Path traversal prevention with triple-layer validation
- **Performance**: Analyzes up to 8 images per listing sequentially

**Security Features:**
- Validates image URLs start with `/uploads/`
- Blocks paths containing `..` segments  
- Verifies resolved paths stay within uploads directory
- Invalid images automatically rejected (score = 0)

### Image Upload Security
**Multi-layer validation system** for uploaded files:
- **Magic Byte Validation**: Checks JPEG, PNG, GIF headers
- **WebP Security**: RIFF header + WEBP FourCC + VP8/VP8L/VP8X chunk validation
- **Memory Efficient**: Reads only first 32 bytes for header validation
- **Sharp Integration**: Verifies decodability and dimensions (max 50000px)
- **Resource Safety**: Proper file descriptor cleanup

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- React with TypeScript, Vite build system
- Wouter for routing, TanStack Query for state management
- shadcn/ui + Radix UI for accessible components
- Tailwind CSS with custom design system
- React Hook Form with Zod validation

### Backend
- Express.js with TypeScript
- Passport.js for authentication (local strategy)
- PostgreSQL sessions with connect-pg-simple
- Helmet.js, rate limiting, CSRF protection
- DeepSeek AI for content & image moderation

### Database
- PostgreSQL (Neon serverless hosting)
- Drizzle ORM for type-safe operations
- Comprehensive schema: Users, Categories, Listings, Moderation System (6 tables)

### AI-Powered Moderation
**DeepSeek AI integration** for ultra-strict content moderation:

**Text Analysis:**
- Multi-language detection (Spanish, English, German, French, etc.)
- Cuba-specific prohibited keywords and patterns
- Dynamic blacklist management
- Spam and duplicate detection

**Image Analysis (NEW):**
- DeepSeek Vision API with multimodal support
- Base64 image encoding from local uploads
- Detects: nudity, violence, political symbols, weapons, drugs
- Ultra-strict scoring: <70 = reject
- Security: Path traversal prevention

**Moderation Flow:**
1. Text analysis (title + description)
2. Image analysis (up to 8 images)
3. Cuba-rules check (blacklist + prohibited keywords)
4. Spam detection
5. Duplicate check
6. Combined scoring → Auto-approve (≥70) or Auto-reject (<70)

**Admin Features:**
- Moderation queue for manual review
- Appeal system (configurable limits)
- Blacklist management (words, users, emails, phones)
- Configurable settings (confidence threshold, strictness level)

### Security
- Rate limiting (global + endpoint-specific)
- Content Security Policy with Helmet.js
- Input validation with Zod schemas
- Secure password hashing (scrypt)
- Path traversal prevention
- Magic byte + Sharp validation for images
- HTTPS enforcement (HSTS)

## External Dependencies

### Core
- Node.js, TypeScript, Express.js, Vite

### Database
- PostgreSQL, Neon Database, Drizzle ORM

### UI
- React, Tailwind CSS, Radix UI, Lucide React, shadcn/ui

### AI
- **DeepSeek AI** (text moderation + vision)

### Tools
- Wouter (routing), TanStack Query, React Hook Form, Zod, Sharp (image processing)
- Passport.js, Express Session, Helmet.js, CSRF Protection

## Category Structure
7 main categories (all in Spanish):
- Comprar & Vender
- Autos/Vehículos  
- Inmobiliaria
- Generación de Energía
- Servicios Ofrecidos
- Material de Construcción & Maquinaria
- Empleos

## Environment Variables
- `DEEPSEEK_API_KEY`: Required for AI text & image moderation
- `DATABASE_URL`: PostgreSQL connection (auto-configured by Replit)

## Key Features
- Cuban phone number validation
- Province-based user registration
- Flexible pricing (CUP/USD, "Precio a consultar")
- Up to 10 images per listing
- Banner advertisement system (5 positions)
- Mobile-first responsive design
- Admin panel with unified sidebar navigation
- Drag & drop category reordering
