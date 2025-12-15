import CountryClient from "./CountryClient";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.whogoverns.org";

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

export default function CountryPage({
  params,
}: {
  params: { iso3: string };
}) {
  const iso3 = String(params?.iso3 ?? "FRA").trim().toUpperCase();
  return <CountryClient iso3={iso3} />;
}
