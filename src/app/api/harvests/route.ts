import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { harvests } from "@/db/schema";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getOrCreateUser } from "@/lib/session";
import { createHarvest, listMyHarvests } from "@/lib/harvests";

const createSchema = z.object({
  description: z.string().min(1).max(2000),
  name: z.string().min(1).max(200),
  stack: z.array(z.string().max(200)).max(50),
  scaffoldCommands: z.array(z.string().max(500)).max(50),
  compileSteps: z.array(z.string().max(500)).max(50),
  rationale: z.string().max(4000),
  visibility: z.enum(["public", "private"]),
  source: z.enum(["ai", "community", "seed"]),
});

export async function POST(req: Request) {
  try {
    const session = await getOrCreateUser();
    const json = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(
        ERROR_CODES.BAD_REQUEST,
        "Invalid harvest payload",
        400,
      );
    }
    const row = await createHarvest({
      userId: session.user.id,
      ...parsed.data,
    });
    return Response.json(row);
  } catch (err) {
    logger.error("harvests.create failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to create harvest", 500);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mine = url.searchParams.get("mine") === "true";
    if (mine) {
      const session = await getOrCreateUser();
      const rows = await listMyHarvests(session.user.id);
      return Response.json(rows);
    }
    const db = getDb();
    const rows = await db
      .select()
      .from(harvests)
      .where(eq(harvests.visibility, "public"))
      .orderBy(desc(harvests.createdAt))
      .limit(20);
    return Response.json(rows);
  } catch (err) {
    logger.error("harvests.list failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to list harvests", 500);
  }
}
