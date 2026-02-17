import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import pLimit from "p-limit";
import { createHash } from "node:crypto";
import { getListingsCollection, type ListingDocument } from "../../listings.js";

const BASE_URL = "https://www.ironplanet.com";
const FALLBACK_IMAGE_URL = "https://placehold.co/600x400?text=IronPlanet";
const FETCH_TIMEOUT_MS = 20000;
const DETAIL_TIMEOUT_MS = 20000;
const CONCURRENCY = 3;
const MAX_LISTINGS = 25;

export type IronPlanetScrapeSummary = {
  scraped: number;
  upserted: number;
  modified: number;
  matched: number;
  sampleListings: ListingDocument[];
};

export type IronPlanetScrapedListing = Omit<ListingDocument, "price" | "hours" | "source"> & {
  price: number | null;
  hours: number | null;
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
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<{ html: string; meta: { url: string; status: number; contentType: string } }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
      throw new Error(`Timed out fetching HTML after ${timeoutMs}ms: url=${url}`);
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

const cleanHtmlToText = (html: string): string => {
  if (!html) return "";

  const normalizedInput = html
    .replace(/<\/?li\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, " ");

  const $ = cheerio.load(normalizedInput);
  const lines: string[] = [];

  $("li").each((_i, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) lines.push(`• ${text}`);
  });

  if (lines.length === 0) {
    const text = $.text().trim();
    return text.replace(/\s+/g, " ");
  }

  return lines.join(" ").replace(/\s+/g, " ").trim();
};


const findNumberInText = (text: string): number | undefined => {
  const normalized = Number(text.replaceAll(",", ""));
  return Number.isFinite(normalized) ? normalized : undefined;
};

const parseCurrency = (text: string): number | undefined => {
  const match = text.match(/(?:\bUS\s*\$|\bUSD\b|\$)\s*([\d,]+(?:\.\d{2})?)/i);
  if (!match?.[1]) return undefined;
  return findNumberInText(match[1]);
};

const US_STATE_MAP: Record<string, string> = {
  al: "AL",
  alabama: "AL",
  ak: "AK",
  alaska: "AK",
  az: "AZ",
  arizona: "AZ",
  ar: "AR",
  arkansas: "AR",
  ca: "CA",
  california: "CA",
  co: "CO",
  colorado: "CO",
  ct: "CT",
  connecticut: "CT",
  de: "DE",
  delaware: "DE",
  fl: "FL",
  florida: "FL",
  ga: "GA",
  georgia: "GA",
  hi: "HI",
  hawaii: "HI",
  id: "ID",
  idaho: "ID",
  il: "IL",
  illinois: "IL",
  in: "IN",
  indiana: "IN",
  ia: "IA",
  iowa: "IA",
  ks: "KS",
  kansas: "KS",
  ky: "KY",
  kentucky: "KY",
  la: "LA",
  louisiana: "LA",
  me: "ME",
  maine: "ME",
  md: "MD",
  maryland: "MD",
  ma: "MA",
  massachusetts: "MA",
  mi: "MI",
  michigan: "MI",
  mn: "MN",
  minnesota: "MN",
  ms: "MS",
  mississippi: "MS",
  mo: "MO",
  missouri: "MO",
  mt: "MT",
  montana: "MT",
  ne: "NE",
  nebraska: "NE",
  nv: "NV",
  nevada: "NV",
  nh: "NH",
  "new hampshire": "NH",
  newhampshire: "NH",
  nj: "NJ",
  "new jersey": "NJ",
  newjersey: "NJ",
  nm: "NM",
  "new mexico": "NM",
  newmexico: "NM",
  ny: "NY",
  "new york": "NY",
  newyork: "NY",
  nc: "NC",
  "north carolina": "NC",
  northcarolina: "NC",
  nd: "ND",
  "north dakota": "ND",
  northdakota: "ND",
  oh: "OH",
  ohio: "OH",
  ok: "OK",
  oklahoma: "OK",
  or: "OR",
  oregon: "OR",
  pa: "PA",
  pennsylvania: "PA",
  ri: "RI",
  "rhode island": "RI",
  rhodeisland: "RI",
  sc: "SC",
  "south carolina": "SC",
  southcarolina: "SC",
  sd: "SD",
  "south dakota": "SD",
  southdakota: "SD",
  tn: "TN",
  tennessee: "TN",
  tx: "TX",
  texas: "TX",
  ut: "UT",
  utah: "UT",
  vt: "VT",
  vermont: "VT",
  va: "VA",
  virginia: "VA",
  wa: "WA",
  washington: "WA",
  wv: "WV",
  "west virginia": "WV",
  westvirginia: "WV",
  wi: "WI",
  wisconsin: "WI",
  wy: "WY",
  wyoming: "WY",
};

const normalizeStateCode = (value: string): string => {
  const compact = value.trim().toLowerCase();
  if (!compact) return "";

  const cleaned = compact.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const direct = US_STATE_MAP[cleaned] ?? US_STATE_MAP[cleaned.replaceAll(" ", "")];
  if (direct) return direct;

  const parts = cleaned.split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const mapped = US_STATE_MAP[parts[i]!];
    if (mapped) return mapped;
  }

  return "";
};

const parseJsonLd = ($: CheerioAPI): Record<string, unknown>[] => {
  const records: Record<string, unknown>[] = [];

  $("script[type='application/ld+json']").each((_i: number, el: AnyNode) => {
    const raw = $(el).text().trim();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") records.push(item as Record<string, unknown>);
        }
        return;
      }

      if (parsed && typeof parsed === "object") {
        const graph = (parsed as Record<string, unknown>)["@graph"];
        if (Array.isArray(graph)) {
          for (const item of graph) {
            if (item && typeof item === "object") records.push(item as Record<string, unknown>);
          }
          return;
        }

        records.push(parsed as Record<string, unknown>);
      }
    } catch {
      // ignore malformed json-ld
    }
  });

  return records;
};

const isJunkImage = (url: string): boolean => {
  const lower = url.toLowerCase();
  if (/\/n_images\/|avatar|ritchielist|logo|placeholder|sprite|blank|icon/i.test(lower)) return true;
  if (lower.endsWith(".gif")) return true;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === "www.ironplanet.com" && parsed.pathname.toLowerCase().startsWith("/images/")) {
      return true;
    }
  } catch {
    // ignore parse failures
  }

  return false;
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

  return "";
};

const findPrice = ($: CheerioAPI, meta: Record<string, unknown>[] = []): number | undefined => {
  const isValidPrice = (value: number | undefined): value is number => typeof value === "number" && value >= 100;

  for (const entry of meta) {
    const offers = entry.offers;
    if (offers && typeof offers === "object" && !Array.isArray(offers)) {
      const offersPrice = (offers as Record<string, unknown>).price;
      if (typeof offersPrice === "string") {
        const parsed = parseCurrency(offersPrice);
        if (isValidPrice(parsed)) return parsed;
      }
    }

    const directPrice = entry.price;
    if (typeof directPrice === "string") {
      const parsed = parseCurrency(directPrice);
      if (isValidPrice(parsed)) return parsed;
    }
  }

  const labeledPriceGroups = [
    ["Buy Now Price", "Buy Now", "Buy-Now Price", "Buy Now price"],
    ["High Offer", "High Bid", "Highest Bid", "High offer"],
    ["Current Price", "Price", "Bid", "Winning Bid", "High Bid"],
  ];

  for (const labels of labeledPriceGroups) {
    const labeledValue = findLabeledValue($, labels);
    const labeledPrice = parseCurrency(labeledValue);
    if (isValidPrice(labeledPrice)) return labeledPrice;
  }

  const selectorValue =
    $("[itemprop='price']").first().attr("content")?.trim() ||
    $("[itemprop='price']").first().text().trim() ||
    $(".price, [class*='price' i], [data-price]").first().text().trim();
  const selectorPrice = parseCurrency(selectorValue);
  if (isValidPrice(selectorPrice)) return selectorPrice;

  const fallbackSources = [
    $("main").text(),
    $("dl").text(),
    $("table").text(),
    $("[class*='price' i], [class*='bid' i], [data-price], [data-bid]").text(),
    $("meta[name='description']").attr("content") ?? "",
  ];

  for (const source of fallbackSources) {
    const fallbackPrice = parseCurrency(source);
    if (isValidPrice(fallbackPrice)) return fallbackPrice;
  }

  return undefined;
};

const findHours = ($: CheerioAPI): number | undefined => {
  const parseHoursFromText = (text: string): number | undefined => {
    const match = text.match(/([\d,]+(?:\.\d+)?)\s*(?:hours?|hrs?)?/i);
    if (!match?.[1]) return undefined;
    return findNumberInText(match[1]);
  };

  const labeledValue = findLabeledValue($, [
    "Hours",
    "Hour Meter",
    "Meter Hours",
    "Usage",
    "Meter Reading",
    "Hour Meter Reading",
    "Meter Reading:",
    "Meter:",
  ]);
  const labeledHours = parseHoursFromText(labeledValue);
  if (labeledHours !== undefined) return labeledHours;

  const fallbackSources = [
    $("main").text(),
    $("dl").text(),
    $("table").text(),
    $("meta[name='description']").attr("content") ?? "",
  ];

  for (const source of fallbackSources) {
    const fallbackMatch = source.match(/(?:meter\s*reading|hour\s*meter|hours?|usage)\D{0,40}([\d,]+(?:\.\d+)?)/i);
    if (!fallbackMatch?.[1]) continue;

    const fallbackHours = findNumberInText(fallbackMatch[1]);
    if (fallbackHours === undefined || fallbackHours <= 72) continue;
    return fallbackHours;
  }

  return undefined;
};

const findState = ($: CheerioAPI, url: string): string => {
  const labeledValue = findLabeledValue($, ["State", "Item Location", "Location"]);
  const labeledState = normalizeStateCode(labeledValue);
  if (labeledState) return labeledState;

  const labels = ["State", "Location", "Item Location"];
  for (const label of labels) {
    const node = $("*:contains('" + label + "')")
      .filter((_i: number, el: AnyNode) => $(el).text().trim() === label)
      .first();

    if (!node.length) continue;
    const sibling = node.next().text().trim() || node.parent().next().text().trim();
    if (!sibling) continue;

    const siblingState = normalizeStateCode(sibling);
    if (siblingState) return siblingState;
  }

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const idIndex = parts.findIndex((part) => /^\d+$/.test(part));
    if (idIndex > 0) {
      const slug = parts[idIndex - 1];
      const token = slug?.split("-").filter(Boolean).pop();
      if (token) {
        const slugState = normalizeStateCode(decodeURIComponent(token));
        if (slugState) return slugState;
      }
    }
  } catch {
    // ignore url parse failures
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
  const scoredCandidates: Array<{ url: string; score: number }> = [];
  const scoreImageUrl = (url: string): number => {
    let score = url.length / 100;
    if (/cdn|cloudfront|images\./i.test(url)) score += 100;
    if (/photo|image|full|large|original/i.test(url)) score += 75;
    if (/\.jpe?g|\.png/i.test(url)) score += 25;
    if (/thumb|small|icon|logo|placeholder/i.test(url)) score -= 120;
    return score;
  };

  for (const entry of parseJsonLd($)) {
    const image = entry.image;
    const candidates: string[] = [];

    if (typeof image === "string") candidates.push(image);
    if (Array.isArray(image)) {
      for (const item of image) {
        if (typeof item === "string") candidates.push(item);
      }
    }

    for (const candidate of candidates) {
      const absolute = toAbsoluteUrl(candidate.trim());
      if (!absolute || isJunkImage(absolute)) continue;
      images.add(absolute);
      scoredCandidates.push({ url: absolute, score: scoreImageUrl(absolute) + 200 });
    }
  }

  const junkTokens = ["icon", "logo", "pixel", "placeholder", "sprite", "blank", "avatar", "ritchielist"];
  const scoredImages: Array<{ url: string; score: number }> = [];

  $("img").each((_i: number, el: AnyNode) => {
    const raw = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
    if (!raw) return;

    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("data:")) return;

    const absolute = toAbsoluteUrl(trimmed);
    if (!absolute) return;

    const lower = absolute.toLowerCase();
    if (lower.includes(".svg") || junkTokens.some((token) => lower.includes(token)) || isJunkImage(lower)) return;

    const dimensions = [$(el).attr("width"), $(el).attr("height")]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value)) as number[];
    const dimensionScore = dimensions.reduce((sum, value) => sum + value, 0);
    const qualityBoost = scoreImageUrl(absolute);

    scoredImages.push({
      url: absolute,
      score: dimensionScore + qualityBoost,
    });
  });

  const selected = [...scoredCandidates, ...scoredImages]
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.url)
    .filter((url, index, arr) => arr.indexOf(url) === index)
    .slice(0, 5);

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
  const jsonLdEntries = parseJsonLd(detail$);
  const title = firstText(detail$, ["h1", "main h1", "title"]);
  if (!title) return null;

  const normalizedImages = normalizeImages(findImages(detail$));
  const imageUrl = normalizedImages.find((image) => image.trim().length > 0 && !isJunkImage(image)) ?? "";
  const { make, model } = inferMakeAndModel(title);
  const rawDescription =
    detail$("meta[name='description']").attr("content")?.trim() ??
    firstText(detail$, ["main p", ".description"]);
  const description = cleanHtmlToText(rawDescription);

  const extractedPrice = findPrice(detail$, jsonLdEntries);
  const price = typeof extractedPrice === "number" && extractedPrice >= 100 ? extractedPrice : null;

  return {
    id: `ironplanet:${sourceExternalId}`,
    title,
    description,
    state: findState(detail$, url),
    price,
    hours: findHours(detail$) ?? null,
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

export async function scrapeIronPlanetDetail(detailUrl: string): Promise<IronPlanetScrapedListing | null> {
  const { html: detailHtml, meta } = await fetchHtml(detailUrl, DETAIL_TIMEOUT_MS);
  const sourceExternalId = extractSourceExternalId(meta.url);
  const now = new Date().toISOString();

  return buildListingDocument(detailHtml, meta.url, sourceExternalId, now);
}
