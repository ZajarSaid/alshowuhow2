"use client";

import { useState, useEffect, Fragment } from "react";
import { signOut } from "next-auth/react";
import logo from "@/logo.png";

type AdminTab = "overview" | "vendors" | "requests" | "leads" | "customers" | "services" | "feedback";

type Stats = {
  totalCustomers: number;
  totalVendors: number;
  pendingVendors: number;
  approvedVendors: number;
  totalRequests: number;
  activeLeads: number;
  wonProjects: number;
  totalRevenue: number;
  totalFeedback: number;
  avgRating: number;
  percentUseAgain: number;
  percentRecommend: number;
};

type Vendor = {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website: string | null;
  description: string | null;
  licenseInformation: string | null;
  insuranceInformation: string | null;
  yearsInBusiness: number | null;
  status: string;
  createdAt: string;
  services: { service: { name: string } }[];
  serviceAreas: { zipCode: string }[];
};

type Lead = {
  id: string;
  status: string;
  createdAt: string;
  serviceRequest: {
    zipCode: string;
    description: string;
    customer: { firstName: string; lastName: string };
    service: { name: string };
  };
  vendor: { businessName: string } | null;
  project?: { finalValue: number | null } | null;
};

type MatchedVendor = {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string | null;
};

type CustomerRequest = {
  id: string;
  createdAt: string;
  description: string | null;
  status: string;
  zipCode: string;
  urgency: string;
  additionalNotes: string | null;
  otherServiceText: string | null;
  preferredContactMethod: string;
  matchedVendors: MatchedVendor[] | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    preferredContact: string;
  };
  service: { name: string };
  leads: { vendor: { businessName: string } | null }[];
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  preferredContact: string;
  createdAt: string;
  serviceRequests: CustomerRequest[];
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  _count?: { vendorServices: number; serviceRequests: number };
};

type Feedback = {
  id: string;
  rating: number;
  hearAbout: string;
  useAgain: string;
  recommend: string;
  comment: string | null;
  createdAt: string;
  serviceRequest: {
    zipCode: string;
    customer: { firstName: string; lastName: string; email: string };
    service: { name: string };
  };
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-yellow-100 text-yellow-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  SENT: "bg-purple/10 text-purple",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

const sidebarItems: { id: AdminTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "vendors", label: "Vendors", icon: "🏪" },
  { id: "requests", label: "Requests", icon: "📥" },
  { id: "leads", label: "Leads", icon: "📋" },
  { id: "customers", label: "Customers", icon: "👥" },
  { id: "services", label: "Services", icon: "🔧" },
  { id: "feedback", label: "Feedback", icon: "⭐" },
];

function DetailRow({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-dark-text/50">{label}</dt>
      <dd className="font-medium text-dark-text text-right break-words">
        {isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-purple hover:underline break-all">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function VendorDetails({ vendor }: { vendor: Vendor }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
      <div>
        <h4 className="font-semibold text-dark-text mb-3">Business Information</h4>
        <dl className="space-y-2">
          <DetailRow label="Contact Person" value={vendor.contactName} />
          <DetailRow label="Email" value={vendor.email} />
          <DetailRow label="Phone" value={vendor.phone} />
          <DetailRow label="Address" value={vendor.address} />
          <DetailRow label="Website" value={vendor.website} isLink={!!vendor.website} />
          {vendor.description && <DetailRow label="Description" value={vendor.description} />}
          <DetailRow label="Applied" value={new Date(vendor.createdAt).toLocaleDateString()} />
        </dl>
      </div>
      <div>
        <h4 className="font-semibold text-dark-text mb-3">Qualifications</h4>
        <dl className="space-y-2">
          <DetailRow label="License" value={vendor.licenseInformation} />
          <DetailRow label="Insurance" value={vendor.insuranceInformation} />
          <DetailRow label="Years in Business" value={vendor.yearsInBusiness != null ? String(vendor.yearsInBusiness) : null} />
        </dl>
        <h4 className="font-semibold text-dark-text mb-3 mt-6">Service Areas</h4>
        <div className="flex flex-wrap gap-1">
          {vendor.serviceAreas.map((area) => (
            <span key={area.zipCode} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs">{area.zipCode}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomerDetails({ customer }: { customer: Customer }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
      <div>
        <h4 className="font-semibold text-dark-text mb-3">Customer Information</h4>
        <dl className="space-y-2">
          <DetailRow label="Full Name" value={`${customer.firstName} ${customer.lastName}`} />
          <DetailRow label="Email" value={customer.email} />
          <DetailRow label="Phone" value={customer.phone} />
          <DetailRow label="Preferred Contact" value={customer.preferredContact} />
          <DetailRow label="Registered" value={new Date(customer.createdAt).toLocaleDateString()} />
        </dl>
      </div>
      <div>
        <h4 className="font-semibold text-dark-text mb-3">Service Request History</h4>
        {customer.serviceRequests.length === 0 ? (
          <p className="text-dark-text/50 text-sm">No requests yet.</p>
        ) : (
          <div className="space-y-3">
            {customer.serviceRequests.map((req) => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-dark-text">{req.service.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || "bg-gray-100 text-gray-700"}`}>
                    {req.status}
                  </span>
                </div>
                {req.description && (
                  <p className="text-xs text-dark-text/60 mt-1">{req.description}</p>
                )}
                <div className="text-xs text-dark-text/40 mt-2">
                  {new Date(req.createdAt).toLocaleDateString()}
                  {req.leads.length > 0 && (
                    <> · {req.leads.map((l) => l.vendor?.businessName).filter(Boolean).join(", ")}</>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestDetails({ request }: { request: CustomerRequest }) {
  const matched = request.matchedVendors ?? [];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
      <div>
        <h4 className="font-semibold text-dark-text mb-3">Customer</h4>
        <dl className="space-y-2">
          <DetailRow label="Name" value={`${request.customer.firstName} ${request.customer.lastName}`} />
          <DetailRow label="Email" value={request.customer.email} />
          <DetailRow label="Phone" value={request.customer.phone} />
          <DetailRow label="Preferred Contact" value={request.customer.preferredContact || request.preferredContactMethod} />
          <DetailRow label="Service" value={request.service.name} />
          <DetailRow label="ZIP Code" value={request.zipCode} />
          <DetailRow label="Urgency" value={request.urgency ? request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1) : null} />
          <DetailRow label="Submitted" value={new Date(request.createdAt).toLocaleDateString()} />
        </dl>
      </div>
      <div>
        <h4 className="font-semibold text-dark-text mb-3">Request Details</h4>
        {request.otherServiceText && (
          <div className="bg-crimson/5 border border-crimson/20 rounded-lg p-3 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-crimson mb-1">
              Service requested (Other)
            </p>
            <p className="text-dark-text/80 whitespace-pre-wrap">{request.otherServiceText}</p>
          </div>
        )}
        {request.description && (
          <p className="text-dark-text/80 whitespace-pre-wrap">{request.description}</p>
        )}
        <DetailRow label="Additional Notes" value={request.additionalNotes} />
        <h4 className="font-semibold text-dark-text mb-3 mt-6">Matched Vendors ({matched.length})</h4>
        {matched.length === 0 ? (
          <p className="text-dark-text/50">No matching vendors for this request.</p>
        ) : (
          <div className="space-y-3">
            {matched.map((vendor) => (
              <div key={vendor.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="font-medium text-dark-text">{vendor.businessName}</div>
                <div className="text-xs text-dark-text/60 mt-1 space-y-0.5">
                  <div>{vendor.contactName}</div>
                  <div>{vendor.email}</div>
                  <div>{vendor.phone}</div>
                  {vendor.website && (
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple hover:underline break-all"
                    >
                      {vendor.website}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarContent({
  activeTab,
  onSelect,
}: {
  activeTab: AdminTab;
  onSelect: (tab: AdminTab) => void;
}) {
  return (
    <>
      <div className="p-5 border-b border-white/10 flex items-center gap-2 min-w-0">
        <img src={logo.src} alt="ALshowUhow" className="h-8 w-auto" />
      </div>
      <p className="px-5 pt-4 text-xs text-white/50">Admin Dashboard</p>
      <nav className="p-4 space-y-1">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === item.id
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [newService, setNewService] = useState({ name: "", description: "", icon: "" });
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const adminFetch = async (path: string) => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return res.json();
    };

    Promise.all([
      adminFetch("/api/admin/stats"),
      adminFetch("/api/admin/vendors"),
      adminFetch("/api/customer-requests"),
      adminFetch("/api/admin/leads"),
      adminFetch("/api/admin/customers"),
      adminFetch("/api/admin/services"),
      adminFetch("/api/admin/feedback"),
    ]).then(([s, v, r, l, c, sv, fb]) => {
      setStats(s);
      setVendors(Array.isArray(v) ? v : []);
      setRequests(Array.isArray(r) ? r : []);
      setLeads(Array.isArray(l) ? l : []);
      setCustomers(Array.isArray(c) ? c : []);
      setServices(Array.isArray(sv) ? sv : []);
      setFeedback(Array.isArray(fb) ? fb : []);
      setLoading(false);
    }).catch(() => {
      setAuthError(true);
      setLoading(false);
    });
  }, []);

  const handleApproveVendor = async (id: string) => {
    await fetch("/api/admin/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "APPROVED" }),
    });
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status: "APPROVED" } : v)));
    if (stats) setStats({ ...stats, pendingVendors: stats.pendingVendors - 1, approvedVendors: stats.approvedVendors + 1 });
  };

  const handleRejectVendor = async (id: string) => {
    await fetch("/api/admin/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "REJECTED" }),
    });
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status: "REJECTED" } : v)));
    if (stats) setStats({ ...stats, pendingVendors: stats.pendingVendors - 1 });
  };

  const handleToggleService = async (service: Service) => {
    await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: service.id, active: !service.active }),
    });
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, active: !service.active } : s))
    );
  };

  const handleCreateService = async () => {
    if (!newService.name.trim()) return;
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newService),
    });
    if (!res.ok) return;
    const created = await res.json();
    setServices((prev) =>
      [...prev, { ...created, _count: { vendorServices: 0, serviceRequests: 0 } }].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    setNewService({ name: "", description: "", icon: "" });
  };

  const overviewStats = stats
    ? [
        { label: "Total Vendors", value: stats.totalVendors, icon: "🏪", color: "text-brand-blue" },
        { label: "Total Customers", value: stats.totalCustomers, icon: "👥", color: "text-purple" },
        { label: "Total Requests", value: stats.totalRequests, icon: "📝", color: "text-crimson" },
        { label: "Active Leads", value: stats.activeLeads, icon: "📋", color: "text-yellow-600" },
        { label: "Won Projects", value: stats.wonProjects, icon: "✅", color: "text-green-600" },
        { label: "Total Revenue", value: `$${stats.totalRevenue}`, icon: "💰", color: "text-orange-600" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-light-bg lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-shrink-0 bg-brand-blue flex-col lg:min-h-screen lg:sticky lg:top-0">
        <SidebarContent activeTab={activeTab} onSelect={setActiveTab} />
      </aside>

      <main className="flex-1 min-w-0 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={logo.src}
              alt="ALshowUhow"
              className="h-8 w-auto shrink-0 lg:hidden"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-dark-text capitalize truncate">{activeTab}</h1>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="shrink-0 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-dark-text/70 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-dark-text/50">Loading dashboard data...</div>
        ) : authError ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-semibold text-dark-text mb-1">Session expired</h2>
            <p className="text-sm text-dark-text/60 mb-4">Please sign in again to view the dashboard.</p>
            <button
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="px-4 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-dark transition-colors"
            >
              Sign in again
            </button>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-8">
                  {overviewStats.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{stat.icon}</span>
                        <div className="min-w-0">
                          <div className={`text-xl sm:text-2xl font-bold truncate ${stat.color}`}>{stat.value}</div>
                          <div className="text-xs sm:text-sm text-dark-text/60 truncate">{stat.label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-5 border-b border-gray-200">
                    <h2 className="font-semibold text-dark-text">Recent Leads</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {leads.slice(0, 5).map((lead) => (
                      <div key={lead.id} className="p-4 flex items-center gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dark-text">
                            {lead.serviceRequest.customer.firstName} {lead.serviceRequest.customer.lastName} — {lead.serviceRequest.service.name}
                          </p>
                          <p className="text-xs text-dark-text/50">
                            {lead.serviceRequest.zipCode} · {new Date(lead.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || "bg-gray-100 text-gray-700"}`}>
                          {lead.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "vendors" && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center gap-2">
                  <h2 className="font-semibold text-dark-text">All Vendors</h2>
                  <span className="text-sm text-dark-text/50 shrink-0">{vendors.length} vendors</span>
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-light-bg text-left">
                      <tr>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Business</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Contact</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Services</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Status</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vendors.map((vendor) => (
                        <Fragment key={vendor.id}>
                          <tr className="hover:bg-light-bg">
                            <td className="px-5 py-4">
                              <div className="font-medium text-dark-text">{vendor.businessName}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div>{vendor.contactName}</div>
                              <div className="text-xs text-dark-text/50">{vendor.email}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1">
                                {vendor.services.map((s) => (
                                  <span key={s.service.name} className="px-2 py-0.5 bg-light-bg rounded text-xs">{s.service.name}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[vendor.status]}`}>
                                {vendor.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-3 items-center">
                                <button
                                  onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}
                                  className="text-xs font-medium text-purple hover:text-purple-dark"
                                >
                                  {expandedVendor === vendor.id ? "Hide Details" : "Details"}
                                </button>
                                {vendor.status === "PENDING" && (
                                  <>
                                    <button onClick={() => handleApproveVendor(vendor.id)} className="text-xs font-medium text-green-600 hover:text-green-700">Approve</button>
                                    <button onClick={() => handleRejectVendor(vendor.id)} className="text-xs font-medium text-crimson hover:text-crimson-dark">Reject</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedVendor === vendor.id && (
                            <tr className="bg-light-bg/50">
                              <td colSpan={5} className="px-5 py-5">
                                <VendorDetails vendor={vendor} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-dark-text">{vendor.businessName}</div>
                          <div className="text-xs text-dark-text/50">
                            {vendor.contactName}{vendor.email ? ` · ${vendor.email}` : ""}
                          </div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[vendor.status]}`}>
                          {vendor.status}
                        </span>
                      </div>
                      {vendor.services.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {vendor.services.map((s) => (
                            <span key={s.service.name} className="px-2 py-0.5 bg-light-bg rounded text-xs">{s.service.name}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}
                          className="text-xs font-medium text-purple hover:text-purple-dark"
                        >
                          {expandedVendor === vendor.id ? "Hide Details" : "Details"}
                        </button>
                        {vendor.status === "PENDING" && (
                          <>
                            <button onClick={() => handleApproveVendor(vendor.id)} className="text-xs font-medium text-green-600 hover:text-green-700">Approve</button>
                            <button onClick={() => handleRejectVendor(vendor.id)} className="text-xs font-medium text-crimson hover:text-crimson-dark">Reject</button>
                          </>
                        )}
                      </div>
                      {expandedVendor === vendor.id && (
                        <div className="bg-light-bg/50 rounded-lg p-4">
                          <VendorDetails vendor={vendor} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "requests" && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center gap-2">
                  <h2 className="font-semibold text-dark-text">Service Requests</h2>
                  <span className="text-sm text-dark-text/50 shrink-0">{requests.length} requests</span>
                </div>

                {requests.length === 0 ? (
                  <div className="p-8 text-center text-dark-text/50">No service requests yet.</div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-light-bg text-left">
                          <tr>
                            <th className="px-5 py-3 font-medium text-dark-text/60">Customer</th>
                            <th className="px-5 py-3 font-medium text-dark-text/60">Service</th>
                            <th className="px-5 py-3 font-medium text-dark-text/60">ZIP</th>
                            <th className="px-5 py-3 font-medium text-dark-text/60">Matched Vendors</th>
                            <th className="px-5 py-3 font-medium text-dark-text/60">Date</th>
                            <th className="px-5 py-3 font-medium text-dark-text/60">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {requests.map((request) => (
                            <Fragment key={request.id}>
                              <tr className="hover:bg-light-bg">
                                <td className="px-5 py-4">
                                  <div className="font-medium text-dark-text">
                                    {request.customer.firstName} {request.customer.lastName}
                                  </div>
                                  <div className="text-xs text-dark-text/50">{request.customer.email}</div>
                                </td>
                                <td className="px-5 py-4">{request.service.name}</td>
                                <td className="px-5 py-4">{request.zipCode}</td>
                                <td className="px-5 py-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    (request.matchedVendors?.length ?? 0) > 0 ? statusColors["APPROVED"] : "bg-gray-100 text-gray-700"
                                  }`}>
                                    {request.matchedVendors?.length ?? 0} matched
                                  </span>
                                </td>
                                <td className="px-5 py-4">{new Date(request.createdAt).toLocaleDateString()}</td>
                                <td className="px-5 py-4">
                                  <button
                                    onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                                    className="text-xs font-medium text-purple hover:text-purple-dark"
                                  >
                                    {expandedRequest === request.id ? "Hide Details" : "Details"}
                                  </button>
                                </td>
                              </tr>
                              {expandedRequest === request.id && (
                                <tr className="bg-light-bg/50">
                                  <td colSpan={6} className="px-5 py-5">
                                    <RequestDetails request={request} />
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden divide-y divide-gray-100">
                      {requests.map((request) => (
                        <div key={request.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-dark-text">
                                {request.customer.firstName} {request.customer.lastName}
                              </div>
                              <div className="text-xs text-dark-text/50">
                                {request.service.name} · ZIP {request.zipCode}
                              </div>
                            </div>
                            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (request.matchedVendors?.length ?? 0) > 0 ? statusColors["APPROVED"] : "bg-gray-100 text-gray-700"
                            }`}>
                              {request.matchedVendors?.length ?? 0} matched
                            </span>
                          </div>
                          <div className="text-xs text-dark-text/60">{new Date(request.createdAt).toLocaleDateString()}</div>
                          <button
                            onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                            className="text-xs font-medium text-purple hover:text-purple-dark"
                          >
                            {expandedRequest === request.id ? "Hide Details" : "Details"}
                          </button>
                          {expandedRequest === request.id && (
                            <div className="bg-light-bg/50 rounded-lg p-4">
                              <RequestDetails request={request} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "leads" && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center gap-2">
                  <h2 className="font-semibold text-dark-text">All Leads</h2>
                  <span className="text-sm text-dark-text/50 shrink-0">{leads.length} leads</span>
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-light-bg text-left">
                      <tr>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Customer</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Service</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">ZIP</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Vendor</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-light-bg">
                          <td className="px-5 py-4">{lead.serviceRequest.customer.firstName} {lead.serviceRequest.customer.lastName}</td>
                          <td className="px-5 py-4">{lead.serviceRequest.service.name}</td>
                          <td className="px-5 py-4">{lead.serviceRequest.zipCode}</td>
                          <td className="px-5 py-4">{lead.vendor?.businessName || "—"}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || "bg-gray-100 text-gray-700"}`}>
                              {lead.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <div key={lead.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-dark-text">
                            {lead.serviceRequest.customer.firstName} {lead.serviceRequest.customer.lastName}
                          </div>
                          <div className="text-xs text-dark-text/50">{lead.serviceRequest.service.name}</div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || "bg-gray-100 text-gray-700"}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="text-xs text-dark-text/60">
                        ZIP {lead.serviceRequest.zipCode} · {lead.vendor?.businessName || "Unassigned"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "customers" && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200">
                  <h2 className="font-semibold text-dark-text">Customers</h2>
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-light-bg text-left">
                      <tr>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Name</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Email</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Requests</th>
                        <th className="px-5 py-3 font-medium text-dark-text/60">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customers.map((customer) => (
                        <Fragment key={customer.id}>
                          <tr className="hover:bg-light-bg">
                            <td className="px-5 py-4 font-medium text-dark-text">{customer.firstName} {customer.lastName}</td>
                            <td className="px-5 py-4 text-dark-text/60">{customer.email}</td>
                            <td className="px-5 py-4">{customer.serviceRequests.length}</td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                                className="text-xs font-medium text-purple hover:text-purple-dark"
                              >
                                {expandedCustomer === customer.id ? "Hide Details" : "Details"}
                              </button>
                            </td>
                          </tr>
                          {expandedCustomer === customer.id && (
                            <tr className="bg-light-bg/50">
                              <td colSpan={4} className="px-5 py-5">
                                <CustomerDetails customer={customer} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                  {customers.map((customer) => (
                    <div key={customer.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-dark-text">{customer.firstName} {customer.lastName}</div>
                          <div className="text-xs text-dark-text/50 truncate">{customer.email}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-dark-text">{customer.serviceRequests.length}</div>
                          <div className="text-xs text-dark-text/50">requests</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                        className="text-xs font-medium text-purple hover:text-purple-dark"
                      >
                        {expandedCustomer === customer.id ? "Hide Details" : "Details"}
                      </button>
                      {expandedCustomer === customer.id && (
                        <div className="bg-light-bg/50 rounded-lg p-4">
                          <CustomerDetails customer={customer} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "services" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                  <h2 className="font-semibold text-dark-text mb-4">Add New Service</h2>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      value={newService.icon}
                      onChange={(e) => setNewService({ ...newService, icon: e.target.value })}
                      placeholder="Icon (emoji)"
                      maxLength={4}
                      className="md:w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
                    />
                    <input
                      type="text"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      placeholder="Service name *"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
                    />
                    <input
                      type="text"
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
                    />
                    <button
                      onClick={handleCreateService}
                      disabled={!newService.name.trim()}
                      className="px-6 py-2.5 bg-purple text-white rounded-lg font-semibold hover:bg-purple-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      Add Service
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center gap-2">
                    <h2 className="font-semibold text-dark-text">All Services</h2>
                    <span className="text-sm text-dark-text/50 shrink-0">{services.length} services</span>
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-light-bg text-left">
                        <tr>
                          <th className="px-5 py-3 font-medium text-dark-text/60">Service</th>
                          <th className="px-5 py-3 font-medium text-dark-text/60">Vendors</th>
                          <th className="px-5 py-3 font-medium text-dark-text/60">Requests</th>
                          <th className="px-5 py-3 font-medium text-dark-text/60">Status</th>
                          <th className="px-5 py-3 font-medium text-dark-text/60">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {services.map((service) => (
                          <tr key={service.id} className="hover:bg-light-bg">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {service.icon && <span className="text-xl">{service.icon}</span>}
                                <div>
                                  <div className={`font-medium text-dark-text ${!service.active ? "line-through opacity-50" : ""}`}>
                                    {service.name}
                                  </div>
                                  {service.description && (
                                    <div className="text-xs text-dark-text/50">{service.description}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">{service._count?.vendorServices ?? 0}</td>
                            <td className="px-5 py-4">{service._count?.serviceRequests ?? 0}</td>
                            <td className="px-5 py-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  service.active ? statusColors["APPROVED"] : statusColors["REJECTED"]
                                }`}
                              >
                                {service.active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() => handleToggleService(service)}
                                className={`text-xs font-medium ${
                                  service.active ? "text-crimson hover:text-crimson-dark" : "text-green-600 hover:text-green-700"
                                }`}
                              >
                                {service.active ? "Deactivate" : "Activate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-gray-100">
                    {services.map((service) => (
                      <div key={service.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {service.icon && <span className="text-xl">{service.icon}</span>}
                            <div className="min-w-0">
                              <div className={`font-medium text-dark-text ${!service.active ? "line-through opacity-50" : ""}`}>
                                {service.name}
                              </div>
                              {service.description && (
                                <div className="text-xs text-dark-text/50">{service.description}</div>
                              )}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              service.active ? statusColors["APPROVED"] : statusColors["REJECTED"]
                            }`}
                          >
                            {service.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs text-dark-text/60">
                          <span>
                            {service._count?.vendorServices ?? 0} vendors · {service._count?.serviceRequests ?? 0} requests
                          </span>
                          <button
                            onClick={() => handleToggleService(service)}
                            className={`font-medium shrink-0 ${
                              service.active ? "text-crimson hover:text-crimson-dark" : "text-green-600 hover:text-green-700"
                            }`}
                          >
                            {service.active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "feedback" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-white rounded-xl p-5 border border-gray-200">
                    <div className="text-3xl font-bold text-yellow-500">{stats?.avgRating || 0}/5</div>
                    <div className="text-sm text-dark-text/60 mt-1">Average Rating</div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-200">
                    <div className="text-3xl font-bold text-green-600">{stats?.percentUseAgain || 0}%</div>
                    <div className="text-sm text-dark-text/60 mt-1">Would Use Again</div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-200">
                    <div className="text-3xl font-bold text-purple">{stats?.percentRecommend || 0}%</div>
                    <div className="text-sm text-dark-text/60 mt-1">Would Recommend</div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center gap-2">
                    <h2 className="font-semibold text-dark-text">Customer Feedback</h2>
                    <span className="text-sm text-dark-text/50 shrink-0">{feedback.length} responses</span>
                  </div>
                  {feedback.length === 0 ? (
                    <div className="p-8 text-center text-dark-text/50">No feedback submitted yet.</div>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-light-bg text-left">
                            <tr>
                              <th className="px-5 py-3 font-medium text-dark-text/60">Customer</th>
                              <th className="px-5 py-3 font-medium text-dark-text/60">Service</th>
                              <th className="px-5 py-3 font-medium text-dark-text/60">ZIP</th>
                              <th className="px-5 py-3 font-medium text-dark-text/60">Rating</th>
                              <th className="px-5 py-3 font-medium text-dark-text/60">Heard About</th>
                              <th className="px-5 py-3 font-medium text-dark-text/60">Use Again</th>
                              <th className="px-5 py-3 font-medium text-dark-text/60">Recommend</th>
                              <th className="px-5 py-3 font-medium text-dark-text/60">Comment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {feedback.map((fb) => (
                              <tr key={fb.id} className="hover:bg-light-bg">
                                <td className="px-5 py-4">
                                  <div className="font-medium text-dark-text">
                                    {fb.serviceRequest.customer.firstName} {fb.serviceRequest.customer.lastName}
                                  </div>
                                  <div className="text-xs text-dark-text/50">{fb.serviceRequest.customer.email}</div>
                                </td>
                                <td className="px-5 py-4">{fb.serviceRequest.service.name}</td>
                                <td className="px-5 py-4">{fb.serviceRequest.zipCode}</td>
                                <td className="px-5 py-4">
                                  <span className="text-yellow-500">{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
                                </td>
                                <td className="px-5 py-4 capitalize">{fb.hearAbout.replace("_", " ")}</td>
                                <td className="px-5 py-4 capitalize">{fb.useAgain.replace("_", " ")}</td>
                                <td className="px-5 py-4 capitalize">{fb.recommend.replace("_", " ")}</td>
                                <td className="px-5 py-4 text-dark-text/60 max-w-[200px] truncate">
                                  {fb.comment || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="md:hidden divide-y divide-gray-100">
                        {feedback.map((fb) => (
                          <div key={fb.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-dark-text">
                                  {fb.serviceRequest.customer.firstName} {fb.serviceRequest.customer.lastName}
                                </div>
                                <div className="text-xs text-dark-text/50 truncate">{fb.serviceRequest.customer.email}</div>
                              </div>
                              <span className="shrink-0 text-yellow-500 text-sm">{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
                            </div>
                            <div className="text-xs text-dark-text/60">
                              {fb.serviceRequest.service.name} · {fb.serviceRequest.zipCode}
                            </div>
                            <dl className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <dt className="text-dark-text/50">Heard</dt>
                                <dd className="capitalize">{fb.hearAbout.replace("_", " ")}</dd>
                              </div>
                              <div>
                                <dt className="text-dark-text/50">Use again</dt>
                                <dd className="capitalize">{fb.useAgain.replace("_", " ")}</dd>
                              </div>
                              <div>
                                <dt className="text-dark-text/50">Recommend</dt>
                                <dd className="capitalize">{fb.recommend.replace("_", " ")}</dd>
                              </div>
                            </dl>
                            {fb.comment && (
                              <p className="text-xs text-dark-text/60 border-t border-gray-100 pt-2">{fb.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Admin sections"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex">
          {sidebarItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] pt-2 pb-1.5 transition-colors ${
                  active ? "text-purple" : "text-dark-text/45 hover:text-dark-text/70"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-purple rounded-b-full" />
                )}
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[10px] font-semibold leading-tight max-w-full truncate px-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}