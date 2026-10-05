"use client";

import { useI18n } from "@/lib/i18n/context";
import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

type Lead = {
  id: string;
  status: string;
  createdAt: string;
  serviceRequest: {
    description: string;
    zipCode: string;
    urgency: string;
    preferredContactMethod: string;
    customer: {
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
    };
    service: { name: string; icon: string };
  };
  project?: { status: string; finalValue: number | null } | null;
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  ESTIMATE_SENT: "bg-purple/10 text-purple",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  CLOSED: "bg-gray-100 text-gray-700",
};

type Props = {
  vendorId: string;
  businessName?: string;
};

export default function VendorDashboard({ vendorId, businessName }: Props) {
  const { t } = useI18n();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    fetch("/api/vendors/leads")
      .then((r) => r.json())
      .then((data: Lead[]) => {
        setLeads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [vendorId]);

  const updateLeadStatus = async (id: string, status: string) => {
    setActingId(id);
    try {
      const res = await fetch("/api/vendors/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed to update lead");
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch {
      // keep UI state unchanged on failure
    } finally {
      setActingId(null);
    }
  };

  const mailtoHref = (lead: Lead) => {
    const c = lead.serviceRequest.customer;
    const subject = `Your ALshowUhow request — ${lead.serviceRequest.service.name}`;
    const body = [
      `Hello ${c.firstName},`,
      "",
      "Thank you for your recent ALshowUhow service request.",
      "I'd like to discuss your project and provide a quote.",
      "Please let me know a convenient time to connect.",
      "",
      "Best regards,",
      businessName || "ALshowUhow verified provider",
    ].join("\n");
    return `mailto:${c.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const newCount = leads.filter((l) => l.status === "NEW").length;
  const inProgress = leads.filter((l) => ["CONTACTED", "ESTIMATE_SENT"].includes(l.status)).length;
  const wonCount = leads.filter((l) => l.status === "WON").length;

  return (
    <div className="min-h-screen bg-light-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-dark-text">{t.dashboard?.vendorDashboard ?? "Vendor Dashboard"}</h1>
            <p className="text-dark-text/60">{t.dashboard?.welcomeBack?.replace("{businessName}", businessName ? `, ${businessName}` : "") ?? `Welcome back${businessName ? `, ${businessName}` : ""}`}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/vendor/settings"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-dark-text/70 hover:bg-gray-50 transition-colors"
            >
              {t.dashboard?.settings ?? "Settings"}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-dark-text/70 hover:bg-gray-50 transition-colors"
            >
              {t.dashboard?.signOut ?? "Sign out"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "New Leads", value: newCount, color: "text-blue-600" },
            { label: "In Progress", value: inProgress, color: "text-yellow-600" },
            { label: "Won", value: wonCount, color: "text-green-600" },
            { label: "Total Leads", value: leads.length, color: "text-dark-text" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-200">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-dark-text/60 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h2 className="font-semibold text-dark-text">Recent Leads</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-dark-text/50">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-dark-text/50">No leads yet. They&apos;ll appear here when customers request your services.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <div key={lead.id} className="p-4 sm:p-5 hover:bg-light-bg transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || "bg-gray-100 text-gray-700"}`}>
                          {lead.status.replace("_", " ")}
                        </span>
                        {lead.serviceRequest.urgency === "URGENT" && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Urgent</span>
                        )}
                      </div>
                      <h3 className="font-medium text-dark-text">
                        {lead.serviceRequest.service.name} — {lead.serviceRequest.zipCode}
                      </h3>
                      <p className="text-sm text-dark-text/60 mt-1">{lead.serviceRequest.description}</p>
                      <div className="mt-2 text-xs text-dark-text/70 space-y-0.5">
                        <p>
                          Customer: {lead.serviceRequest.customer.firstName} {lead.serviceRequest.customer.lastName}
                          {lead.serviceRequest.urgency !== "NORMAL" && " · wants to be reached by " + lead.serviceRequest.preferredContactMethod.replace("both", "email & phone")}
                        </p>
                        {lead.serviceRequest.customer.email && (
                          <p>📧 {lead.serviceRequest.customer.email}</p>
                        )}
                        {lead.serviceRequest.customer.phone && (
                          <p>📞 {lead.serviceRequest.customer.phone}</p>
                        )}
                      </div>

                      {(lead.status === "NEW" || lead.status === "CONTACTED") && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {lead.serviceRequest.customer.email && (
                            <a
                              href={mailtoHref(lead)}
                              className="px-3 py-1.5 rounded-lg bg-purple text-white text-xs font-medium hover:bg-purple-dark transition-colors"
                            >
                              Email Customer
                            </a>
                          )}
                          {lead.serviceRequest.customer.phone && (
                            <a
                              href={`tel:${lead.serviceRequest.customer.phone.replace(/[^+\d]/g, "")}`}
                              className="px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                            >
                              Call Customer
                            </a>
                          )}
                          {lead.status === "NEW" && (
                            <button
                              onClick={() => updateLeadStatus(lead.id, "CONTACTED")}
                              disabled={actingId === lead.id}
                              className="px-3 py-1.5 rounded-lg border border-yellow-300 bg-yellow-50 text-xs font-medium text-yellow-700 hover:bg-yellow-100 disabled:opacity-50 transition-colors"
                            >
                              Mark Contacted
                            </button>
                          )}
                          <button
                            onClick={() => updateLeadStatus(lead.id, "WON")}
                            disabled={actingId === lead.id}
                            className="px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                          >
                            Mark Won
                          </button>
                          <button
                            onClick={() => updateLeadStatus(lead.id, "LOST")}
                            disabled={actingId === lead.id}
                            className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            Mark Lost
                          </button>
                        </div>
                      )}
                    </div>
                    {lead.project?.finalValue && (
                      <span className="text-green-600 font-semibold">${lead.project.finalValue}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
