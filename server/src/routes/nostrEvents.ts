import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { prisma } from "../utils/prisma";

const router = Router();

// GET /nostr-events/private — get all kind 4000 events (for RPG decryption)
router.get(
  "/nostr-events/private",
  authenticate,
  requireRole("rpg", "admin", "super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const events = await prisma.nostrEvent.findMany({
        where: { kind: 4000 },
        select: {
          id: true,
          content: true,
          createdAt: true,
          pubkey: true,
        },
        orderBy: { receivedAt: "desc" },
        take: limit,
        skip: offset,
      });

      res.json(events);
    } catch (err) {
      next(err);
    }
  },
);

// GET /nostr-events/by-pubkey/:pubkey — get kind 4000 event for a specific ephemeral pubkey
router.get(
  "/nostr-events/by-pubkey/:pubkey",
  authenticate,
  requireRole("rpg", "admin", "super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pubkey = req.params.pubkey as string;
      if (!pubkey || !/^[0-9a-f]{64}$/i.test(pubkey)) {
        res.status(400).json({ error: "Invalid pubkey format" });
        return;
      }

      const event = await prisma.nostrEvent.findFirst({
        where: { kind: 4000, pubkey },
        select: {
          id: true,
          content: true,
          createdAt: true,
          pubkey: true,
        },
      });

      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      res.json(event);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
