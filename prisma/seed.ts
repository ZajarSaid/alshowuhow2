import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import path from "path";
import "dotenv/config";

function createDb() {
  const url = process.env.DATABASE_URL;

  if (url && url.startsWith("libsql")) {
    const adapter = new PrismaLibSql({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }

  // Honour an explicit local file: URL. Previously any non-libsql value was
  // ignored and the seed always wrote to ./dev.db, so a caller could not point
  // the seed at a scratch database - and the seed-guard test consequently
  // overwrote the real dev database on every test run.
  const localFile = url && url.startsWith("file:") ? url.slice("file:".length) : path.join(process.cwd(), "dev.db");
  const adapter = new PrismaLibSql({ url: `file:${localFile}` });
  return new PrismaClient({ adapter });
}

const db = createDb();

const PROD_SEED_FLAG = "--allow-prod";

function isRemoteUrl(url: string | undefined): boolean {
  return !!url && url.startsWith("libsql");
}

// Turso carries its auth token in the query string (?authToken=...), and some
// URLs carry it in userinfo, so strip both before any URL reaches a log.
function redactUrl(url: string): string {
  return url.replace(/\?.*$/, "").replace(/:\/\/[^@]*@/, "://***@");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value) return value;
  console.error(
    `\nMissing required environment variable ${name}.\n\n` +
    "This seed creates admin and vendor accounts, so it will not invent a\n" +
    "password: a missing value previously fell back to a hardcoded default,\n" +
    "producing accounts with a publicly known password.\n\n" +
    `  ${name}='<a strong unique value>' npm run db:seed\n`,
  );
  process.exit(1);
}

function assertSeedTargetIsSafe(argv: string[] = process.argv, env: NodeJS.ProcessEnv = process.env): void {
  if (!isRemoteUrl(env.DATABASE_URL)) return;
  if (argv.includes(PROD_SEED_FLAG) || env.ALLOW_PROD_SEED === "1") return;

  const target = redactUrl(env.DATABASE_URL!);
  console.error(
    "\nREFUSING TO SEED A PRODUCTION DATABASE.\n\n" +
    `  DATABASE_URL = ${target}\n\n` +
    "This seed script deletes every row of every table before inserting demo\n" +
    "data, and it creates admin accounts using SEED_ADMIN_PASSWORD. Running it\n" +
    "against production would destroy all real data.\n\n" +
    "To seed a local database, unset DATABASE_URL or set it to file:./dev.db.\n" +
    "If you truly intend to wipe and reseed this remote database, re-run with:\n\n" +
    `  npm run db:seed -- ${PROD_SEED_FLAG}\n`,
  );
  process.exit(1);
}

async function main() {
  assertSeedTargetIsSafe();

  console.log("Seeding database...");

  // Refuse to invent credentials. Previously these fell back to hardcoded
  // defaults, so a missing env var silently produced accounts with a publicly
  // known password.
  const ADMIN_EMAIL = "nyc.aljoseph@gmail.com";
  const VENDOR_EMAIL = "john@abcplumbing.com";
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");

  // The four demo vendors (and the leads/projects/payments/feedback that only
  // exist to give those vendors a history) are opt-in. By default the seed
  // creates only admins, the service catalogue, one customer and two inbound
  // requests, so a fresh environment is not populated with fake businesses that
  // look real. Re-create them with --with-vendor-demo or SEED_VENDOR_DEMO=1.
  const withVendorDemo = process.argv.includes("--with-vendor-demo") || process.env.SEED_VENDOR_DEMO === "1";
  const vendorPassword = withVendorDemo ? requireEnv("SEED_VENDOR_PASSWORD") : null;

  await db.payment.deleteMany();
  await db.project.deleteMany();
  await db.lead.deleteMany();
  await db.file.deleteMany();
  await db.serviceRequest.deleteMany();
  await db.vendorServiceArea.deleteMany();
  await db.vendorService.deleteMany();
  await db.vendor.deleteMany();
  await db.customer.deleteMany();
  await db.notification.deleteMany();
  await db.user.deleteMany();
  await db.service.deleteMany();

  const serviceData = (name: string, icon: string, description: string) => ({ name, icon, description });

  const [
    homeServices,
    realEstateServices,
    businessServices,
    foodHospitalityServices,
    eventsEntertainmentServices,
    automotiveServices,
  ] = await Promise.all([
    db.service.create({ data: { ...serviceData("Home Services", "🏡", "Plumbing, HVAC, electrical, roofing, landscaping, painting, cleaning, handyman, pest control, and more"), featured: true, sortOrder: 1 } }),
    db.service.create({ data: { ...serviceData("Real Estate & Property Services", "🏢", "Real estate agents, property managers, home inspectors, appraisers, and more"), featured: true, sortOrder: 2 } }),
    db.service.create({ data: { ...serviceData("Business & Professional Services", "💼", "Attorneys, bookkeeping, accounting, advertising & marketing, notaries, consulting, writing & editing, and more"), featured: true, sortOrder: 3 } }),
    db.service.create({ data: { ...serviceData("Food, Beverage & Hospitality Services", "🍽️", "Catering, food trucks, private chefs, bartending, concessions, event staffing, servers, venue support, restaurant services, hospitality staffing, and mobile food vendors"), featured: true, sortOrder: 4 } }),
    db.service.create({ data: { ...serviceData("Events & Entertainment", "🎉", "DJs, decorators, caterers, photographers, videographers, filmmakers, party rentals, security, and more"), featured: true, sortOrder: 5 } }),
    db.service.create({ data: { ...serviceData("Automotive Services", "🚗", "Mobile repair, mechanics, towing, detailing, and more"), featured: true, sortOrder: 6 } }),
  ]);

  const createSubServices = (parent: { id: string }, items: { name: string; icon: string; description: string }[]) =>
    Promise.all(items.map((item, i) => db.service.create({ data: { ...item, parentId: parent.id, featured: false, sortOrder: i + 1 } })));

  const homeSubs = await createSubServices(homeServices, [
    serviceData("Plumbing", "🔧", "Pipes, faucets, drains, and water heater services"),
    serviceData("HVAC", "❄️", "Heating, ventilation, and air conditioning"),
    serviceData("Electrical", "⚡", "Wiring, outlets, panels, and lighting"),
    serviceData("Roofing", "🏠", "Roof repair, replacement, and inspection"),
    serviceData("Landscaping", "🌿", "Lawn care, garden design, and outdoor maintenance"),
    serviceData("Painting", "🎨", "Interior and exterior painting"),
    serviceData("Cleaning", "✨", "Residential and commercial cleaning services"),
    serviceData("Handyman", "🔨", "General repairs and home maintenance"),
    serviceData("Pest Control", "🐜", "Pest control and extermination services"),
    serviceData("Appliance Repair", "🔧", "Fix and maintain household appliances"),
  ]);
  const plumbing = homeSubs[0];
  const hvac = homeSubs[1];
  const electrical = homeSubs[2];
  const landscaping = homeSubs[4];

  await createSubServices(realEstateServices, [
    serviceData("Real Estate Agents", "🏡", "Buying, selling, and listing assistance"),
    serviceData("Property Managers", "🏢", "Ongoing property and tenant management"),
    serviceData("Home Inspectors", "🔍", "Pre-purchase and routine home inspections"),
    serviceData("Appraisers", "📊", "Property valuation and appraisal reports"),
  ]);

  await createSubServices(businessServices, [
    serviceData("Attorneys", "⚖️", "Legal advice and representation"),
    serviceData("Bookkeeping", "📒", "Financial record keeping and reconciliation"),
    serviceData("Accounting", "🧮", "Tax preparation, payroll, and financial reporting"),
    serviceData("Advertising & Marketing", "📣", "Campaigns, branding, and promotion"),
    serviceData("Notaries", "✍️", "Document notarization services"),
    serviceData("Consulting", "💡", "Expert business and management advice"),
    serviceData("Writing & Editing", "✏️", "Content writing, proofreading, and editing"),
  ]);

  await createSubServices(foodHospitalityServices, [
    serviceData("Catering", "🍽️", "Event and private catering"),
    serviceData("Food Trucks", "🚚", "Mobile food truck services"),
    serviceData("Private Chefs", "👨‍🍳", "In-home private chef services"),
    serviceData("Bartending", "🍹", "Bartenders for events and venues"),
    serviceData("Concessions", "🍿", "Concession stands and vendors"),
    serviceData("Event Staffing", "👥", "Staff for events and venues"),
    serviceData("Servers", "🍴", "Wait staff for events"),
    serviceData("Venue Support", "🏟️", "Back-of-house venue support"),
    serviceData("Restaurant Services", "🍛", "Restaurant and kitchen services"),
    serviceData("Hospitality Staffing", "🏨", "Hospitality industry staffing"),
    serviceData("Mobile Food Vendors", "🛵", "Mobile food and beverage vending"),
  ]);

  await createSubServices(eventsEntertainmentServices, [
    serviceData("DJs", "🎧", "DJ and music entertainment"),
    serviceData("Decorators", "🎈", "Event decoration and styling"),
    serviceData("Caterers", "🍽️", "Food service for celebrations"),
    serviceData("Photographers", "📷", "Event and portrait photography"),
    serviceData("Videographers", "🎥", "Event video and filming"),
    serviceData("Filmmakers", "🎬", "Film production services"),
    serviceData("Party Rentals", "🎡", "Party equipment and rentals"),
    serviceData("Security", "🛡️", "Event security services"),
  ]);

  await createSubServices(automotiveServices, [
    serviceData("Mobile Repair", "🔧", "On-site vehicle repair"),
    serviceData("Mechanics", "🛠️", "General auto repair and maintenance"),
    serviceData("Towing", "🚛", "Towing and roadside assistance"),
    serviceData("Detailing", "🧼", "Vehicle detailing and cleaning"),
  ]);

  // The customer-facing catch-all. Picking it in /request collects free text
  // (ServiceRequest.otherServiceText) instead of a sub-service. It is
  // top-level (no parent) and flagged isCatchAll so the picker keys off the
  // flag, not the name.
  const otherService = await db.service.create({
    data: { ...serviceData("Other", "📋", "Any service not listed above — tell us what you need"), featured: true, sortOrder: 7, isCatchAll: true },
  });
  console.log(`  Catch-all service: ${otherService.name} (${otherService.id})`);

  // Admin accounts — the platform operators
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await db.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: adminHash, role: "ADMIN" },
  });
  await db.user.create({
    data: { email: "cammccain9d@gmail.com", passwordHash: adminHash, role: "ADMIN" },
  });

  const vendorHash = vendorPassword ? await bcrypt.hash(vendorPassword, 10) : null;

  let vendor1: { id: string } | undefined;
  let vendor2: { id: string } | undefined;
  let vendor3: { id: string } | undefined;

  if (withVendorDemo && vendorHash) {
  const v1User = await db.user.create({
    data: { email: "john@abcplumbing.com", passwordHash: vendorHash, role: "VENDOR" },
  });
  vendor1 = await db.vendor.create({
    data: {
      userId: v1User.id, businessName: "ABC Plumbing Co.", contactName: "John Smith",
      email: "john@abcplumbing.com", phone: "(555) 111-2222", address: "100 Main St, Anytown, NY 12345",
      status: "APPROVED", licenseInformation: "PL-12345", insuranceInformation: "State Farm", yearsInBusiness: 10,
    },
  });

  const v2User = await db.user.create({
    data: { email: "mike@quickelectric.com", passwordHash: vendorHash, role: "VENDOR" },
  });
  vendor2 = await db.vendor.create({
    data: {
      userId: v2User.id, businessName: "Quick Electric", contactName: "Mike Lee",
      email: "mike@quickelectric.com", phone: "(555) 333-4444", address: "200 Oak Ave, Anytown, NY 12345",
      status: "APPROVED", licenseInformation: "EL-67890", yearsInBusiness: 5,
    },
  });

  const v3User = await db.user.create({
    data: { email: "sarah@greenlawn.com", passwordHash: vendorHash, role: "VENDOR" },
  });
  vendor3 = await db.vendor.create({
    data: {
      userId: v3User.id, businessName: "Green Lawn Care", contactName: "Sarah Green",
      email: "sarah@greenlawn.com", phone: "(555) 555-6666", address: "300 Pine Rd, Anytown, NY 12348",
      status: "APPROVED", yearsInBusiness: 3,
    },
  });

  const v4User = await db.user.create({
    data: { email: "lisa@cleanpro.com", passwordHash: vendorHash, role: "VENDOR" },
  });
  await db.vendor.create({
    data: {
      userId: v4User.id, businessName: "CleanPro Services", contactName: "Lisa White",
      email: "lisa@cleanpro.com", phone: "(555) 777-8888", address: "400 Elm St, Anytown, NY 12345",
      status: "PENDING", yearsInBusiness: 2,
    },
  });

  await db.vendorService.create({ data: { vendorId: vendor1.id, serviceId: plumbing.id } });
  await db.vendorService.create({ data: { vendorId: vendor1.id, serviceId: hvac.id } });
  await db.vendorService.create({ data: { vendorId: vendor2.id, serviceId: electrical.id } });
  await db.vendorService.create({ data: { vendorId: vendor3.id, serviceId: landscaping.id } });

  await db.vendorServiceArea.createMany({ data: [
    { vendorId: vendor1.id, zipCode: "12345" },
    { vendorId: vendor1.id, zipCode: "12346" },
    { vendorId: vendor1.id, zipCode: "12347" },
    { vendorId: vendor2.id, zipCode: "12345" },
    { vendorId: vendor2.id, zipCode: "12347" },
    { vendorId: vendor3.id, zipCode: "12348" },
    { vendorId: vendor3.id, zipCode: "12349" },
  ]});
  }

  // Customers never log in — no usable password is set for their account.
  const custUser = await db.user.create({
    data: { email: "john@email.com", passwordHash: await bcrypt.hash(randomUUID(), 10), role: "CUSTOMER" },
  });
  const customer = await db.customer.create({
    data: {
      userId: custUser.id, firstName: "John", lastName: "Doe",
      email: "john@email.com", phone: "(555) 999-0000", preferredContact: "email",
    },
  });

  const req1 = await db.serviceRequest.create({
    data: {
      customerId: customer.id, serviceId: plumbing.id, zipCode: "12345",
      description: "Leaking water line under kitchen sink needs repair",
      preferredContactMethod: "email", urgency: "NORMAL",
    },
  });

  const req2 = await db.serviceRequest.create({
    data: {
      customerId: customer.id, serviceId: hvac.id, zipCode: "12346",
      description: "AC unit not cooling properly, needs inspection",
      preferredContactMethod: "phone", urgency: "URGENT",
    },
  });

  if (withVendorDemo) {
  const lead1 = await db.lead.create({
    data: { serviceRequestId: req1.id, vendorId: vendor1!.id, status: "WON", sentAt: new Date(), contactedAt: new Date(), closedAt: new Date() },
  });
  await db.project.create({
    data: { leadId: lead1.id, status: "WON", estimatedValue: 450, finalValue: 450, wonDate: new Date() },
  });
  await db.payment.create({
    data: { vendorId: vendor1!.id, leadId: lead1.id, paymentType: "LEAD_FEE", amount: 25, status: "PAID", paymentDate: new Date() },
  });

  await db.lead.create({
    data: { serviceRequestId: req2.id, vendorId: vendor1!.id, status: "NEW" },
  });

  // Sample customer feedback
  await db.customerFeedback.create({
    data: {
      serviceRequestId: req1.id,
      rating: 5,
      hearAbout: "google",
      useAgain: "very_likely",
      recommend: "definitely",
      comment: "Very easy process, found a great plumber quickly!",
    },
  });

  await db.customerFeedback.create({
    data: {
      serviceRequestId: req2.id,
      rating: 3,
      hearAbout: "friend",
      useAgain: "not_sure",
      recommend: "probably",
      comment: null,
    },
  });
  }

  console.log("Seed complete!");
  console.log(`  Admin:  ${ADMIN_EMAIL} (password from SEED_ADMIN_PASSWORD)`);
  if (withVendorDemo) {
    console.log(`  Vendor: ${VENDOR_EMAIL} (password from SEED_VENDOR_PASSWORD) [+ 3 more demo vendors]`);
  } else {
    console.log("  Vendors: none seeded. Pass --with-vendor-demo to re-create the demo vendors.");
  }
  console.log("  (Customers cannot log in — accounts are auto-created from request emails.)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
