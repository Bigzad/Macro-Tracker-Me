-- =====================================================
-- FIXED PROGRESS REPORTS RLS POLICIES
-- =====================================================
-- This fixes the RLS permission issues by avoiding
-- direct auth.users table references
-- =====================================================

-- First, drop existing policies
DROP POLICY IF EXISTS "Coaches can manage their own reports" ON progress_reports;
DROP POLICY IF EXISTS "Clients can view reports about them" ON progress_reports;
DROP POLICY IF EXISTS "Owners and admins have full report access" ON progress_reports;
DROP POLICY IF EXISTS "Coaches can manage their own templates" ON report_templates;
DROP POLICY IF EXISTS "Everyone can view system templates" ON report_templates;
DROP POLICY IF EXISTS "Coaches can access cache for their clients" ON report_metrics_cache;
DROP POLICY IF EXISTS "Clients can view their own cache" ON report_metrics_cache;
DROP POLICY IF EXISTS "Coaches can manage shares for their reports" ON report_shares;
DROP POLICY IF EXISTS "Shared recipients can view shared reports" ON report_shares;

-- =====================================================
-- FIXED PROGRESS REPORTS POLICIES
-- =====================================================

-- Allow coaches to manage their own reports using coach_user_id
CREATE POLICY "coaches_own_reports" ON progress_reports
    FOR ALL USING (coach_user_id = auth.uid());

-- Allow coaches to manage reports where they are assigned via email
-- (This uses a simpler approach without subqueries to auth.users)
CREATE POLICY "coaches_email_reports" ON progress_reports
    FOR ALL USING (
        coach_email = (
            SELECT email FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Allow clients to view their own reports by user_id
CREATE POLICY "clients_own_reports" ON progress_reports
    FOR SELECT USING (client_user_id = auth.uid());

-- Allow owners and admins full access
CREATE POLICY "admin_full_reports_access" ON progress_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- FIXED REPORT TEMPLATES POLICIES
-- =====================================================

-- Allow coaches to manage their own templates
CREATE POLICY "coaches_own_templates" ON report_templates
    FOR ALL USING (
        coach_user_id = auth.uid() OR 
        is_system_template = true
    );

-- Allow everyone to view system templates
CREATE POLICY "system_templates_viewable" ON report_templates
    FOR SELECT USING (is_system_template = true);

-- Allow owners and admins full access to all templates
CREATE POLICY "admin_full_templates_access" ON report_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- FIXED METRICS CACHE POLICIES
-- =====================================================

-- Allow coaches to access cache for their assigned clients
CREATE POLICY "coaches_client_cache" ON report_metrics_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM coach_assignments ca
            JOIN user_profiles up ON up.id = ca.coach_id
            WHERE up.user_id = auth.uid()
            AND ca.client_id = client_user_id
            AND ca.is_active = true
        ) OR
        -- Also allow if coach created a report for this client
        EXISTS (
            SELECT 1 FROM progress_reports pr
            WHERE pr.coach_user_id = auth.uid()
            AND pr.client_user_id = report_metrics_cache.client_user_id
        )
    );

-- Allow clients to view their own cache
CREATE POLICY "clients_own_cache" ON report_metrics_cache
    FOR SELECT USING (client_user_id = auth.uid());

-- Allow owners and admins full access
CREATE POLICY "admin_full_cache_access" ON report_metrics_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- FIXED REPORT SHARES POLICIES
-- =====================================================

-- Allow coaches to manage shares for their own reports
CREATE POLICY "coaches_own_shares" ON report_shares
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM progress_reports pr
            WHERE pr.id = report_id
            AND pr.coach_user_id = auth.uid()
        )
    );

-- Allow shared recipients to view shared reports
-- (Using user_profiles instead of auth.users)
CREATE POLICY "view_shared_reports" ON report_shares
    FOR SELECT USING (
        shared_with_email = (
            SELECT email FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Allow owners and admins full access
CREATE POLICY "admin_full_shares_access" ON report_shares
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Ensure authenticated users can access the tables
GRANT SELECT, INSERT, UPDATE, DELETE ON progress_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_metrics_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_shares TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test if policies are working (run these as a coach user)
-- SELECT * FROM progress_reports; -- Should only show coach's reports
-- SELECT * FROM report_templates; -- Should show coach's + system templates
-- SELECT * FROM report_metrics_cache; -- Should show accessible client data
-- SELECT * FROM report_shares; -- Should show coach's shares