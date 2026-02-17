import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import pLimit from "p-limit";
import { createHash } from "node:crypto";
import { getListingsCollection, type ListingDocument } from "../listings.js";

const BASE_URL = "https://www.ironplanet.com";
const FALLBACK_IMAGE_URL = "https://placehold.co/600x400?text=IronPlanet";
const FETCH_TIMEOUT_MS = 20000;
const CONCURRENCY = 3;
const MAX_LISTINGS = 25;

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

const fetchHtml = async (
  url: string
): Promise<{ html: string; meta: { url: string; status: number; contentType: string } }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const contentType = response.headers.get("content-type")?.trim() ?? "unknown";
    const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
    const meta = {
      url: response.url,
      status: response.status,
      contentType,
    };

    if (!response.ok) {
      let snippet = "";
      if (isHtml) {
        const body = (await response.text()).trim();
        if (body.length > 0) {
          snippet = ` bodySnippet=${JSON.stringify(body.slice(0, 300))}`;
        }
      }

      throw new Error(
        `Failed to fetch HTML: status=${meta.status} url=${meta.url} contentType=${meta.contentType}${snippet}`
      );
    }

    if (!isHtml) {
      throw new Error(`Unexpected content type: status=${meta.status} url=${meta.url} contentType=${meta.contentType}`);
    }

    const html = await response.text();
    return { html, meta };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timed out fetching HTML after ${FETCH_TIMEOUT_MS}ms: url=${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

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

const findLabeledValue = ($: CheerioAPI, labels: string[]): string => {
  const normalizedLabels = labels.map((label) => label.trim().toLowerCase());
  const isMatch = (value: string): boolean => normalizedLabels.includes(value.trim().toLowerCase());

  for (const dt of $("dt").toArray()) {
    const label = $(dt).text().trim();
    if (!isMatch(label)) continue;

    const value = $(dt).next("dd").first().text().trim();
    if (value) return value;
  }

  for (const th of $("th").toArray()) {
    const label = $(th).text().trim();
    if (!isMatch(label)) continue;

    const value = $(th).next("td").first().text().trim();
    if (value) return value;
  }

  for (const node of $("body *").toArray()) {
    const label = $(node).text().trim();
    if (!isMatch(label)) continue;

    const nextSiblingText = $(node).next().first().text().trim();
    if (nextSiblingText) return nextSiblingText;

    const parentNextText = $(node).parent().next().first().text().trim();
    if (parentNextText) return parentNextText;

    const container = $(node).closest("li, tr, .row, .field, .detail, .spec, .attribute, .info");
    if (container.length) {
      const siblingValue =
        container.find("dd, td, .value, [data-value]").first().text().trim() ||
        container.next().find("dd, td, .value, [data-value]").first().text().trim() ||
        container.next().first().text().trim();

      if (siblingValue) return siblingValue;
    }
  }

  return "";
};

const findPrice = ($: CheerioAPI): number | undefined => {
  const labeledValue = findLabeledValue($, ["Current Price", "Price", "Bid", "Winning Bid", "High Bid"]);
  const labeledMatch = labeledValue.match(/(?:US\s*)?\$\s?([\d,.]+(?:\.\d{2})?)/i);
  if (labeledMatch?.[1]) {
    return findNumberInText(labeledMatch[1]);
  }

  const selectorValue =
    $("[itemprop='price']").first().attr("content")?.trim() ||
    $("[itemprop='price']").first().text().trim() ||
    $("[class*='price' i]").first().text().trim();
  const selectorMatch = selectorValue.match(/(?:US\s*)?\$\s?([\d,.]+(?:\.\d{2})?)/i);
  if (selectorMatch?.[1]) {
    return findNumberInText(selectorMatch[1]);
  }

  const text = $("body").text();
  const match = text.match(/\$\s?([\d,.]+(?:\.\d{2})?)/);
  if (!match?.[1]) return undefined;
  return findNumberInText(match[1]);
};

const findHours = ($: CheerioAPI): number | undefined => {
  const labeledValue = findLabeledValue($, ["Hours", "Hour Meter", "Meter Hours", "Usage"]);
  const labeledMatch = labeledValue.match(/([\d,]+(?:\.\d+)?)/);
  if (labeledMatch?.[1]) {
    return findNumberInText(labeledMatch[1]);
  }

  const text = $("body").text();
  const match = text.match(/([\d,]+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
  if (!match?.[1]) return undefined;
  return findNumberInText(match[1]);
};

const findState = ($: CheerioAPI): string => {
  const labeledValue = findLabeledValue($, ["State", "Item Location", "Location"]);
  const labeledMatch = labeledValue.match(/\b([A-Z]{2})\b/);
  if (labeledMatch?.[1]) return labeledMatch[1];

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
  const junkTokens = ["icon", "logo", "pixel", "placeholder", "sprite", "blank"];

  $("img").each((_i: number, el: AnyNode) => {
    const raw = $(el).attr("src") || $(el).attr("data-src");
    if (!raw) return;

    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("data:")) return;

    const absolute = toAbsoluteUrl(trimmed);
    if (!absolute) return;

    const lower = absolute.toLowerCase();
    if (lower.includes(".svg") || junkTokens.some((token) => lower.includes(token))) return;

    images.add(absolute);
  });

  const selected = Array.from(images).slice(0, 5);
  if (selected.length === 0) return [FALLBACK_IMAGE_URL];

  return selected;
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
    description: detail$("meta[name='description']").attr("content")?.trim() ?? firstText(detail$, ["main p", ".description"]),
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
    sellerType: "auction",
    availability: "scheduled_auction",
    photoCount: normalizedImages.length,
    lastSeenAt: nowIso,
    listingUpdatedAt: nowIso,
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

  const listingsForUpsert = listings.map((listing) => {
    const { createdAt, isPublished, status, ...setDoc } = listing;
    // intentionally dropping createdAt/isPublished/status (handled by upsert logic)
    void createdAt;
    void isPublished;
    void status;

    return setDoc;
  });

  const listingsCollection = getListingsCollection();
  return listingsCollection.upsertManyBySourceExternalId("ironplanet", listingsForUpsert);
};

export async function scrapeIronPlanetSearch(searchUrl: string): Promise<IronPlanetScrapeSummary> {
  const { html } = await fetchHtml(searchUrl);
  const $ = cheerio.load(html);

  const listingUrls = new Set<string>();
  $("a[href]").each((_i: number, el: AnyNode) => {
    const href = $(el).attr("href");
    if (!href) return;
    const absolute = toAbsoluteUrl(href);
    if (!absolute || !isListingUrl(absolute)) return;
    listingUrls.add(absolute);
  });

  const limit = pLimit(CONCURRENCY);
  const candidates = Array.from(listingUrls).slice(0, MAX_LISTINGS);

  const listings: Array<IronPlanetScrapedListing | null> = await Promise.all(
    candidates.map((url) =>
      limit(async (): Promise<IronPlanetScrapedListing | null> => {
        try {
          const { html: detailHtml, meta } = await fetchHtml(url);
          const sourceExternalId = extractSourceExternalId(meta.url);
          const now = new Date().toISOString();

          return buildListingDocument(detailHtml, meta.url, sourceExternalId, now);
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
    sampleListings: scrapedListings.slice(0, 10),
  };
}
