# Vidly

[![CI](https://github.com/archiforge/vidly/actions/workflows/ci.yml/badge.svg)](https://github.com/archiforge/vidly/actions/workflows/ci.yml)

A full-stack movie rental management platform: a REST API built with **Express 5, MongoDB and
TypeScript**, and an admin portal built with **React 19, Vite and Tailwind CSS**. Store staff use it
to manage the catalogue, register customers, check movies out and process returns with automatic
billing.

![Dashboard](docs/screenshots/03-dashboard.png)

| Check out a movie                                         | Process a return                                                  | Customer details & history                                |
| --------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| ![New rental](docs/screenshots/08-new-rental-summary.png) | ![Return dialog](docs/screenshots/05-rentals-return-dialog.png)   | ![Customer page](docs/screenshots/17-customer-detail.png) |
| **Catalogue with filters**                                | **Server-side validation on the field**                           | **Staff and roles**                                       |
| ![Movies](docs/screenshots/10-movies-filtered-sorted.png) | ![Duplicate title](docs/screenshots/12-movie-duplicate-error.png) | ![Staff](docs/screenshots/18-staff.png)                   |

**[See all 27 screenshots →](docs/SCREENSHOTS.md)**

## Features

- **Dashboard** — movies out, 30-day and all-time revenue, customer and inventory totals,
  out-of-stock and low-stock alerts, most-rented titles and recent activity.
- **Rentals** — check a movie out to a customer with a searchable picker, see the fee accruing on
  active rentals, and process returns with an itemised charge. Stock is updated atomically, so the
  last copy can never be rented twice.
- **Catalogue** — movies with genre, stock and daily rate; search, filter by genre and
  availability, sort and paginate (all reflected in the URL, so views are shareable).
- **Genres** — renaming a genre updates its movies; genres in use can't be deleted.
- **Customers** — contact details, gold membership, active rentals and full rental history.
- **Staff & roles** — clerks run the store; administrators can also delete records and manage
  staff. Role changes and account deletions take effect immediately, not when a token expires.
- **Accounts** — self-service sign-up (can be disabled), profile and password management.
- Responsive and keyboard accessible: labelled form controls, native modal dialogs, ARIA
  combobox/listbox picker, sortable headers announced to screen readers, skip link.

## Quick start

### Run everything with Docker

```bash
cp .env.example .env              # then set JWT_SECRET (e.g. `openssl rand -base64 48`)
docker compose up --build -d      # MongoDB + the app on http://localhost:3900
```

Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (that account is created on first
start). To explore with demo data instead:

```bash
docker compose exec app node apps/server/dist/seed.js --reset
```

> `--reset` replaces all Vidly data, including accounts; the configured admin account is recreated
> the next time the app restarts.

### Local development

Requires **Node.js 22.12+** and a MongoDB 7+ instance (the bundled Compose file can provide one).

```bash
npm install
npm run db:up        # starts MongoDB in Docker on localhost:27017 (skip if you have one)
npm run seed         # demo data: 6 genres, 20 movies, 12 customers, rental history
npm run dev          # API on http://localhost:3900, portal on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the API, so no CORS setup is
needed.

### Demo accounts

Created by `npm run seed`:

| Role          | Email             | Password    |
| ------------- | ----------------- | ----------- |
| Administrator | `admin@vidly.dev` | `Admin123!` |
| Clerk         | `clerk@vidly.dev` | `Clerk123!` |

## Scripts

Run from the repository root.

| Command                     | What it does                                                         |
| --------------------------- | -------------------------------------------------------------------- |
| `npm run dev`               | API (auto-restarting) and portal (hot reload) together               |
| `npm run build`             | Production builds of the portal and the API                          |
| `npm start`                 | Run the built API, which also serves the built portal                |
| `npm run seed [-- --reset]` | Load demo data (refuses to touch a non-empty database without reset) |
| `npm test`                  | Unit and integration tests for every package                         |
| `npm run test:e2e`          | Playwright end-to-end tests (run `npm run build` first)              |
| `npm run lint`              | ESLint                                                               |
| `npm run typecheck`         | TypeScript, every package                                            |
| `npm run format`            | Prettier                                                             |
| `npm run check`             | Everything CI checks except the e2e tests                            |
| `npm run db:up` / `db:down` | Start / stop the development MongoDB container                       |

## Configuration

The API reads environment variables, or an `apps/server/.env` file in development (see
[`apps/server/.env.example`](apps/server/.env.example)). Configuration is validated on start-up and
the server refuses to start with a clear message if something is wrong.

| Variable                         | Default                           | Notes                                                                   |
| -------------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| `MONGODB_URI`                    | `mongodb://127.0.0.1:27017/vidly` |                                                                         |
| `PORT`                           | `3900`                            |                                                                         |
| `JWT_SECRET`                     | dev-only fallback                 | **Required in production**, at least 32 characters                      |
| `JWT_EXPIRES_IN`                 | `12h`                             | e.g. `30m`, `7d`                                                        |
| `ALLOW_REGISTRATION`             | `true`                            | Self-service staff sign-up                                              |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | —                                 | Creates (or promotes) this administrator on start-up                    |
| `CORS_ORIGIN`                    | —                                 | Comma-separated origins; only needed if the portal is on another origin |
| `TRUST_PROXY`                    | `0`                               | Number of reverse proxies in front (for client IPs and rate limiting)   |
| `AUTH_RATE_LIMIT`                | `20`                              | Failed sign-in/sign-up attempts per IP per 15 minutes                   |
| `LOG_LEVEL`                      | `info`                            | `silent` … `trace`                                                      |
| `CLIENT_DIST_DIR`                | `apps/client/dist` in production  | Where the built portal is served from                                   |

The portal only needs `VITE_API_URL` if the API is hosted on a different origin.

## API

All endpoints are under `/api` and exchange JSON. Authenticated endpoints expect
`Authorization: Bearer <token>`, obtained from `POST /api/auth/login`. List endpoints accept
`page`, `pageSize` (max 100), `search`, `sort` and `order` and return
`{ items, total, page, pageSize, totalPages }`.

Errors always have the same shape, with field-level `details` for validation problems:

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [{ "path": "title", "message": "Title is required" }]
  }
}
```

| Method & path              | Access | Description                                                                                  |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| `GET /health`              | public | Liveness and database status (`503` when the database is down)                               |
| `GET /config`              | public | Public settings (whether sign-up is open)                                                    |
| `POST /auth/register`      | public | Create a clerk account → `{ token, user }`                                                   |
| `POST /auth/login`         | public | → `{ token, user }`                                                                          |
| `GET /auth/me`             | staff  | The signed-in user                                                                           |
| `PATCH /auth/me`           | staff  | Update your name → `{ token, user }`                                                         |
| `POST /auth/me/password`   | staff  | Change your password                                                                         |
| `GET /genres`              | public | All genres with `movieCount`                                                                 |
| `POST /genres`             | staff  | Create                                                                                       |
| `PUT /genres/:id`          | staff  | Rename (also updates its movies)                                                             |
| `DELETE /genres/:id`       | admin  | `409` while movies use it                                                                    |
| `GET /movies`              | public | Filter by `genreId`, `inStock`; sort by `title`, `genre`, `numberInStock`, `dailyRentalRate` |
| `GET /movies/:id`          | public |                                                                                              |
| `POST /movies`             | staff  | `{ title, genreId, numberInStock, dailyRentalRate }`                                         |
| `PUT /movies/:id`          | staff  |                                                                                              |
| `DELETE /movies/:id`       | admin  | `409` while copies are rented out                                                            |
| `GET /customers`           | staff  | Filter by `gold`; includes `activeRentals`                                                   |
| `GET /customers/:id`       | staff  |                                                                                              |
| `POST /customers`          | staff  | `{ name, phone, email?, isGold }`                                                            |
| `PUT /customers/:id`       | staff  |                                                                                              |
| `DELETE /customers/:id`    | admin  | `409` while they have movies out                                                             |
| `GET /rentals`             | staff  | Filter by `status` (`active`, `returned`, `all`), `customerId`, `movieId`                    |
| `GET /rentals/:id`         | staff  |                                                                                              |
| `POST /rentals`            | staff  | Check out: `{ customerId, movieId }`                                                         |
| `POST /rentals/:id/return` | staff  | Check in: sets `dateReturned` and `rentalFee`, restocks the copy                             |
| `DELETE /rentals/:id`      | admin  | Remove a record (an active rental's copy is restocked)                                       |
| `GET /stats`               | staff  | Dashboard figures                                                                            |
| `GET /users`               | admin  | Staff accounts                                                                               |
| `PATCH /users/:id`         | admin  | `{ isAdmin }` — not on your own account                                                      |
| `DELETE /users/:id`        | admin  | Not your own account                                                                         |

### Business rules

- **Rental fee** = daily rate × billable days, where every started day counts and the minimum is
  one day. The rate is fixed when the movie is checked out. The rule lives in `@vidly/shared`, so
  the fee previewed in the portal is computed by the same code that bills it.
- **Stock** counts copies on the shelf. Checking out decrements it with a single conditional
  update (`numberInStock > 0`), so concurrent checkouts of the last copy can't oversell; returns
  are guarded the same way, so a double-submitted return can't restock twice.
- A customer can have **one active rental per title** (enforced by a partial unique index).
- Rentals keep **snapshots** of the customer and movie so history stays readable; renames are
  propagated to them.
- Records that other data depends on (a genre with movies, a movie or customer with active
  rentals) can't be deleted.

## Testing

| Layer                | Tooling                                   | Where                           |
| -------------------- | ----------------------------------------- | ------------------------------- |
| Domain rules         | Vitest                                    | `packages/shared/src`           |
| API integration      | Vitest + Supertest against a real MongoDB | `apps/server/test`              |
| Components and pages | Vitest + Testing Library (jsdom)          | `apps/client/src/**/*.test.tsx` |
| End to end           | Playwright against the production build   | `e2e`                           |

The API tests start a throwaway in-memory MongoDB via `mongodb-memory-server`, which downloads a
MongoDB binary on first run. To use an existing server instead (each test file gets its own
database):

```bash
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm test -w @vidly/server
```

End-to-end tests serve the production build on port 3901 against the `vidly_e2e` database, which
they reset and seed on every run:

```bash
npm run build
npx playwright install chromium   # once
npm run test:e2e
```

## Project structure

```
apps/
  server/            Express API
    src/
      config/        Environment validation
      models/        Mongoose schemas and indexes
      routes/        One router per resource
      middleware/    Authentication, authorisation, error handling
      scripts/       Demo data seeding
    test/            Integration tests
  client/            React admin portal
    src/
      api/           TanStack Query hooks per resource
      auth/          Session context and route guards
      components/    Layout, design-system primitives, shared widgets
      pages/         One folder per area, lazily loaded
packages/
  shared/            Zod schemas, API types and domain rules used by both apps
e2e/                 Playwright specs
```

**Stack:** Express 5 · Mongoose 9 · Zod 4 · JSON Web Tokens · bcrypt · Helmet · Pino ·
React 19 · React Router 7 · TanStack Query 5 · React Hook Form · Tailwind CSS 4 · Vite 8 ·
Vitest · Playwright · TypeScript 5.9 · ESLint 10 · Prettier · Docker.

## Security

- Passwords hashed with bcrypt; password hashes are excluded from queries by default and user
  objects leave the API through an explicit allow-list.
- Sign-in timing doesn't reveal whether an email is registered; failed attempts are rate-limited.
- Every authenticated request re-reads the user, so revoking access is immediate.
- Strict security headers and Content Security Policy (Helmet); request bodies capped at 100 kB;
  query parameters parsed with the `simple` parser and validated, which rules out operator
  injection; user search input is regex-escaped.
- The production container runs as a non-root user with only the API's runtime dependencies.
- Tokens are kept in `localStorage` for simplicity. If you extend the portal with third-party
  scripts, consider moving to `HttpOnly` cookies with CSRF protection.

## Upgrading from v1

Version 2 is a rewrite of the original Node/React course project. The two apps now actually work
together, and several defects were fixed along the way: the client and API disagreed on the port,
auth header and endpoint paths; `GET /:id` routes searched by request body; rental update/delete
edited movies; the stock check never triggered; rental dates defaulted to the server start time;
and unhandled async errors crashed the process.

Breaking changes for API clients:

- Authenticate with `Authorization: Bearer <token>` (was `x-token`). Login and registration return
  `{ token, user }` and live at `/api/auth/login` and `/api/auth/register`.
- The default port is `3900`.
- Deletes return `204 No Content`; creates return `201`.
- Rentals have a `status` field (`active` / `returned`). Data from v1 isn't migrated automatically;
  re-seed or add `status` to existing rental documents.
- Writing movies and genres requires a signed-in user; customers, rentals and stats are no longer
  public.
