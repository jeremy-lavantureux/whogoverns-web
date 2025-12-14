"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorldMap from "./components/WorldMap";


type MapResponse = {
  year: number;
  countries: Record<string, any>;
  meta?: any;
};

function toBool(v: string | null, fallback = false) {
  if (v === null) return fallback;
  return v === "true" || v === "1";
}

function PageClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const yearFromUrl = Number(sp.get("year") ?? "2020");
  const continentFromUrl = sp.get("continent") ?? "";
  const groupFromUrl = sp.get("group") ?? "";
  const coveredOnlyFromUrl = toBool(sp.get("covered_only"), false);

  const [year, setYear] = useState<number>(yearFromUrl);
  const [continent, setContinent] = useState<string>(continentFromUrl);
  const [group, setGroup] = useState<string>(groupFromUrl);
  const [coveredOnly, setCoveredOnly] = useState<boolean>(coveredOnlyFromUrl);

  const [data, setData] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE!;

  const apiUrl = useMemo(() => {
    const u = new URL("/v1/map", apiBase);
    u.searchParams.set("year", String(year));
    if (continent) u.searchParams.set("continent", continent);
    if (group) u.searchParams.set("group", group);
    if (coveredOnly) u.searchParams.set("covered_only", "true");
    return u.toString();
  }, [apiBase, year, continent, group, coveredOnly]);

  // keep URL shareable
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

  // fetch data
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
          setError(String(e));
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

  const countryCount = data ? Object.keys(data.countries ?? {}).length : 0;

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">WhoGoverns — Map (V1 debug)</h1>
        <p className="text-sm text-gray-600">
          API: <span className="font-mono">{apiUrl}</span>
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium">Year: {year}</label>
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
            <option value="">All</option>
            <option value="AF">Africa</option>
            <option value="EU">Europe</option>
            <option value="NA">North America</option>
            <option value="SA">South America</option>
            <option value="AS">Asia</option>
            <option value="OC">Oceania</option>
            <option value="AN">Antarctica</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Group</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="">All</option>
            <option value="EU">EU</option>
            <option value="OECD">OECD</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={coveredOnly}
            onChange={(e) => setCoveredOnly(e.target.checked)}
          />
          Covered only
        </label>
      </section>

      <section className="border rounded p-4 bg-white">
        {loading && <p>Loading…</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {!loading && !error && data && (
          <p className="text-sm text-gray-700">
            Loaded year <b>{data.year}</b> — countries returned: <b>{countryCount}</b>
          </p>
        )}
      </section>

		{/* World map */}
		{data && (
		  <section className="border rounded p-4 bg-white">
			<WorldMap year={year} countries={data.countries} />
		  </section>
		)}


      <section className="border rounded p-4 bg-gray-50">
        <h2 className="font-medium mb-2">Raw response (debug)</h2>
        <pre className="text-xs overflow-auto">
          {data ? JSON.stringify(data, null, 2) : "No data"}
        </pre>
      </section>

      <footer className="border-t pt-4 text-sm text-gray-600">
        <div className="border rounded p-3 bg-white">
          Ad placeholder (V1) — will be replaced by a discreet banner.
        </div>
      </footer>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="p-6">Loading…</main>}>
      <PageClient />
    </Suspense>
  );
}
