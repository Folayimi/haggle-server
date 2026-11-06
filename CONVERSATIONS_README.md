# Conversations and Messaging

This document describes the conversation and messaging functionality currently
implemented in the Haggle backend.

## Overview

The conversation module supports:

- Direct buyer/seller conversations.
- Support conversations.
- Side-chat conversations associated with a live session.
- Conversation participants and participant-specific state.
- Text, voice, image, product-share, and system messages.
- Message attachments.
- Per-user message delivery/read receipts.
- Conversation last-message metadata for inbox previews.

The API is registered in `routes/routes.ts` at:

```text
/api/v1/conversations
```

## Authentication and authorization

All conversation, negotiation, offer, and deal endpoints require:

```http
Authorization: Bearer <accessToken>
```

The server derives the acting user from the verified token. Client-supplied
`sender_user_id`, `buyer_id`, `seller_id`, and `userId` values are not accepted
as proof of identity. Conversation operations require membership, while
negotiation and offer operations require participation and the correct sender
or recipient permission.

## Conversation types

The supported `conversation_type` values are:

| Value | Purpose |
|---|---|
| `direct` | Buyer/seller conversation outside a live room |
| `support` | Support conversation |
| `session_sidechat` | Conversation associated with a live session |

## Message types

The supported `message_type` values are:

| Value | Relevant fields |
|---|---|
| `text` | `text_body` |
| `voice` | `voice_url`, optionally `voice_duration_seconds` |
| `image` | `text_body` and/or an attachment |
| `product_share` | `shared_listing_id` |
| `system` | `text_body` and/or `metadata_json` |

The database does not enforce per-message-type field requirements. The API
currently validates only the presence of the route-level required fields.

## Attachment types

The supported `attachment_type` values are:

- `screenshot`
- `image`
- `video`
- `document`

## Receipt statuses

The supported message receipt statuses are:

- `sent`
- `delivered`
- `seen`
- `read`

Receipts are stored per message and per user. Repeating a receipt request for
the same message/user updates the existing receipt.

## API endpoints

### List conversations

```http
GET /api/v1/conversations
```

```http
GET /api/v1/conversations
Authorization: Bearer <accessToken>
```

Success response:

```json
[
  {
    "id": "conversation-uuid",
    "conversation_type": "direct",
    "seller_id": "seller-uuid",
    "listing_id": "listing-uuid",
    "session_id": null,
    "last_message_at": "2026-11-02T12:00:00.000Z",
    "last_message_preview": "Is this still available?",
    "created_at": "2026-11-02T11:00:00.000Z",
    "participants": [
      {
        "conversation_id": "conversation-uuid",
        "user_id": "buyer-uuid",
        "last_read_message_id": null,
        "last_read_at": null,
        "is_archived": false,
        "is_muted": false
      }
    ]
  }
]
```

Only conversations for which the requested user has a row in
`conversation_participants` are returned. Conversations include participant
rows and `unread_count`. `limit` is supported and capped at 100; cursor
pagination is reserved for a future iteration and currently returns
`next_cursor: null`.

If the user has no memberships, the endpoint returns an empty array:

```json
[]
```

### Create a conversation

```http
POST /api/v1/conversations
Content-Type: application/json
Authorization: Bearer <accessToken>
```

Request body:

```json
{
  "conversation_type": "direct",
  "seller_id": "seller-uuid",
  "listing_id": "listing-uuid",
  "participant_ids": [
    "buyer-uuid",
    "seller-uuid"
  ]
}
```

Required fields:

- `conversation_type`
- A non-empty `participant_ids` array

Optional fields:

- `seller_id`
- `listing_id`
- `session_id`

The authenticated user is automatically included. The endpoint validates that
participants exist, validates listing/seller consistency when a listing is
provided, and reuses an existing two-person `direct` conversation to prevent
duplicates.

Success response (`201`):

```json
{
  "id": "conversation-uuid",
  "conversation_type": "direct",
  "seller_id": "seller-uuid",
  "listing_id": "listing-uuid",
  "session_id": null,
  "last_message_at": null,
  "last_message_preview": null,
  "created_at": "2026-11-02T12:00:00.000Z"
}
```

The authenticated user is automatically added to `participant_ids`; clients
only need to provide the other intended participants.

### List messages in a conversation

```http
GET /api/v1/conversations/:conversationId/messages
```

Example:

```http
GET /api/v1/conversations/conversation-uuid/messages
```

Success response:

```json
[
  {
    "id": "message-uuid",
    "conversation_id": "conversation-uuid",
    "sender_user_id": "derived-from-token",
    "message_type": "text",
    "text_body": "Is this still available?",
    "voice_url": null,
    "voice_duration_seconds": null,
    "shared_listing_id": null,
    "metadata_json": null,
    "created_at": "2026-11-02T12:00:00.000Z",
    "edited_at": null,
    "deleted_at": null
  }
]
```

Messages are returned in descending `created_at` order, newest first. Use
`limit` (maximum 100) and `before=<ISO timestamp>` to fetch older messages.
The response includes attachment and receipt collections.

### Send a message

```http
POST /api/v1/conversations/:conversationId/messages
Content-Type: application/json
```

Text message example:

```json
{
  "sender_user_id": "buyer-uuid",
  "message_type": "text",
  "text_body": "Is this still available?"
}
```

Voice message example:

```json
{
  "sender_user_id": "buyer-uuid",
  "message_type": "voice",
  "voice_url": "https://cdn.example.com/voice/message.ogg",
  "voice_duration_seconds": 18
}
```

Product-share message example:

```json
{
  "sender_user_id": "buyer-uuid",
  "message_type": "product_share",
  "shared_listing_id": "listing-uuid",
  "metadata_json": {
    "source": "listing_details"
  }
}
```

Required fields:

- `sender_user_id` (derived from the access token; do not send it)
- `message_type`

Optional fields:

- `text_body`
- `voice_url`
- `voice_duration_seconds`
- `shared_listing_id`
- `metadata_json`

`metadata_json` is serialized to a JSON string before storage. The endpoint
returns the created message (`201`):

```json
{
  "id": "message-uuid",
  "conversation_id": "conversation-uuid",
  "sender_user_id": "buyer-uuid",
  "message_type": "text",
  "text_body": "Is this still available?",
  "voice_url": null,
  "voice_duration_seconds": null,
  "shared_listing_id": null,
  "metadata_json": null,
  "created_at": "2026-11-02T12:00:00.000Z",
  "edited_at": null,
  "deleted_at": null
}
```

After inserting the message, the repository updates the parent conversation:

- `last_message_at` is set to the current time.
- `last_message_preview` is set to `text_body`, or `message_type` when no text
  body exists.

### Add an attachment

```http
POST /api/v1/conversations/:conversationId/messages/:messageId/attachments
Content-Type: application/json
```

Request body:

```json
{
  "attachment_type": "image",
  "url": "https://cdn.example.com/images/item.jpg",
  "thumbnail_url": "https://cdn.example.com/images/item-thumb.jpg",
  "size_bytes": 245678
}
```

Required fields:

- `attachment_type`
- `url`

Optional fields:

- `thumbnail_url`
- `size_bytes`

Success response (`201`):

```json
{
  "id": "attachment-uuid",
  "message_id": "message-uuid",
  "attachment_type": "image",
  "url": "https://cdn.example.com/images/item.jpg",
  "thumbnail_url": "https://cdn.example.com/images/item-thumb.jpg",
  "size_bytes": 245678
}
```

The repository verifies that `messageId` belongs to `conversationId` before
storing the attachment.

### Mark a message receipt

```http
POST /api/v1/conversations/:conversationId/messages/:messageId/receipts
Content-Type: application/json
Authorization: Bearer <accessToken>
```

Request body:

```json
{
  "status": "read"
}
```

The route requires conversation membership and a receipt `status`.

Success response:

```json
{
  "message_id": "message-uuid",
  "user_id": "buyer-uuid",
  "status": "read",
  "updated_at": "2026-11-02T12:05:00.000Z"
}
```

The repository first looks for an existing receipt for the message and user.
It inserts one if none exists; otherwise it updates the receipt status and
timestamp.

## Database model

The messaging schema is defined in
[src/db/schema/messaging.ts](./src/db/schema/messaging.ts).

### `conversations`

Stores conversation-level metadata:

- `id`
- `conversation_type`
- `seller_id`
- `listing_id`
- `session_id`
- `last_message_at`
- `last_message_preview`
- `created_at`

Indexes:

- `conversations_last_message_at_desc_idx`
- `conversations_session_id_idx`

### `conversation_participants`

Stores membership and user-specific state:

- `conversation_id`
- `user_id`
- `last_read_message_id`
- `last_read_at`
- `is_archived`
- `is_muted`

The pair `(conversation_id, user_id)` is unique. There are also indexes on
`conversation_id` and `user_id`.

### `messages`

Stores message content and lifecycle metadata:

- `id`
- `conversation_id`
- `sender_user_id`
- `message_type`
- `text_body`
- `voice_url`
- `voice_duration_seconds`
- `shared_listing_id`
- `metadata_json`
- `created_at`
- `edited_at`
- `deleted_at`

Messages have a composite index on `(conversation_id, created_at)`.
`deleted_at` and `edited_at` support the authenticated sender-only edit and
soft-delete endpoints.

### `message_attachments`

Stores media associated with a message:

- `id`
- `message_id`
- `attachment_type`
- `url`
- `thumbnail_url`
- `size_bytes`

### `message_receipts`

Stores delivery/read state per user:

- `message_id`
- `user_id`
- `status`
- `updated_at`

The pair `(message_id, user_id)` is unique.

## Repository behavior

The implementation is in
[storage/repositories/messaging.repository.ts](./storage/repositories/messaging.repository.ts).

Implemented repository operations:

- `listConversations(userId)`
- `createConversation(input)`
- `listMessages(conversationId)`
- `sendMessage(input)`
- `addAttachment(input)`
- `markMessageReceipt(messageId, userId, status)`

## Implemented relationships

The Drizzle relations in
[src/db/schema/relations.ts](./src/db/schema/relations.ts) connect:

- Users to conversations through participants.
- Users to sent messages.
- Conversations to participants.
- Conversations to messages.
- Messages to attachments.
- Messages to receipts.
- Listings to conversations and shared messages.
- Live sessions to session side-chat conversations.

## Error responses

The routes currently use these common responses:

### Missing identity or required request data

```json
{
  "error": "Invalid or expired token"
}
```

or:

```json
{
  "error": "conversation_type and participant_ids are required"
}
```

These are returned with HTTP `400`.

### Repository or database failure

The route returns HTTP `500` with an operation-specific error:

```json
{
  "error": "Failed to fetch messages",
  "details": {}
}
```

## Current limitations

The following features are represented in the schema or planned by the data
model but are not exposed by the current conversation routes:

- Cursor pagination for the conversation list.
- Conversation search.
- Archive/unarchive endpoints.
- Mute/unmute endpoints.
- Conversation archive/unarchive and mute/unmute actions.
- Realtime Socket.IO events; no realtime gateway exists in this repository.
- Push notification orchestration for messaging and negotiation events.
- Attachment upload handling; clients currently provide an already-hosted URL.
- Product variant validation; no product-variant tables exist yet.

## Negotiation and offer APIs

Negotiations are separate from conversations. One conversation can contain
multiple listing-specific negotiations.

### Create a negotiation

```http
POST /api/v1/negotiations
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "conversation_id": "conversation-uuid",
  "listing_id": "listing-uuid",
  "quantity": 1,
  "variant_selection": {
    "size": "43",
    "color": "Black/White"
  }
}
```

The authenticated user becomes the buyer. The seller is resolved from the
listing. The server verifies that the listing is published, has inventory,
the buyer is not the seller, and both parties are members of the conversation.
An invalid conversation or listing is rejected without exposing database
details. The endpoint returns:

```json
{
  "success": true,
  "data": {
    "id": "negotiation-uuid",
    "conversation_id": "conversation-uuid",
    "listing_id": "listing-uuid",
    "buyer_id": "buyer-uuid",
    "seller_id": "seller-uuid",
    "status": "active",
    "quantity": 1
  }
}
```

Equivalent active negotiations are reused, so repeated clicks return the
same active negotiation rather than creating another one. This is also safe
for simultaneous requests: the database has a partial unique index on
`conversation_id`, `listing_id`, `buyer_id`, and `seller_id` for active rows,
and a unique-violation race is resolved by returning the row created by the
winning request.

### Submit an offer

```http
POST /api/v1/negotiations/:negotiationId/offers
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "amount": 42000,
  "currency": "NGN"
}
```

Only a buyer or seller in the negotiation can submit an offer. Amount,
currency, negotiation status, and the listing's configured acceptable floor
are checked server-side. The acceptable floor is never included in an error
response.

### List offers

```http
GET /api/v1/negotiations/:negotiationId/offers
Authorization: Bearer <accessToken>
```

Offers are returned in chronological sequence order.

### Counter, accept, reject, and withdraw

```http
POST /api/v1/offers/:offerId/counter
POST /api/v1/offers/:offerId/accept
POST /api/v1/offers/:offerId/reject
POST /api/v1/offers/:offerId/withdraw
Authorization: Bearer <accessToken>
```

Counteroffers create a new offer linked through `parent_offer_id`; the
previous offer is marked `countered`. Only the intended recipient can counter,
accept, or reject. Only the original sender can withdraw a pending offer.
Acceptance re-checks listing availability, updates the negotiation, and
creates one immutable deal in a database transaction.

### Retrieve the deal

```http
GET /api/v1/negotiations/:negotiationId/deal
Authorization: Bearer <accessToken>
```

Only the buyer or seller can retrieve the agreed deal snapshot.

## Negotiation database additions

The negotiation schema now includes:

- `negotiation_threads.conversation_id`
- `negotiation_threads.quantity`
- `negotiation_threads.variant_snapshot`
- `negotiation_threads.updated_at`
- `offers.status`
- `deals`

Migration:

- `migrations/0002_messaging_negotiation.sql`
- `migrations/0003_sync_negotiation_threads.sql` (synchronizes deployed
  negotiation columns and adds the active-negotiation uniqueness constraint)

Negotiation events are also written as structured `negotiation_event`
messages in the conversation timeline when a negotiation starts. The
negotiation tables remain the source of truth; clients must not infer state by
parsing message text.
