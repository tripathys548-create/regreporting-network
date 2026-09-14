import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { asRecord, jsonError, parseMutation } from "@/lib/http";

export const dynamic = "force-dynamic";

const DAY_PATTERN = /^[0-6]$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** POST /api/admin/newsletter/settings { enabled, sendDay, sendTime } — admin explicitly opts in to automatic weekly sends. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ admin: true });
  if (!auth.ok) return auth.response;

  const { enabled, sendDay, sendTime } = asRecord(parsed.data);
  const dayStr = String(sendDay ?? "1");
  if (!DAY_PATTERN.test(dayStr)) return jsonError("Choose a valid send day.", 422);
  if (typeof sendTime !== "string" || !TIME_PATTERN.test(sendTime)) return jsonError("Choose a valid send time (HH:mm).", 422);

  const settings = await prisma.newsletterSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", enabled: enabled === true, sendDay: Number(dayStr), sendTime },
    update: { enabled: enabled === true, sendDay: Number(dayStr), sendTime },
  });
  await prisma.auditLog.create({ data: { actorId: auth.session.user.id, action: "newsletter.settings", targetType: "newsletter-settings", targetId: "singleton", detail: JSON.stringify({ enabled: settings.enabled, sendDay: settings.sendDay, sendTime: settings.sendTime }) } });

  return NextResponse.json({ enabled: settings.enabled, sendDay: settings.sendDay, sendTime: settings.sendTime });
}
