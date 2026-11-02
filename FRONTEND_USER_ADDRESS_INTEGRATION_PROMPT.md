# Frontend integration prompt: user profile and addresses

Update the frontend to treat profile location and address data as separate concerns.

## Profile changes

The user profile no longer contains `country_code` or `city`. Remove those fields
from profile models, profile edit forms, profile request bodies, and profile
location displays. The profile now supports the optional `website_address` field.

Do not read or write location data through `PUT /api/v1/users/me`. Use the
authenticated address endpoints below for all shipping, pickup, and location
data.

## Authentication

Send the access token on every address request:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

If an endpoint returns `401`, refresh the access token using the existing auth
flow and retry once. Do not send a user ID in the request body to identify the
owner; the server derives the owner from the token.

## Fetch addresses

```http
GET /api/v1/users/me/addresses
```

Successful response:

```json
{
  "success": true,
  "data": [
    {
      "id": "address-uuid",
      "user_id": "user-uuid",
      "label": "Home",
      "recipient_name": "Ada Lovelace",
      "phone_e164": "+2348012345678",
      "country": "Nigeria",
      "country_code": "NG",
      "state": "Lagos",
      "city": "Lagos",
      "line_1": "1 Example Street",
      "line_2": null,
      "postal_code": "100001",
      "is_default": true,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

## Create an address

```http
POST /api/v1/users/me/addresses
```

Required JSON fields are `label`, `recipient_name`, `phone_e164`, `country`,
`country_code`, `state`, `city`, `line_1`, and `postal_code`. `line_2` and
`is_default` are optional.

```json
{
  "label": "Home",
  "recipient_name": "Ada Lovelace",
  "phone_e164": "+2348012345678",
  "country": "Nigeria",
  "country_code": "NG",
  "state": "Lagos",
  "city": "Lagos",
  "line_1": "1 Example Street",
  "line_2": "Apartment 2",
  "postal_code": "100001",
  "is_default": true
}
```

The server returns `201` with the created address in `data`:

```json
{ "success": true, "data": { "...": "created address" } }
```

## Update an address

```http
PATCH /api/v1/users/me/addresses/:addressId
```

Send only fields that changed. The accepted fields are
`label`, `recipient_name`, `phone_e164`, `country`, `country_code`, `state`,
`city`, `line_1`, `line_2`, `postal_code`, and `is_default`.

Successful response:

```json
{ "success": true, "data": { "...": "updated address" } }
```

Use the address `id` returned by the fetch/create response for `:addressId`.
The token owner must own the address; otherwise the endpoint returns `404`.
