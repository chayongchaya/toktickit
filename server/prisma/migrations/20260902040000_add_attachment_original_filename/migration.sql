-- AlterTable
-- Adds originalFileName so the requester's original upload name can be
-- displayed in the UI, separate from the internally generated storage
-- filename kept in "fileName".
ALTER TABLE "Attachment" ADD COLUMN "originalFileName" TEXT NOT NULL DEFAULT '';

-- Backfill existing rows (created before this column existed) so they
-- don't show a blank filename in the UI. We don't have their true
-- original filename, so fall back to the generated storage filename
-- ("fileName") as the best available label — this only affects rows
-- created before this migration; every new upload stores the real
-- original filename going forward.
UPDATE "Attachment"
SET "originalFileName" = "fileName"
WHERE "originalFileName" = '';
