export async function acceptCookies(page) {
    const cookieButton = page.getByRole('button', {
        name: /accept|agree|ok|verstanden|akzeptieren|schliessen/i,
    });

    if (await cookieButton.first().isVisible().catch(() => false)) {
        await cookieButton.first().click().catch(() => {
        });
    }
}

export async function scrollToBottom(page) {
    let previousHeight = 0;

    while (true) {
        const currentHeight = await page.evaluate(
            () => document.body.scrollHeight
        );

        // Stop if page height no longer grows
        if (currentHeight === previousHeight) {
            break;
        }

        previousHeight = currentHeight;

        // Slowly scroll down in chunks
        await page.evaluate(async () => {
            await new Promise(resolve => {
                const step = 400; // px per scroll
                const delay = 150; // ms between scrolls

                const timer = setInterval(() => {
                    window.scrollBy(0, step);

                    if (
                        window.scrollY + window.innerHeight >=
                        document.body.scrollHeight
                    ) {
                        clearInterval(timer);
                        resolve();
                    }
                }, delay);
            });
        });

        // Give lazy loading time
        await page.waitForTimeout(1500);
    }
}

export function cleanLine(value) {
    return value
        ?.replace(/\s+/g, ' ')
        .trim();
}

export function parseTb(value) {
    const match = value?.match(/(\d+(?:[.,]\d+)?)\s*TB/i);
    return match ? Number(match[1].replace(',', '.')) : null;
}

export function parseRpm(value) {
    const match = value?.match(/(\d+)\s*RPM/i);
    return match ? Number(match[1]) : null;
}

export function parseMb(value) {
    const match = value?.match(/(\d+)\s*MB/i);
    return match ? Number(match[1]) : null;
}
