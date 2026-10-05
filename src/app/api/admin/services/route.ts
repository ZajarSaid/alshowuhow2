import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, readJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export const GET = route("admin/services:GET", async () => {
  const { response } = await requireAdmin();
  if (response) return response;

  const services = await db.service.findMany({
    include: {
      _count: { select: { vendorServices: true, serviceRequests: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(services);
});

export const POST = route("admin/services:POST", async (req) => {
  const { response: authResponse } = await requireAdmin();
  if (authResponse) return authResponse;

  const { value: body, response } = await readJson<{
    name?: string;
    description?: string;
    icon?: string;
  }>(req);
  if (response) return response;

  if (!body.name?.trim()) {
    return jsonError("Name is required", 400);
  }

  const service = await db.service.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      icon: body.icon?.trim() || null,
    },
  });

  return NextResponse.json(service, { status: 201 });
});

export const PATCH = route("admin/services:PATCH", async (req) => {
  const { response: authResponse } = await requireAdmin();
  if (authResponse) return authResponse;

  const { value: body, response } = await readJson<{
    id?: string;
    active?: boolean;
    name?: string;
    description?: string;
  }>(req);
  if (response) return response;

  if (!body.id) {
    return jsonError("Missing id", 400);
  }

  const updateData: Record<string, unknown> = {};
  if (body.active !== undefined) updateData.active = body.active;
  if (body.name?.trim()) updateData.name = body.name.trim();
  if (body.description !== undefined) updateData.description = body.description?.trim() || null;

  const service = await db.service.update({ where: { id: body.id }, data: updateData });

  return NextResponse.json(service);
});
