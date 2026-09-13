import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { fromService, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { securityConfig } from "@/lib/security/config";
import { createSuggestion, toggleSuggestionVote, validateNewSuggestion } from "@/lib/services/suggestions";

export const dynamic = "force-dynamic";

/** POST /api/suggestions { title, description, category, ... } — any verified member. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;

  const auth = await authorizeApi({ verified: true });
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`suggestion:${auth.session.user.id}`, securityConfig.rateLimits.suggestion.limit, securityConfig.rateLimits.suggestion.windowMs);
  if (limited) return limited;

  const result = validateNewSuggestion(parsed.data);
  if (!result.ok) return jsonError(result.error, 422);
  return fromService(await createSuggestion(auth.session.user.id, result.value), 201);
}

/** POST-style toggle handled via PATCH: /api/suggestions { suggestionId } → vote toggle. */
export async function PATCH(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;

  const auth = await authorizeApi({ verified: true });
  if (!auth.ok) return auth.response;

  const data = parsed.data as { suggestionId?: unknown };
  if (typeof data.suggestionId !== "string") return jsonError("suggestionId is required.", 400);

  const limited = limitOrNull(`suggestion-vote:${auth.session.user.id}`, securityConfig.rateLimits.vote.limit, securityConfig.rateLimits.vote.windowMs);
  if (limited) return limited;

  return fromService(await toggleSuggestionVote(auth.session.user.id, data.suggestionId));
}

export function GET() {
  return NextResponse.json({ error: "Not supported. Use /admin?section=suggestions to browse." }, { status: 405 });
}
