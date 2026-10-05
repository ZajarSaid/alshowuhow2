import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readJson, rateLimit, route } from "@/lib/api";

const VALID_HEAR_ABOUT = ["google", "social", "friend", "advertisement", "other"];
const VALID_USE_AGAIN = ["very_likely", "likely", "not_sure", "unlikely", "very_unlikely"];
const VALID_RECOMMEND = ["definitely", "probably", "not_sure", "probably_not", "definitely_not"];

export const POST = route("feedback:POST", async (req: Request) => {
  const { response: limited } = rateLimit(req, "feedback", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const { value: body, response } = await readJson<{
    serviceRequestId?: string; rating?: number; hearAbout?: string;
    useAgain?: string; recommend?: string; comment?: string;
  }>(req);
  if (response) return response;
  const { serviceRequestId, rating, hearAbout, useAgain, recommend, comment } = body;

  if (!serviceRequestId || !rating || !hearAbout || !useAgain || !recommend) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  if (!VALID_HEAR_ABOUT.includes(hearAbout)) {
    return NextResponse.json({ error: "Invalid hearAbout value" }, { status: 400 });
  }

  if (!VALID_USE_AGAIN.includes(useAgain)) {
    return NextResponse.json({ error: "Invalid useAgain value" }, { status: 400 });
  }

  if (!VALID_RECOMMEND.includes(recommend)) {
    return NextResponse.json({ error: "Invalid recommend value" }, { status: 400 });
  }

  const request = await db.serviceRequest.findUnique({ where: { id: serviceRequestId } });
  if (!request) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  const existing = await db.customerFeedback.findUnique({ where: { serviceRequestId } });
  if (existing) {
    return NextResponse.json({ error: "Feedback already submitted for this request" }, { status: 409 });
  }

  const feedback = await db.customerFeedback.create({
    data: {
      serviceRequestId,
      rating,
      hearAbout,
      useAgain,
      recommend,
      comment: comment || null,
    },
  });

  return NextResponse.json({ success: true, id: feedback.id }, { status: 201 });
});
