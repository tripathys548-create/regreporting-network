import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { asRecord, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { recordShareEvent, SHARE_CONTENT_TYPES, SHARE_METHODS, type ShareContentType, type ShareMethod } from "@/lib/repositories/shareEvents";
import { securityConfig } from "@/lib/security/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/share-events { contentType, contentId, method } — fire-and-forget share
 * telemetry (spec §24). Works for anonymous and authenticated viewers; never blocks
 * or slows down the actual share action on the client.
 */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;

  const session = await getSession();
  const limited = limitOrNull(
    `share-event:${session ? `user:${session.user.id}` : "anon"}`,
    securityConfig.rateLimits.shareEvent.limit,
    securityConfig.rateLimits.shareEvent.windowMs,
  );
  if (limited) return limited;

  const { contentType, contentId, method } = asRecord(parsed.data);
  if (!SHARE_CONTENT_TYPES.includes(contentType as ShareContentType)) return jsonError("Unknown content type.", 422);
  if (!SHARE_METHODS.includes(method as ShareMethod)) return jsonError("Unknown share method.", 422);
  if (typeof contentId !== "string" || !contentId || contentId.length > 200) return jsonError("Invalid content id.", 422);

  await recordShareEvent({ contentType: contentType as ShareContentType, contentId, method: method as ShareMethod, userId: session?.user.id ?? null });
  return NextResponse.json({ ok: true }, { status: 201 });
}
