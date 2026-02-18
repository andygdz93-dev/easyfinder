# Workflows

## Manual Listing Creation

1. Seller fills form
2. Uploads images (max 5)
3. Images stored via API
4. Listing saved
5. Score generated

---

## Edit Listing

1. Seller updates fields
2. Seller can add/remove images
3. PATCH or PUT request
4. Listing updated
5. Score recalculated

---

## Delete Listing

1. Seller clicks delete
2. Confirmation modal
3. DELETE request
4. Listing removed
5. Images removed

---

## CSV Upload

1. Seller uploads CSV
2. Validate CSV
3. Show row errors
4. Confirm upload
5. Save listings

---

## ZIP Upload

1. Seller uploads ZIP
2. Validate ZIP:
   - Contains one CSV
   - Images named correctly
3. Map images to rows
4. Save listings
5. Attach images
6. Generate score

---

## Image Flow

Upload:
Frontend → API → Mongo → store ID

Display:
Frontend uses full URL:
https://easyfinder.fly.dev/api/images/:id

No relative paths allowed.
