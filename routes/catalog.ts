import { Router, type Request, type Response } from "express";
import multer from "multer";
import { authRepository, catalogRepository, usersRepository } from "../storage";
import { getRequestUserId } from "./http";
import { ListingStatus, ListingType, NegotiationStyle } from "../src/db/schema";
import { verifyAccessToken } from "../services/tokenService";
import { sanitizeNumericFields } from "../utils/sanitize";

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

router.get("/categories/:slug", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = verifyAccessToken(token);
      // Get user data
      const userData = await usersRepository.getUserById(decoded.userId);

      if (!userData) {
        return res.status(401).json({
          error: "Invalid Token",
        });
      }

      const category = await catalogRepository.getCategoryBySlug(
        req.params.slug,
      );
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      return res.json({
        success: true,
        message: "category found",
        data: category,
      });
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch category", details: error });
  }
});

router.post("/categories", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = verifyAccessToken(token);
      // Get user data
      const userData = await usersRepository.getUserById(decoded.userId);

      if (!userData) {
        return res.status(401).json({
          error: "Invalid Token",
        });
      }

      const body = req.body as {
        name?: string;
        slug?: string;
        kind?: string;
        status?: string;
        parent_id?: string;
      };

      if (!body.name || !body.kind) {
        return res.status(400).json({ error: "name and kind are required" });
      }

      const category = await catalogRepository.createCategory({
        name: body.name,
        slug: body.slug,
        kind: body.kind as never,
        status: body.status as never,
        parent_id: body.parent_id,
      });

      return res.status(201).json({
        success: true,
        message: "Category Created Successfully",
        data: category,
      });
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyAccessToken(token);
    // Get user data
    const user = await authRepository.findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: "UnAuthorized Access: User not found",
      });
    }

    const body = req.body as {
      seller_id?: string;
      listing_type?: (typeof ListingType)[keyof typeof ListingType];
      category_id?: string;
      title?: string;
      description?: string;
      starting_amount?: string;
      lowest_amount?: string;
      auto_decline_amount?: string;
      tags?: string;
      status?: (typeof ListingStatus)[keyof typeof ListingStatus];
      negotiation_style?: (typeof NegotiationStyle)[keyof typeof NegotiationStyle];
      negotiation_note?: string;
      cover_media_id?: string;
    };

    // 1. Sanitize numeric fields
    const sanitizedBody = sanitizeNumericFields(body);

    // 2. Validate required fields (using sanitizedBody)
    if (
      !sanitizedBody.seller_id ||
      !sanitizedBody.listing_type ||
      !sanitizedBody.category_id ||
      !sanitizedBody.title ||
      !sanitizedBody.description ||
      !sanitizedBody.tags
    ) {
      return res.status(400).json({ error: "Missing required listing fields" });
    }

    const listing = await catalogRepository.createListing({
      seller_id: sanitizedBody.seller_id,
      listing_type: sanitizedBody.listing_type,
      category_id: sanitizedBody.category_id,
      title: sanitizedBody.title,
      // Let the repository generate the slug if not provided, or pass it
      slug: sanitizedBody.title.toLowerCase().replace(/\s+/g, "-") ?? "", // optional
      description: sanitizedBody.description,
      starting_amount: sanitizedBody.starting_amount, // now null if was empty
      lowest_amount: sanitizedBody.lowest_amount, // now null if was empty
      auto_decline_amount: sanitizedBody.auto_decline_amount, // now null if was empty
      tags: sanitizedBody.tags,
      status: sanitizedBody.status,
      negotiation_style: sanitizedBody.negotiation_style,
      negotiation_note: sanitizedBody.negotiation_note,
      cover_media_id: sanitizedBody.cover_media_id,
    });

    return res.status(201).json({
      message: "Listing created successfully",
      success: true,
      data: listing,
    });
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
    if (!req.params.id) {
      return res.status(401).json({ error: "listing Id is required" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify access token
    try {
      const decoded = verifyAccessToken(token);
      // Get user data
      const userData = await usersRepository.getUserById(decoded.userId);

      if (!userData) {
        return res.status(401).json({
          error: "Invalid Token",
        });
      }

      const listing = await catalogRepository.updateListing(
        req.params.id,
        req.body,
      );

      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      return res.json({
        success: true,
        message: "listing updated successfully",
        data: listing,
      });
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }
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
  // upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.params.id) {
      return res.status(401).json({ error: "listing Id is required" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    try {
      try {
        const decoded = verifyAccessToken(token);
        // Get user data
        const userData = await usersRepository.getUserById(decoded.userId);

        if (!userData) {
          return res.status(401).json({
            error: "Invalid Token",
          });
        }

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

        return res.status(200).json({
          success: true,
          message: "listing media created successfully",
          data: media,
        });
      } catch (jwtError) {
        return res.status(401).json({
          error: "Invalid or expired token",
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to add listing media", details: error });
    }
  },
);

router.delete(
  "/listings-media/:id/delete",
  async (req: Request, res: Response) => {
    console.log("okkkkkayyyyyyyy");
    if (!req.params.id) {
      return res.status(401).json({ error: "listing Id is required" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    try {
      try {
        const decoded = verifyAccessToken(token);
        // Get user data
        const userData = await usersRepository.getUserById(decoded.userId);

        if (!userData) {
          return res.status(401).json({
            error: "Invalid Token",
          });
        }

        const removed = await catalogRepository.deleteListingMedia(
          req.params.id,
        );
        return res.status(201).json({
          success: true,
          message: "listing media Deleted successfully",
          data: removed,
        });
      } catch (jwtError) {
        return res.status(401).json({
          error: "Invalid or expired token",
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to delete listing media", details: error });
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

router.delete("/listings/:id/unsave", async (req: Request, res: Response) => {
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
