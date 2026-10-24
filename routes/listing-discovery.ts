import { Router, type Request, type Response } from "express";
import { authRepository, listingFeaturesRepository } from "../storage";
import { getBearerUserId, isUuid } from "./http";
import { isValidListingReview } from "../utils/listing-discovery";

const router = Router();
const eventTypes = new Set([
  "tap",
  "watch",
  "share",
  "contact_seller",
  "negotiation_started",
]);
const pageOptions = (req: Request) => {
  const limitValue = Number(req.query.limit ?? 20);
  const pageValue = Number(req.query.page ?? 1);
  if (
    !Number.isInteger(limitValue) ||
    limitValue < 1 ||
    limitValue > 50 ||
    !Number.isInteger(pageValue) ||
    pageValue < 1 ||
    pageValue > 10000
  )
    return null;
  return {
    limit: limitValue,
    offset: (pageValue - 1) * limitValue,
    page: pageValue,
  };
};
const filters = (req: Request) => {
  const type = req.query.listing_type;
  const categoryId = req.query.category_id;
  if (type !== undefined && type !== "product" && type !== "service")
    return null;
  if (categoryId !== undefined && !isUuid(categoryId)) return null;
  return {
    type: type as string | undefined,
    categoryId: categoryId as string | undefined,
  };
};
const authenticatedUser = async (req: Request) => {
  const userId = getBearerUserId(req);
  if (!userId) return null;
  return (await authRepository.findUserById(userId)) ? userId : null;
};

const feedHandler =
  (kind: "latest" | "trending") => async (req: Request, res: Response) => {
    const page = pageOptions(req);
    const queryFilters = filters(req);
    if (!page || !queryFilters)
      return res
        .status(400)
        .json({ error: "Invalid pagination or listing filters" });
    try {
      const data = await listingFeaturesRepository.listFeed({
        kind,
        ...page,
        ...queryFilters,
      });
      return res.json({
        success: true,
        message: `${kind} listings found`,
        data,
        pagination: { page: page.page, limit: page.limit },
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: `Failed to fetch ${kind} listings`, details: error });
    }
  };

// Keep fixed discovery paths ahead of /listings/:id in catalog.ts.
router.get("/listings/latest", feedHandler("latest"));
router.get("/listings/trending", feedHandler("trending"));

router.get("/listings/recommendations", async (req: Request, res: Response) => {
  const userId = await authenticatedUser(req);
  if (!userId)
    return res.status(401).json({ error: "A valid bearer token is required" });
  const page = pageOptions(req);
  const queryFilters = filters(req);
  if (!page || !queryFilters)
    return res
      .status(400)
      .json({ error: "Invalid pagination or listing filters" });
  try {
    const data = await listingFeaturesRepository.recommendations({
      userId,
      ...page,
      ...queryFilters,
    });
    return res.json({
      success: true,
      message: "listing recommendations found",
      data,
      pagination: { page: page.page, limit: page.limit },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch recommendations", details: error });
  }
});

router.post(
  "/listings/:id/interactions",
  async (req: Request, res: Response) => {
    const userId = await authenticatedUser(req);
    if (!userId)
      return res
        .status(401)
        .json({ error: "A valid bearer token is required" });
    if (!isUuid(req.params.id))
      return res.status(400).json({ error: "Invalid listing ID" });
    const { type, event_id: eventId, watch_ms: watchMs } = req.body ?? {};
    if (!eventTypes.has(type) || !isUuid(eventId))
      return res
        .status(400)
        .json({ error: "A supported type and UUID event_id are required" });
    if (
      type === "watch" &&
      (!Number.isInteger(watchMs) || watchMs < 0 || watchMs > 3600000)
    )
      return res
        .status(400)
        .json({ error: "watch_ms must be between 0 and 3600000" });
    try {
      const result = await listingFeaturesRepository.recordInteraction({
        listingId: req.params.id,
        userId,
        type,
        eventId,
        watchMs: type === "watch" ? watchMs : undefined,
      });
      if (!result)
        return res.status(404).json({ error: "Published listing not found" });
      return res
        .status(result.recorded ? 201 : 200)
        .json({ success: true, data: result });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to record interaction", details: error });
    }
  },
);

router.get("/listings/:id/views", async (req: Request, res: Response) => {
  if (!isUuid(req.params.id))
    return res.status(400).json({ error: "Invalid listing ID" });
  const listing = await listingFeaturesRepository.getPublicListing(
    req.params.id,
  );
  if (!listing)
    return res.status(404).json({ error: "Published listing not found" });
  return res.json({
    success: true,
    data: { listing_id: listing.id, view_count: listing.view_count },
  });
});

router.get("/listings/:id/analytics", async (req: Request, res: Response) => {
  const userId = await authenticatedUser(req);
  if (!userId)
    return res.status(401).json({ error: "A valid bearer token is required" });
  if (!isUuid(req.params.id))
    return res.status(400).json({ error: "Invalid listing ID" });
  const days = Number(req.query.days ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 90)
    return res.status(400).json({ error: "days must be between 1 and 90" });
  try {
    const listing = await listingFeaturesRepository.getPublicListing(
      req.params.id,
    );
    if (!listing)
      return res.status(404).json({ error: "Published listing not found" });
    if (listing.seller_id !== userId)
      return res
        .status(403)
        .json({ error: "Only the listing owner may view detailed analytics" });
    const data = await listingFeaturesRepository.listingAnalytics(
      req.params.id,
      days,
    );
    return res.json({ success: true, data: { ...data, window_days: days } });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch listing analytics", details: error });
  }
});

router.get(
  "/listings/:id/reviews/summary",
  async (req: Request, res: Response) => {
    if (!isUuid(req.params.id))
      return res.status(400).json({ error: "Invalid listing ID" });
    if (!(await listingFeaturesRepository.getPublicListing(req.params.id)))
      return res.status(404).json({ error: "Published listing not found" });
    return res.json({
      success: true,
      data: await listingFeaturesRepository.reviewSummary(req.params.id),
    });
  },
);

router.get("/listings/:id/reviews", async (req: Request, res: Response) => {
  if (!isUuid(req.params.id))
    return res.status(400).json({ error: "Invalid listing ID" });
  const page = pageOptions(req);
  if (!page) return res.status(400).json({ error: "Invalid pagination" });
  if (!(await listingFeaturesRepository.getPublicListing(req.params.id)))
    return res.status(404).json({ error: "Published listing not found" });
  const data = await listingFeaturesRepository.listReviews(
    req.params.id,
    page.limit,
    page.offset,
  );
  return res.json({
    success: true,
    data,
    pagination: { page: page.page, limit: page.limit },
  });
});

router.post("/listings/:id/reviews", async (req: Request, res: Response) => {
  const userId = await authenticatedUser(req);
  if (!userId)
    return res.status(401).json({ error: "A valid bearer token is required" });
  if (!isUuid(req.params.id))
    return res.status(400).json({ error: "Invalid listing ID" });
  const { rating, title, comment } = req.body ?? {};
  if (!isValidListingReview(rating))
    return res
      .status(400)
      .json({ error: "rating must be an integer from 1 to 5" });
  if (
    (title != null &&
      (typeof title !== "string" || title.trim().length > 120)) ||
    (comment != null &&
      (typeof comment !== "string" || comment.trim().length > 4000))
  )
    return res
      .status(400)
      .json({ error: "title or comment exceeds its allowed length" });
  try {
    const result = await listingFeaturesRepository.recordReview({
      listingId: req.params.id,
      reviewerId: userId,
      rating,
      title: title?.trim(),
      comment: comment?.trim(),
    });
    if (result.kind === "missing")
      return res.status(404).json({ error: "Published listing not found" });
    if (result.kind === "self")
      return res
        .status(403)
        .json({ error: "You cannot review your own listing" });
    if (result.kind === "exists")
      return res.status(409).json({
        error:
          "You have already reviewed this listing; update your existing review",
      });
    return res.status(201).json({ success: true, data: result.review });
  } catch (error: any) {
    if (error?.code === "23505")
      return res.status(409).json({
        error:
          "You have already reviewed this listing; update your existing review",
      });
    return res
      .status(500)
      .json({ error: "Failed to create listing review", details: error });
  }
});

router.patch(
  "/listings/:id/reviews/:reviewId",
  async (req: Request, res: Response) => {
    const userId = await authenticatedUser(req);
    if (!userId)
      return res
        .status(401)
        .json({ error: "A valid bearer token is required" });
    if (!isUuid(req.params.id) || !isUuid(req.params.reviewId))
      return res.status(400).json({ error: "Invalid listing or review ID" });
    const { rating, title, comment } = req.body ?? {};
    if (rating !== undefined && !isValidListingReview(rating))
      return res
        .status(400)
        .json({ error: "rating must be an integer from 1 to 5" });
    if (
      title !== undefined &&
      title !== null &&
      (typeof title !== "string" || title.trim().length > 120)
    )
      return res
        .status(400)
        .json({ error: "title must be at most 120 characters" });
    if (
      comment !== undefined &&
      comment !== null &&
      (typeof comment !== "string" || comment.trim().length > 4000)
    )
      return res
        .status(400)
        .json({ error: "comment must be at most 4000 characters" });
    const review = await listingFeaturesRepository.updateReview({
      listingId: req.params.id,
      reviewId: req.params.reviewId,
      userId,
      rating,
      title: typeof title === "string" ? title.trim() : title,
      comment: typeof comment === "string" ? comment.trim() : comment,
    });
    return review
      ? res.json({ success: true, data: review })
      : res.status(404).json({ error: "Review not found" });
  },
);

router.delete(
  "/listings/:id/reviews/:reviewId",
  async (req: Request, res: Response) => {
    const userId = await authenticatedUser(req);
    if (!userId)
      return res
        .status(401)
        .json({ error: "A valid bearer token is required" });
    if (!isUuid(req.params.id) || !isUuid(req.params.reviewId))
      return res.status(400).json({ error: "Invalid listing or review ID" });
    const deleted = await listingFeaturesRepository.deleteReview({
      listingId: req.params.id,
      reviewId: req.params.reviewId,
      userId,
    });
    return deleted
      ? res.json({ success: true, deleted: true })
      : res.status(404).json({ error: "Review not found" });
  },
);

router.get("/users/me/reviews", async (req: Request, res: Response) => {
  const userId = await authenticatedUser(req);
  if (!userId)
    return res.status(401).json({ error: "A valid bearer token is required" });
  const page = pageOptions(req);
  if (!page) return res.status(400).json({ error: "Invalid pagination" });
  const data = await listingFeaturesRepository.ownReviews(
    userId,
    page.limit,
    page.offset,
  );
  return res.json({
    success: true,
    data,
    pagination: { page: page.page, limit: page.limit },
  });
});

export default router;
