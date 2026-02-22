# DineSmart Backend

Backend API for the DineSmart POS platform, built with Node.js, Express, and MongoDB.

## Features

- Authentication and tenant-aware access control
- Restaurant, table, category, and menu item management
- Order lifecycle and payment processing
- Cash drawer operations, payment queue, and audit endpoints

## Tech Stack

- Node.js (CommonJS)
- Express
- Mongoose
- JWT + bcryptjs
- Joi validation

## Quick Start

1. Install dependencies:
   - `npm install`
2. Create environment file:
   - `.env` with Mongo URI and JWT secrets
3. Run development server:
   - `npm run dev`
4. Run production server:
   - `npm start`

## Scripts

- `npm run dev` – start with nodemon
- `npm start` – start server
- `npm run seed` – seed database

## Project Structure

- `src/controllers` – request handlers
- `src/routes` – API routes
- `src/models` – Mongoose models
- `src/middlewares` – auth/error/validation/tenancy middleware
- `src/services` – business services
- `scripts` – seed and verification scripts