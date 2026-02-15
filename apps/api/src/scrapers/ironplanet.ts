import * as cheerio from "cheerio";
import pLimit from "p-limit";

type IronPlanetListing = {
  source: "ironplanet";
  sourceId: string;
  url: string;
  title: string;
  price?: string;
  location?: string;
  images: string[];
};

const BASE_URL = "https://www.ironplanet.com/jsp/s/search.ips?kwtag=navbar";

const toAbsoluteUrl = (href: string, origin: string) => {
  try {
    return new URL(href, origin).toString();
  } catch {
    return null;
  }
};

const extractSourceId = (url: string) => {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts.at(-1) ?? pathname;
};

const pickPrice = ($: cheerio.CheerioAPI) => {
  const pageText = $("body").text();
  const match = pageText.match(/\$\s?[\d,]+(?:\.\d{2})?/);
  return match?.[0]?.replace(/\s+/g, " ").trim();
};

const pickLocation = ($: cheerio.CheerioAPI) => {
  const locationLabel = $("*:contains('Location')")
    .filter((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      return /^location\b/i.test(text);
    })
    .first();

  if (locationLabel.length) {
    const text = locationLabel.text().replace(/\s+/g, " ").trim();
    const cleaned = text.replace(/^location\s*:?\s*/i, "").trim();
    if (cleaned) return cleaned;

    const next = locationLabel.next().text().replace(/\s+/g, " ").trim();
    if (next) return next;
  }

  return undefined;
};

const parseListing = async (listingUrl: string): Promise<IronPlanetListing | null> => {
  try {
    const res = await fetch(listingUrl);
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $("h1").first().text().replace(/\s+/g, " ").trim() ||
      $("title").first().text().replace(/\s+/g, " ").trim();

    if (!title) return null;

    const imageSet = new Set<string>();
    $("img[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (!src) return;
      const absolute = toAbsoluteUrl(src, listingUrl);
      if (!absolute) return;
      imageSet.add(absolute);
    });

    return {
      source: "ironplanet",
      sourceId: extractSourceId(listingUrl),
      url: listingUrl,
      title,
      price: pickPrice($),
      location: pickLocation($),
      images: Array.from(imageSet).slice(0, 5),
    };
  } catch {
    return null;
  }
};

export async function scrapeIronPlanetSearch(searchUrl: string): Promise<IronPlanetListing[]> {
  try {
    const url = toAbsoluteUrl(searchUrl, BASE_URL);
    if (!url) return [];

    const res = await fetch(url);
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);

    const listingUrls = new Set<string>();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      if (!/\/for-sale\//i.test(href)) return;
      const absolute = toAbsoluteUrl(href, BASE_URL);
      if (!absolute) return;
      listingUrls.add(absolute);
    });

    const candidates = Array.from(listingUrls).slice(0, 10);
    const limit = pLimit(4);
    const results = await Promise.all(candidates.map((item) => limit(() => parseListing(item))));

    return results.filter((item): item is IronPlanetListing => item !== null);
  } catch {
    return [];
  }
}
