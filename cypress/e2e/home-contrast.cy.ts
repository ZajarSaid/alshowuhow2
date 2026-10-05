// Whole-page colour contrast audit.
//
// Why this shape, after two earlier attempts:
//   1. As a component test it measured nothing. Cypress mounts into a bare
//      HTML shell with no stylesheet, so every computed style fell back to
//      browser defaults (black text, default link blue).
//   2. Importing globals.css from a spec fails outright, because Tailwind v4's
//      `@import "tailwindcss"` is not resolvable by Cypress's webpack.
//   3. A purely static version of this check was simply wrong: it looked for
//      the string "text-crimson" beside a gradient class in a component file,
//      which flagged HowItWorks (a crimson label on white at 5.53:1, perfectly
//      readable) and would miss any case whose background is more than one
//      element away.
//
// So this visits the real page, where the real cascade has run, and reads real
// computed colours. Colours are normalised through a canvas rather than parsed
// out of the CSS text, because Tailwind v4 emits oklab()/oklch()/color-mix(),
// and Chrome serialises colour-mix() results as fractional rgb(0.99, 0.04, ...)
// values which are 0-1, not 0-255. Parsing those as 0-255 makes every element
// look black and reports confident nonsense.
// Colours must not be parsed out of the CSS text. Tailwind v4 emits oklab()
// for its opacity modifiers and colour-mixes, so `text-white/80` computes to
// `oklab(0.999994 0.0000455677 0.0000200868 / 0.8)` — three near-zero numbers
// that look like black if read as sRGB. Reading those numerically reported
// confident nonsense. Instead each colour is rasterised onto a 1x1 canvas and
// the pixel read back, which the browser converts into real sRGB whatever
// space it started in.
describe("home page colour contrast audit", () => {
  const luminance = (rgb: number[]) => {
    const srgb = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
  };

  const ratio = (a: number[], b: number[]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it("renders no text that fails its WCAG AA threshold", () => {
    const violations: string[] = [];
    let checked = 0;
    let unresolvable = 0;

    const auditWindow = (win: Cypress.AUTWindow) => {
      const doc = win.document;
      const ctx = doc.createElement("canvas").getContext("2d")!;
      ctx.canvas.width = 1;
      ctx.canvas.height = 1;

      // Rasterise a colour to true sRGB 0-255, optionally compositing it over
      // another colour first (source-over), exactly as the page paints it.
      const raster = (color: string, alpha: number, under?: string): number[] => {
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, 1, 1);
        if (under) {
          ctx.fillStyle = under;
          ctx.fillRect(0, 0, 1, 1);
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2]];
      };

      // Alpha is the one thing a canvas will not tell us, so read it from the
      // serialised value: `oklab(L a b / 0.8)` or `rgba(r, g, b, 0.8)`.
      const alphaOf = (value: string) => {
        if (value.includes("/")) {
          const a = parseFloat(value.split("/").pop()!.replace(")", ""));
          if (!Number.isNaN(a)) return a;
        }
        const fn = value.match(/rgba?\(([^)]+)\)/);
        if (fn) {
          const parts = fn[1].split(/[,\s/]+/).map(parseFloat);
          if (parts.length === 4 && !Number.isNaN(parts[3])) return parts[3];
        }
        return 1;
      };

      // Colour stops can be rgb(), oklab(), oklch(), lab(), color() or hex.
      const COLOR_FN = /(?:rgba?|oklab|oklch|hsla?|lab|lch|color)\([^)]*\)|#[0-9a-f]{3,8}/gi;

      for (const el of Array.from(doc.body.querySelectorAll("*"))) {
        const node = el as HTMLElement;

        const text = Array.from(node.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => (n.textContent ?? "").trim())
          .filter(Boolean)
          .join(" ");
        if (!text) continue;

        // Decorative layers carry no content, so they are out of scope.
        if (node.closest("[aria-hidden='true']")) continue;

        // Emoji glyphs are colour bitmaps painted by the font, not text
        // colour: the computed `color` says nothing about how they render.
        if (!/[\p{L}\p{N}]/u.test(text)) continue;

        const style = win.getComputedStyle(node);
        if (style.visibility === "hidden" || style.display === "none") continue;
        if (parseFloat(style.opacity) === 0) continue;

        // Both banners are always painted now, so there is no inactive group to
        // skip. This filter used to read
        //   node.closest("[data-slide]")?.getAttribute("data-slide") !== "active"
        // to drop the crossfaded-out slide, whose descendants keep full computed
        // opacity even though nothing is drawn. That comparison also rejected every
        // node *outside* a slide, so once the carousel was removed it skipped the
        // entire page and the audit reported zero violations because it measured
        // nothing. Keeping the assertion below is what stops that recurring quietly.

        // An alpha here is normal and expected: Tailwind's `text-white/80` is
        // 80% white and must be composited over its background before it can be
        // compared. Discarding it would skip most of the body copy.
        const fg = style.color;
        if (!fg) {
          unresolvable += 1;
          continue;
        }

        // Resolve the effective background: the nearest opaque colour, or the
        // gradient image's colour stops when a gradient paints the box.
        // Kept as colour strings, not parsed numbers, so the canvas resolves
        // whatever colour space each one is expressed in.
        const candidates: string[] = [];
        let cursor: HTMLElement | null = node;
        while (cursor) {
          const s = win.getComputedStyle(cursor);
          const image = s.backgroundImage;
          if (image && image !== "none" && image.includes("gradient")) {
            // A gradient interpolates between its stops, so the extremes are
            // the worst cases. Sibling overlay layers are not composited here,
            // making this a floor on the real contrast rather than a ceiling.
            for (const stop of image.match(COLOR_FN) ?? []) {
              if (alphaOf(stop) >= 1) candidates.push(stop);
            }
            break;
          }
          const bg = s.backgroundColor;
          if (bg && bg !== "transparent" && alphaOf(bg) >= 1) {
            candidates.push(bg);
            break;
          }
          cursor = cursor.parentElement;
        }

        if (candidates.length === 0) continue; // nothing painted behind it

        // WCAG AA: 3:1 for large text, 4.5:1 otherwise.
        const size = parseFloat(style.fontSize);
        const weight = parseInt(style.fontWeight, 10) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const required = large ? 3 : 4.5;

        // Rasterise both the background and the text composited over it, so
        // opacity modifiers are measured as actually painted, then take the
        // worst case across candidate backgrounds.
        const worst = candidates
          .map((bg) => {
            const bgRgb = raster(bg, 1);
            // Alpha comes from the colour string itself. Passing it again as
            // globalAlpha would apply it twice (0.6 of a 60% colour), which
            // reported dark-text/60 on white as a false 2.16:1 failure.
            const over = raster(fg, 1, bg);
            return { bg, r: ratio(over, bgRgb) };
          })
          .sort((a, b) => a.r - b.r)[0];

        checked += 1;
        if (worst.r < required) {
          violations.push(
            `${required}:1 required (${large ? "large" : "normal"}, ${size}px/${weight}) ` +
              `got ${worst.r.toFixed(2)}:1 "${text.slice(0, 44)}" ` +
              `fg=${fg} bg=${worst.bg}`,
          );
        }
      }
    };

    // The two banners share one carousel, so only one slide is on screen at a
    // time. Auditing a single pass would only cover whichever slide happened to
    // be active when the page loaded, so each slide is audited in turn.
      const auditCurrentSlide = (label: string) => {
      const checkedBefore = checked;
      cy.window().then((win) => {
        auditWindow(win);
        // Without these floors the test would pass on an unstyled page.
        expect(checked - checkedBefore, `no text elements were audited (${label})`).to.be.greaterThan(4);
        expect(unresolvable, `text whose colour could not be resolved (${label})`).to.eq(0);
      });
    };

    // Both banners share one hero and are visible at once, so one visit covers the
    // whole region - there is no carousel left to drive.
    cy.visit("/");
    cy.get("#tv-show-title").should("be.visible");
    auditCurrentSlide("hero, English");

    // Same audit on the Spanish page. Spanish runs longer, so it wraps onto more
    // lines and each line lands on a different part of the gradient. The colours are
    // shared; the geometry is not, so it has to be walked rather than assumed.
    cy.setCookie("site_locale", "es");
    cy.visit("/");
    cy.get("html").should("have.attr", "lang", "es-US");
    cy.get("#tv-show-title").should("be.visible");
    auditCurrentSlide("hero, Spanish");

    cy.then(() => {
      expect(violations, `contrast violations:\n  ${violations.join("\n  ")}`).to.deep.eq([]);
    });
  });

  it("keeps both banners wired up for assistive technology", () => {
    cy.visit("/");
    cy.get('section[aria-labelledby="hero-heading"]').should("exist");
    cy.get('section[aria-labelledby="tv-show-title"]').should("exist");
    // Both are visible on arrival now; nothing has to be activated to see either.
    cy.get("h1#hero-heading").should("be.visible");
    cy.get("#tv-show-title").should("be.visible");
    // Heading order: the h1 is the service line and comes first, so a screen reader
    // navigating by heading meets the page's promise before the TV block.
    cy.get("h1#hero-heading").then(($h1) => {
      cy.get("h2#tv-show-title").then(($h2) => {
        // DOCUMENT_POSITION_FOLLOWING === 4.
        const h1PrecedesH2 = Boolean($h1[0].compareDocumentPosition($h2[0]) & 4);
        expect(h1PrecedesH2, "TV heading follows the h1").to.equal(true);
      });
    });

    // The landmarks must survive translation, even though the copy changes.
    cy.setCookie("site_locale", "es");
    cy.visit("/");
    cy.get('section[aria-labelledby="hero-heading"]').should("exist");
    cy.get('section[aria-labelledby="tv-show-title"]').should("exist");
    cy.get("h1#hero-heading").should("be.visible").and("contain.text", "Encuentra Proveedores");
    cy.get("#tv-show-title").should("be.visible");
  });
});
