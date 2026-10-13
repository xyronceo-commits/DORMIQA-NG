-- Migration: 202610120001_clean_ai_moderation_fields.sql
-- Clean up legacy AI fields from app_documents (listings and reports)

-- Update listings: copy aiBanReason to rejectionReason if empty, then strip isAiBanned and aiBanReason
update public.app_documents
set data = (
  (data - 'isAiBanned' - 'aiBanReason')
  || jsonb_build_object(
       'rejectionReason',
       coalesce(nullif(data->>'rejectionReason', ''), nullif(data->>'aiBanReason', ''))
     )
)
where collection = 'listings'
  and (data ? 'isAiBanned' or data ? 'aiBanReason');

-- Update reports: strip legacy AI moderation fields
update public.app_documents
set data = data - 'aiActionTaken' - 'aiReason' - 'isFakeOrDuplicate' - 'duplicateWithAgent'
where collection = 'reports'
  and (data ? 'aiActionTaken' or data ? 'aiReason' or data ? 'isFakeOrDuplicate' or data ? 'duplicateWithAgent');
