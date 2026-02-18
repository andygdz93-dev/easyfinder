# EasyFinder AI

EasyFinder AI is a marketplace and intelligence platform for heavy equipment listings.

It supports:
- Buyer browsing and scoring
- Seller-managed inventory
- Admin review and source management
- CSV and ZIP-based bulk uploads
- AI-based listing scoring and confidence modeling

---

## Core Features

### 1. Buyer Experience
- Browse listings
- Filter by state, hours, price
- View AI score and confidence
- View detailed breakdown (Deal, Usage, Risk, Speed)
- Add to watchlist

### 2. Seller Experience
- Add listings manually
- Edit listings
- Delete listings (with confirmation)
- Upload bulk listings via CSV
- Upload ZIP bundle (CSV + images)
- Manage up to 200 listings (Pro plan)

### 3. Admin
- Manage scraped sources
- Review listings
- Access all seller listings
- Override restrictions

---

## Image Handling (Current Implementation)

Images are stored via the API and saved in MongoDB as references.

Listings store:
- `imageUrl` (primary image)
- `images[]` (up to 5 images)

Images are served via:

https://easyfinder.fly.dev/api/images/:id

Important:
- Demo images use `/demo-images/...`
- Uploaded images use `/api/images/:id`
- Frontend must NOT prefix relative URLs
- All image URLs must be absolute

---

## Bulk Upload Rules

### CSV Upload
- One row = one listing
- Required columns:
  - title
  - description
  - location
  - condition
  - contactName
  - contactEmail
- Optional:
  - imageUrl..imageUrl5

### ZIP Bundle Upload
ZIP must contain:
- Exactly one `.csv`
- Image files named according to row number

Example:
Row 2 → 2A.jpg, 2B.jpg, 2C.jpg, 2D.jpg, 2E.jpg  
Row 3 → 3A.jpg, 3B.jpg, 3C.jpg, 3D.jpg, 3E.jpg  

Max listings per upload: 200

---

## Deployment

- Web: Vercel
- API: Fly.io
- Database: MongoDB

---

## Known Constraints

- Max 5 images per listing
- ZIP validation requires API endpoint:
  - POST `/api/seller/upload/validate-zip`
- Image CORS headers must allow frontend domain
