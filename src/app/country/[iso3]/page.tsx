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

export async function generateStaticParams() {
  try {
    const res = await fetch(`${apiBase}/v1/metadata/countries`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("metadata not available");
    const json = await res.json();

    const list: string[] = (json.countries ?? [])
      .filter((c: any) => c?.coverage_status === "available" && c?.iso3)
      .map((c: any) => String(c.iso3).trim().toUpperCase())
      .filter((v: string) => v.length === 3);

    const unique = Array.from(new Set(list));
    if (unique.length === 0) throw new Error("empty list");

    return unique.map((iso3) => ({ iso3 }));
  } catch {
    return ["FRA", "DEU", "USA", "RWA"].map((iso3) => ({ iso3 }));
  }
}

export default async function CountryPage({
  params,
}: {
  params?: { iso3?: string };
}) {
  // Defensive: never crash build if params is missing
  const iso3 = String(params?.iso3 ?? "FRA").trim().toUpperCase();

  const year = clampYear(new Date().getFullYear());

  const iso2 = countriesLib.alpha3ToAlpha2(iso3);
  const countryName =
    (iso2 &&
      (countriesLib.getName(iso2, "fr") ||
        countriesLib.getName(iso2, "en"))) ||
    iso3;

  const safeFetchJson = async (url: string) => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  };

  const [countryRes, timelineRes, eventsRes] = await Promise.all([
    safeFetchJson(
      `${apiBase}/v1/country/${iso3}?year=${year}&from=${year - 8}&to=${year}`
    ),
    safeFetchJson(`${apiBase}/v1/timeline/${iso3}?from=${year - 8}&to=${year}`),
    safeFetchJson(`${apiBase}/v1/events/${iso3}?from=${year - 8}&to=${year}`),
  ]);

  const power: Power | null = (countryRes as any)?.power ?? null;
  const timeline: TimelineItem[] = (timelineRes as any)?.years ?? [];
  const events: EventItem[] = (eventsRes as any)?.events ?? [];

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
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
          <p>Données non disponibles.</p>
        )}
      </section>

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
