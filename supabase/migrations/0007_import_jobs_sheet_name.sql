-- Add sheet_name to import_jobs so multi-sheet workbook imports can be
-- tracked and displayed per-sheet in the uploads table.

ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS sheet_name text;
