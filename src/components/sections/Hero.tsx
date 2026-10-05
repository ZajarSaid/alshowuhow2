"use client";

import Link from "next/link";
import TvShowCaption from "./TvShowCaption";
import { useI18n } from "@/lib/i18n/context";

// One hero, both banners, TV show dominant.
//
// This used to be a two-slide carousel that crossfaded every 5s, which meant each
// banner got half the attention and neither was reliably seen - the exact opposite
// of what the TV show needs. Both are now always visible, stacked in DOM order so
// the h1 comes before the h2, with the TV block given the larger type and the
// spotlight. That also removes the timer, the dots and the pause control, and with
// them the WCAG 2.2.2 pause affordance, since there is nothing left to pause.
//
// Wording is unchanged. The two-tone heading and the crimson-light tagline are
// load-bearing: --crimson measures 2.03:1 on --purple and 1.84:1 on --blue, failing
// WCAG AA at these sizes, so the light variant has to stay.
export default function Hero() {
  const { t } = useI18n();

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative bg-gradient-to-br from-purple via-brand-blue to-brand-blue-dark text-white overflow-hidden"
    >
      {/* The highlight sits low (62% down) rather than at the top, so the light
          falls on the TV block instead of the lead-in above it. That bias is what
          makes the eye land there first. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_62%,rgba(255,255,255,0.30),transparent_70%)]" />
        <div className="absolute -left-32 -top-24 h-[34rem] w-[34rem] rounded-full bg-light-purple/20 blur-3xl" />
        <div className="absolute -right-32 -top-24 h-[34rem] w-[34rem] rounded-full bg-brand-blue/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(23,16,48,0.55)_100%)]" />
      </div>

      {/* The service proposition stays the h1: it is what the page ranks for, and
          heading level and visual size do not have to match. It is deliberately a
          step smaller than the TV title below it so the TV block wins the eye. */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 text-center">
        <h1 id="hero-heading" className="text-2xl md:text-4xl font-bold mb-5 leading-tight">
          {t.hero.slideOneTitleLead}{" "}
          <span className="text-crimson-light">{t.hero.slideOneTitleAccent}</span>
        </h1>

        <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          {t.hero.slideOneBody}
        </p>

        <div className="flex justify-center">
          <Link
            href="/request"
            className="bg-crimson hover:bg-crimson-dark text-white px-8 py-4 rounded-lg font-bold text-base md:text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            {t.hero.ctaService}
          </Link>
        </div>
      </div>

      {/* Separator between the two banners. TvShowCaption has one of its own
          between its tagline and body; this one marks the join between the two
          styles so they read as two blocks rather than one long page. */}
      <div aria-hidden="true" className="relative mt-16 md:mt-20 flex items-center justify-center">
        <div className="h-px w-24 bg-gradient-to-r from-transparent to-white/50" />
        <div className="mx-3 h-1.5 w-1.5 rotate-45 bg-white/70" />
        <div className="h-px w-24 bg-gradient-to-l from-transparent to-white/50" />
      </div>

      <TvShowCaption />
    </section>
  );
}
