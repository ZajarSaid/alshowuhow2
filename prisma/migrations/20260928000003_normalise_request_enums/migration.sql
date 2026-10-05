-- Normalise ServiceRequest enums to the upper-case convention already used by
-- every other status column in this schema (User, Vendor, Lead, Project,
-- Payment are all upper case; ServiceRequest was the only lower-case outlier).
--
-- This was not cosmetic: src/components/dashboard/AdminDashboard.tsx looks up
-- badge colours from a map keyed by the upper-case values, so a lower-case "new"
-- missed the lookup and rendered the generic gray fallback badge.

UPDATE "ServiceRequest" SET "status" = UPPER("status") WHERE "status" <> UPPER("status");
UPDATE "ServiceRequest" SET "urgency" = UPPER("urgency") WHERE "urgency" <> UPPER("urgency");
