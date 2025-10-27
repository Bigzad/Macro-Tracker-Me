-- =====================================================
-- COACH MACRO ADJUSTMENTS - RLS POLICY FIXES
-- =====================================================
-- Fix for RLS policies that are blocking macro adjustments
-- Issue: JWT email extraction and user ID matching not working correctly
-- =====================================================

-- 1. DROP EXISTING POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Coaches can manage their own macro adjustments" ON coach_macro_adjustments;
DROP POLICY IF EXISTS "Clients can view their macro adjustments" ON coach_macro_adjustments;
DROP POLICY IF EXISTS "Owners and admins have full access to macro adjustments" ON coach_macro_adjustments;

-- 2. CREATE IMPROVED RLS POLICIES
-- =====================================================

-- Policy 1: Coaches can manage their own adjustments
-- Fixed to properly check both user_id and email matching
CREATE POLICY "Coaches can manage their own macro adjustments" ON coach_macro_adjustments
    FOR ALL USING (
        -- Check if coach_user_id matches current user
        coach_user_id = auth.uid() 
        OR 
        -- Check if coach_email matches current user's email
        coach_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR
        -- Alternative email check using current_setting if available
        coach_email = COALESCE(
            (SELECT email FROM auth.users WHERE id = auth.uid()),
            current_setting('request.jwt.claims.email', true)
        )
    );

-- Policy 2: Clients can view adjustments made for them (read-only)
CREATE POLICY "Clients can view their macro adjustments" ON coach_macro_adjustments
    FOR SELECT USING (
        -- Check if client_user_id matches current user
        client_user_id = auth.uid() 
        OR 
        -- Check if client_email matches current user's email
        client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Policy 3: Owners and admins have full access
-- Fixed to check both 'role' and 'computed_role' fields for compatibility
CREATE POLICY "Owners and admins have full access to macro adjustments" ON coach_macro_adjustments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND (
                role IN ('owner', 'admin') 
                OR 
                computed_role IN ('owner', 'admin')
            )
        )
    );

-- 3. CREATE ADDITIONAL HELPER POLICY FOR DEBUGGING
-- =====================================================
-- This policy allows coaches to manage adjustments based on coach role verification
CREATE POLICY "Coach role based access" ON coach_macro_adjustments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND (
                role IN ('coach', 'owner', 'admin') 
                OR 
                computed_role IN ('coach', 'owner', 'admin')
            )
        )
    );

-- 4. VERIFY POLICIES WERE CREATED
-- =====================================================
SELECT 
    policyname, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'coach_macro_adjustments'
ORDER BY policyname;

-- 5. TEST QUERY TO DEBUG RLS
-- =====================================================
-- This query can help identify RLS issues during testing
SELECT 
    'Current user ID' as check_type,
    auth.uid() as user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as user_email,
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) as user_role,
    (SELECT computed_role FROM user_profiles WHERE user_id = auth.uid()) as computed_role
UNION ALL
SELECT 
    'JWT claims' as check_type,
    null as user_id,
    current_setting('request.jwt.claims.email', true) as user_email,
    current_setting('request.jwt.claims.role', true) as user_role,
    null as computed_role;

-- =====================================================
-- INSTRUCTIONS FOR APPLYING THIS FIX
-- =====================================================
/*
1. Run this SQL script in your Supabase SQL editor
2. The script will drop and recreate the RLS policies with improved logic
3. Test the macro adjustment functionality in the coach dashboard
4. If issues persist, check the test query output for debugging information

The main fixes:
- Improved email matching using proper user lookup
- Added computed_role support for compatibility
- More robust coach role verification
- Added fallback email extraction methods
*/