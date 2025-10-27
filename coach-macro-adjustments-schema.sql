-- =====================================================
-- COACH MACRO ADJUSTMENTS DATABASE SCHEMA
-- =====================================================
-- This schema allows coaches to override AI-generated macros
-- while preserving original AI calculations for reference
-- =====================================================

-- 1. CREATE COACH MACRO ADJUSTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS coach_macro_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Client identification (matches daily_targets structure)
    client_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_email TEXT,
    client_anon_profile_id UUID REFERENCES anonymous_profiles(id) ON DELETE CASCADE,
    
    -- Coach identification  
    coach_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    coach_email TEXT NOT NULL,
    
    -- Adjusted macro values
    adjusted_calories INTEGER NOT NULL CHECK (adjusted_calories > 0),
    adjusted_protein INTEGER NOT NULL CHECK (adjusted_protein >= 0),
    adjusted_carbs INTEGER NOT NULL CHECK (adjusted_carbs >= 0),
    adjusted_fat INTEGER NOT NULL CHECK (adjusted_fat >= 0),
    
    -- Metadata
    adjustment_reason TEXT, -- Optional note from coach about why they adjusted
    unit_system TEXT DEFAULT 'imperial' CHECK (unit_system IN ('imperial', 'metric')),
    
    -- Original AI values for comparison (snapshot at time of adjustment)
    original_ai_calories INTEGER,
    original_ai_protein INTEGER,
    original_ai_carbs INTEGER,
    original_ai_fat INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one adjustment per client-coach pair
    UNIQUE(client_user_id, coach_user_id),
    UNIQUE(client_email, coach_email),
    UNIQUE(client_anon_profile_id, coach_user_id)
);

-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_coach_macro_adj_client_user ON coach_macro_adjustments(client_user_id);
CREATE INDEX IF NOT EXISTS idx_coach_macro_adj_client_email ON coach_macro_adjustments(client_email);
CREATE INDEX IF NOT EXISTS idx_coach_macro_adj_coach ON coach_macro_adjustments(coach_user_id);
CREATE INDEX IF NOT EXISTS idx_coach_macro_adj_updated ON coach_macro_adjustments(updated_at);

-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_coach_macro_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coach_macro_adjustments_updated_at
    BEFORE UPDATE ON coach_macro_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_macro_adjustments_updated_at();

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
ALTER TABLE coach_macro_adjustments ENABLE ROW LEVEL SECURITY;

-- Allow coaches to view and edit their own adjustments
CREATE POLICY "Coaches can manage their own macro adjustments" ON coach_macro_adjustments
    FOR ALL USING (
        coach_user_id = auth.uid() OR 
        coach_email = auth.jwt() ->> 'email'
    );

-- Allow clients to view adjustments made for them (read-only)
CREATE POLICY "Clients can view their macro adjustments" ON coach_macro_adjustments
    FOR SELECT USING (
        client_user_id = auth.uid() OR 
        client_email = auth.jwt() ->> 'email'
    );

-- Allow owners/admins full access
CREATE POLICY "Owners and admins have full access to macro adjustments" ON coach_macro_adjustments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- 5. HELPER FUNCTION TO GET EFFECTIVE MACROS
-- =====================================================
-- This function returns coach-adjusted macros if they exist,
-- otherwise falls back to AI-generated macros from daily_targets
CREATE OR REPLACE FUNCTION get_effective_client_macros(
    p_client_user_id UUID DEFAULT NULL,
    p_client_email TEXT DEFAULT NULL,
    p_client_anon_profile_id UUID DEFAULT NULL
)
RETURNS TABLE (
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    source TEXT, -- 'coach_adjusted' or 'ai_generated'
    adjusted_by_coach_email TEXT,
    adjustment_reason TEXT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- First, try to get coach-adjusted macros
    RETURN QUERY
    SELECT 
        cma.adjusted_calories,
        cma.adjusted_protein,
        cma.adjusted_carbs,
        cma.adjusted_fat,
        'coach_adjusted'::TEXT as source,
        cma.coach_email,
        cma.adjustment_reason,
        cma.updated_at
    FROM coach_macro_adjustments cma
    WHERE (p_client_user_id IS NOT NULL AND cma.client_user_id = p_client_user_id)
       OR (p_client_email IS NOT NULL AND cma.client_email = p_client_email)
       OR (p_client_anon_profile_id IS NOT NULL AND cma.client_anon_profile_id = p_client_anon_profile_id)
    LIMIT 1;
    
    -- If no coach adjustments found, return AI-generated macros
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            dt.daily_calories,
            dt.daily_protein,
            dt.daily_carbs,
            dt.daily_fat,
            'ai_generated'::TEXT as source,
            NULL::TEXT as adjusted_by_coach_email,
            NULL::TEXT as adjustment_reason,
            dt.updated_at
        FROM daily_targets dt
        WHERE (p_client_user_id IS NOT NULL AND dt.user_id = p_client_user_id)
           OR (p_client_email IS NOT NULL AND dt.user_email = p_client_email)
           OR (p_client_anon_profile_id IS NOT NULL AND dt.anon_profile_id = p_client_anon_profile_id)
        ORDER BY dt.updated_at DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. AUDIT TABLE FOR MACRO ADJUSTMENT HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS coach_macro_adjustment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_id UUID REFERENCES coach_macro_adjustments(id) ON DELETE CASCADE,
    
    -- Previous values
    previous_calories INTEGER,
    previous_protein INTEGER,
    previous_carbs INTEGER,
    previous_fat INTEGER,
    
    -- New values  
    new_calories INTEGER,
    new_protein INTEGER,
    new_carbs INTEGER,
    new_fat INTEGER,
    
    -- Change metadata
    changed_by_coach_email TEXT,
    change_reason TEXT,
    change_type TEXT CHECK (change_type IN ('create', 'update', 'delete')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to log changes
CREATE OR REPLACE FUNCTION log_macro_adjustment_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO coach_macro_adjustment_history (
            adjustment_id, new_calories, new_protein, new_carbs, new_fat,
            changed_by_coach_email, change_type
        ) VALUES (
            NEW.id, NEW.adjusted_calories, NEW.adjusted_protein, NEW.adjusted_carbs, NEW.adjusted_fat,
            NEW.coach_email, 'create'
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO coach_macro_adjustment_history (
            adjustment_id, 
            previous_calories, previous_protein, previous_carbs, previous_fat,
            new_calories, new_protein, new_carbs, new_fat,
            changed_by_coach_email, change_type
        ) VALUES (
            NEW.id,
            OLD.adjusted_calories, OLD.adjusted_protein, OLD.adjusted_carbs, OLD.adjusted_fat,
            NEW.adjusted_calories, NEW.adjusted_protein, NEW.adjusted_carbs, NEW.adjusted_fat,
            NEW.coach_email, 'update'
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_macro_adjustment_changes
    AFTER INSERT OR UPDATE ON coach_macro_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION log_macro_adjustment_changes();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('coach_macro_adjustments', 'coach_macro_adjustment_history');

-- Check if function was created successfully  
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_effective_client_macros';