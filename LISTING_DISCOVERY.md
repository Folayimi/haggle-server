# Listing discovery, reviews, and analytics

The implemented API follows the server's existing `/api/v1/catalog` route prefix. Public discovery reads only `published` listings. The README's `/api` examples describe a planned API and are not the routes currently registered by the server.

## Endpoints

All responses use the existing `{ success, message, data }` style where applicable. Pagination accepts `page` (default `1`) and `limit` (default `20`, maximum `50`; page range `1` to `10000`). Discovery routes also accept `listing_type=product|service` and `category_id=<uuid>`.

| Method and path | Access | Behavior |
|---|---|---|
| `GET /api/v1/catalog/listings/latest` | Public | Published products and services, newest first; stable timestamp and ID ordering. |
| `GET /api/v1/catalog/listings/trending` | Public | Recent engagement ranking over seven days. |
| `GET /api/v1/catalog/listings/recommendations` | Bearer access token | Category, listing type, and followed seller signals from the current user's recent activity; trending fallback. |
| `POST /api/v1/catalog/listings/:id/interactions` | Bearer access token | Records `tap`, `watch`, `share`, `contact_seller`, or `negotiation_started`. Requires a UUID `event_id`; watch also accepts `watch_ms` (0–3,600,000). |
| `GET /api/v1/catalog/listings/:id/views` | Public | Returns the published listing's lifetime `view_count`. |
| `GET /api/v1/catalog/listings/:id/analytics?days=7` | Listing owner bearer token | Detailed counts for a 1–90 day window. Viewer identities are never returned. |
| `POST /api/v1/catalog/listings/:id/reviews` | Bearer access token | Create one review per user and listing. Body: `rating` 1–5, optional `title` (120 chars), optional `comment` (4,000 chars). |
| `GET /api/v1/catalog/listings/:id/reviews?page=1&limit=20` | Public | Published reviews with only public reviewer name and avatar. |
| `GET /api/v1/catalog/listings/:id/reviews/summary` | Public | Returns `{ average, count }` from published, non-deleted reviews. |
| `PATCH /api/v1/catalog/listings/:id/reviews/:reviewId` | Review author bearer token | Edit an owned review. |
| `DELETE /api/v1/catalog/listings/:id/reviews/:reviewId` | Review author bearer token | Soft delete an owned review. |
| `GET /api/v1/catalog/users/me/reviews?page=1&limit=20` | Bearer access token | Current user's review history. |

Example review response:

```json
{
  "success": true,
  "data": {
    "id": "<uuid>",
    "listing_id": "<uuid>",
    "reviewer_user_id": "<uuid>",
    "rating": 5,
    "title": "Good quality",
    "comment": "As described.",
    "is_verified_purchase": true,
    "status": "published"
  }
}
```

## Review rules

`listing_reviews` is separate from `reviews`, which continues to represent post-transaction buyer/seller reviews. A user may have one listing review and can edit it. Authors may soft-delete their review; a later POST restores and updates their deleted review instead of creating a conflicting duplicate. Only published and non-deleted reviews contribute to the live summary. Verified purchase is derived from a delivered order item for that listing and buyer; clients cannot set it. Sellers cannot review their own listings. The database enforces one review per reviewer/listing and ratings from one to five.

## Interaction and ranking semantics

The existing `feed_impressions` table stores listing events. Opening a published listing through its existing authenticated detail endpoint records a view. The authenticated viewer is read from the signed bearer token; owner views are ignored. A unique key allows one count per user/listing in each 30-minute bucket, and `view_count` is incremented atomically only when the insert succeeds. Anonymous views are not supported because current detail routes require authentication.

Saves and unsaves are recorded by the existing save routes and update `save_count` only when the saved-listing row changes. Other supported events require a client UUID `event_id` for idempotent retries. Seller generated activity is excluded from trending. The seven-day score counts each user once per signal: view 1, tap 2, meaningful watch (at least five seconds) 3, save 4, share 5, contact 6, negotiation started 8. The total is multiplied by a recency factor that declines linearly over 14 days, with a 0.1 floor. Stable creation time and ID tie-breakers are used.

Recommendations are deterministic, not machine learning. They use up to 90 days of recorded category and listing-type engagement plus followed sellers, omit the user's own listings, and return category/follow reasons. With no matching candidates, the endpoint falls back to trending. A maximum of 300 candidates are ranked in memory after database filtering.

## Migration and checks

Generate a migration with `npm run db:generate`, inspect it, then apply it to the intended non-production database with `npm run db:migrate` after confirming `DATABASE_URL`. `npm run db:push` is also present in the project but applies schema changes directly; prefer reviewed migrations. The migration adds the listing reviews table and indexes, interaction types/idempotency key, and the trending query index. Do not run either database command against production as part of local development.

Run `npm test` for deterministic review validation, view-bucket, ranking-weight, and recency tests. Run `npm run build` for the TypeScript check. No database-backed integration test harness is configured in this repository.

Raw events remain in the existing eed_impressions table; this codebase has no analytics retention job. Choose and configure a retention period before event volume grows substantially.
