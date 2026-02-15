import cheerio from "cheerio";

export interface IronPlanetListing {
  title: string;
  url: string;
  price?: string;
}

export async function scrapeIronPlanet(): Promise<IronPlanetListing[]> {
  const url =
    "https://www.ironplanet.com/jsp/s/search.ips?kwtag=navbar";

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch IronPlanet: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const listings: IronPlanetListing[] = [];

  // TEMP: log part of the HTML so we can inspect structure
  console.log("IRONPLANET HTML SAMPLE:");
  console.log(html.slice(0, 1500));

  // We'll refine selectors after inspecting structure

  return listings;
}
