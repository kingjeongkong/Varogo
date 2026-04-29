-- AddForeignKey
ALTER TABLE "post_drafts" ADD CONSTRAINT "post_drafts_selected_hook_id_fkey" FOREIGN KEY ("selected_hook_id") REFERENCES "hook_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
