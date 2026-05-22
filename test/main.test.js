import {PlaywrightCrawler, purgeDefaultStorages} from '@crawlee/playwright';
import {beforeAll, describe, expect, it} from 'vitest';

import {__testables, router} from '../src/routes.js';

describe('PlaywrightCrawler', () => {
    beforeAll(async () => {
        await purgeDefaultStorages();
    });

    it('should crawl and push data to dataset', async () => {
        const crawler = new PlaywrightCrawler({
            maxRequestsPerCrawl: 10,
            requestHandler: router,
        });

        await crawler.run(['https://www.digitec.ch/en/s1/producttype/hard-drives-36?filter=460%3D16%3A32%3A15%2C60%3D1098']);

        expect(crawler.stats.state.requestsFinished).toBeGreaterThanOrEqual(10);

        const {items} = await crawler.getData();
        expect(items.length).toBeGreaterThan(0);
        expect(items[0].url).toBeDefined();
        expect(items[0].title).toBeDefined();
        expect(items[0].scrapedAt).toBeDefined();

        expect(items[0].itemNumber).toBeDefined();
        expect(items[0].manufacturer).toBeDefined();
        expect(items[0].manufacturerNo).toBeDefined();
        expect(items[0].category).toBeDefined();

        expect(items[0].capacityTb).toBeDefined();
        expect(items[0].storageTechnology).toBeDefined();
        expect(items[0].rpm).toBeDefined();
        expect(items[0].cacheMb).toBeDefined();

        expect(items[0].priceChf).toBeDefined();
        expect(items[0].pricePerTb).toBeDefined();
    }, 60_000);
});

describe('listing price handoff', () => {
    it('preserves listing-derived price fields on product requests', () => {
        const result = __testables.getListingDataFromRequest({
            userData: {
                listingData: {
                    priceText: 'CHF 479.–',
                    priceValueRaw: '479.–',
                    priceChf: 479,
                    pricePerTb: 19.96,
                    capacityTb: 24,
                },
            },
        });

        expect(result).toEqual({
            priceText: 'CHF 479.–',
            priceValueRaw: '479.–',
            priceChf: 479,
            pricePerTb: 19.96,
        });
    });

    it('falls back to null price fields when listing data is missing', () => {
        const result = __testables.getListingDataFromRequest({ userData: {} });

        expect(result).toEqual({
            priceText: null,
            priceValueRaw: null,
            priceChf: null,
            pricePerTb: null,
        });
    });
});
