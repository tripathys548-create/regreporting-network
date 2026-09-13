import { redirect } from "next/navigation";
import { firstParam, type SearchParams } from "@/lib/params";

/** RegBot is a popup available on every page; this route keeps old links working. */
export default function RegBotRedirect({ searchParams }: { searchParams: SearchParams }) {
  const q = (firstParam(searchParams, "q") ?? "").slice(0, 600);
  redirect(q ? `/?regbot=1&q=${encodeURIComponent(q)}` : "/?regbot=1");
}
