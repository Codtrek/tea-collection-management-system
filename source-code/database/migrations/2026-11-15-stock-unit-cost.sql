-- Finance-Reports-Addendum §5 — what the factory paid for fertilizer stock. An Incoming movement
-- records its unit cost (Rs per kg); the Expense report counts quantity × unit cost as
-- "Fertilizer stock purchases" on the movement date. Stock received before this column existed
-- has no cost (NULL) and is reported as "stock-ins without a cost", never guessed at.
BEGIN;

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2)
    CHECK (unit_cost IS NULL OR unit_cost > 0);

COMMIT;
