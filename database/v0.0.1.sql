CREATE TABLE drive_product_snapshots
(
    id                 bigserial PRIMARY KEY,

    url                text        NOT NULL,
    title              text        NOT NULL,
    scraped_at         timestamptz NOT NULL,

    item_number        text,
    manufacturer       text,
    manufacturer_no    text,
    category           text,

    capacity_tb        numeric,
    storage_technology text,
    rpm                integer,
    cache_mb           integer,

    price_chf          numeric,
    price_per_tb       numeric,

    raw                jsonb       NOT NULL
);

CREATE INDEX drive_product_snapshots_url_scraped_at_idx
    ON drive_product_snapshots (url, scraped_at DESC);

CREATE INDEX drive_product_snapshots_price_per_tb_idx
    ON drive_product_snapshots (price_per_tb);

CREATE INDEX drive_product_snapshots_capacity_tb_idx
    ON drive_product_snapshots (capacity_tb);
