import { PlaywrightCrawler } from '@crawlee/playwright';
import { Actor } from 'apify';
import { log } from 'apify';
import { router } from './routes.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};

const startUrls = input.startUrls ?? [
    'https://www.digitec.ch/en/s1/producttype/hard-drives-36?filter=460%3D16%3A32%3A15%2C60%3D1098',
];

const proxyConfiguration = await Actor.createProxyConfiguration(
    input.proxyConfiguration ?? {
        groups: ['RESIDENTIAL'],
        checkAccess: true,
    },
);

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandler: router,

    maxRequestsPerCrawl: input.maxRequestsPerCrawl ?? 200,
    maxConcurrency: input.maxConcurrency ?? 3,

    launchContext: {
        launchOptions: {
            args: ['--disable-gpu'],
            headless: input.headless ?? true,
            slowMo: input.slowMoMillis ?? 0,
        },
    },

    async failedRequestHandler({ request }) {
        log.error(`Request failed: ${request.url}`);
    },
});

await crawler.run(startUrls);

await Actor.exit();
