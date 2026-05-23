import {Actor, log} from "apify";
import {saveProduct} from "../db.js";
import {acceptCookies, cleanLine} from "../utils.js";

export async function handleDigitecListingPage({ page, request, enqueueLinks }) {
    log.info(`Listing page: ${request.url}`);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await acceptCookies(page);

    // Scroll to load lazy content
    await loadAllProducts(page);

    const productUrls = [
        ...new Set(
            await page.$$eval(
                'a[href*="/s1/product/"]',
                links => links.map(a => a.href),
            ),
        ),
    ];

    log.info(`Loaded ${productUrls.length} products`);

    // Enqueue product detail pages (to extract Specifications).
    await enqueueLinks({
        urls: productUrls,
        label: 'digitec-product',
        strategy: 'same-domain',
    });
}

export async function handleDigitecProductPage({ page, request }) {
    log.info(`Product page: ${request.url}`);

    await page.waitForLoadState('domcontentloaded');

    await acceptCookies(page);

    const title = cleanLine(await page.title().catch(() => null));

    const productDetail = page.locator('.productDetail').first();

    let priceChf = await productDetail.innerText();
    priceChf = parseSwissPrice(priceChf.match(/(?:CHF|Fr\.)\s*([\d’'.-]+)/i)[0]);

    let product = {
        source: 'digitec',
        url: request.url,
        title,
        scrapedAt: new Date().toISOString(),
        specifications: null,

        priceChf,
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

        const capacityTb = parseTb(specifications['Storage capacity']);

        product = {
            ...product,

            pricePerTb: Number((priceChf / capacityTb).toFixed(2)),

            itemNumber: specifications['Item number'] ?? null,
            manufacturer: specifications['Manufacturer'] ?? null,
            manufacturerNo: specifications['Manufacturer No.'] ?? null,
            category: specifications['Category'] ?? null,

            scopeOfApplication: specifications['Scope of application'] ?? null,
            interface: specifications['Interface'] ?? null,
            interfaceVersion: specifications['Interface version'] ?? null,
            formFactor: specifications['Form factor'] ?? null,

            storageCapacityRaw: specifications['Storage capacity'] ?? null,
            capacityTb: capacityTb,

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

function parseSwissPrice(value) {
    const normalized = value
        .replace(/[’']/g, '')
        .replace(/-/g, '00')
        .replace(',', '.')
        .replace(/[^\d.]/g, '');

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
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
