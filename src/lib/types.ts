import { SERVICE_CATEGORIES, LEAD_STATUSES, VENDOR_STATUSES } from "./constants";

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]["id"];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  zipCode: string;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  customerId: string;
  serviceCategory: ServiceCategory;
  zipCode: string;
  description: string;
  photos?: string[];
  preferredContactMethod: "email" | "phone";
  urgency: "NORMAL" | "URGENT";
  status: "NEW" | "QUALIFIED" | "ASSIGNED";
  createdAt: string;
}

export interface Vendor {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  services: ServiceCategory[];
  zipCodesServed: string[];
  licenseInfo?: string;
  insuranceInfo?: string;
  yearsInBusiness?: number;
  status: VendorStatus;
  createdAt: string;
}

export interface Lead {
  id: string;
  serviceRequestId: string;
  customerId: string;
  vendorId?: string;
  serviceCategory: ServiceCategory;
  zipCode: string;
  description: string;
  status: LeadStatus;
  vendorResponse?: string;
  projectOutcome?: "won" | "lost" | "pending";
  revenue?: number;
  createdAt: string;
  sentAt?: string;
}
