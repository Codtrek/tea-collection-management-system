-- Fertilizer-Delivery-Addendum §5.2 — Write-off replaces "Mark Discarded".
-- Stock that leaves the books without going to anyone (expired, damaged, other) is its own
-- movement type, so it never reads as a dispatch. The batch quantity drops by the written-off
-- kg; `fertilizer_batches.discarded` stays for legacy rows only.
BEGIN;

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check;
ALTER TABLE stock_movements
    ADD CONSTRAINT stock_movements_type_check
    CHECK (type IN ('Incoming', 'Outgoing', 'Write-off'));

ALTER TABLE stock_movements
    ADD COLUMN IF NOT EXISTS write_off_reason VARCHAR(10)
        CHECK (write_off_reason IN ('expired', 'damaged', 'other'));

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_write_off_reason_required;
ALTER TABLE stock_movements
    ADD CONSTRAINT stock_movements_write_off_reason_required
    CHECK (type <> 'Write-off' OR write_off_reason IS NOT NULL);

COMMIT;
