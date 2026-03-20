import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Prisma unique constraint violation
  if (err.constructor?.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002") {
      res.status(409).json({ error: "Resource already exists" });
      return;
    }
  }

  // JSON parse errors (Express body-parser adds a `type` field)
  if ("type" in err && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  // Never leak internal details in production
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.error("Unhandled error:", err);
  }
  res.status(500).json({ error: "Internal server error" });
}
