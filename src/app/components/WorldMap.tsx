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
  iso3: string | null;
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
    iso3: null,
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
      .wg-covered { opacity: 1; }
      .wg-not-covered { opacity: .22; }

      .wg-covered:hover { opacity: .90; }
      .wg-not-covered:hover { opacity: .35; }
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
      const raw = node.getAttribute("id");
      if (!raw) return;

      const iso3 = raw.trim().toUpperCase();
      if (iso3.length !== 3) return;

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

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const positionFromEvent = (e: MouseEvent) => {
      const maxX = window.innerWidth - 340;
      const maxY = window.innerHeight - 120;
      return {
        x: clamp(e.clientX + 12, 8, maxX),
        y: clamp(e.clientY + 12, 8, maxY),
      };
    };

    const hideTooltip = () =>
      setTt((prev) => ({ ...prev, visible: false, iso3: null }));

    const getIso3 = (e: any) => {
      const el = e.target as Element | null;
      if (!el) return null;

      // Remonte jusqu’à l’élément qui porte l’id ISO3
      const withId = el.closest("path[id], g[id]") as Element | null;
      if (!withId) return null;

      const raw = withId.getAttribute("id");
      if (!raw) return null;

      const iso3 = raw.trim().toUpperCase();
      if (iso3.length !== 3) return null;
      return iso3;
    };

    const onPointerMove = (e: PointerEvent) => {
      // Met à jour la position si visible
      if (!tt.visible) return;
      const pos = positionFromEvent(e as unknown as MouseEvent);
      setTt((prev) => ({ ...prev, x: pos.x, y: pos.y }));
    };

    const onPointerOver = (e: PointerEvent) => {
      const iso3 = getIso3(e);
      if (!iso3) return;

      // Si on survole le même pays, ne pas recalculer en boucle
      if (tt.visible && tt.iso3 === iso3) return;

      const data = countryByIso3[iso3];

      // Nom complet : priorité DB, sinon fallback ISO2->name
      let name: string | undefined = data?.country?.name;
      const iso2 = countriesLib.alpha3ToAlpha2(iso3);

      if (!name && iso2) {
        name =
          countriesLib.getName(iso2, "fr") ||
          countriesLib.getName(iso2, "en") ||
          undefined;
      }
      if (!name) name = "Pays";

      const available = data?.country?.coverage_status === "available";

      const leader = data?.power?.leader_name || null;
      const partyName =
        data?.power?.main_party?.name ||
        data?.power?.main_party?.abbr ||
        null;

      const flagUrl = iso2
        ? `https://flagcdn.com/24x18/${iso2.toLowerCase()}.png`
        : null;

      const line2 = available
        ? `${leader ?? "—"} — ${partyName ?? "—"}`
        : "Données en cours de traitement";

      const pos = positionFromEvent(e as unknown as MouseEvent);

      setTt({
        visible: true,
        x: pos.x,
        y: pos.y,
        name,
        flagUrl,
        line2,
        available,
        iso3,
      });
    };

	const onNavigate = (e: PointerEvent) => {
	  const iso3 = getIso3(e);
	  if (!iso3) return;

	  const url = `/country/${iso3}?year=${year}`;

	  // Navigation client si possible, sinon fallback
	  try {
		router.push(url);
	  } catch {
		window.location.assign(url);
	  }
	};

    // Événements : pointer* = plus stable sur SVG
    root.addEventListener("pointermove", onPointerMove as any);
    root.addEventListener("pointerover", onPointerOver as any);
    root.addEventListener("pointerup", onNavigate as any);

    root.addEventListener("mouseleave", hideTooltip);
    window.addEventListener("scroll", hideTooltip, true);

    return () => {
      root.removeEventListener("pointermove", onPointerMove as any);
      root.removeEventListener("pointerover", onPointerOver as any);
      root.removeEventListener("pointerup", onNavigate as any);

      root.removeEventListener("mouseleave", hideTooltip);
      window.removeEventListener("scroll", hideTooltip, true);
    };
    // Important: pas de dépendance sur tt.visible / tt.iso3 pour éviter de réinstaller les listeners
  }, [router, year, countryByIso3]);

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
