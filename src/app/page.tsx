import Hero from "@/components/sections/Hero";
import ServiceCategories from "@/components/sections/ServiceCategories";
import HowItWorks from "@/components/sections/HowItWorks";
import Stats from "@/components/sections/Stats";

// Homepage sections are read from the database at request time. Without this,
// `next build` statically prerenders `/` (querying whatever DATABASE_URL the
// build runs against), which breaks deploys before prod schema migrations
// land. Force server-side rendering so `next build` never executes it.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <ServiceCategories />
      <HowItWorks />
    </>
  );
}
