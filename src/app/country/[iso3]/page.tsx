import countriesLib from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countriesLib.registerLocale(en);

type Power = {
  leader_name: string | null;
  coalition: boolean;
  confidence: number | null;
  main_party: {
    id: number;
    name: string;
    abbr: string | null;
  } | null;
  source_id: number | null;
};

type TimelineItem = {
  year: number;
  leader_name: string | null;
  coalition: boolean;
  confidence: number | null;
  main_party: {
    id: number;
    name: string;
    abbr: string | null;
  } | null;
};

type EventItem = {
  id: number;
  date: string;
  title: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "https://api.whogoverns.org";

function clampYear(y: number) {
  return Math.min(2025, Math.max(1945, y));
}

/**
 * Required for `output: "export"` with dynamic routes.
 * We generate pages only for covered countries (V1).
 */
export async function generateStaticParams() {
  // Option A: get list from metadata endpoint if you have it
  // If metadata is not available, fallback to a small list.
  try {
    const res = await fetch(`${apiBase}/v1/metadata/countries`, {
      // build-time fetch: no cache needed
      cache: "no-store",
    });
    if (!res.ok) throw new Error("metadata not available");
    const json = await res.json();

    // Expecting: { countries: [{ iso3, coverage_status, ... }, ...] }
    const list: string[] =
      (json.countries ?? [])
        .filter((c: any) => c?.coverage_status === "available")
        .map((c: any) => String(c.iso3).toUpperCase()) ?? [];

    // Ensure we return unique ISO3
    return Array.from(new Set(list)).map((iso3) => ({ iso3 }));
  } catch {
    // Fallback minimal V1 list (safe)
    return ["FRA", "DEU", "USA", "RWA"].map((iso3) => ({ iso3 }));
  }
}

// Static export can't read query params at runtime reliably,
// so we render a default year page (current year) and keep it simple for V1.
// We'll add a year switcher later via client component if needed.
export default async function CountryPage({
  params,
}: {
  params: { iso3: string };
}) {
  const iso3 = params.iso3.toUpperCase();

  const year = clampYear(new Date().getFullYear());

  const iso2 = countriesLib.alpha3ToAlpha2(iso3);
  const countryName =
    (iso2 &&
      (countriesLib.getName(iso2, "fr") ||
        countriesLib.getName(iso2, "en"))) ||
    iso3;

  const [countryRes, timelineRes, eventsRes] = await Promise.all([
    fetch(`${apiBase}/v1/country/${iso3}?year=${year}&from=${year - 8}&to=${year}`, {
      cache: "no-store",
    }).then((r) => r.json()),
    fetch(`${apiBase}/v1/timeline/${iso3}?from=${year - 8}&to=${year}`, {
      cache: "no-store",
    }).then((r) => r.json()),
    fetch(`${apiBase}/v1/events/${iso3}?from=${year - 8}&to=${year}`, {
      cache: "no-store",
    }).then((r) => r.json()),
  ]);

  const power: Power | null = countryRes.power ?? null;
  const timeline: TimelineItem[] = timelineRes.years ?? [];
  const events: EventItem[] = eventsRes.events ?? [];

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="flex items-center gap-4">
        {iso2 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://flagcdn.com/48x36/${iso2.toLowerCase()}.png`}
            alt=""
            width={48}
            height={36}
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{countryName}</h1>
          <p className="text-sm text-gray-600">Année {year}</p>
        </div>
      </header>

      {/* Power */}
      <section className="border rounded bg-white p-4 space-y-2">
        <h2 className="font-medium">Pouvoir en place</h2>

        {power ? (
          <>
            <p>
              <b>Dirigeant :</b> {power.leader_name ?? "—"}
            </p>
            <p>
              <b>Parti :</b>{" "}
              {power.main_party?.name ?? power.main_party?.abbr ?? "—"}
            </p>
            <p>
              <b>Coalition :</b> {power.coalition ? "Oui" : "Non"}
            </p>
            {power.confidence !== null && (
              <p>
                <b>Confiance :</b> {power.confidence} %
              </p>
            )}
          </>
        ) : (
          <p>Données non disponibles pour cette année.</p>
        )}
      </section>

      {/* Timeline */}
      <section className="border rounded bg-white p-4">
        <h2 className="font-medium mb-3">Évolution récente</h2>

        {timeline.length === 0 ? (
          <p>Aucune donnée disponible.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {timeline.map((t) => (
              <li key={t.year}>
                <b>{t.year}</b> — {t.leader_name ?? "—"} —{" "}
                {t.main_party?.name ?? t.main_party?.abbr ?? "—"}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Events */}
      <section className="border rounded bg-white p-4">
        <h2 className="font-medium mb-3">Événements politiques</h2>

        {events.length === 0 ? (
          <p>Aucun événement renseigné.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id}>
                <b>{e.date}</b> — {e.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
