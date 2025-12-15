"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import countriesLib from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countriesLib.registerLocale(en);

type Props = {
  year: number;
  countries: Record<string, any>;
};

const SVG_NS = "http://www.w3.org/2000/svg";

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  name: string;
  flagUrl: string | null;
  line2: string;
  available: boolean;
};

export default function WorldMap({ year, countries }: Props) {
  const router = useRouter();
  const [svgMarkup, setSvgMarkup] = useState<string>("");

  const [tt, setTt] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    name: "",
    flagUrl: null,
    line2: "",
    available: false,
  });

  useEffect(() => {
    fetch("/maps/world-iso3.svg")
      .then((r) => r.text())
      .then(setSvgMarkup)
      .catch(() => setSvgMarkup(""));
  }, []);

  const countryByIso3 = useMemo(() => countries ?? {}, [countries]);

  const renderedSvg = useMemo(() => {
    if (!svgMarkup) return "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const svg = doc.documentElement;

    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const style = doc.createElementNS(SVG_NS, "style");
    style.textContent = `
      .wg-country { cursor: pointer; transition: opacity .12s ease; }
      .wg-country:hover { opacity: .90; }
      .wg-covered { opacity: 1; }
      .wg-not-covered { opacity: .22; }
    `;
    svg.insertBefore(style, svg.firstChild);

    return new XMLSerializer().serializeToString(svg);
  }, [svgMarkup]);

  // Apply classes (covered / not covered)
  useEffect(() => {
    const container = document.getElementById("wg-map-root");
    if (!container) return;

    const nodes = container.querySelectorAll("path[id], g[id]");
    nodes.forEach((node: Element) => {
      const iso3 = node.getAttribute("id");
      if (!iso3 || iso3.length !== 3) return;

      const data = countryByIso3[iso3];
      const available = data?.country?.coverage_status === "available";

      node.classList.add("wg-country");
      node.classList.toggle("wg-covered", available);
      node.classList.toggle("wg-not-covered", !available);
    });
  }, [renderedSvg, countryByIso3]);

  // Hover + tooltip + click
  useEffect(() => {
    const root = document.getElementById("wg-map-root");
    if (!root) return;

    const getIso3 = (e: any) => {
      const el = e.target as HTMLElement | null;
      if (!el) return null;
      const iso3 = el.getAttribute("id");
      if (!iso3 || iso3.length !== 3) return null;
      return iso3.toUpperCase();
    };

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const onMouseMove = (e: MouseEvent) => {
      if (!tt.visible) return;
      const maxX = window.innerWidth - 340;
      const maxY = window.innerHeight - 120;
      setTt((prev) => ({
        ...prev,
        x: clamp(e.clientX + 12, 8, maxX),
        y: clamp(e.clientY + 12, 8, maxY),
      }));
    };

    const onMouseOver = (e: any) => {
      const iso3 = getIso3(e);
      if (!iso3) return;

      const data = countryByIso3[iso3];
      const name = data?.country?.name ?? iso3;
      const available = data?.country?.coverage_status === "available";

      const leader = data?.power?.leader_name || null;
      const partyName =
        data?.power?.main_party?.name ||
        data?.power?.main_party?.abbr ||
        null;

      const iso2 = countriesLib.alpha3ToAlpha2(iso3);
      const flagUrl = iso2
        ? `https://flagcdn.com/24x18/${iso2.toLowerCase()}.png`
        : null;

      const line2 = available
        ? `${leader ?? "—"} — ${partyName ?? "—"}`
        : "Données en cours de traitement";

      const maxX = window.innerWidth - 340;
      const maxY = window.innerHeight - 120;

      setTt({
        visible: true,
        x: clamp((e as MouseEvent).clientX + 12, 8, maxX),
        y: clamp((e as MouseEvent).clientY + 12, 8, maxY),
        name,
        flagUrl,
        line2,
        available,
      });
    };

    const onMouseOut = (e: any) => {
      const iso3 = getIso3(e);
      if (!iso3) return;
      setTt((prev) => ({ ...prev, visible: false }));
    };

    const onClick = (e: any) => {
      const iso3 = getIso3(e);
      if (!iso3) return;
      router.push(`/country/${iso3}?year=${year}`);
    };

    root.addEventListener("mousemove", onMouseMove as any);
    root.addEventListener("mouseover", onMouseOver);
    root.addEventListener("mouseout", onMouseOut);
    root.addEventListener("click", onClick);

    return () => {
      root.removeEventListener("mousemove", onMouseMove as any);
      root.removeEventListener("mouseover", onMouseOver);
      root.removeEventListener("mouseout", onMouseOut);
      root.removeEventListener("click", onClick);
    };
  }, [router, year, tt.visible, countryByIso3]);

  if (!svgMarkup) {
    return (
      <section className="border rounded p-4 bg-white">
        <div>Chargement de la carte…</div>
      </section>
    );
  }

  return (
    <section className="border rounded p-4 bg-white space-y-3">
      {/* Légende */}
      <div className="flex items-center gap-4 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-gray-700" />
          <span>Données disponibles</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-gray-300" />
          <span>Données en cours</span>
        </div>
      </div>

      {/* Carte */}
      <div
        id="wg-map-root"
        style={{ width: "100%", height: "620px", overflow: "hidden" }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: renderedSvg }}
      />

      {/* Tooltip */}
      {tt.visible && (
        <div
          style={{
            position: "fixed",
            left: tt.x,
            top: tt.y,
            zIndex: 50,
            maxWidth: 320,
          }}
          className="pointer-events-none border rounded bg-white shadow px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2">
            {tt.flagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tt.flagUrl} alt="" width={24} height={18} />
            ) : (
              <div className="w-6 h-[18px] bg-gray-200 rounded" />
            )}
            <div className="font-medium">{tt.name}</div>
          </div>
          <div className="text-gray-700 mt-1">{tt.line2}</div>
        </div>
      )}
    </section>
  );
}
