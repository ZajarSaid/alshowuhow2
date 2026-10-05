import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { readJson, route } from "@/lib/api";

export const GET = route("services:GET", async () => {
  const categories = await db.service.findMany({
    where: { active: true, featured: true, isCatchAll: false },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      icon: true,
      description: true,
      subServices: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, icon: true, description: true },
      },
    },
  });
  return NextResponse.json(categories);
});

export const POST = route("services:POST", async (req: Request) => {
  const { response } = await requireAdmin();
  if (response) return response;

  const { value: body, response: parseResponse } = await readJson<{
    name?: string; description?: string; icon?: string;
  }>(req);
  if (parseResponse) return parseResponse;
  const { name, description, icon } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const service = await db.service.create({
    data: { name, description, icon },
  });

  return NextResponse.json(service, { status: 201 });
});
