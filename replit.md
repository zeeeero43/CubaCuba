# Rico-Cuba E-commerce Platform

## Overview
Rico-Cuba is a full-stack e-commerce platform designed for the Cuban market. It features a modern React frontend and an Express.js backend, providing user authentication, product catalog management, a mobile-responsive shopping experience, and a comprehensive AI-powered moderation system. The platform is localized in Spanish, supports Cuban phone number formats, and uses Cuban provinces for user registration. Key ambitions include strict content moderation aligned with Cuban regulations, a robust administrative panel, and a flexible e-commerce experience tailored for the local market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- Modern React frontend using functional components.
- shadcn/ui components with Radix UI primitives for accessible and customizable UI.
- Tailwind CSS for styling with a custom design system.
- Mobile-first approach with responsive design, including a mobile-only bottom navigation.
- Dynamic icon system using Lucide React components for consistent iconography.
- Admin panel uses a unified `AdminLayout` with a consistent sidebar navigation.
- Hierarchical category management in the admin panel with drag & drop reordering.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite build system, Wouter for routing, TanStack Query for server state management, React Hook Form with Zod for form handling.
- **Backend**: Express.js with TypeScript, Passport.js for local authentication and role-based access control, Express sessions with PostgreSQL storage, Helmet.js for security, rate limiting, and CSRF protection.
- **AI Integration**: DeepSeek AI for automated content moderation.
- **Image Upload Security**: Multi-layer validation including magic byte validation (JPEG, PNG, GIF, WebP with RIFF/WEBP/chunk checks), memory-efficient header reading (first 32 bytes), and Sharp library integration for decodability and dimension validation.
- **Category Structure**: Complete overhaul based on client specifications, including 7 main categories (e.g., "Comprar & Vender", "Autos/Vehículos", "Empleos") with hierarchical subcategories, all in Spanish.
- **Flexible Pricing**: Supports CUP/USD currency selection and "Precio a consultar" option.
- **Banner Advertisement System**: 5 predefined banner positions with admin management.

### Feature Specifications
- **AI-Powered Moderation System**: Ultra-strict content moderation using DeepSeek AI, automated review system with confidence-based auto-approval/rejection, appeal system, and dynamic blacklist management.
- **Admin Panel**: Comprehensive interface for content moderation, user management, system configuration, and category management.
- **User Profiles**: Enhanced profile editing, password changes, and always-visible statistics.
- **Listing Creation UX**: Auto-navigation, province auto-filling from user profile, strengthened validation.

### System Design Choices
- **Database**: PostgreSQL hosted on Neon (serverless) with Drizzle ORM for type-safe operations.
- **Schema**: Comprehensive design including Users, Categories, Products, and 6 dedicated tables for the Moderation System.
- **Authentication**: Local username/password (phone number as identifier), secure password hashing (scrypt), SMS verification, and secure session management with PostgreSQL persistence.
- **Security**: Rate limiting, Content Security Policy (CSP), input validation with Zod, secure headers, and HTTPS enforcement.
- **Internationalization**: Full localization in Spanish, Cuban phone number format validation, and Cuban province selection.

## External Dependencies

### Core Technologies
- **Node.js Runtime**
- **TypeScript**
- **Vite**
- **Express.js**

### Database & ORM
- **PostgreSQL**
- **Neon Database**
- **Drizzle ORM**
- **Drizzle Kit**

### UI & Styling
- **React**
- **Tailwind CSS**
- **Radix UI**
- **Lucide React**
- **shadcn/ui**

### Authentication & Security
- **Passport.js**
- **Express Session**
- **Helmet.js**
- **CSRF Protection**

### AI Services
- **DeepSeek AI**

### Development Tools
- **Wouter** (routing)
- **TanStack Query**
- **React Hook Form**
- **Zod**
- **Sharp** (image processing)