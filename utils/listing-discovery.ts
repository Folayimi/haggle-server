export const VIEW_DEDUPE_BUCKET_MS = 30 * 60 * 1000;

export const getViewDedupeBucket = (timestampMs: number): number =>
  Math.floor(timestampMs / VIEW_DEDUPE_BUCKET_MS);

export const isValidListingReview = (rating: unknown): rating is number =>
  Number.isInteger(rating) && Number(rating) >= 1 && Number(rating) <= 5;

export const TRENDING_WEIGHTS = {
  view: 1,
  tap: 2,
  watch: 3,
  save: 4,
  share: 5,
  contact_seller: 6,
  negotiation_started: 8,
} as const;

export const applyRecencyFactor = (engagement: number, ageMs: number): number =>
  engagement * Math.max(0.1, 1 - ageMs / (14 * 24 * 60 * 60 * 1000));
