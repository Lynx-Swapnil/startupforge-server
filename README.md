# StartupForge Server

A RESTful API backend for StartupForge — a platform connecting startup founders with collaborators.

## Tech Stack

- Node.js + Express.js
- MongoDB (Atlas)
- JWT Authentication (HTTPOnly Cookies)
- Stripe Payments
- dotenv for environment variables

## Features

- JWT token generation and verification middleware
- Protected dashboard API routes
- Server-side pagination on opportunities
- Server-side search using MongoDB `$regex`
- Server-side filter using MongoDB `$in`
- Stripe Checkout for premium founder subscription
- Admin approve/reject startups
- Role-based access (Founder, Collaborator, Admin)

## API Endpoints

### Auth
- `POST /jwt` — Issue JWT token (stored in HTTPOnly cookie)
- `POST /logout` — Clear JWT token

### Startups
- `GET /startups` — Get all startups
- `GET /startups/:id` — Get single startup
- `POST /startups` — Create startup (protected)
- `PUT /startups/:id` — Update startup (protected)
- `DELETE /startups/:id` — Delete startup (protected)
- `PATCH /startups/:id/status` — Admin approve/reject (protected)

### Opportunities
- `GET /opportunities` — Get with search, filter, pagination
- `GET /opportunities/:id` — Get single opportunity
- `POST /opportunities` — Create opportunity (protected)
- `PUT /opportunities/:id` — Update opportunity (protected)
- `DELETE /opportunities/:id` — Delete opportunity (protected)

### Applications
- `POST /applications` — Submit application (protected)
- `GET /applications/by-founder/:ownerId` — Get applications for founder (protected)
- `GET /applications/by-user/:email` — Get user applications (protected)
- `GET /applications/check` — Check if applied
- `PATCH /applications/:id` — Update application status (protected)

### Payments
- `POST /create-checkout-session` — Create Stripe session
- `POST /payments` — Save payment (protected)
- `GET /payments` — Get all payments (protected)
- `GET /payments/check-premium/:userId` — Check premium status

### Admin
- `GET /admin/stats` — Dashboard stats (protected)
- `GET /admin/revenue-analytics` — Revenue chart data (protected)

## Environment Variables

Create a `.env` file:

```
PORT=5000
DB_URL=your_mongodb_connection_string
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_key
```

## Run Locally

```bash
npm install
npm start
```

## Admin Credentials

- Email: mdantormia1779@gmail.com
