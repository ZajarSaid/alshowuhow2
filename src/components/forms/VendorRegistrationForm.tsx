"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type DbService = { id: string; name: string; icon: string; description: string };
type ServiceCategory = DbService & { subServices: DbService[] };

type VendorData = {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  services: string[];
  zipCodes: string;
  licenseInfo: string;
  insuranceInfo: string;
  yearsInBusiness: string;
  certifications: string;
  password: string;
};

const initialData: VendorData = {
  businessName: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  services: [],
  zipCodes: "",
  licenseInfo: "",
  insuranceInfo: "",
  yearsInBusiness: "",
  certifications: "",
  password: "",
};

export default function VendorRegistrationForm() {
  const [data, setData] = useState<VendorData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [services, setServices] = useState<ServiceCategory[]>([]);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((s: ServiceCategory[]) => setServices(s))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (submitted) window.scrollTo(0, 0);
  }, [submitted]);

  const update = (field: keyof VendorData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleService = (serviceId: string) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((s) => s !== serviceId)
        : [...prev.services, serviceId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: data.businessName,
          contactPerson: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address,
          website: data.website || undefined,
          services: data.services,
          zipCodes: data.zipCodes,
          licenseInfo: data.licenseInfo || undefined,
          insuranceInfo: data.insuranceInfo || undefined,
          yearsInBusiness: data.yearsInBusiness || undefined,
          password: data.password || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to submit application");
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "We couldn't submit your application right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-20 h-20 bg-purple/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-dark-text mb-4">Application Submitted!</h2>
        <p className="text-dark-text/60 text-lg mb-4">
          Thank you for applying to join ALshowUhow as a vendor.
        </p>
        <p className="text-dark-text/60">
          We&apos;ll review your application and get back to you at <span className="font-medium">{data.email}</span> within 1-2 business days.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 rounded-lg bg-purple text-white font-medium hover:bg-light-purple transition-colors"
        >
          Go home
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Join as a Vendor</h1>
        <p className="text-gray-600 mt-2">
          Register your business and start receiving qualified leads. It&apos;s free!
        </p>
      </div>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
      {/* Business Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h3 className="text-xl font-bold text-dark-text mb-6">Business Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text/70 mb-2">Business Name *</label>
            <input
              type="text"
              required
              value={data.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              placeholder="Your Business Name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text/70 mb-2">Contact Person *</label>
            <input
              type="text"
              required
              value={data.contactPerson}
              onChange={(e) => update("contactPerson", e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Email *</label>
              <input
                type="email"
                required
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Phone *</label>
              <input
                type="tel"
                required
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text/70 mb-2">Business Address *</label>
            <input
              type="text"
              required
              value={data.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Street address, City, State ZIP"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text/70 mb-2">Website (optional)</label>
            <input
              type="url"
              value={data.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://yourbusiness.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
            />
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h3 className="text-xl font-bold text-dark-text mb-2">Services Offered *</h3>
        <p className="text-sm text-dark-text/50 mb-6">Select all services your business provides</p>
        <div className="space-y-4">
          {services.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 font-semibold text-dark-text mb-2">
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {cat.subServices.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleService(sub.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      data.services.includes(sub.id)
                        ? "border-purple bg-purple/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{sub.icon}</span>
                    <div className="font-medium mt-2">{sub.name}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Areas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h3 className="text-xl font-bold text-dark-text mb-6">Service Areas</h3>
        <div>
          <label className="block text-sm font-medium text-dark-text/70 mb-2">ZIP Codes Served *</label>
          <textarea
            required
            value={data.zipCodes}
            onChange={(e) => update("zipCodes", e.target.value)}
            placeholder="Enter ZIP codes separated by commas (e.g., 12345, 12346, 12347)"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none resize-none"
          />
          <p className="text-sm text-dark-text/50 mt-1">Enter the ZIP codes where you provide services</p>
        </div>
      </div>

      {/* Qualifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h3 className="text-xl font-bold text-dark-text mb-2">Qualifications</h3>
        <p className="text-sm text-dark-text/50 mb-6">Optional but helps build trust with customers</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text/70 mb-2">Password *</label>
            <input
              type="password"
              required
              value={data.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Set a password for your account"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">License Number</label>
              <input
                type="text"
                value={data.licenseInfo}
                onChange={(e) => update("licenseInfo", e.target.value)}
                placeholder="License #"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Insurance Info</label>
              <input
                type="text"
                value={data.insuranceInfo}
                onChange={(e) => update("insuranceInfo", e.target.value)}
                placeholder="Insurance provider/policy"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Years in Business</label>
              <input
                type="number"
                value={data.yearsInBusiness}
                onChange={(e) => update("yearsInBusiness", e.target.value)}
                placeholder="e.g., 5"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Certifications</label>
              <input
                type="text"
                value={data.certifications}
                onChange={(e) => update("certifications", e.target.value)}
                placeholder="e.g., EPA Certified"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="text-center">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-10 py-4 bg-crimson text-white rounded-lg font-bold text-lg hover:bg-crimson-dark disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
        <p className="text-sm text-dark-text/50 mt-4">
          By submitting, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
      </form>
    </>
  );
}
