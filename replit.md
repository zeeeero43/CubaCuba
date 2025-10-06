# Rico-Cuba E-commerce Platform

## Overview

Rico-Cuba is a full-stack e-commerce platform designed for the Cuban market, featuring a modern React frontend with Express.js backend. The application provides user authentication, product catalog management, a mobile-responsive shopping experience, and a comprehensive AI-powered moderation system. The platform supports Cuban phone number formats, uses Cuban provinces for user registration, and is fully localized in Spanish.

### Recent Additions (October 2025)
- **AI-Powered Moderation System**: Ultra-strict content moderation using DeepSeek AI to enforce Cuban content regulations
- **Admin Panel**: Complete administrative interface for content moderation, user management, and system configuration
- **Automated Review System**: All listings automatically analyzed before publication with confidence-based auto-approval/rejection
- **Appeal System**: Users can appeal moderation decisions with configurable limits
- **Blacklist Management**: Dynamic content filtering with prohibited words, users, emails, and phone numbers

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern React application using functional components and hooks
- **Vite Build System**: Fast development server and optimized production builds
- **Routing**: Client-side routing with Wouter library for lightweight navigation
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: shadcn/ui components with Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom design system and CSS variables for theming
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Express.js Server**: RESTful API with TypeScript support
- **Authentication**: Passport.js with local strategy + role-based access control (user/admin)
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **Security**: Comprehensive security measures including Helmet.js, rate limiting, CSRF protection, and input validation
- **AI Integration**: DeepSeek AI service for automated content moderation with Cuba-specific rules
- **API Structure**: RESTful endpoints for users, categories, products, and moderation with proper error handling

### Database Architecture
- **PostgreSQL**: Primary database with Neon serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations with schema-first approach
- **Schema Design**: Comprehensive tables including:
  - **Users**: Cuban phone validation, role-based access (user/admin), email support
  - **Categories & Products**: Hierarchical category system with full listing management
  - **Moderation System**: 6 dedicated tables (reviews, blacklist, reports, settings, admin_users, logs)
  - **Favorites & Ratings**: User engagement tracking
- **Migrations**: Database migrations managed through Drizzle Kit with `npm run db:push`

### Authentication & Authorization
- **Local Authentication**: Username/password authentication with phone number as identifier
- **Password Security**: Secure password hashing using Node.js scrypt
- **SMS Verification**: Verification code system for account verification
- **Session Security**: Secure session management with PostgreSQL persistence
- **CSRF Protection**: Cross-site request forgery protection on sensitive endpoints

### Security Features
- **Rate Limiting**: Global and endpoint-specific rate limiting to prevent abuse
- **Content Security Policy**: Helmet.js configuration with CSP headers
- **Input Validation**: Comprehensive input validation using Zod schemas
- **Secure Headers**: Security headers for production deployment
- **HTTPS Enforcement**: HSTS configuration for production environments

## External Dependencies

### Core Technologies
- **Node.js Runtime**: Server-side JavaScript execution
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Frontend build tool and development server
- **Express.js**: Web application framework

### Database & ORM
- **PostgreSQL**: Primary database system
- **Neon Database**: Serverless PostgreSQL hosting platform
- **Drizzle ORM**: Type-safe database toolkit
- **Drizzle Kit**: Database migration and management tools

### UI & Styling
- **React**: Frontend framework
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless UI components for accessibility
- **Lucide React**: Icon library
- **shadcn/ui**: Pre-built component library

### Authentication & Security
- **Passport.js**: Authentication middleware
- **Express Session**: Session management
- **Helmet.js**: Security headers middleware
- **CSRF Protection**: Cross-site request forgery protection
- **Rate Limiting**: Request rate limiting middleware

### Development Tools
- **ESBuild**: Fast JavaScript bundler for production
- **PostCSS**: CSS processing tool
- **Autoprefixer**: CSS vendor prefix automation
- **Wouter**: Lightweight routing library

### API & Data Management
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation
- **Hookform Resolvers**: Form validation integration

## Content Moderation System

### Overview
The platform includes a comprehensive AI-powered moderation system designed to enforce ultra-strict Cuban content regulations. All user-generated listings are automatically analyzed before publication using DeepSeek AI.

### Key Features
1. **Automatic AI Review**: Every new listing is analyzed for:
   - Prohibited political content (government criticism, opposition, dissidence)
   - Illegal activities (drug trafficking, weapons, human trafficking)
   - Immoral content (pornography, adult services)
   - Spam and duplicate detection
   - Image content analysis

2. **Confidence-Based Decisions**:
   - Auto-approve: AI confidence >= 70%
   - Auto-reject: AI confidence < 70% with violations
   - Manual review: Edge cases requiring human judgment

3. **Blacklist System**:
   - Prohibited words: Cuban-specific banned phrases
   - Blocked users: Users who repeatedly violate policies
   - Blocked emails/phones: Prevent circumvention

4. **Appeal Process**:
   - Users can appeal rejected listings
   - Configurable max appeals per listing (default: 2)
   - Admins review appeals in dedicated queue

### Admin Panel Routes
- `/admin` - Dashboard with statistics and recent activity
- `/admin/queue` - Moderation queue for pending reviews and appeals
- `/admin/reports` - User-submitted reports management
- `/admin/blacklist` - Blacklist management (words, users, emails, phones)
- `/admin/settings` - AI thresholds and moderation configuration
- `/admin/users` - User management (block/unblock)

### Backend API Endpoints

#### Moderation Routes
- `GET /api/moderation/status/:listingId` - Check moderation status
- `POST /api/moderation/appeal/:listingId` - Submit appeal
- `GET /api/moderation/my-reviews` - User's moderation history

#### Admin Routes (require admin role)
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/reviews/pending` - Pending reviews queue
- `GET /api/admin/reviews/appealed` - Appeals queue
- `POST /api/admin/reviews/:id/decide` - Approve/reject listing
- `GET /api/admin/reports` - All reports
- `POST /api/admin/reports/:id/resolve` - Resolve report
- `GET /api/admin/blacklist` - Blacklist entries
- `POST /api/admin/blacklist` - Add blacklist entry
- `GET /api/admin/settings` - Moderation settings
- `PUT /api/admin/settings` - Update settings
- `GET /api/admin/users` - User management
- `POST /api/admin/users/:id/block` - Block user

#### User Report Routes
- `POST /api/reports/listing/:id` - Report a listing
- `POST /api/reports/user/:id` - Report a user

### Environment Variables
- `DEEPSEEK_API_KEY` - Required for AI moderation (already configured)
- `DATABASE_URL` - PostgreSQL connection (auto-configured by Replit)

### Moderation Settings (Configurable via Admin Panel)
- `ai_confidence_threshold`: Minimum confidence for auto-approval (0-100, default: 70)
- `strictness_level`: low, medium, high, ultra (default: high)
- `auto_approve_enabled`: Enable/disable auto-approval (default: true)
- `manual_review_required`: Force manual review for all (default: false)
- `max_appeals_per_listing`: Appeal limit (default: 2)
- `blacklist_enabled`: Enable blacklist checking (default: true)
- `spam_detection_enabled`: Enable spam detection (default: true)
- `duplicate_detection_enabled`: Enable duplicate detection (default: true)
- `image_moderation_enabled`: Enable image AI analysis (default: true)
- `cuba_rules_enforcement`: relaxed, standard, strict (default: strict)

### Database Schema

#### Moderation Tables
1. **moderation_reviews**: AI analysis results and decisions
2. **moderation_blacklist**: Prohibited content (words, users, emails, phones)
3. **moderation_reports**: User-submitted reports
4. **moderation_settings**: System configuration
5. **admin_users**: Admin user information (deprecated - uses users.role)
6. **moderation_logs**: Audit trail of moderation actions

### Seeding
The system automatically seeds default settings and prohibited words on startup via `server/seed-moderation.ts`. The seeding is idempotent and can be run multiple times safely.