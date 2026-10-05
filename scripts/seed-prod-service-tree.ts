import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !url.startsWith("libsql")) {
  console.error("Set TURSO_DATABASE_URL to a libsql:// URL");
  process.exit(1);
}
if (!authToken) {
  console.error("Set TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

type Sub = { name: string; icon: string; description: string };
type Category = { name: string; icon: string; description: string; sortOrder: number; subs: Sub[] };

// Mirrors prisma/seed.ts. Finds an existing flat service by name and
// REPARENTS it (keeps id), so existing VendorService/ServiceRequest rows
// keep pointing at valid services and future matching still works.
const CATEGORIES: Category[] = [
  {
    name: "Home Services", icon: "🏡", sortOrder: 1,
    description: "Plumbing, HVAC, electrical, roofing, landscaping, painting, cleaning, handyman, pest control, and more",
    subs: [
      { name: "Plumbing", icon: "🔧", description: "Pipes, faucets, drains, and water heater services" },
      { name: "HVAC", icon: "❄️", description: "Heating, ventilation, and air conditioning" },
      { name: "Electrical", icon: "⚡", description: "Wiring, outlets, panels, and lighting" },
      { name: "Roofing", icon: "🏠", description: "Roof repair, replacement, and inspection" },
      { name: "Landscaping", icon: "🌿", description: "Lawn care, garden design, and outdoor maintenance" },
      { name: "Painting", icon: "🎨", description: "Interior and exterior painting" },
      { name: "Cleaning", icon: "✨", description: "Residential and commercial cleaning services" },
      { name: "Handyman", icon: "🔨", description: "General repairs and home maintenance" },
      { name: "Pest Control", icon: "🐜", description: "Pest control and extermination services" },
      { name: "Appliance Repair", icon: "🔧", description: "Fix and maintain household appliances" },
    ],
  },
  {
    name: "Real Estate & Property Services", icon: "🏢", sortOrder: 2,
    description: "Real estate agents, property managers, home inspectors, appraisers, and more",
    subs: [
      { name: "Real Estate Agents", icon: "🏡", description: "Buying, selling, and listing assistance" },
      { name: "Property Managers", icon: "🏢", description: "Ongoing property and tenant management" },
      { name: "Home Inspectors", icon: "🔍", description: "Pre-purchase and routine home inspections" },
      { name: "Appraisers", icon: "📊", description: "Property valuation and appraisal reports" },
    ],
  },
  {
    name: "Business & Professional Services", icon: "💼", sortOrder: 3,
    description: "Attorneys, bookkeeping, accounting, advertising & marketing, notaries, consulting, writing & editing, and more",
    subs: [
      { name: "Attorneys", icon: "⚖️", description: "Legal advice and representation" },
      { name: "Bookkeeping", icon: "📒", description: "Financial record keeping and reconciliation" },
      { name: "Accounting", icon: "🧮", description: "Tax preparation, payroll, and financial reporting" },
      { name: "Advertising & Marketing", icon: "📣", description: "Campaigns, branding, and promotion" },
      { name: "Notaries", icon: "✍️", description: "Document notarization services" },
      { name: "Consulting", icon: "💡", description: "Expert business and management advice" },
      { name: "Writing & Editing", icon: "✏️", description: "Content writing, proofreading, and editing" },
    ],
  },
  {
    name: "Food, Beverage & Hospitality Services", icon: "🍽️", sortOrder: 4,
    description: "Catering, food trucks, private chefs, bartending, concessions, event staffing, servers, venue support, restaurant services, hospitality staffing, and mobile food vendors",
    subs: [
      { name: "Catering", icon: "🍽️", description: "Event and private catering" },
      { name: "Food Trucks", icon: "🚚", description: "Mobile food truck services" },
      { name: "Private Chefs", icon: "👨‍🍳", description: "In-home private chef services" },
      { name: "Bartending", icon: "🍹", description: "Bartenders for events and venues" },
      { name: "Concessions", icon: "🍿", description: "Concession stands and vendors" },
      { name: "Event Staffing", icon: "👥", description: "Staff for events and venues" },
      { name: "Servers", icon: "🍴", description: "Wait staff for events" },
      { name: "Venue Support", icon: "🏟️", description: "Back-of-house venue support" },
      { name: "Restaurant Services", icon: "🍛", description: "Restaurant and kitchen services" },
      { name: "Hospitality Staffing", icon: "🏨", description: "Hospitality industry staffing" },
      { name: "Mobile Food Vendors", icon: "🛵", description: "Mobile food and beverage vending" },
    ],
  },
  {
    name: "Events & Entertainment", icon: "🎉", sortOrder: 5,
    description: "DJs, decorators, caterers, photographers, videographers, filmmakers, party rentals, security, and more",
    subs: [
      { name: "DJs", icon: "🎧", description: "DJ and music entertainment" },
      { name: "Decorators", icon: "🎈", description: "Event decoration and styling" },
      { name: "Caterers", icon: "🍽️", description: "Food service for celebrations" },
      { name: "Photographers", icon: "📷", description: "Event and portrait photography" },
      { name: "Videographers", icon: "🎥", description: "Event video and filming" },
      { name: "Filmmakers", icon: "🎬", description: "Film production services" },
      { name: "Party Rentals", icon: "🎡", description: "Party equipment and rentals" },
      { name: "Security", icon: "🛡️", description: "Event security services" },
    ],
  },
  {
    name: "Automotive Services", icon: "🚗", sortOrder: 6,
    description: "Mobile repair, mechanics, towing, detailing, and more",
    subs: [
      { name: "Mobile Repair", icon: "🔧", description: "On-site vehicle repair" },
      { name: "Mechanics", icon: "🛠️", description: "General auto repair and maintenance" },
      { name: "Towing", icon: "🚛", description: "Towing and roadside assistance" },
      { name: "Detailing", icon: "🧼", description: "Vehicle detailing and cleaning" },
    ],
  },
];

async function findCategoryByName(name: string) {
  const r = await client.execute(
    `SELECT id FROM "Service" WHERE name = ? AND parentId IS NULL LIMIT 1`,
    [name],
  );
  return r.rows[0] ?? null;
}

async function main() {
  console.log(`Connected to ${url}`);

  for (const cat of CATEGORIES) {
    const existing = await findCategoryByName(cat.name);
    let categoryId: string;

    if (existing) {
      categoryId = String(existing.id);
      await client.execute(
        `UPDATE "Service" SET featured = 1, sortOrder = ?, icon = ?, description = ? WHERE id = ?`,
        [cat.sortOrder, cat.icon, cat.description, categoryId],
      );
      console.log(`KEEP category ${cat.name} (${categoryId})`);
    } else {
      const r = await client.execute(
        `INSERT INTO "Service" (id, name, description, icon, active, featured, sortOrder, parentId, createdAt, updatedAt)
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, 1, 1, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
        [cat.name, cat.description, cat.icon, cat.sortOrder],
      );
      categoryId = String(r.rows[0].id);
      console.log(`NEW  category ${cat.name} (${categoryId})`);
    }

    let i = 1;
    for (const sub of cat.subs) {
      const flat = await client.execute(
        `SELECT id, featured FROM "Service" WHERE name = ? AND parentId IS NULL LIMIT 1`,
        [sub.name],
      );

      if (flat.rows.length > 0) {
        const flatId = String(flat.rows[0].id);
        const isFeatured = Number(flat.rows[0].featured);
        await client.execute(
          `UPDATE "Service" SET parentId = ?, sortOrder = ?, icon = ?, description = ?, featured = ? WHERE id = ?`,
          [categoryId, i, sub.icon, sub.description, isFeatured ? 1 : 0, flatId],
        );
        console.log(`REPARENT ${sub.name} -> ${cat.name} (id kept ${flatId})`);
      } else {
        const existingSub = await client.execute(
          `SELECT id FROM "Service" WHERE name = ? AND parentId = ? LIMIT 1`,
          [sub.name, categoryId],
        );
        if (existingSub.rows.length > 0) {
          console.log(`KEEP   ${sub.name} under ${cat.name}`);
        } else {
          const r = await client.execute(
            `INSERT INTO "Service" (id, name, description, icon, active, featured, sortOrder, parentId, createdAt, updatedAt)
             VALUES (lower(hex(randomblob(16))), ?, ?, ?, 1, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
            [sub.name, sub.description, sub.icon, i, categoryId],
          );
          console.log(`NEW    ${sub.name} under ${cat.name} (${String(r.rows[0].id)})`);
        }
      }
      i++;
    }
  }

  // Deactivate the orphan duplicate "Other" (no references) so vendor/admin
  // service lists don't show it. The referenced "Other" stays untouched.
  const others = await client.execute(`SELECT id FROM "Service" WHERE name = 'Other'`);
  for (const o of others.rows) {
    const vs = await client.execute(`SELECT COUNT(*) c FROM "VendorService" WHERE serviceId = ?`, [String(o.id)]);
    const sr = await client.execute(`SELECT COUNT(*) c FROM "ServiceRequest" WHERE serviceId = ?`, [String(o.id)]);
    if (Number(vs.rows[0].c) === 0 && Number(sr.rows[0].c) === 0) {
      await client.execute(`UPDATE "Service" SET active = 0 WHERE id = ?`, [String(o.id)]);
      console.log(`DEACTIVATE orphan "Other" (${String(o.id)})`);
    }
  }

  const summary = await client.execute(
    `SELECT name, featured, parentId FROM "Service" ORDER BY featured DESC, sortOrder, name`,
  );
  console.log(`\nFinal Service rows (${summary.rows.length}):`);
  for (const s of summary.rows) {
    const indent = s.parentId ? "   " : "";
    console.log(`${indent}${String(s.name)}${Number(s.featured) ? " [featured]" : ""}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });