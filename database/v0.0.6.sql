UPDATE drive_product_snapshots
SET source = 'digitec'
WHERE source IS NULL;

ALTER TABLE drive_product_snapshots
    ALTER COLUMN source SET NOT NULL;
