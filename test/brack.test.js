import {Configuration, PlaywrightCrawler, purgeDefaultStorages} from "@crawlee/playwright";
import {handleBrackProductPage} from "../src/sites/brack.js";
import {beforeAll,beforeEach, describe, expect, it} from 'vitest';

describe('Brack', () => {
    beforeAll(async () => {
        await purgeDefaultStorages();
    });

    it('should fill all data in default case ', async () => {
        const crawler = new PlaywrightCrawler({
            requestHandler: handleBrackProductPage,
        });

        const url = 'https://www.brack.ch/seagate-harddisk-ironwolf-pro-3-5-sata-24-tb-1673676';
        await crawler.run([url]);

        expect(crawler.stats.state.requestsFinished).toBe(1);

        const {items} = await crawler.getData();
        const idx = items.findIndex(item => item.url === url);
        expect(idx).toBeGreaterThanOrEqual(0);

        const item = items[idx];
        expect(item["source"]).toBe("brack");
        expect(item["url"]).toBe("https://www.brack.ch/seagate-harddisk-ironwolf-pro-3-5-sata-24-tb-1673676");
        expect(item["title"]).toBe("Seagate Harddisk IronWolf Pro 3.5\" SATA 24 TB");
        expect(item["scrapedAt"]).toBeDefined();
        expect(item["manufacturer"]).toBe("Seagate");
        expect(item["manufacturerNo"]).toBe("ST24000NT002");
        expect(item["capacityTb"]).toBe(24);
        expect(item["rpm"]).toBe(7200);
        expect(item["cacheMb"]).toBe(512);
        expect(item["priceChf"]).toBe(680);
        expect(item["pricePerTb"]).toBe(28.333333333333332);
        expect(item["Speicher Anwendungsbereich"]).toBe("NAS");
        expect(item["Dauerbetrieb"]).toBe("Ja");
        expect(item["Speicherschnittstelle"]).toBe("SATA III (6Gb/s)");
        expect(item["Festplatten Formfaktor"]).toBe("3.5\"");
        expect(item["Hot-Plug Unterstützung"]).toBe("Ja");
        expect(item["Festplatten Schnittstelle"]).toBe("SATA");
        expect(item["HDD Umdrehungsgeschwindigkeit"]).toBe("7200 rpm");
        expect(item["Sektorgrösse"]).toBe("512e");
        expect(item["Speicherkapazität total"]).toBe("24 TB");
        expect(item["Leistungsaufnahme Betrieb"]).toBe("7.8 W");
        expect(item["Leistungsaufnahme Standby"]).toBe("1.1 W");
        expect(item["Datenspeicher Cache"]).toBe("512 MB");
        expect(item["Herstellername"]).toBe("Seagate");
        expect(item["Herstellernummer"]).toBe("ST24000NT002");
        expect(item["Herstellergarantie"]).toBe("60 Monate");
        expect(item["Garantieinformationen"]).toBe("Seagate");
        expect(item["Herstellerseite"]).toBe("Zum Hersteller");
    }, 60_000);

    it('should fill all data in special case', async () => {
        const crawler = new PlaywrightCrawler({
            requestHandler: handleBrackProductPage,
        });

        const url = 'https://www.brack.ch/western-digital-harddisk-wd-red-pro-3-5-sata-16-tb-1121393';
        await crawler.run([url]);

        expect(crawler.stats.state.requestsFinished).toBe(1);

        const {items} = await crawler.getData();
        const idx = items.findIndex(item => item.url === url);
        expect(idx).toBeGreaterThanOrEqual(0);

        const item = items[idx];
        expect(item["source"]).toBe("brack");
        expect(item["url"]).toBe("https://www.brack.ch/western-digital-harddisk-wd-red-pro-3-5-sata-16-tb-1121393");
        expect(item["title"]).toBe("Western Digital Harddisk WD Red Pro 3.5\" SATA 16 TB");
        expect(item["scrapedAt"]).toBeDefined();
        expect(item["manufacturer"]).toBe("Western Digital");
        expect(item["manufacturerNo"]).toBe("WD161KFGX");
        expect(item["capacityTb"]).toBe(16);
        expect(item["rpm"]).toBe(7200);
        expect(item["cacheMb"]).toBe(512);
        expect(item["priceChf"]).toBe(569);
        expect(item["pricePerTb"]).toBe(35.5625);
        expect(item["Speicher Anwendungsbereich"]).toBe("NAS");
        expect(item["Dauerbetrieb"]).toBe("Ja");
        expect(item["Speicherschnittstelle"]).toBe("SATA III (6Gb/s)");
        expect(item["Festplatten Formfaktor"]).toBe("3.5\"");
        expect(item["Festplatten Schnittstelle"]).toBe("SATA");
        expect(item["HDD Umdrehungsgeschwindigkeit"]).toBe("7200 rpm");
        expect(item["Speicherkapazität total"]).toBe("16 TB");
        expect(item["Leistungsaufnahme Betrieb"]).toBe("6.1 W");
        expect(item["Leistungsaufnahme Standby"]).toBe("0.9 W");
        expect(item["Datenspeicher Cache"]).toBe("512 MB");
        expect(item["Herstellername"]).toBe("Western Digital");
        expect(item["Herstellernummer"]).toBe("WD161KFGX");
        expect(item["Herstellergarantie"]).toBe("60 Monate");
        expect(item["Garantieinformationen"]).toBe("Western Digital");
    }, 60_000);

    it('should have price if no variants', async () => {
        const crawler = new PlaywrightCrawler({
            requestHandler: handleBrackProductPage,
        });

        const url = 'https://www.brack.ch/seagate-harddisk-exos-m3-plus-3-5-sata-30-tb-1925008';
        await crawler.run([url]);

        expect(crawler.stats.state.requestsFinished).toBe(1);

        const {items} = await crawler.getData();
        const idx = items.findIndex(item => item.url === url);
        expect(idx).toBeGreaterThanOrEqual(0);

        const item = items[idx];
        expect(item["url"]).toBe("https://www.brack.ch/seagate-harddisk-exos-m3-plus-3-5-sata-30-tb-1925008");
        expect(item["priceChf"]).toBe(880);
        expect(item["pricePerTb"]).toBe(29.3333333333333333333);
    }, 60_000);
});
