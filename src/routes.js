import { createPlaywrightRouter } from '@crawlee/playwright';
import {handleListingPage, handleProductPage} from "./sites/digitec.js";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async (ctx) => {
    if (ctx.request.url.startsWith('https://www.digitec.ch/')) {
        return handleListingPage(ctx);
    } else {
        throw new Error("Unknown start url: " + ctx.request.url);
    }
});

router.addHandler('digitec-product', async (ctx) => {
    return handleProductPage(ctx);
});
