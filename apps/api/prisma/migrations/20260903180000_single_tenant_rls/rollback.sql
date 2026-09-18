-- Reverses 20260903180000_single_tenant_rls.
-- The rollback removes database-level RLS protection and must only be used
-- during a controlled recovery with the application access model reviewed.

BEGIN;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'email_settings',
    'leads',
    'sessions',
    'appointments',
    'financials',
    'contents',
    'content_versions',
    'audit_logs',
    'security_events',
    'analytics_events',
    'web_vitals',
    'notification_reads',
    'auto_templates',
    'lead_status_templates',
    'consent_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS viviani_runtime_single_tenant ON %I', table_name);
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

COMMIT;
