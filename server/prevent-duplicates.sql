-- Prevent Future Duplicate Vocabulary Entries
-- This script adds a unique index to the vocabulary table to prevent
-- duplicate entries with the same english/amharic/romanized values

-- Drop the index if it already exists (for re-running)
DROP INDEX IF EXISTS idx_vocabulary_unique;

-- Create unique index on the combination of english, amharic, and romanized fields
-- This will prevent INSERT or UPDATE operations that would create duplicates
CREATE UNIQUE INDEX idx_vocabulary_unique
ON vocabulary(english, amharic, romanized);

-- Verify the index was created
SELECT name, tbl_name, sql
FROM sqlite_master
WHERE type = 'index' AND name = 'idx_vocabulary_unique';

-- Note: This index will cause INSERT/UPDATE operations to fail with a constraint
-- violation if duplicate values are attempted. Make sure your data seeding
-- scripts handle this appropriately.
