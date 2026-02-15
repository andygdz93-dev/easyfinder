import * as cheerio from "cheerio";
import { randomUUID } from "crypto";
import pLimit from "p-limit";
import { getListingsCollection } from "../listings.js";

export type IronPlanetScrapedListing = {
  id: string;
  status: "active";
  isPublished: true;
  source: "ironplanet";
  sourceId: string;
  sourceExternalId?: string;
  url: string;
  title: string;
  price?: string;
  location?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
};

const BASE_URL = "https://www.ironplanet.com";

const toAbsoluteUrl = (href: string): string | null => {
  try {
    return new URL(href, BASE_URL).toString();
  } catch {
    return null;
  }
};

const extractSourceId = (url: string): string => {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? pathname;
  } catch {
    return url;
  }
};

const isListingUrl = (url: string): boolean => /\/for-sale\//i.test(url);

const firstText = ($: cheerio.CheerioAPI, selectors: string[]): string => {
  for (const selector of selectors) {
    const value = $(selector).first().text().trim();
    if (value) return value;
  }
  return "";
};

const findPrice = ($: cheerio.CheerioAPI): string | undefined => {
  const text = $("body").text();
  const match = text.match(/\$\s?[\d,.]+(?:\.\d{2})?/);
  return match?.[0]?.trim();
};

const findLocation = ($: cheerio.CheerioAPI): string | undefined => {
  const labels = ["Location", "Item Location"];
  for (const label of labels) {
    const node = $("*:contains('" + label + "')").filter((_i: number, el: any) => $(el).text().trim() === label).first();
    if (!node.length) continue;
    const sibling = node.next().text().trim() || node.parent().next().text().trim();
    if (sibling) return sibling;
  }
  return undefined;
};

const findImages = ($: cheerio.CheerioAPI): string[] => {
  const images = new Set<string>();
  $("img").each((_i: number, el: any) => {
    const raw = $(el).attr("src") || $(el).attr("data-src");
    if (!raw) return;
    const absolute = toAbsoluteUrl(raw);
    if (absolute) images.add(absolute);
  });
  return Array.from(images).slice(0, 5);
};

export async function scrapeIronPlanetSearch(searchUrl: string): Promise<IronPlanetScrapedListing[]> {
  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch search page: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const listingUrls = new Set<string>();
  $("a[href]").each((_i: number, el: any) => {
    const href = $(el).attr("href");
    if (!href) return;
    const absolute = toAbsoluteUrl(href);
    if (!absolute || !isListingUrl(absolute)) return;
    listingUrls.add(absolute);
  });

  const limit = pLimit(3);
  const candidates = Array.from(listingUrls).slice(0, 10);

  const listings: Array<IronPlanetScrapedListing | null> = await Promise.all(
    candidates.map((url) =>
      limit(async (): Promise<IronPlanetScrapedListing | null> => {
        try {
          const detailRes = await fetch(url);
          if (!detailRes.ok) return null;

          const detailHtml = await detailRes.text();
          const detail$ = cheerio.load(detailHtml);

          const title = firstText(detail$, ["h1", "main h1", "title"]);
          if (!title) return null;

          const sourceExternalId = extractSourceId(url);
          const now = new Date().toISOString();

          return {
            id: randomUUID(),
            status: "active",
            isPublished: true,
            source: "ironplanet",
            sourceId: sourceExternalId,
            sourceExternalId,
            url,
            title,
            price: findPrice(detail$),
            location: findLocation(detail$),
            images: findImages(detail$),
            createdAt: now,
            updatedAt: now,
          };
        } catch {
          return null;
        }
      })
    )
  );

  const scrapedListings = listings.filter(
    (listing: IronPlanetScrapedListing | null): listing is IronPlanetScrapedListing => listing !== null
  );

  const listingsCollection = getListingsCollection();
  const existingListings = await listingsCollection.findLiveListings();
  const existingExternalIds = new Set(
    existingListings
      .filter((listing) => listing.source === "ironplanet" && typeof listing.sourceExternalId === "string")
      .map((listing) => listing.sourceExternalId)
  );

  const seenExternalIds = new Set<string>();
  const newListings = scrapedListings.filter((listing) => {
    if (!listing.sourceExternalId) return true;
    if (existingExternalIds.has(listing.sourceExternalId)) return false;
    if (seenExternalIds.has(listing.sourceExternalId)) return false;
    seenExternalIds.add(listing.sourceExternalId);
    return true;
  });

  await listingsCollection.insertMany(newListings);

  return scrapedListings;
}
