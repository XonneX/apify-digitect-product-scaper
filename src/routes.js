import { createPlaywrightRouter } from '@crawlee/playwright';
import { Actor, log } from 'apify';

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
    await autoScroll(page);

    const products = await page.$$eval('a[href*="/s1/product/"]', (links) => {
        const seen = new Set();

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
                    title: cleanLine(a.innerText || text.split('\n')[0]),
                    url: href,
                    priceText: priceMatch?.[0] ?? null,
                    priceChf: priceMatch ? parseSwissPrice(priceMatch[1]) : null,
                    capacityTb: tbMatch ? Number(tbMatch[1].replace(',', '.')) : null,
                    rawText: text,
                };
            })
            .filter(Boolean)
            .filter((item) => item.title && item.title.length > 5);
    });

    const normalized = products.map((p) => ({
        ...p,
        pricePerTb:
            p.priceChf && p.capacityTb
                ? Number((p.priceChf / p.capacityTb).toFixed(2))
                : null,
        scrapedAt: new Date().toISOString(),
    }));

    await Actor.pushData(normalized);

    log.info(`Saved ${normalized.length} products`);

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

    const product = {
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

        product.specifications = await extractSpecifications(page);
    } else {
        log.warning(`No Specifications toggle found on ${request.url}`);
    }

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

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 700;

            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 300);
        });
    });
}

async function extractSpecifications(page) {
    return await page.evaluate(() => {
        const clean = (v) => (v ?? '').replace(/\s+/g, ' ').trim();

        const specsButton =
            document.querySelector('button#specifications')
            ?? document.querySelector('button[data-test="specifications"]');
        if (!specsButton) return null;

        const specsRoot =
            specsButton.closest('section')
            ?? specsButton.parentElement
            ?? document.body;

        const tables = Array.from(specsRoot.querySelectorAll('table'));
        if (!tables.length) return [];

        return tables
            .map((table) => {
                const groupTitle = clean(
                    table.querySelector('caption')?.innerText
                    ?? table.querySelector('caption')?.textContent,
                );

                const items = Array.from(table.querySelectorAll('tbody tr'))
                    .map((tr) => {
                        const tds = tr.querySelectorAll('td');
                        const name = clean(tds[0]?.innerText ?? tds[0]?.textContent);
                        const value = clean(tds[1]?.innerText ?? tds[1]?.textContent);
                        if (!name && !value) return null;
                        return { name, value: value || null };
                    })
                    .filter(Boolean);

                return {
                    groupTitle: groupTitle || null,
                    items,
                };
            })
            .filter((g) => g.items?.length);
    });
}
