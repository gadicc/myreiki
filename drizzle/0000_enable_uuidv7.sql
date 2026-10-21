-- Provision the real UUIDv7 implementation before any table default refers to it.
-- A missing extension must stop migration rather than silently create UUIDv4 IDs.
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;
