import { Router, type Request, type Response } from "express";
import multer from "multer";
import { catalogRepository } from "../storage";
import { getRequestUserId } from "./http";

const router = Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await catalogRepository.listCategories();
    return res.json(categories);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch categories", details: error });
  }
});

router.post("/categories", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      name?: string;
      slug?: string;
      kind?: string;
      parent_id?: string;
    };

    if (!body.name || !body.kind) {
      return res.status(400).json({ error: "name and kind are required" });
    }

    const category = await catalogRepository.createCategory({
      name: body.name,
      slug: body.slug,
      kind: body.kind as never,
      parent_id: body.parent_id,
    });

    return res.status(201).json(category);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to create category", details: error });
  }
});

router.get("/listings", async (req: Request, res: Response) => {
  try {
    const sellerId =
      typeof req.query.sellerId === "string" ? req.query.sellerId : undefined;
    const listings = await catalogRepository.listListings(sellerId);
    return res.json(listings);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch listings", details: error });
  }
});

router.post("/listings", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      seller_id?: string;
      listing_type?: string;
      category_id?: string;
      title?: string;
      slug?: string;
      description?: string;
      price_amount?: string;
      price_currency?: string;
      status?: string;
      is_negotiable?: boolean;
      cover_media_id?: string;
    };

    if (
      !body.seller_id ||
      !body.listing_type ||
      !body.category_id ||
      !body.title ||
      !body.description ||
      !body.price_amount
    ) {
      return res.status(400).json({ error: "Missing required listing fields" });
    }

    const listing = await catalogRepository.createListing({
      seller_id: body.seller_id,
      listing_type: body.listing_type as never,
      category_id: body.category_id,
      title: body.title,
      slug: body.slug,
      description: body.description,
      price_amount: body.price_amount,
      price_currency: body.price_currency ?? "USD",
      status: body.status as never,
      is_negotiable: body.is_negotiable ?? true,
      cover_media_id: body.cover_media_id,
    });

    return res.status(201).json(listing);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to create listing", details: error });
  }
});

router.get("/listings/:id", async (req: Request, res: Response) => {
  try {
    const listing = await catalogRepository.getListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    return res.json(listing);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch listing", details: error });
  }
});

router.patch("/listings/:id", async (req: Request, res: Response) => {
  try {
    const listing = await catalogRepository.updateListing(
      req.params.id,
      req.body,
    );
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    return res.json(listing);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to update listing", details: error });
  }
});

router.delete("/listings/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await catalogRepository.deleteListing(req.params.id);
    return res.json({ deleted });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to delete listing", details: error });
  }
});

// Flexible media upload: supports both file uploads and URL-based media
router.post(
  "/listings/:id/media",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      let thumbnailUrl: string | undefined;

      const body = req.body as {
        media_type?: string;
        url?: string;
        thumbnail_url?: string;
        sort_order?: number;
        width?: number;
        height?: number;
        duration_seconds?: number;
      };

      // Handle file upload (multipart/form-data)
      if (req.file) {
        mediaType = body.media_type;

        if (!mediaType) {
          return res
            .status(400)
            .json({ error: "media_type is required when uploading a file" });
        }

        // Validate media_type
        if (!["IMAGE", "VIDEO"].includes(mediaType)) {
          return res
            .status(400)
            .json({ error: "media_type must be either IMAGE or VIDEO" });
        }

        // Generate file URL (in production, upload to S3, Azure Blob, etc.)
        // For now, we'll create a local file path
        const timestamp = Date.now();
        const fileName = `${req.params.id}-${timestamp}-${req.file.originalname}`;
        mediaUrl = `/media/${fileName}`;

        // In production, you would:
        // 1. Upload req.file.buffer to S3/cloud storage
        // 2. Get the returned URL
        // Example: mediaUrl = await uploadToS3(req.file.buffer, fileName);
      }
      // Handle URL-based media (JSON)
      else if (body.url) {
        mediaType = body.media_type;
        mediaUrl = body.url;

        if (!mediaType || !mediaUrl) {
          return res
            .status(400)
            .json({ error: "media_type and url are required" });
        }

        // Validate media_type
        if (!["IMAGE", "VIDEO"].includes(mediaType)) {
          return res
            .status(400)
            .json({ error: "media_type must be either IMAGE or VIDEO" });
        }

        // Validate URL format
        try {
          new URL(mediaUrl);
        } catch {
          return res.status(400).json({ error: "Invalid URL format" });
        }

        // Set thumbnail URL if provided
        thumbnailUrl = body.thumbnail_url;
      } else {
        return res.status(400).json({
          error:
            "Either upload a file or provide a URL. Provide media_type in both cases.",
        });
      }

      // Verify listing exists
      const listing = await catalogRepository.getListingById(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // Add media to listing
      const media = await catalogRepository.addListingMedia({
        listing_id: req.params.id,
        media_type: mediaType as never,
        url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        sort_order: body.sort_order ?? 0,
        width: body.width,
        height: body.height,
        duration_seconds: body.duration_seconds,
      });

      return res.status(201).json({
        ...media,
        _note:
          "For file uploads in production, implement cloud storage integration",
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to add listing media", details: error });
    }
  },
);

router.put("/listings/:id/inventory", async (req: Request, res: Response) => {
  try {
    const inventory = await catalogRepository.setListingInventory(
      req.params.id,
      req.body,
    );
    return res.json(inventory);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to set inventory", details: error });
  }
});

router.put(
  "/listings/:id/service-meta",
  async (req: Request, res: Response) => {
    try {
      const serviceMeta = await catalogRepository.setListingServiceMeta(
        req.params.id,
        req.body,
      );
      return res.json(serviceMeta);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to set service metadata", details: error });
    }
  },
);

router.post("/listings/:id/save", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res
        .status(400)
        .json({ error: "x-user-id header or userId is required" });
    }

    const saved = await catalogRepository.saveListing(userId, req.params.id);
    return res.status(201).json(saved);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to save listing", details: error });
  }
});

router.delete("/listings/:id/save", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res
        .status(400)
        .json({ error: "x-user-id header or userId is required" });
    }

    const removed = await catalogRepository.unsaveListing(
      userId,
      req.params.id,
    );
    return res.json({ removed });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to unsave listing", details: error });
  }
});

export default router;
