"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  year: number;
  countries: Record<string, any>;
};

const SVG_NS = "http://www.w3.org/2000/svg";

export default function WorldMap({ year, countries }: Props) {
  const router = useRouter();
  const [svgMarkup, setSvgMarkup] = useState<string>("");

  // 1) Load SVG text
  useEffect(() => {
    fetch("/maps/world-iso3.svg")
      .then((r) => r.text())
      .then(setSvgMarkup)
      .catch(() => setSvgMarkup(""));
  }, []);

  const countryByIso3 = useMemo(() => countries ?? {}, [countries]);

  // 2) Build a safe SVG string (inject style + ensure sizing)
  const renderedSvg = useMemo(() => {
    if (!svgMarkup) return "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const svg = doc.documentElement;

    // Ensure sizing: fit container
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Add CSS style inside SVG
    const style = doc.createElementNS(SVG_NS, "style");
    style.textContent = `
      .wg-country { cursor: pointer; transition: opacity .12s ease; }
      .wg-country:hover { opacity: .85; }
      .wg-covered { opacity: 1; }
      .wg-not-covered { opacity: .35; }
    `;
    // Insert style as first child
    svg.insertBefore(style, svg.firstChild);

    // Serialize back to string
    return new XMLSerializer().serializeToString(svg);
  }, [svgMarkup]);

  // 3) Click handler (event delegation)
  useEffect(() => {
    const root = document.getElementById("wg-map-root");
    if (!root) return;

    const onClick = (e: any) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      const iso3 = el.getAttribute("id");
      if (!iso3 || iso3.length !== 3) return;

      router.push(`/country/${iso3}?year=${year}`);
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [router, year]);

  // 4) Apply classes + titles after mount/update
  useEffect(() => {
    const container = document.getElementById("wg-map-root");
    if (!container) return;

    const nodes = container.querySelectorAll("path[id], g[id]");
    nodes.forEach((node: Element) => {
      const iso3 = node.getAttribute("id");
      if (!iso3 || iso3.length !== 3) return;

      const data = countryByIso3[iso3];
      const covered = data?.country?.coverage_status === "available";

      node.classList.add("wg-country");
      node.classList.toggle("wg-covered", covered);
      node.classList.toggle("wg-not-covered", !covered);

      const name = data?.country?.name ?? iso3;
      const party =
		data?.power?.main_party?.abbr ||
		data?.power?.main_party?.name ||
		"";
      const titleText = party ? `${name} — ${party} (${year})` : `${name} (${year})`;

      let titleEl = node.querySelector("title") as SVGTitleElement | null;
      if (!titleEl) {
        titleEl = document.createElementNS(SVG_NS, "title") as SVGTitleElement;
        node.insertBefore(titleEl, node.firstChild);
      }
      titleEl.textContent = titleText;
    });
  }, [renderedSvg, countryByIso3, year]);

  if (!svgMarkup) return <div className="border rounded p-4 bg-white">Loading map…</div>;

  return (
    <section className="border rounded p-4 bg-white">
      <div
        id="wg-map-root"
        style={{ width: "100%", height: "600px", overflow: "hidden" }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: renderedSvg }}
      />
    </section>
  );
}
