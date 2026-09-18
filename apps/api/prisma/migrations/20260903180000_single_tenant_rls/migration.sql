-- The current deployment is one isolated Viviani Serena installation.
-- RLS is enabled as a database-level defense-in-depth boundary for the
-- runtime role. Application authorization remains responsible for user roles.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'viviani_app') THEN
    RAISE EXCEPTION 'Required runtime role viviani_app does not exist; run ensure-runtime-db-role.sh first';
  END IF;
END $$;

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
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS viviani_runtime_single_tenant ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY viviani_runtime_single_tenant ON %I FOR ALL TO viviani_app USING (true) WITH CHECK (true)',
      table_name
    );
  END LOOP;
END $$;
