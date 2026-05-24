import {Actor, log} from "apify";
import {acceptCookies, cleanLine, parseMb, parseRpm, parseTb, scrollToBottom} from "../utils.js";
import {saveProduct} from "../db.js";

export async function handleBrackListingPage({page, request, enqueueLinks}) {
    log.info(`Listing page: ${request.url}`);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await acceptCookies(page);

    await scrollToBottom(page);

    const productUrls = [
        ...new Set(
            await page.$$eval(
                'a[aria-label="Zur Produktdetailseite"]',
                links => links.map(a => a.href),
            ),
        ),
    ];

    log.info(`Loaded ${productUrls.length} products`);

    await enqueueLinks({
        urls: productUrls,
        label: 'brack-product',
        strategy: 'same-domain',
    });
}

export async function handleBrackProductPage({page, request}) {
    log.info(`Product page: ${request.url}`);

    await page.waitForLoadState('domcontentloaded');

    await acceptCookies(page);

    const title = cleanLine(await page.title().catch(() => null));

    const path = new URL(page.url()).pathname;
    const priceChf = await page.locator(
        'script[type="application/ld+json"]'
    ).evaluateAll((scripts, path) => {
        for (const script of scripts) {
            try {
                const json = JSON.parse(script.textContent);

                const variants = json.hasVariant ?? [];

                for (const product of variants) {
                    if (
                        product.url === path
                        && product.offers?.price
                    ) {
                        return Number(product.offers.price);
                    }
                }
            } catch {
            }
        }

        return null;
    }, path);

    const specsToggle = page.getByRole('heading', {
        name: 'Spezifikationen',
    });
    await specsToggle.scrollIntoViewIfNeeded();
    const showMoreButton = specsToggle.locator('..').getByLabel('Mehr anzeigen');
    if (await showMoreButton.isVisible().catch(() => false)) {
        await showMoreButton.click();
    }

    const specifications = await extractSpecifications(page);

    const capacityTb = parseTb(specifications['Speicherkapazität total']);
    const pricePerTb = priceChf / capacityTb;

    const product = {
        source: 'brack',
        url: request.url,
        title,
        scrapedAt: new Date().toISOString(),

        itemNumber: specifications['???'],
        manufacturer: specifications['Herstellername'],
        manufacturerNo: specifications['Herstellernummer'],
        category: specifications['category'],

        capacityTb,
        storageTechnology: specifications['????'],
        rpm: parseRpm(specifications['HDD Umdrehungsgeschwindigkeit']),
        cacheMb: parseMb(specifications['Datenspeicher Cache']),

        priceChf,
        pricePerTb,

        ...specifications,
    };

    await saveProduct(product);
    await Actor.pushData(product);
}

async function extractSpecifications(page) {
    const specsHeading = page.getByRole('heading', {
        name: 'Spezifikationen',
    });

    const specsSection = specsHeading.locator('..');

    const rows = await specsSection.locator('table tbody tr').all();

    const specifications = {};

    for (const row of rows) {
        const cells = row.locator('td');

        if ((await cells.count()) < 2) continue;

        const name = normalizeKey(await cells.nth(0).innerText().catch(() => null));
        const value = cleanLine(await cells.nth(1).innerText().catch(() => null));

        if (!name || !value) continue;

        specifications[name] = value;
    }

    return specifications;
}

function normalizeKey(key) {
    return cleanLine(key)
        .replace(/i$/, '')
        .trim();
}
