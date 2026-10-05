"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

type Service = { name: string; icon: string | null };
type ServiceArea = { zipCode: string };

type Vendor = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website: string | null;
  description: string | null;
  status: string;
  licenseInformation: string | null;
  insuranceInformation: string | null;
  yearsInBusiness: number | null;
  createdAt: Date;
  services: { service: Service; [key: string]: unknown }[];
  serviceAreas: ServiceArea[];
};

const statusStyles: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  SUSPENDED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
};

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-dark-text/50 sm:w-48 shrink-0">{label}</span>
      <span className="text-dark-text">{value || "—"}</span>
    </div>
  );
}

export default function VendorSettings({ vendor }: { vendor: Vendor }) {
  return (
    <div className="min-h-screen bg-light-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-dark-text">Profile Settings</h1>
            <p className="text-dark-text/60">Your business profile and account details</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/vendor/dashboard"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-dark-text/70 hover:bg-gray-50 transition-colors"
            >
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-dark-text/70 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-dark-text">Business Information</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[vendor.status] || "bg-gray-100 text-gray-700"}`}>
              {vendor.status}
            </span>
          </div>
          <div className="p-5">
            <Row label="Business Name" value={vendor.businessName} />
            <Row label="Contact Person" value={vendor.contactName} />
            <Row label="Email" value={vendor.email} />
            <Row label="Phone" value={vendor.phone} />
            <Row label="Address" value={vendor.address} />
            <Row label="Website" value={vendor.website} />
            <Row label="Description" value={vendor.description} />
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="p-5 border-b border-gray-200">
            <h2 className="font-semibold text-dark-text">Qualifications</h2>
          </div>
          <div className="p-5">
            <Row label="License" value={vendor.licenseInformation} />
            <Row label="Insurance" value={vendor.insuranceInformation} />
            <Row label="Years in Business" value={vendor.yearsInBusiness} />
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="p-5 border-b border-gray-200">
            <h2 className="font-semibold text-dark-text">Services Offered</h2>
          </div>
          <div className="p-5">
            {vendor.services.length === 0 ? (
              <p className="text-dark-text/50 text-sm">No services added.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {vendor.services.map((vs) => (
                  <span
                    key={vs.service.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-light-bg border border-gray-200 text-sm font-medium text-dark-text"
                  >
                    <span>{vs.service.icon ?? "•"}</span>
                    {vs.service.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Service Areas */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="p-5 border-b border-gray-200">
            <h2 className="font-semibold text-dark-text">Service Areas</h2>
          </div>
          <div className="p-5">
            {vendor.serviceAreas.length === 0 ? (
              <p className="text-dark-text/50 text-sm">No service areas added.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vendor.serviceAreas.map((area) => (
                  <span
                    key={area.zipCode}
                    className="px-3 py-1.5 rounded-lg bg-light-bg border border-gray-200 text-sm font-mono text-dark-text"
                  >
                    {area.zipCode}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-200">
            <h2 className="font-semibold text-dark-text">Account</h2>
          </div>
          <div className="p-5">
            <Row label="Member Since" value={new Date(vendor.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
          </div>
        </div>
      </div>
    </div>
  );
}
