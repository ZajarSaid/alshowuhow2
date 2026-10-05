import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// Brand spelling guard.
//
// ALshowUhow is the one canonical spelling, agreed as the source of truth. The
// codebase had grown four variants (ALshowUhow, ALShowUHow, ALSHOWUHOW,
// Alshowuhow) with a single wrong one leaking into user-visible copy: a How it
// Works step read "ALShowUHow will find the right vendor". Typos in a brand name
// are the kind of defect that survives review forever, because nothing crashes
// and no test fails.
//
// This makes it a failure instead.
//
// Deliberately NOT rewritten, because they are identifiers rather than prose and
// changing them would break things:
//   - the domain alshowuhow.com and its subdomains
//   - email addresses such as admin@alshowuhow.com
//   - the npm package name, which must stay lowercase
//   - the seeded admin password
const CANONICAL = "ALshowUhow";

const SRC = resolve(__dirname, "..", "src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });

// Email addresses and bare domains are identifiers, not brand prose. Strip them
// first so the check only ever looks at words a person would read on screen.
//
// Cookie and storage keys count as identifiers for the same reason: they are never
// displayed, and they conventionally use whatever casing the platform prefers. The
// locale cookie is "site_locale" partly so that lowering the brand into a key does
// not trip this guard.
const IDENTIFIER =
  /\S*@\S*alshowuhow\.\S*|\S*alshowuhow\.[a-z]{2,}\S*|\S*ALSHOWUHOW[A-Z_]*\.txt\s*|alshowuhow@[\S]+|["'`][a-z0-9_]*alshowuhow[a-z0-9_]*["'`]/gi;

// Matches any casing of the brand, with or without spacing between the words,
// so ALshowUhow, ALShowUHow, ALSHOWUHOW and "Al show Uhow" are all caught.
const BRAND = /al\s*show\s*u?\s*how/gi;

describe("brand spelling", () => {
  const files = walk(SRC);
  // Without this the scan could silently cover zero files and always pass.
  it("has source files to scan", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it(`spells the brand "${CANONICAL}" everywhere in src/`, () => {
    const wrong: string[] = [];
    const seen = new Set<string>();
    let canonical = 0;

    for (const file of files) {
      const relative = file.slice(SRC.length + 1);
      const source = readFileSync(file, "utf8").replace(IDENTIFIER, " ");

      for (const match of source.matchAll(BRAND)) {
        seen.add(match[0]);
        if (match[0] === CANONICAL) {
          canonical += 1;
        } else {
          const line = source.slice(0, match.index).split("\n").length;
          wrong.push(`${relative}:${line} -> "${match[0]}"`);
        }
      }
    }

    // If the pattern ever stops matching, the assertion below would pass
    // vacuously, so require it to actually have found the brand.
    expect(canonical, "no canonical mentions were scanned").toBeGreaterThan(20);
    expect([...seen], "every spelling scanned, for visibility").to.deep.eq([CANONICAL]);
    expect(wrong, `non-canonical brand spellings:\n  ${wrong.join("\n  ")}`).to.deep.eq([]);
    // Reads and re-scans every file under src/; the default 5s budget is not
    // enough once the suite runs its files in parallel.
  }, 20_000);

  it("keeps the display name in metadata and alt text", () => {
    // The logo is an image, so its alt text is the brand's only textual
    // representation on every page header.
    const metadata = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");
    expect(metadata).toContain(CANONICAL);

    for (const file of walk(join(SRC, "components")).filter((f) => f.endsWith(".tsx"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/alt="([^"]*)"/g)) {
        if (/al\s*show\s*u?\s*how/i.test(match[1])) {
          expect(match[1], `${file} alt text`).toBe(CANONICAL);
        }
      }
    }
  });
});
