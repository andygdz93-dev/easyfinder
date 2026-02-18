# Architecture Overview

## Stack

Frontend:
- React
- Vite
- TypeScript

Backend:
- Fastify
- MongoDB
- Zod validation

Deployment:
- Web: Vercel
- API: Fly.io

---

## Image Architecture (Updated)

Images are:

1. Uploaded via multipart/form-data
2. Stored in MongoDB (GridFS or binary collection)
3. Referenced by ID
4. Served via:

   /api/images/:id

Images are not stored as public CDN files.

Important:
- API must set correct Content-Type
- API must set CORS headers
- API must allow cross-origin image fetch

---

## Listing Model

Listing contains:

- id
- title
- description
- state
- location
- price
- hours
- year
- category
- condition
- imageUrl
- images[]
- source
- status
- publishedAt
- contactName
- contactEmail

---

## Bulk Upload Architecture

### CSV Upload
- Parse
- Validate required columns
- Validate row-level errors
- Store listings

### ZIP Upload
- Extract zip
- Locate CSV
- Map images to row numbers
- Attach images to listing
- Validate naming pattern:
  RowNumber + Letter (A–E)

---

## Routes

Seller:
- POST /seller/listings
- PUT /seller/listings/:id
- PATCH /seller/listings/:id
- DELETE /seller/listings/:id
- POST /seller/upload/validate-csv
- POST /seller/upload/validate-zip
- POST /seller/upload/zip

Images:
- GET /api/images/:id

---

## Security

- Auth required for seller routes
- NDA middleware
- Plan middleware
- Demo mode disables writes
