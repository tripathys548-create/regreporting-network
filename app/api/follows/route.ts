import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, parseMutation } from "@/lib/http";
import { toggleFollow } from "@/lib/services/community";
import type { FollowTargetType } from "@/types";

export const dynamic = "force-dynamic";

const TARGET_TYPES: FollowTargetType[] = ["user", "discussion", "source", "topic"];

/** POST /api/follows { targetType, targetId } — toggles following an expert, discussion, regulator or topic. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const { targetType, targetId } = asRecord(parsed.data);
  const type = TARGET_TYPES.find((t) => t === targetType);
  if (!type || typeof targetId !== "string" || !targetId) return jsonError("Invalid follow target.", 400);
  return fromService(await toggleFollow(auth.session.user.id, type, targetId));
}
