"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CountryMapItem = {
  iso3: string;
  name?: string;
  party?: { name?: string; abbr?: string } | null;
  covered?: boolean;
};

type Props = {
  year: number;
  countries: Record<string, any>;
};

export default function WorldMap({ year, countries }: Props) {
  const router = useRouter();
  const [svg, setSvg] = useState<string>("");

  // Load SVG from public/
  useEffect(() => {
    fetch("/maps/world-iso3.svg")
      .then((r) => r.text())
      .then(setSvg)
      .catch(() => setSvg(""));
  }, []);

  const countryByIso3 = useMemo(() => countries ?? {}, [countries]);

  // Inject styling by ISO3 id
  const styledSvg = useMemo(() => {
    if (!svg) return "";

    // simple coloring strategy (V1):
    // - covered countries: colored
    // - not covered: light grey
    // - missing key: very light
    // you can refine later.
    let out = svg;

    // Add a base style block if not present
    if (!out.includes("<style")) {
      out = out.replace(
        "<svg",
        `<svg><style>
          .wg-country { cursor: pointer; transition: opacity .1s ease; }
          .wg-country:hover { opacity: .85; }
          .wg-covered { opacity: 1; }
          .wg-not-covered { opacity: .25; }
        </style>`
      );
    }

    return out;
  }, [svg]);

  // Handle hover/click with event delegation
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

  // After SVG is mounted, apply classes + title tooltips
  useEffect(() => {
    const container = document.getElementById("wg-map-root");
    if (!container) return;

    const paths = container.querySelectorAll("path[id], g[id]");
    paths.forEach((node: Element) => {
      const iso3 = node.getAttribute("id");
      if (!iso3 || iso3.length !== 3) return;

      const data = countryByIso3[iso3];
      const covered = Boolean(data?.covered ?? data?.coverage_status === "covered");

      node.classList.add("wg-country");
      node.classList.toggle("wg-covered", covered);
      node.classList.toggle("wg-not-covered", !covered);

      // tooltip text
      const name = data?.name ?? iso3;
      const party = data?.party?.abbr || data?.party?.name || "";
      const titleText = party ? `${name} — ${party} (${year})` : `${name} (${year})`;

      // ensure a <title> exists
	let titleEl = node.querySelector("title") as SVGTitleElement | null;

	if (!titleEl) {
	  titleEl = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"title"
	  ) as SVGTitleElement;
	  node.insertBefore(titleEl, node.firstChild);
	}

	titleEl.textContent = titleText;
    });
  }, [styledSvg, countryByIso3, year]);

  if (!svg) return <div className="border rounded p-4">Loading map…</div>;

  return (
    <div
      id="wg-map-root"
      className="border rounded bg-white p-2 overflow-auto"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: styledSvg }}
    />
  );
}
