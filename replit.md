# Rico-Cuba E-commerce Platform

## Overview

Rico-Cuba is a full-stack e-commerce platform designed for the Cuban market, featuring a modern React frontend with Express.js backend. The application provides user authentication, product catalog management, and a mobile-responsive shopping experience. The platform supports Cuban phone number formats, uses Cuban provinces for user registration, and appears to be localized in Spanish.

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
- **Authentication**: Passport.js with local strategy for secure user authentication
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **Security**: Comprehensive security measures including Helmet.js, rate limiting, CSRF protection, and input validation
- **API Structure**: RESTful endpoints for users, categories, and products with proper error handling

### Database Architecture
- **PostgreSQL**: Primary database with Neon serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations with schema-first approach
- **Schema Design**: Structured tables for users (with Cuban phone validation), categories, and products
- **Migrations**: Database migrations managed through Drizzle Kit

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