/**
 * Tune DATABASE_URL for Prisma under Supabase poolers.
 * Session mode caps clients (~15); unbounded Prisma pools exhaust it quickly.
 */
export function withPrismaPoolLimit(rawUrl, limit = 5) {
  const url = String(rawUrl || "").trim();
  if (!url || url.startsWith("file:") || /sqlite/i.test(url)) return url;
  if (/[?&]connection_limit=/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=${Math.max(1, Math.min(10, Number(limit) || 5))}`;
}
