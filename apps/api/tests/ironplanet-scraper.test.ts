import { beforeEach, describe, expect, it, vi } from "vitest";
import { scrapeIronPlanetSearch } from "../src/scrapers/ironplanet.js";
import { isValidIronPlanetUrl } from "../src/scrapers/ironplanet.validation.js";

process.env.NODE_ENV = "test";

describe("isValidIronPlanetUrl", () => {
  it("accepts valid ironplanet https urls", () => {
    expect(isValidIronPlanetUrl("https://www.ironplanet.com/for-sale/")).toBe(true);
    expect(isValidIronPlanetUrl("https://ironplanet.com/for-sale/")).toBe(true);
  });

  it("rejects unsafe or non-ironplanet urls", () => {
    expect(isValidIronPlanetUrl("http://www.ironplanet.com/for-sale/")).toBe(false);
    expect(isValidIronPlanetUrl("https://example.com/for-sale/")).toBe(false);
    expect(isValidIronPlanetUrl("https://127.0.0.1/for-sale/")).toBe(false);
    expect(isValidIronPlanetUrl("https://10.0.0.1/for-sale/")).toBe(false);
    expect(isValidIronPlanetUrl("file:///etc/passwd")).toBe(false);
    expect(isValidIronPlanetUrl("https://user:pass@ironplanet.com/for-sale/")).toBe(false);
  });
});

describe("scrapeIronPlanetSearch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("scrapes listings, uses meta description, and filters junk images", async () => {
    const searchUrl = "https://www.ironplanet.com/search";
    const detailUrl1 = "https://www.ironplanet.com/for-sale/first";
    const detailUrl2 = "https://www.ironplanet.com/for-sale/second";

    const searchHtml = `
      <html><body>
        <a href="/for-sale/first">First</a>
        <a href="/for-sale/second">Second</a>
      </body></html>
    `;

    const detailHtml = `
      <html>
        <head><meta name="description" content="Well maintained excavator"></head>
        <body>
          <h1>2020 CAT 320</h1>
          <img src="/images/equipment-main.jpg" />
          <img src="/images/logo.png" />
          <img src="/images/icon-small.jpg" />
          <img src="data:image/png;base64,AAAA" />
          <img src="/images/pixel.gif" />
          <img src="/images/angle-one.jpg" />
          <img src="/images/angle-two.jpg" />
          <img src="/images/angle-three.jpg" />
          <img src="/images/angle-four.jpg" />
          <img src="/images/angle-five.jpg" />
          <img src="/images/angle-six.jpg" />
        </body>
      </html>
    `;

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url === searchUrl) {
        return new Response(searchHtml, { status: 200, headers: { "Content-Type": "text/html" } });
      }

      if (url === detailUrl1 || url === detailUrl2) {
        return new Response(detailHtml, { status: 200, headers: { "Content-Type": "text/html" } });
      }

      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const summary = await scrapeIronPlanetSearch(searchUrl);

    expect(summary.scraped).toBe(2);
    expect(summary.sampleListings).toHaveLength(2);

    const first = summary.sampleListings[0];
    expect(first).toBeDefined();

    const listing = first!;
    expect(listing.description).toBe("Well maintained excavator");

    const images = listing.images;
    expect(images).toBeDefined();

    const listingImages = images!;
    expect(listingImages).toHaveLength(5);
    expect(listingImages.every((image) => image.startsWith("https://www.ironplanet.com/") || image.startsWith("https://placehold.co/"))).toBe(true);
    expect(listingImages.some((image) => image.includes("logo") || image.includes("icon") || image.includes("pixel"))).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("prefers structured fields for hours, state, and price extraction", async () => {
    const searchUrl = "https://www.ironplanet.com/search-structured";
    const detailUrl = "https://www.ironplanet.com/for-sale/structured";

    const searchHtml = `
      <html><body>
        <a href="/for-sale/structured">Structured Listing</a>
      </body></html>
    `;

    const detailHtml = `
      <html>
        <body>
          <h1>2021 CAT 336</h1>
          <dl>
            <dt>Hours</dt><dd>2,345 hrs</dd>
            <dt>State</dt><dd>TX</dd>
            <dt>Current Price</dt><dd>US $12,300</dd>
          </dl>
        </body>
      </html>
    `;

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url === searchUrl) {
        return new Response(searchHtml, { status: 200, headers: { "Content-Type": "text/html" } });
      }

      if (url === detailUrl) {
        return new Response(detailHtml, { status: 200, headers: { "Content-Type": "text/html" } });
      }

      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const summary = await scrapeIronPlanetSearch(searchUrl);
    expect(summary.scraped).toBe(1);
    expect(summary.sampleListings).toHaveLength(1);

    const listing = summary.sampleListings[0]!;
    expect(listing.hours).toBe(2345);
    expect(listing.state).toBe("TX");
    expect(listing.price).toBe(12300);
  });

  it("does not derive price from numeric URL id and filters junk json-ld images", async () => {
    const searchUrl = "https://www.ironplanet.com/search-url-id";
    const detailUrl =
      "https://www.ironplanet.com/for-sale/Excavators-Crawler-Excavators-Arizona/13861836";

    const searchHtml = `
      <html><body>
        <a href="/for-sale/Excavators-Crawler-Excavators-Arizona/13861836">Listing</a>
      </body></html>
    `;

    const detailHtml = `
      <html>
        <body>
          <h1>2022 CAT 349</h1>
          <dl>
            <dt>Current Price</dt><dd>US $12,300</dd>
            <dt>Hours</dt><dd>1,049 hrs</dd>
            <dt>Location</dt><dd>Mesa, Arizona, United States</dd>
          </dl>
          <script type="application/ld+json">
            {"@context":"https://schema.org","@type":"Product","offers":{"price":"13861836"},"image":["https://www.ironplanet.com/images/logo.png","https://example.com/photo1.jpg"]}
          </script>
          <img src="https://www.ironplanet.com/n_images/mpe-avatar-white.png" />
        </body>
      </html>
    `;

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url === searchUrl) {
        return new Response(searchHtml, { status: 200, headers: { "Content-Type": "text/html" } });
      }

      if (url === detailUrl) {
        return new Response(detailHtml, { status: 200, headers: { "Content-Type": "text/html" } });
      }

      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const summary = await scrapeIronPlanetSearch(searchUrl);
    expect(summary.scraped).toBe(1);

    const listing = summary.sampleListings[0]!;
    expect(listing.price).toBe(12300);
    expect(listing.price).not.toBe(13861836);
    expect(listing.hours).toBe(1049);
    expect(listing.state).toBe("AZ");
    expect(listing.images).toContain("https://example.com/photo1.jpg");
    expect(listing.images).not.toContain("https://www.ironplanet.com/n_images/mpe-avatar-white.png");
    expect(listing.imageUrl).toBe("https://example.com/photo1.jpg");
  });
});
