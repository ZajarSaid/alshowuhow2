import type { Locale } from "./config";

/**
 * TEMPORARY. Spanish names for the seven featured service categories.
 *
 * Service names and descriptions live in the `Service` table because they are
 * admin-editable at runtime. That is correct for one language and wrong for two:
 * a single `name` column cannot hold both "Home Services" and "Servicios para el
 * Hogar". The real fix is a `ServiceTranslation(serviceId, locale, name,
 * description)` side table read by a locale-aware query - already recommended, and
 * out of scope for a language-switch demo.
 *
 * So this map stands in for that table. It is keyed by service id rather than by
 * English name on purpose: ids are stable when an admin renames a category, whereas
 * a name-keyed map would silently revert to English the first time someone edits
 * the catalogue in the admin panel.
 *
 * Delete this file and the lookup in ServiceCategories when the translation table
 * lands. Nothing else should need to change: the component only needs `name` to
 * come from somewhere locale-aware.
 */
const SPANISH_BY_SERVICE_ID: Record<string, string> = {
  cmumond650000s59tnanaeevj: "Servicios para el Hogar",
  cmumond660001s59tuqk9kqjd: "Servicios de Bienes Raíces y Propiedades",
  cmumond660002s59tqwmzodkh: "Servicios Corporativos y Profesionales",
  cmumond660003s59te97vvl2v: "Servicios de Comida, Bebidas y Hospitalidad",
  cmumond660004s59tqugphwl2: "Eventos y Entretenimiento",
  cmumond660005s59tiqqtoeva: "Servicios Automotrices",
  cmumond9z001es59tqqkz3lbp: "Otro",
};

/**
 * Returns the name for the active locale, falling back to the database's English
 * value whenever there is no translation - which includes the 44 sub-services, none
 * of which are translated yet. A category showing English on a Spanish page is the
 * expected state of this demo, not a bug.
 */
export function localizeServiceName(
  locale: Locale,
  service: { id: string; name: string },
): string {
  if (locale === "en") return service.name;
  return SPANISH_BY_SERVICE_ID[service.id] ?? service.name;
}
