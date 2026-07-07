-- Demo accounts for exercising the backend auth flow end-to-end, mirroring the mobile app's
-- local SQLite demo accounts (source-code/mobile/src/db/index.ts) — same phones/names/password
-- ('password123' for all), except the collector's role uses the reconciled 'collector' value
-- (the mobile app's local seed still says 'collection_agent'; that's a known gap, not fixed here).
--
-- Only seeds `users` — role-specific profile rows (tea_estate_owners, factory_employees, etc.)
-- are deferred until the feature modules that need them are built.
--
-- password_hash below is bcrypt('password123', 10). Run with:
--   psql -d <your_db> -f seed.sql

INSERT INTO users (phone, password_hash, role) VALUES
    ('0770000001', '$2b$10$bIh1zAtv8R9OatrI/dpAFeb.D03XyE1mTPWzpZmva/.jHeZnCOYHy', 'estate_owner'),
    ('0770000002', '$2b$10$bIh1zAtv8R9OatrI/dpAFeb.D03XyE1mTPWzpZmva/.jHeZnCOYHy', 'estate_manager'),
    ('0770000003', '$2b$10$bIh1zAtv8R9OatrI/dpAFeb.D03XyE1mTPWzpZmva/.jHeZnCOYHy', 'collector'),
    ('0770000004', '$2b$10$bIh1zAtv8R9OatrI/dpAFeb.D03XyE1mTPWzpZmva/.jHeZnCOYHy', 'receiving_officer'),
    ('0770000005', '$2b$10$bIh1zAtv8R9OatrI/dpAFeb.D03XyE1mTPWzpZmva/.jHeZnCOYHy', 'factory_admin'),
    ('0770000006', '$2b$10$bIh1zAtv8R9OatrI/dpAFeb.D03XyE1mTPWzpZmva/.jHeZnCOYHy', 'factory_officer'),
    ('0770000007', '$2b$10$bIh1zAtv8R9OatrI/dpAFeb.D03XyE1mTPWzpZmva/.jHeZnCOYHy', 'factory_manager'),
    ('0770000008', '$2b$10$bIh1zAtv8R9OatrI/dpAFeb.D03XyE1mTPWzpZmva/.jHeZnCOYHy', 'employee');
