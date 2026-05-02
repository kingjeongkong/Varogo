-- Rename hook_options table → post_draft_options (preserves rows)
ALTER TABLE "hook_options" RENAME TO "post_draft_options";

-- Rename PK and FK constraints to match new table name
ALTER TABLE "post_draft_options" RENAME CONSTRAINT "hook_options_pkey" TO "post_draft_options_pkey";
ALTER TABLE "post_draft_options" RENAME CONSTRAINT "hook_options_post_draft_id_fkey" TO "post_draft_options_post_draft_id_fkey";

-- Rename index on post_draft_id
ALTER INDEX "hook_options_post_draft_id_idx" RENAME TO "post_draft_options_post_draft_id_idx";

-- Rename PostDraft.selected_hook_id column → selected_option_id (preserves data)
ALTER TABLE "post_drafts" RENAME COLUMN "selected_hook_id" TO "selected_option_id";

-- Rename FK constraint on PostDraft.selected_option_id
ALTER TABLE "post_drafts" RENAME CONSTRAINT "post_drafts_selected_hook_id_fkey" TO "post_drafts_selected_option_id_fkey";
