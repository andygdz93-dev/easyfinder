import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import pLimit from "p-limit";
import { createHash } from "node:crypto";
import { getListingsCollection, type ListingDocument } from "../listings.js";

const BASE_URL = "https://www.ironplanet.com";
const FALLBACK_IMAGE_URL = "https://placehold.co/600x400?text=IronPlanet";
const SAMPLE_LISTINGS_LIMIT = 10;

export type IronPlanetScrapeSummary = {
  scraped: number;
  upserted: number;
  modified: number;
  matched: number;
  sampleListings: ListingDocument[];
};

type IronPlanetScrapedListing = ListingDocument & {
  source: "ironplanet";
  sourceExternalId: string;
  sourceUrl: string;
  status: "active";
  isPublished: true;
};

const toAbsoluteUrl = (href: string): string | null => {
  try {
    return new URL(href, BASE_URL).toString();
  } catch {
    return null;
  }
};

const hashUrl = (url: string): string => createHash("sha256").update(url).digest("hex").slice(0, 24);

const extractSourceExternalId = (url: string): string => {
  try {
    const parsed = new URL(url);
    const fromQuery =
      parsed.searchParams.get("itemid") ??
      parsed.searchParams.get("id") ??
      parsed.searchParams.get("listingId");
    if (fromQuery) return fromQuery;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const forSaleIndex = parts.findIndex((part) => part.toLowerCase() === "for-sale");
    if (forSaleIndex >= 0 && parts[forSaleIndex + 1]) {
      return parts[forSaleIndex + 1];
    }

    return hashUrl(url);
  } catch {
    return hashUrl(url);
  }
};

const isListingUrl = (url: string): boolean => /\/for-sale\//i.test(url);

const firstText = ($: CheerioAPI, selectors: string[]): string => {
  for (const selector of selectors) {
    const value = $(selector).first().text().trim();
    if (value) return value;
  }
  return "";
};

const findNumberInText = (text: string): number | undefined => {
  const normalized = Number(text.replaceAll(",", ""));
  return Number.isFinite(normalized) ? normalized : undefined;
};

const findPrice = ($: CheerioAPI): number | undefined => {
  const text = $("body").text();
  const match = text.match(/\$\s?([\d,.]+(?:\.\d{2})?)/);
  if (!match?.[1]) return undefined;
  return findNumberInText(match[1]);
};

const findHours = ($: CheerioAPI): number | undefined => {
  const text = $("body").text();
  const match = text.match(/([\d,]+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
  if (!match?.[1]) return undefined;
  return findNumberInText(match[1]);
};

const findState = ($: CheerioAPI): string => {
  const labels = ["State", "Location", "Item Location"];
  for (const label of labels) {
    const node = $("*:contains('" + label + "')")
      .filter((_i: number, el: AnyNode) => $(el).text().trim() === label)
      .first();

    if (!node.length) continue;
    const sibling = node.next().text().trim() || node.parent().next().text().trim();
    if (!sibling) continue;

    const stateMatch = sibling.match(/\b([A-Z]{2})\b/);
    if (stateMatch?.[1]) return stateMatch[1];
  }

  return "";
};

const inferYearFromTitle = (title: string): number | undefined => {
  const match = title.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
};

const inferMakeAndModel = (title: string): { make?: string; model?: string } => {
  const parts = title.split(/\s+/).filter(Boolean);
  if (!parts.length) return {};

  const offset = /^\d{4}$/.test(parts[0] ?? "") ? 1 : 0;
  const make = parts[offset];
  const model = parts[offset + 1];

  return {
    make: make && make.length > 1 ? make : undefined,
    model: model && model.length > 0 ? model : undefined,
  };
};

const findImages = ($: CheerioAPI): string[] => {
  const images = new Set<string>();
  $("img").each((_i: number, el: AnyNode) => {
    const raw = $(el).attr("src") || $(el).attr("data-src");
    if (!raw) return;
    const absolute = toAbsoluteUrl(raw);
    if (absolute) images.add(absolute);
  });

  if (images.size === 0) {
    images.add(FALLBACK_IMAGE_URL);
  }

  return Array.from(images).slice(0, 5);
};

const normalizeImages = (images: string[]): string[] => {
  const normalized = images.filter((image) => image.trim().length > 0);
  const hero = normalized[0] ?? FALLBACK_IMAGE_URL;

  if (normalized.length >= 5) {
    return normalized.slice(0, 5);
  }

  const padded = [...normalized];
  while (padded.length < 5) {
    padded.push(hero);
  }

  return padded;
};

const buildListingDocument = (
  detailHtml: string,
  url: string,
  sourceExternalId: string,
  nowIso: string
): IronPlanetScrapedListing | null => {
  const detail$ = cheerio.load(detailHtml);
  const title = firstText(detail$, ["h1", "main h1", "title"]);
  if (!title) return null;

  const normalizedImages = normalizeImages(findImages(detail$));
  const imageUrl = normalizedImages[0] && normalizedImages[0].trim().length > 0 ? normalizedImages[0] : FALLBACK_IMAGE_URL;
  const { make, model } = inferMakeAndModel(title);

  return {
    id: `ironplanet:${sourceExternalId}`,
    title,
    description: firstText(detail$, ["meta[name='description']", "main p", ".description"]) || "",
    state: findState(detail$),
    price: findPrice(detail$) ?? 0,
    hours: findHours(detail$) ?? 0,
    year: inferYearFromTitle(title),
    make,
    model,
    operable: true,
    is_operable: true,
    category: "other",
    images: normalizedImages,
    imageUrl,
    source: "ironplanet",
    sourceExternalId,
    sourceUrl: url,
    status: "active",
    isPublished: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

const persistIronPlanetListings = async (
  listings: IronPlanetScrapedListing[]
): Promise<{ upserted: number; modified: number; matched: number }> => {
  if (!listings.length) {
    return { upserted: 0, modified: 0, matched: 0 };
  }

  const listingsCollection = getListingsCollection();
  return listingsCollection.upsertManyBySourceExternalId("ironplanet", listings);
};

export async function scrapeIronPlanetSearch(searchUrl: string): Promise<IronPlanetScrapeSummary> {
  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch search page: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const listingUrls = new Set<string>();
  $("a[href]").each((_i: number, el: AnyNode) => {
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
          const sourceExternalId = extractSourceExternalId(url);
          const now = new Date().toISOString();

          return buildListingDocument(detailHtml, url, sourceExternalId, now);
        } catch {
          return null;
        }
      })
    )
  );

  const scrapedListings = listings.filter(
    (listing: IronPlanetScrapedListing | null): listing is IronPlanetScrapedListing => listing !== null
  );

  const { upserted, modified, matched } = await persistIronPlanetListings(scrapedListings);

  return {
    scraped: scrapedListings.length,
    upserted,
    modified,
    matched,
    sampleListings: scrapedListings.slice(0, SAMPLE_LISTINGS_LIMIT),
  };
}
