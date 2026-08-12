import { PrismaClient } from "./prisma-client-bundle.js";
import { withPrismaPoolLimit } from "./dbUrl.js";

const globalForPrisma = globalThis;

const datasourceUrl = withPrismaPoolLimit(process.env.DATABASE_URL, 5);

/** عميل واحد لكل عملية (مفيد على Vercel عند إعادة استخدام الدالة الدافئة) */
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(datasourceUrl
      ? { datasources: { db: { url: datasourceUrl } } }
      : {}),
  });
}

export const prisma = globalForPrisma.prisma;
