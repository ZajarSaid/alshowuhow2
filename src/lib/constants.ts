export const SERVICE_CATEGORIES = [
  { id: "plumbing", name: "Plumbing", icon: "🔧", description: "Pipes, faucets, drains, and water heater services" },
  { id: "hvac", name: "HVAC", icon: "❄️", description: "Heating, ventilation, and air conditioning" },
  { id: "electrical", name: "Electrical", icon: "⚡", description: "Wiring, outlets, panels, and lighting" },
  { id: "roofing", name: "Roofing", icon: "🏠", description: "Roof repair, replacement, and inspection" },
  { id: "landscaping", name: "Landscaping", icon: "🌿", description: "Lawn care, garden design, and outdoor maintenance" },
  { id: "cleaning", name: "Cleaning", icon: "✨", description: "Residential and commercial cleaning services" },
  { id: "handyman", name: "Handyman", icon: "🔨", description: "General repairs and home maintenance" },
  { id: "appliance-repair", name: "Appliance Repair", icon: "🔧", description: "Fix and maintain household appliances" },
] as const;

export const LEAD_STATUSES = [
  "New",
  "Qualified",
  "Assigned",
  "Sent",
  "Vendor Contacted",
  "Customer Contacted",
  "Estimate/Quote",
  "Won",
  "Lost",
  "Cancelled",
  "Closed",
] as const;

export const VENDOR_STATUSES = ["Pending", "Approved", "Suspended", "Rejected"] as const;

export const BRAND_COLORS = {
  crimson: "#C92535",
  purple: "#4B1E8E",
  blue: "#183B8F",
  white: "#FFFFFF",
  lightBg: "#F7F8FC",
  darkText: "#172554",
  lightPurple: "#6D4BC3",
} as const;

export const FEEDBACK_HEAR_ABOUT = [
  { value: "google", label: "Google search" },
  { value: "social", label: "Social media" },
  { value: "friend", label: "Friend or family" },
  { value: "advertisement", label: "Advertisement" },
  { value: "other", label: "Other" },
] as const;

export const FEEDBACK_USE_AGAIN = [
  { value: "very_likely", label: "Very likely" },
  { value: "likely", label: "Likely" },
  { value: "not_sure", label: "Not sure" },
  { value: "unlikely", label: "Unlikely" },
  { value: "very_unlikely", label: "Very unlikely" },
] as const;

export const FEEDBACK_RECOMMEND = [
  { value: "definitely", label: "Definitely" },
  { value: "probably", label: "Probably" },
  { value: "not_sure", label: "Not sure" },
  { value: "probably_not", label: "Probably not" },
  { value: "definitely_not", label: "Definitely not" },
] as const;
