"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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

export default function CountryPage() {
  const { iso3 } = useParams<{ iso3: string }>();
  const sp = useSearchParams();

  const year =
    Number(sp.get("year")) ||
    Math.min(2025, Math.max(1945, new Date().getFullYear()));

  const iso3Upper = iso3.toUpperCase();
  const iso2 = countriesLib.alpha3ToAlpha2(iso3Upper);
  const countryName =
    (iso2 &&
      (countriesLib.getName(iso2, "fr") ||
        countriesLib.getName(iso2, "en"))) ||
    iso3Upper;

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE || "https://api.whogoverns.org";

  const [power, setPower] = useState<Power | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch(
        `${apiBase}/v1/country/${iso3Upper}?year=${year}&from=${
          year - 8
        }&to=${year}`
      ).then((r) => r.json()),
      fetch(
        `${apiBase}/v1/timeline/${iso3Upper}?from=${year - 8}&to=${year}`
      ).then((r) => r.json()),
      fetch(
        `${apiBase}/v1/events/${iso3Upper}?from=${year - 8}&to=${year}`
      ).then((r) => r.json()),
    ])
      .then(([countryRes, timelineRes, eventsRes]) => {
        setPower(countryRes.power ?? null);
        setTimeline(timelineRes.years ?? []);
        setEvents(eventsRes.events ?? []);
      })
      .finally(() => setLoading(false));
  }, [apiBase, iso3Upper, year]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p>Chargement…</p>
      </main>
    );
  }

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
