import { createPlaywrightRouter } from '@crawlee/playwright';
import {handleDigitecListingPage, handleDigitecProductPage} from "./sites/digitec.js";
import {handleBrackListingPage, handleBrackProductPage} from "./sites/brack.js";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async (ctx) => {
    if (ctx.request.url.startsWith('https://www.digitec.ch/')) {
        return handleDigitecListingPage(ctx);
    } else if (ctx.request.url.startsWith('https://www.brack.ch/')) {
        return handleBrackListingPage(ctx);
    } else {
        throw new Error("Unknown start url: " + ctx.request.url);
    }
});

router.addHandler('digitec-product', async (ctx) => {
    return handleDigitecProductPage(ctx);
});


router.addHandler('brack-product', async (ctx) => {
    return handleBrackProductPage(ctx);
});
