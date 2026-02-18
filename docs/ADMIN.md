# Admin Documentation

## Admin Capabilities

Admins can:

- View all listings
- Access seller listings
- Access sources
- Access scraping controls
- Bypass seller ownership restrictions
- Access scoring insights

---

## Admin Routing

- `/admin` → redirects to `/admin/listings`
- `/admin/home` → redirected to `/admin/listings`

Admin landing page is listings dashboard.

---

## Listing Source Display Rules

Public marketplace cards must display:

- "Private seller" for seller-created listings
- Actual source name for scraped listings

Seller IDs must NOT be shown in listing cards.

Seller ID is visible only in:
- Listing details view
- Admin panel

---

## Write Permissions

- Admin can edit any listing
- Admin can delete any listing
- Demo mode disables writes

---

## Delete Listing

Deletion:
- Requires confirmation
- Cannot be undone
- Removes images associated with listing
- Logs audit event
