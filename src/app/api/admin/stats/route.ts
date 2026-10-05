import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { route } from "@/lib/api";

export const GET = route("admin:stats:GET", async () => {
  const { response } = await requireAdmin();
  if (response) return response;

  const [
    totalCustomers,
    totalVendors,
    pendingVendors,
    approvedVendors,
    totalRequests,
    activeLeads,
    wonProjects,
    lostProjects,
    totalRevenue,
    totalFeedback,
    avgRatingResult,
    useAgainCount,
    recommendCount,
  ] = await Promise.all([
    db.customer.count(),
    db.vendor.count(),
    db.vendor.count({ where: { status: "PENDING" } }),
    db.vendor.count({ where: { status: "APPROVED" } }),
    db.serviceRequest.count(),
    db.lead.count({ where: { status: { in: ["NEW", "ASSIGNED", "SENT", "CONTACTED"] } } }),
    db.project.count({ where: { status: "WON" } }),
    db.project.count({ where: { status: "LOST" } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
    db.customerFeedback.count(),
    db.customerFeedback.aggregate({ _avg: { rating: true } }),
    db.customerFeedback.count({ where: { useAgain: { in: ["very_likely", "likely"] } } }),
    db.customerFeedback.count({ where: { recommend: { in: ["definitely", "probably"] } } }),
  ]);

  const avgRating = avgRatingResult._avg.rating || 0;
  const percentUseAgain = totalFeedback > 0 ? Math.round((useAgainCount / totalFeedback) * 100) : 0;
  const percentRecommend = totalFeedback > 0 ? Math.round((recommendCount / totalFeedback) * 100) : 0;

  return NextResponse.json({
    totalCustomers,
    totalVendors,
    pendingVendors,
    approvedVendors,
    totalRequests,
    activeLeads,
    wonProjects,
    lostProjects,
    totalRevenue: totalRevenue._sum.amount || 0,
    totalFeedback,
    avgRating: Math.round(avgRating * 10) / 10,
    percentUseAgain,
    percentRecommend,
  });
});
