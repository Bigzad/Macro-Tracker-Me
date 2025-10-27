-- =====================================================
-- COACH MACRO ADJUSTMENTS - USAGE EXAMPLES
-- =====================================================
-- This file contains example queries and operations for the
-- coach macro adjustments feature
-- =====================================================

-- 1. EXAMPLE: CREATE A COACH MACRO ADJUSTMENT
-- =====================================================
-- When a coach wants to adjust macros for a client

INSERT INTO coach_macro_adjustments (
    client_user_id,
    client_email,
    coach_user_id, 
    coach_email,
    adjusted_calories,
    adjusted_protein,
    adjusted_carbs,
    adjusted_fat,
    adjustment_reason,
    original_ai_calories,
    original_ai_protein,
    original_ai_carbs,
    original_ai_fat
) VALUES (
    'client-uuid-here',
    'client@example.com',
    'coach-uuid-here',
    'coach@example.com',
    2200,  -- Adjusted calories
    140,   -- Adjusted protein  
    275,   -- Adjusted carbs
    73,    -- Adjusted fat
    'Increased calories for bulk phase, adjusted protein for strength goals',
    2000,  -- Original AI calories
    120,   -- Original AI protein
    250,   -- Original AI carbs
    67     -- Original AI fat
) ON CONFLICT (client_user_id, coach_user_id) 
DO UPDATE SET
    adjusted_calories = EXCLUDED.adjusted_calories,
    adjusted_protein = EXCLUDED.adjusted_protein,
    adjusted_carbs = EXCLUDED.adjusted_carbs,
    adjusted_fat = EXCLUDED.adjusted_fat,
    adjustment_reason = EXCLUDED.adjustment_reason,
    updated_at = NOW();

-- 2. EXAMPLE: GET EFFECTIVE MACROS FOR A CLIENT
-- =====================================================
-- This will return coach-adjusted macros if they exist,
-- otherwise AI-generated macros

SELECT * FROM get_effective_client_macros(
    p_client_user_id := 'client-uuid-here'
);

-- OR using email
SELECT * FROM get_effective_client_macros(
    p_client_email := 'client@example.com'
);

-- 3. EXAMPLE: GET ALL CLIENT MACROS FOR A COACH'S DASHBOARD
-- =====================================================
-- This query gets all clients assigned to a coach with their effective macros

WITH coach_clients AS (
    SELECT DISTINCT
        COALESCE(up.user_id, up_email.id) as client_user_id,
        COALESCE(up.email, ca.client_email) as client_email,
        up.display_name as client_name
    FROM coach_assignments ca
    LEFT JOIN user_profiles up ON up.id = ca.client_id
    LEFT JOIN auth.users up_email ON up_email.email = ca.client_email
    WHERE ca.coach_id = (
        SELECT id FROM user_profiles WHERE user_id = 'coach-uuid-here'
    )
    AND ca.is_active = true
)
SELECT 
    cc.client_user_id,
    cc.client_email, 
    cc.client_name,
    em.calories,
    em.protein,
    em.carbs,
    em.fat,
    em.source,
    em.adjusted_by_coach_email,
    em.adjustment_reason,
    em.last_updated
FROM coach_clients cc
CROSS JOIN LATERAL get_effective_client_macros(
    p_client_user_id := cc.client_user_id,
    p_client_email := cc.client_email
) em;

-- 4. EXAMPLE: UPDATE EXISTING COACH ADJUSTMENT
-- =====================================================

UPDATE coach_macro_adjustments 
SET 
    adjusted_calories = 2300,
    adjusted_protein = 150,
    adjustment_reason = 'Increased calories and protein for enhanced muscle building'
WHERE client_email = 'client@example.com' 
AND coach_email = 'coach@example.com';

-- 5. EXAMPLE: REMOVE COACH ADJUSTMENT (REVERT TO AI)
-- =====================================================
-- Delete the adjustment to fall back to AI-generated macros

DELETE FROM coach_macro_adjustments 
WHERE client_email = 'client@example.com' 
AND coach_email = 'coach@example.com';

-- 6. EXAMPLE: VIEW ADJUSTMENT HISTORY
-- =====================================================

SELECT 
    cma.client_email,
    cma.coach_email,
    cmah.change_type,
    cmah.previous_calories,
    cmah.new_calories,
    cmah.change_reason,
    cmah.created_at
FROM coach_macro_adjustment_history cmah
JOIN coach_macro_adjustments cma ON cmah.adjustment_id = cma.id
WHERE cma.client_email = 'client@example.com'
ORDER BY cmah.created_at DESC;

-- 7. EXAMPLE: BULK MACRO ADJUSTMENTS
-- =====================================================
-- Apply similar adjustments to multiple clients

WITH macro_template AS (
    SELECT 
        2200 as base_calories,
        140 as base_protein,
        275 as base_carbs,
        73 as base_fat
),
coach_clients AS (
    SELECT client_email FROM coach_assignments ca
    JOIN user_profiles up ON up.id = ca.coach_id
    WHERE up.user_id = 'coach-uuid-here' AND ca.is_active = true
)
INSERT INTO coach_macro_adjustments (
    client_email,
    coach_email,
    adjusted_calories,
    adjusted_protein,
    adjusted_carbs,
    adjusted_fat,
    adjustment_reason
)
SELECT 
    cc.client_email,
    'coach@example.com',
    mt.base_calories,
    mt.base_protein,
    mt.base_carbs,
    mt.base_fat,
    'Bulk macro adjustment template applied'
FROM coach_clients cc
CROSS JOIN macro_template mt
ON CONFLICT (client_email, coach_email) DO NOTHING;

-- 8. EXAMPLE: COMPARE AI VS COACH ADJUSTMENTS
-- =====================================================

SELECT 
    cma.client_email,
    -- AI Generated (Original)
    cma.original_ai_calories as ai_calories,
    cma.original_ai_protein as ai_protein,
    cma.original_ai_carbs as ai_carbs,
    cma.original_ai_fat as ai_fat,
    
    -- Coach Adjusted
    cma.adjusted_calories as coach_calories,
    cma.adjusted_protein as coach_protein,
    cma.adjusted_carbs as coach_carbs,
    cma.adjusted_fat as coach_fat,
    
    -- Differences
    (cma.adjusted_calories - cma.original_ai_calories) as calorie_diff,
    (cma.adjusted_protein - cma.original_ai_protein) as protein_diff,
    (cma.adjusted_carbs - cma.original_ai_carbs) as carb_diff,
    (cma.adjusted_fat - cma.original_ai_fat) as fat_diff,
    
    cma.adjustment_reason,
    cma.updated_at
FROM coach_macro_adjustments cma
WHERE cma.coach_email = 'coach@example.com'
ORDER BY cma.updated_at DESC;

-- 9. EXAMPLE: GET CLIENT'S CURRENT VS TARGET PROGRESS
-- =====================================================
-- Compare what client consumed vs their effective targets (AI or coach-adjusted)

WITH client_effective_macros AS (
    SELECT * FROM get_effective_client_macros(
        p_client_email := 'client@example.com'
    )
),
client_consumed_today AS (
    SELECT 
        COALESCE(SUM(calories), 0) as consumed_calories,
        COALESCE(SUM(protein), 0) as consumed_protein,
        COALESCE(SUM(carbs), 0) as consumed_carbs,
        COALESCE(SUM(fat), 0) as consumed_fat,
        COUNT(*) as meal_count
    FROM daily_meals
    WHERE user_email = 'client@example.com'
    AND meal_date = CURRENT_DATE
)
SELECT 
    -- Targets
    cem.calories as target_calories,
    cem.protein as target_protein,
    cem.carbs as target_carbs,
    cem.fat as target_fat,
    cem.source as target_source,
    
    -- Consumed
    cct.consumed_calories,
    cct.consumed_protein,
    cct.consumed_carbs,
    cct.consumed_fat,
    cct.meal_count,
    
    -- Progress percentages
    ROUND((cct.consumed_calories::decimal / cem.calories) * 100, 1) as calorie_progress,
    ROUND((cct.consumed_protein::decimal / cem.protein) * 100, 1) as protein_progress,
    ROUND((cct.consumed_carbs::decimal / cem.carbs) * 100, 1) as carb_progress,
    ROUND((cct.consumed_fat::decimal / cem.fat) * 100, 1) as fat_progress
FROM client_effective_macros cem
CROSS JOIN client_consumed_today cct;