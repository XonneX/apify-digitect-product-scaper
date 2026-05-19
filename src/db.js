import pg from 'pg';

const {Pool} = pg;

let pool = null;

if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
}

export async function saveProduct(product) {
    if (!pool) {
        return;
    }

    await pool.query(
        `
            INSERT INTO drive_product_snapshots (source,
                                                 url,
                                                 title,
                                                 scraped_at,
                                                 item_number,
                                                 manufacturer,
                                                 manufacturer_no,
                                                 category,
                                                 capacity_tb,
                                                 storage_technology,
                                                 rpm,
                                                 cache_mb,
                                                 price_chf,
                                                 price_per_tb,
                                                 raw)
            VALUES ($1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11, $12,
                    $13, $14,
                    $15)
        `,
        [
            product.source,
            product.url,
            product.title,
            product.scrapedAt,

            product.itemNumber,
            product.manufacturer,
            product.manufacturerNo,
            product.category,

            product.capacityTb,
            product.storageTechnology,
            product.rpm,
            product.cacheMb,

            product.priceChf,
            product.pricePerTb,

            product,
        ],
    );
}

export async function closeDb() {
    if (pool) {
        await pool.end();
    }
}
