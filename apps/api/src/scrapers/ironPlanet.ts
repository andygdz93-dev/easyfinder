import cheerio from "cheerio";
import pLimit from "p-limit";

const BASE_URL =
  "https://www.ironplanet.com/jsp/s/search.ips?kwtag=navbar";

export type IronPlanetListing = {
  title: string;
  price?: string;
  location?: string;
  url: string;
};

export async function scrapeIronPlanet(): Promise<IronPlanetListing[]> {
  const res = await fetch(BASE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`IronPlanet fetch failed: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const listings: IronPlanetListing[] = [];

  $(".search-result-item").each((_, el) => {
    const title = $(el).find(".title").text().trim();
    const price = $(el).find(".price").text().trim();
    const location = $(el).find(".location").text().trim();
    const relativeUrl = $(el).find("a").attr("href");

    if (!title || !relativeUrl) return;

    listings.push({
      title,
      price: price || undefined,
      location: location || undefined,
      url: `https://www.ironplanet.com${relativeUrl}`,
    });
  });

  return listings;
}
