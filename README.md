## What does Digitec Product Scraper do?

Digitec Product Scraper extracts **product URLs and full “Specifications”** from product detail pages on [Digitec](https://www.digitec.ch/). Provide one or more listing/category URLs as `startUrls` and the Actor will discover product pages, open each product, and export the complete Specifications tables (including “Key specifications” and any “Show more specifications” content).

Because it runs on the Apify platform, you also get API access to results, scheduling, monitoring, and integrations, plus optional proxy rotation to improve reliability.

## Why use Digitec Product Scraper?

- Build product catalogs enriched with technical data for comparison, analytics, or internal procurement.
- Track spec changes over time (e.g., interface, cache size, rpm, dimensions).
- Export structured data to downstream systems via Apify dataset formats and integrations.

## How to use Digitec Product Scraper

1. Open the Actor in Apify Console.
2. In the **Input** tab, set `startUrls` to a Digitec listing/category page (or multiple pages).
3. (Optional) Tune `maxRequestsPerCrawl` and `maxConcurrency` for speed vs. server load.
4. Run the Actor.
5. Open the **Output** tab and download the dataset (JSON/CSV/Excel/etc.).

## Input

The most important input is:

- `startUrls` (required): Listing/category URLs to start from.

Optional advanced inputs:

- `maxRequestsPerCrawl`: Limit the total number of pages processed.
- `maxConcurrency`: Control parallelism.
- `headless` / `slowMoMillis`: Debugging controls for the browser run.
- `proxyConfiguration`: Configure proxies in Apify Console.

## Output

The Actor stores results in the default dataset. Each product detail record includes the `url`, page `title`, and a `specifications` array grouped by table.

Example (simplified):

```json
{
  "url": "https://www.digitec.ch/en/s1/product/…",
  "title": "Seagate IronWolf Pro (24 TB, 3.5\") - buy at Digitec - Digitec",
  "specifications": [
    {
      "groupTitle": "Key specifications",
      "items": [
        { "name": "Interface", "value": "SATA" },
        { "name": "Interface version", "value": "SATA III" }
      ]
    }
  ],
  "scrapedAt": "2026-05-18T12:00:00.000Z"
}
```

You can download the dataset in various formats such as JSON, HTML, CSV, or Excel.

## Data table

| Field | Type | Description |
| --- | --- | --- |
| `url` | string | Product detail page URL |
| `title` | string | Page title (best-effort) |
| `specifications` | array | Specification groups (tables) with name/value pairs |
| `scrapedAt` | string | ISO timestamp of extraction |

## Pricing / Cost estimation

How much does it cost to scrape Digitec? Cost depends mainly on how many product pages you open and whether you use proxies, because each product requires a browser page load. To reduce compute usage, keep `maxConcurrency` modest, limit `maxRequestsPerCrawl` during testing, and only scrape the categories you need.

## Tips or Advanced options

- If you already have product URLs, you can put product pages directly into `startUrls` (the Actor detects `/s1/product/` URLs).
- If Digitec blocks requests, enable an Apify proxy in `proxyConfiguration` or reduce concurrency.
- For faster iterations, keep `headless: false` and set `slowMoMillis` while debugging locally.

## FAQ, disclaimers, and support

This Actor is intended for scraping publicly available product information. You are responsible for complying with Digitec’s Terms of Service and applicable laws, and for using reasonable rate limits.

If you hit a bug or Digitec changes its markup, open an issue in the Actor’s repository/Issues tab with a sample URL and a short description of what changed.
