import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createDb() {
  const url = process.env.DATABASE_URL;

  if (url && url.startsWith("libsql")) {
    const adapter = new PrismaLibSql({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaLibSql({
    url: `file:${path.join(process.cwd(), "dev.db")}`,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createDb();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
