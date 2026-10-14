-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "conclusionPage" JSONB;

-- Carry each project's own conclusion wording out of `copy` and into the
-- template, so a project that had changed it reads the same after this. The
-- body is the default template (`DEFAULT_CONCLUSION_PAGE` in
-- src/lib/report/conclusion-template.ts) with the old heading, text and
-- best-runs heading in their places; blank ones keep the default.
UPDATE "projects"
SET "conclusionPage" = jsonb_build_object(
  'body',
  '# ' || COALESCE(NULLIF(btrim("copy"->>'conclusionTitle'), ''), 'Conclusion')
    || E'\n\n'
    || COALESCE(NULLIF(btrim("copy"->>'conclusionBody'), ''), 'Every run across {project}, and where yours landed among them.')
    || E'\n\n{histogram}\n\n{figures}\n\n{#runs}\nYour best run scored {best_score}, in the {percentile} percentile of every run.\n{/runs}\n\n## '
    || COALESCE(NULLIF(btrim("copy"->>'conclusionTop'), ''), 'who did best')
    || E'\n\n{top}',
  'empty', COALESCE("copy"->>'conclusionEmpty', ''),
  'pending', COALESCE("copy"->>'conclusionPending', '')
)
WHERE "copy" IS NOT NULL
  AND jsonb_typeof("copy") = 'object'
  AND ("copy" ?| ARRAY['conclusionTitle', 'conclusionBody', 'conclusionTop', 'conclusionEmpty', 'conclusionPending']);

UPDATE "projects"
SET "copy" = "copy" - ARRAY['conclusionTitle', 'conclusionBody', 'conclusionTop', 'conclusionEmpty', 'conclusionPending']
WHERE "copy" IS NOT NULL AND jsonb_typeof("copy") = 'object';
