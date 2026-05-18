import { createPlaywrightRouter } from '@crawlee/playwright';
import { Dataset, log } from '@crawlee/core';

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ page, request, enqueueLinks }) => {
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

    await Dataset.pushData(normalized);

    log.info(`Saved ${normalized.length} products`);

    // Enqueue next page
    await enqueueLinks({
        selector: 'a[href*="page="], a[aria-label*="Next"], a[rel="next"]',
        strategy: 'same-domain',
    });
});

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