import { createPlaywrightRouter } from '@crawlee/playwright';
import { Actor, log } from 'apify';
import {saveProduct} from "./db.js";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async (ctx) => {
    if (isProductUrl(ctx.request.url)) return handleProductPage(ctx);
    return handleListingPage(ctx);
});

router.addHandler('PRODUCT', async (ctx) => {
    return handleProductPage(ctx);
});

async function handleListingPage({ page, request, enqueueLinks }) {
    log.info(`Listing page: ${request.url}`);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Accept cookie banner if it appears
    const cookieButton = page.getByRole('button', {
        name: /accept|agree|ok|verstanden|akzeptieren/i,
    });

    if (await cookieButton.first().isVisible().catch(() => false)) {
        await cookieButton.first().click().catch(() => {});
    }

    // Scroll to load lazy content
    await loadAllProducts(page);

    const products = await page.$$eval('a[href*="/s1/product/"]', (links) => {
        const seen = new Set();
        const clean = (value) => (value ?? '').replace(/\s+/g, ' ').trim();

        return links
            .map((a) => {
                const href = a.href;
                const card = a.closest('article, div');

                const text = card?.innerText ?? a.innerText ?? '';

                if (!href || seen.has(href)) return null;
                seen.add(href);

                const priceMatch = text.match(/(?:CHF|Fr\.)\s*([\d’'.-]+)/i)
                    ?? text.match(/([\d’'.-]+)\s*(?:CHF|Fr\.)/i);

                const tbMatch = text.match(/(\d+(?:[.,]\d+)?)\s*TB/i);

                return {
                    title: clean(a.innerText || text.split('\n')[0]),
                    url: href,
                    priceText: priceMatch?.[0] ?? null,
                    priceValueRaw: priceMatch?.[1] ?? null,
                    capacityTb: tbMatch ? Number(tbMatch[1].replace(',', '.')) : null,
                    rawText: text,
                };
            })
            .filter(Boolean)
            .filter((item) => item.title && item.title.length > 5);
    });

    const normalized = products.map((p) => {
        const priceChf = p.priceValueRaw ? parseSwissPrice(p.priceValueRaw) : null;
        return {
            ...p,
            priceChf,
            pricePerTb:
                priceChf && p.capacityTb
                    ? Number((priceChf / p.capacityTb).toFixed(2))
                    : null,
            scrapedAt: new Date().toISOString(),
        };
    });

    log.info(`Loaded ${normalized.length} products`);

    // Enqueue product detail pages (to extract Specifications).
    await enqueueLinks({
        urls: normalized.map((p) => p.url),
        label: 'PRODUCT',
        strategy: 'same-domain',
    });

    // Enqueue next page
    await enqueueLinks({
        selector: 'a[href*="page="], a[aria-label*="Next"], a[rel="next"]',
        strategy: 'same-domain',
    });
}

async function handleProductPage({ page, request }) {
    log.info(`Product page: ${request.url}`);

    await page.waitForLoadState('domcontentloaded');

    // Accept cookie banner if it appears
    const cookieButton = page.getByRole('button', {
        name: /accept|agree|ok|verstanden|akzeptieren/i,
    });

    if (await cookieButton.first().isVisible().catch(() => false)) {
        await cookieButton.first().click().catch(() => {});
    }

    const title = cleanLine(await page.title().catch(() => null));

    let product = {
        url: request.url,
        title,
        scrapedAt: new Date().toISOString(),
        specifications: null,
    };

    // Expand the Specifications accordion, then "show more" if available.
    const specsToggle = page.locator('button#specifications, button[data-test="specifications"]').first();
    if (await specsToggle.isVisible().catch(() => false)) {
        const expanded = await specsToggle.getAttribute('aria-expanded').catch(() => null);
        if (expanded === 'false') await specsToggle.click().catch(() => {});

        const showMore = page.locator('button[data-test="showMoreButton-specifications"]').first();
        if (await showMore.isVisible().catch(() => false)) {
            const showMoreExpanded = await showMore.getAttribute('aria-expanded').catch(() => null);
            if (showMoreExpanded === 'false') {
                await showMore.click().catch(() => {});
                await page.waitForTimeout(1500);
            }
        }

        const specifications = await extractSpecifications(page);

        product = {
            ...product,

            itemNumber: specifications['Item number'] ?? null,
            manufacturer: specifications['Manufacturer'] ?? null,
            manufacturerNo: specifications['Manufacturer No.'] ?? null,
            category: specifications['Category'] ?? null,

            scopeOfApplication: specifications['Scope of application'] ?? null,
            interface: specifications['Interface'] ?? null,
            interfaceVersion: specifications['Interface version'] ?? null,
            formFactor: specifications['Form factor'] ?? null,

            storageCapacityRaw: specifications['Storage capacity'] ?? null,
            capacityTb: parseTb(specifications['Storage capacity']),

            cacheRaw: specifications['Cache'] ?? null,
            cacheMb: parseMb(specifications['Cache']),

            sustainedSpeedHdd: specifications['Sustained Speed HDD'] ?? null,

            maxSpeedRaw: specifications['Max. Speed'] ?? null,
            rpm: parseRpm(specifications['Max. Speed']),

            storageTechnology: specifications['Storage Technology'] ?? null,
            maxWorkloadRate: specifications['Max. Workload Rate'] ?? null,
            mtbf: specifications['MTBF'] ?? null,

            powerConsumptionRaw: specifications['Power consumption'] ?? null,
            powerConsumptionW: parseWatts(specifications['Power consumption']),

            standbyPowerConsumptionRaw: specifications['Power consumption (standby)'] ?? null,
            standbyPowerConsumptionW: parseWatts(specifications['Power consumption (standby)']),

            maxOperatingTemperature: specifications['Maximum operating temperature'] ?? null,
            maxNoiseLevel: specifications['Max. noise level'] ?? null,
            countryOfOrigin: specifications['Country of origin'] ?? null,

            rawSpecifications: specifications,
        };
    } else {
        log.warning(`No Specifications toggle found on ${request.url}`);
    }

    await saveProduct(product);
    await Actor.pushData(product);
}

function isProductUrl(url) {
    return typeof url === 'string' && url.includes('/s1/product/');
}

function cleanLine(value) {
    return value
        ?.replace(/\s+/g, ' ')
        .trim();
}

function parseSwissPrice(value) {
    const normalized = value
        .replace(/[’']/g, '')
        .replace(/-/g, '00')
        .replace(',', '.')
        .replace(/[^\d.]/g, '');

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseTb(value) {
    const match = value?.match(/(\d+(?:[.,]\d+)?)\s*TB/i);
    return match ? Number(match[1].replace(',', '.')) : null;
}

function parseMb(value) {
    const match = value?.match(/(\d+)\s*MB/i);
    return match ? Number(match[1]) : null;
}

function parseRpm(value) {
    const match = value?.match(/(\d+)\s*RPM/i);
    return match ? Number(match[1]) : null;
}

function parseWatts(value) {
    const match = value?.match(/(\d+(?:[.,]\d+)?)\s*W/i);
    return match ? Number(match[1].replace(',', '.')) : null;
}

async function loadAllProducts(page) {
    let previousHref = null;
    let stableRounds = 0;

    while (stableRounds < 3) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        const currentCount = await page.locator('a[href*="/s1/product/"]').count();

        const showMoreLink = page
            .locator('a[aria-label^="Load"][aria-label*="more products"]')
            .first();

        const isVisible = await showMoreLink.isVisible().catch(() => false);

        if (!isVisible) {
            log.info(`No Show more link found. Loaded ${currentCount} product links.`);
            break;
        }

        const href = await showMoreLink.getAttribute('href');

        log.info(`Clicking Show more: ${href}`);

        if (href === previousHref) {
            stableRounds++;
        } else {
            stableRounds = 0;
        }

        previousHref = href;

        await Promise.all([
            page.waitForLoadState('domcontentloaded').catch(() => {}),
            showMoreLink.click(),
        ]);

        await page.waitForTimeout(2000);
    }
}

async function extractSpecifications(page) {
    return await page.evaluate(() => {
        const clean = (v) => (v ?? '').replace(/\s+/g, ' ').trim();

        const normalizeKey = (key) =>
            clean(key)
                .replace(/i$/, '') // removes Digitec info-icon suffix
                .trim();

        const specsButton =
            document.querySelector('button#specifications')
            ?? document.querySelector('button[data-test="specifications"]');

        if (!specsButton) return {};

        const specsRoot =
            specsButton.closest('section')
            ?? specsButton.parentElement
            ?? document.body;

        const rows = Array.from(specsRoot.querySelectorAll('table tbody tr'));

        return rows.reduce((specs, tr) => {
            const tds = tr.querySelectorAll('td');

            const name = normalizeKey(tds[0]?.innerText ?? tds[0]?.textContent);
            const value = clean(tds[1]?.innerText ?? tds[1]?.textContent);

            if (!name || !value) return specs;

            specs[name] = value;
            return specs;
        }, {});
    });
}
