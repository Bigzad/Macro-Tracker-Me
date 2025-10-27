-- =====================================================
-- PROGRESS REPORTS DATABASE SCHEMA (FIXED VERSION)
-- =====================================================
-- This schema creates the Progress Reports feature for coaches
-- to generate detailed client analytics and reports
-- =====================================================

-- 1. CREATE PROGRESS REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS progress_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Report identification
    coach_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    coach_email TEXT NOT NULL,
    client_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_email TEXT,
    client_anon_profile_id UUID REFERENCES anonymous_profiles(id) ON DELETE CASCADE,
    
    -- Report configuration
    report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'custom', 'milestone')),
    report_title TEXT NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    
    -- Report processing
    report_status TEXT NOT NULL DEFAULT 'generating' CHECK (report_status IN ('generating', 'completed', 'failed', 'archived')),
    report_data JSONB DEFAULT '{}'::jsonb, -- Calculated metrics and analysis
    report_file_url TEXT, -- Link to generated PDF/file
    file_size_bytes BIGINT, -- Size of generated file
    
    -- Metadata
    template_id UUID, -- Reference to report template (nullable for default)
    generation_time_ms INTEGER, -- How long it took to generate
    error_message TEXT, -- Error details if generation failed
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- When file expires (optional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure report period makes sense
    CONSTRAINT valid_date_range CHECK (date_from <= date_to),
    CONSTRAINT valid_generation_time CHECK (generation_time_ms >= 0)
);

-- 2. CREATE REPORT TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template ownership
    coach_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system templates
    coach_email TEXT,
    
    -- Template configuration
    template_name TEXT NOT NULL,
    template_description TEXT,
    template_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Chart types, sections, branding, etc.
    
    -- Template settings
    is_default BOOLEAN DEFAULT false, -- Default template for this coach
    is_system_template BOOLEAN DEFAULT false, -- Built-in system template
    is_active BOOLEAN DEFAULT true, -- Template can be used
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0, -- How many times this template was used
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure template name is unique per coach (or globally for system templates)
    UNIQUE NULLS NOT DISTINCT (coach_user_id, template_name),
    
    -- System templates must have NULL coach_user_id
    CONSTRAINT system_template_no_coach CHECK (
        (is_system_template = false OR coach_user_id IS NULL)
    )
);

-- 3. CREATE REPORT METRICS CACHE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS report_metrics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Client identification
    client_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_email TEXT,
    client_anon_profile_id UUID REFERENCES anonymous_profiles(id) ON DELETE CASCADE,
    
    -- Cache period
    metric_date DATE NOT NULL,
    cache_period TEXT NOT NULL CHECK (cache_period IN ('daily', 'weekly', 'monthly')),
    
    -- Cached calculations
    daily_adherence_score NUMERIC(5,2), -- Overall adherence percentage (0-100)
    macro_breakdown JSONB DEFAULT '{}'::jsonb, -- Detailed macro consumption vs targets
    meal_timing_data JSONB DEFAULT '{}'::jsonb, -- When meals were consumed
    streak_data JSONB DEFAULT '{}'::jsonb, -- Consecutive days meeting goals
    progress_metrics JSONB DEFAULT '{}'::jsonb, -- Weight/measurement changes
    
    -- Cache metadata
    calculation_version INTEGER DEFAULT 1, -- For cache invalidation
    is_complete BOOLEAN DEFAULT false, -- All data for period is available
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Unique cache entry per client per date per period
    UNIQUE (client_user_id, metric_date, cache_period),
    UNIQUE (client_email, metric_date, cache_period),
    UNIQUE (client_anon_profile_id, metric_date, cache_period)
);

-- 4. CREATE REPORT SHARING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS report_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Report reference
    report_id UUID REFERENCES progress_reports(id) ON DELETE CASCADE,
    
    -- Sharing details
    shared_with_email TEXT NOT NULL,
    shared_by_coach_email TEXT NOT NULL,
    share_token TEXT NOT NULL UNIQUE, -- Secure token for access
    
    -- Access control
    can_download BOOLEAN DEFAULT true,
    access_count INTEGER DEFAULT 0, -- How many times accessed
    max_access_count INTEGER, -- Optional limit
    
    -- Timestamps
    expires_at TIMESTAMP WITH TIME ZONE, -- When share expires
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure valid access limits
    CONSTRAINT valid_access_limit CHECK (
        max_access_count IS NULL OR max_access_count > 0
    )
);

-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Progress Reports indexes
CREATE INDEX IF NOT EXISTS idx_progress_reports_coach ON progress_reports(coach_user_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_client ON progress_reports(client_user_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_coach_email ON progress_reports(coach_email);
CREATE INDEX IF NOT EXISTS idx_progress_reports_client_email ON progress_reports(client_email);
CREATE INDEX IF NOT EXISTS idx_progress_reports_date_range ON progress_reports(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_progress_reports_status ON progress_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_progress_reports_created ON progress_reports(created_at);

-- Report Templates indexes  
CREATE INDEX IF NOT EXISTS idx_report_templates_coach ON report_templates(coach_user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_report_templates_system ON report_templates(is_system_template);

-- Metrics Cache indexes
CREATE INDEX IF NOT EXISTS idx_metrics_cache_client_user ON report_metrics_cache(client_user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_client_email ON report_metrics_cache(client_email);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_date ON report_metrics_cache(metric_date);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_period ON report_metrics_cache(cache_period);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_expires ON report_metrics_cache(expires_at);

-- Report Shares indexes
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_email ON report_shares(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_report_shares_expires ON report_shares(expires_at);

-- 6. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update progress_reports updated_at trigger
CREATE OR REPLACE FUNCTION update_progress_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_progress_reports_updated_at
    BEFORE UPDATE ON progress_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_progress_reports_updated_at();

-- Update report_templates updated_at trigger
CREATE OR REPLACE FUNCTION update_report_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_report_templates_updated_at();

-- Update template usage when reports are created
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_id IS NOT NULL THEN
        UPDATE report_templates 
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = NEW.template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_usage
    AFTER INSERT ON progress_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_template_usage();

-- 7. CREATE ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- Progress Reports Policies
CREATE POLICY "Coaches can manage their own reports" ON progress_reports
    FOR ALL USING (
        coach_user_id = auth.uid() OR 
        coach_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Clients can view reports about them" ON progress_reports
    FOR SELECT USING (
        client_user_id = auth.uid() OR 
        client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Owners and admins have full report access" ON progress_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Report Templates Policies
CREATE POLICY "Coaches can manage their own templates" ON report_templates
    FOR ALL USING (
        coach_user_id = auth.uid() OR 
        is_system_template = true
    );

CREATE POLICY "Everyone can view system templates" ON report_templates
    FOR SELECT USING (is_system_template = true);

-- Metrics Cache Policies  
CREATE POLICY "Coaches can access cache for their clients" ON report_metrics_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM coach_assignments ca
            JOIN user_profiles up ON up.id = ca.coach_id
            WHERE up.user_id = auth.uid()
            AND ca.client_id = client_user_id
            AND ca.is_active = true
        )
    );

CREATE POLICY "Clients can view their own cache" ON report_metrics_cache
    FOR SELECT USING (
        client_user_id = auth.uid() OR 
        client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Report Shares Policies
CREATE POLICY "Coaches can manage shares for their reports" ON report_shares
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM progress_reports pr
            WHERE pr.id = report_id
            AND (pr.coach_user_id = auth.uid() OR 
                 pr.coach_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    );

CREATE POLICY "Shared recipients can view shared reports" ON report_shares
    FOR SELECT USING (
        shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- 8. INSERT DEFAULT SYSTEM TEMPLATES
-- =====================================================
INSERT INTO report_templates (
    template_name,
    template_description,
    template_config,
    is_system_template,
    is_default
) VALUES 
(
    'Standard Weekly Report',
    'Basic weekly progress report with macro adherence and key metrics',
    '{
        "sections": ["summary", "macro_analysis", "daily_breakdown", "recommendations"],
        "charts": ["adherence_trend", "macro_distribution"],
        "date_range": "week",
        "include_progress_photos": false,
        "include_measurements": true,
        "branding": {
            "show_logo": true,
            "color_scheme": "blue",
            "footer_text": "Generated by AI Macro Tracker"
        }
    }'::jsonb,
    true,
    true
),
(
    'Detailed Monthly Report', 
    'Comprehensive monthly analysis with trends, comparisons, and detailed insights',
    '{
        "sections": ["executive_summary", "macro_analysis", "progress_tracking", "behavioral_insights", "goal_progress", "recommendations", "next_month_plan"],
        "charts": ["adherence_trend", "macro_distribution", "weekly_comparison", "progress_timeline"],
        "date_range": "month",
        "include_progress_photos": true,
        "include_measurements": true,
        "include_coach_notes": true,
        "branding": {
            "show_logo": true,
            "color_scheme": "green",
            "footer_text": "Generated by AI Macro Tracker"
        }
    }'::jsonb,
    true,
    false
),
(
    'Quick Progress Check',
    'Simple one-page summary for quick client check-ins',
    '{
        "sections": ["summary", "key_metrics"],
        "charts": ["adherence_gauge"],
        "date_range": "week",
        "include_progress_photos": false,
        "include_measurements": false,
        "page_layout": "single_page",
        "branding": {
            "show_logo": false,
            "color_scheme": "minimal",
            "footer_text": ""
        }
    }'::jsonb,
    true,
    false
) ON CONFLICT DO NOTHING;

-- 9. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to generate report metrics for a client in a date range
CREATE OR REPLACE FUNCTION calculate_client_report_metrics(
    p_client_user_id UUID DEFAULT NULL,
    p_client_email TEXT DEFAULT NULL,
    p_client_anon_profile_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::jsonb;
    daily_data JSONB[];
    macro_totals JSONB;
    adherence_scores NUMERIC[];
    avg_adherence NUMERIC;
BEGIN
    -- Validate inputs
    IF p_date_from IS NULL OR p_date_to IS NULL THEN
        RAISE EXCEPTION 'Date range is required';
    END IF;
    
    IF p_date_from > p_date_to THEN
        RAISE EXCEPTION 'Start date cannot be after end date';
    END IF;
    
    -- Get daily meal data and calculate metrics for each day
    WITH daily_meals AS (
        SELECT 
            dm.meal_date,
            SUM(dm.calories) as consumed_calories,
            SUM(dm.protein) as consumed_protein,
            SUM(dm.carbs) as consumed_carbs,
            SUM(dm.fat) as consumed_fat,
            COUNT(*) as meal_count
        FROM daily_meals dm
        WHERE dm.meal_date BETWEEN p_date_from AND p_date_to
        AND (
            (p_client_user_id IS NOT NULL AND dm.user_id = p_client_user_id) OR
            (p_client_email IS NOT NULL AND dm.user_email = p_client_email) OR
            (p_client_anon_profile_id IS NOT NULL AND dm.anon_profile_id = p_client_anon_profile_id)
        )
        GROUP BY dm.meal_date
    ),
    daily_with_targets AS (
        SELECT 
            dm.*,
            COALESCE(em.calories, 2000) as target_calories,
            COALESCE(em.protein, 150) as target_protein,
            COALESCE(em.carbs, 200) as target_carbs,
            COALESCE(em.fat, 67) as target_fat
        FROM daily_meals dm
        CROSS JOIN LATERAL get_effective_client_macros(
            p_client_user_id := p_client_user_id,
            p_client_email := p_client_email,
            p_client_anon_profile_id := p_client_anon_profile_id
        ) em
    )
    SELECT 
        jsonb_build_object(
            'period', jsonb_build_object(
                'start_date', p_date_from,
                'end_date', p_date_to,
                'total_days', (p_date_to - p_date_from) + 1
            ),
            'macro_totals', jsonb_build_object(
                'consumed', jsonb_build_object(
                    'calories', COALESCE(SUM(dwt.consumed_calories), 0),
                    'protein', COALESCE(SUM(dwt.consumed_protein), 0),
                    'carbs', COALESCE(SUM(dwt.consumed_carbs), 0),
                    'fat', COALESCE(SUM(dwt.consumed_fat), 0)
                ),
                'targets', jsonb_build_object(
                    'calories', COALESCE(AVG(dwt.target_calories) * COUNT(*), 0),
                    'protein', COALESCE(AVG(dwt.target_protein) * COUNT(*), 0),
                    'carbs', COALESCE(AVG(dwt.target_carbs) * COUNT(*), 0),
                    'fat', COALESCE(AVG(dwt.target_fat) * COUNT(*), 0)
                )
            ),
            'adherence', jsonb_build_object(
                'average_score', COALESCE(AVG(
                    (LEAST(dwt.consumed_calories / NULLIF(dwt.target_calories, 0), 1.2) + 
                     LEAST(dwt.consumed_protein / NULLIF(dwt.target_protein, 0), 1.2) +
                     LEAST(dwt.consumed_carbs / NULLIF(dwt.target_carbs, 0), 1.2) +
                     LEAST(dwt.consumed_fat / NULLIF(dwt.target_fat, 0), 1.2)) / 4 * 100
                ), 0),
                'days_logged', COUNT(*),
                'days_on_track', COUNT(*) FILTER (WHERE 
                    dwt.consumed_calories BETWEEN dwt.target_calories * 0.9 AND dwt.target_calories * 1.1
                )
            ),
            'meal_data', jsonb_agg(
                jsonb_build_object(
                    'date', dwt.meal_date,
                    'consumed', jsonb_build_object(
                        'calories', dwt.consumed_calories,
                        'protein', dwt.consumed_protein,
                        'carbs', dwt.consumed_carbs,
                        'fat', dwt.consumed_fat
                    ),
                    'targets', jsonb_build_object(
                        'calories', dwt.target_calories,
                        'protein', dwt.target_protein,
                        'carbs', dwt.target_carbs,
                        'fat', dwt.target_fat
                    ),
                    'meal_count', dwt.meal_count
                ) ORDER BY dwt.meal_date
            )
        )
    INTO result
    FROM daily_with_targets dwt;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired reports and cache
CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete expired report shares
    DELETE FROM report_shares 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- Delete expired metrics cache
    DELETE FROM report_metrics_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Archive old completed reports (older than 1 year)
    UPDATE progress_reports 
    SET report_status = 'archived'
    WHERE report_status = 'completed' 
    AND created_at < NOW() - INTERVAL '1 year';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if all tables were created successfully
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('progress_reports', 'report_templates', 'report_metrics_cache', 'report_shares');

-- Check if functions were created successfully
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('calculate_client_report_metrics', 'cleanup_expired_reports');

-- Check if system templates were inserted
SELECT template_name, is_system_template, is_default 
FROM report_templates 
WHERE is_system_template = true;