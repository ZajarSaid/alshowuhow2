import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

// Slide two of the home page carousel, shown alongside the "Find Trusted Local
// Service Providers" banner.
//
// The gradient, spotlights and vignette live in Hero, which is the single element
// that owns the region's backdrop; repeating them here would double the lighting
// and make the crossfade visible as a brightness step.
//
// English wording is the client's, verbatim; the Spanish is a translation pending
// their sign-off, so treat that string as provisional rather than approved. The
// emphasised show name is split out of the body copy in both locales so the
// <strong> survives translation - the grammar order changes between the two.
// Decorative layers are aria-hidden so screen readers get the copy and nothing else.
export default function TvShowCaption() {
  const { t } = useI18n();

  return (
    <section aria-labelledby="tv-show-title" className="relative py-16 md:py-20 pb-20 md:pb-24">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 ring-1 ring-inset ring-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-white"
          >
            <rect x="2" y="7" width="20" height="13" rx="2.5" />
            <path d="M8 3.5 5.5 7M16 3.5 18.5 7" />
            <path d="M10.2 12.2 14.8 14.8l-4.6 2.6z" fill="currentColor" stroke="none" />
          </svg>
        </span>

        <h2
          id="tv-show-title"
          className="mt-7 text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(255,255,255,0.28)]"
        >
          {t.tvShow.title}
        </h2>

        {/* Luminous rule: fades in from both edges with a bright centre. */}
        <div aria-hidden="true" className="mt-6 flex items-center justify-center">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-white/50" />
          <div className="mx-3 h-1.5 w-1.5 rotate-45 bg-white/70" />
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-white/50" />
        </div>

        {/* text-crimson-light, not text-crimson: the base crimson measures
            2.03:1 on --purple and 1.84:1 on --blue, failing WCAG AA even at
            this size. The light variant is 4.97:1 / 4.52:1. */}
        <p className="mt-6 text-2xl md:text-4xl font-bold tracking-tight text-crimson-light drop-shadow-[0_2px_18px_rgba(255,138,148,0.35)]">
          {t.tvShow.tagline}
        </p>

        {/* max-w-2xl caps the measure. The TV block is now the widest element in
            the hero, and a full-width line at this length is hard to track back
            from - WCAG 1.4.8 wants a line the eye can return to. */}
        <p className="mt-6 text-white/80 text-lg leading-relaxed max-w-2xl mx-auto">
          {t.tvShow.bodyLead}{" "}
          <strong className="text-white">{t.tvShow.bodyHighlight}</strong>{" "}
          {t.tvShow.bodyTail}
        </p>

        <Link
          href="/vendor/register"
          className="group mt-10 inline-flex items-center gap-2 bg-white text-purple font-bold px-9 py-4 rounded-full text-lg shadow-[0_10px_30px_rgba(0,0,0,0.30)] hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(0,0,0,0.38)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          {t.tvShow.cta}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          >
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
