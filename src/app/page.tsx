"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorldMap from "./components/WorldMap";

type MapResponse = {
  year: number;
  countries: Record<string, any>;
};

function PageClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialYear = Number(sp.get("year") ?? "2020");
  const initialContinent = sp.get("continent") ?? "";
  const initialGroup = sp.get("group") ?? "";
  const initialCoveredOnly = sp.get("covered_only") === "true";

  const [year, setYear] = useState<number>(initialYear);
  const [continent, setContinent] = useState<string>(initialContinent);
  const [group, setGroup] = useState<string>(initialGroup);
  const [coveredOnly, setCoveredOnly] = useState<boolean>(initialCoveredOnly);

  const [data, setData] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE || "https://api.whogoverns.org";

  const apiUrl = useMemo(() => {
    const u = new URL("/v1/map", apiBase);
    u.searchParams.set("year", String(year));
    if (continent) u.searchParams.set("continent", continent);
    if (group) u.searchParams.set("group", group);
    if (coveredOnly) u.searchParams.set("covered_only", "true");
    return u.toString();
  }, [apiBase, year, continent, group, coveredOnly]);

  // Keep URL shareable
  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("year", String(year));

    if (continent) u.searchParams.set("continent", continent);
    else u.searchParams.delete("continent");

    if (group) u.searchParams.set("group", group);
    else u.searchParams.delete("group");

    if (coveredOnly) u.searchParams.set("covered_only", "true");
    else u.searchParams.delete("covered_only");

    router.replace(u.pathname + u.search, { scroll: false });
  }, [year, continent, group, coveredOnly, router]);

  // Fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(apiUrl)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as MapResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Bandeau haut */}
      <header className="border rounded bg-white p-6 space-y-2">
        <h1 className="text-2xl font-semibold">WhoGoverns</h1>
        <p className="text-sm text-gray-700">
          Visualisez, par année, le parti au pouvoir par pays. La couverture est
          étendue progressivement (V1 : OCDE + UE).
        </p>
      </header>

      {/* Filtres */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border rounded bg-white p-4">
        <div>
          <label className="block text-sm font-medium">Année : {year}</label>
          <input
            className="w-full"
            type="range"
            min={1945}
            max={2025}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Continent</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={continent}
            onChange={(e) => setContinent(e.target.value)}
          >
            <option value="">Monde</option>
            <option value="AF">Afrique</option>
            <option value="EU">Europe</option>
            <option value="NA">Amérique du Nord</option>
            <option value="SA">Amérique du Sud</option>
            <option value="AS">Asie</option>
            <option value="OC">Océanie</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Groupe</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="">Tous</option>
            <option value="EU">UE</option>
            <option value="OECD">OCDE</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={coveredOnly}
            onChange={(e) => setCoveredOnly(e.target.checked)}
          />
          Pays couverts uniquement
        </label>
      </section>

      {/* Status */}
      <section className="border rounded p-4 bg-white">
        {loading && <p>Chargement…</p>}
        {error && <p className="text-red-600">Erreur : {error}</p>}
        {!loading && !error && data && (
          <p className="text-sm text-gray-700">
            Année <b>{data.year}</b> — pays retournés :{" "}
            <b>{Object.keys(data.countries ?? {}).length}</b>
          </p>
        )}
      </section>

      {/* Carte */}
      {data && <WorldMap year={year} countries={data.countries} />}

      {/* Footer */}
      <footer className="border-t pt-6 text-sm text-gray-600">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>© {new Date().getFullYear()} WhoGoverns</div>
          <div className="text-gray-500">V1 : OCDE + UE</div>
        </div>
      </footer>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="p-6">Chargement…</main>}>
      <PageClient />
    </Suspense>
  );
}
