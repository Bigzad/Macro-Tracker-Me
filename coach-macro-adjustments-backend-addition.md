---

# 🎯 COACH MACRO ADJUSTMENTS FEATURE - NEW DATABASE ELEMENTS

*Added: October 3, 2025*  
*Feature: Allows coaches to override AI-generated macros for clients while preserving original AI calculations*

## NEW TABLES ADDED

### 1. coach_macro_adjustments
**Purpose**: Stores coach-customized macro values that override AI-generated targets

| column_name              | data_type                | is_nullable | column_default      | constraints/notes                    |
| ------------------------ | ------------------------ | ----------- | ------------------- | ------------------------------------ |
| id                       | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY                          |
| client_user_id           | uuid                     | YES         | null                | REFERENCES auth.users(id) CASCADE   |
| client_email             | text                     | YES         | null                |                                      |
| client_anon_profile_id   | uuid                     | YES         | null                | REFERENCES anonymous_profiles(id)    |
| coach_user_id            | uuid                     | YES         | null                | REFERENCES auth.users(id) SET NULL  |
| coach_email              | text                     | NO          | null                | NOT NULL                             |
| adjusted_calories        | integer                  | NO          | null                | CHECK (adjusted_calories > 0)       |
| adjusted_protein         | integer                  | NO          | null                | CHECK (adjusted_protein >= 0)       |
| adjusted_carbs           | integer                  | NO          | null                | CHECK (adjusted_carbs >= 0)         |
| adjusted_fat             | integer                  | NO          | null                | CHECK (adjusted_fat >= 0)           |
| adjustment_reason        | text                     | YES         | null                | Optional coach note                  |
| unit_system              | text                     | YES         | 'imperial'::text    | CHECK IN ('imperial', 'metric')     |
| original_ai_calories     | integer                  | YES         | null                | Snapshot of AI values                |
| original_ai_protein      | integer                  | YES         | null                | Snapshot of AI values                |
| original_ai_carbs        | integer                  | YES         | null                | Snapshot of AI values                |
| original_ai_fat          | integer                  | YES         | null                | Snapshot of AI values                |
| created_at               | timestamp with time zone | YES         | now()               |                                      |
| updated_at               | timestamp with time zone | YES         | now()               | Auto-updated via trigger             |

**UNIQUE CONSTRAINTS**:
- `UNIQUE(client_user_id, coach_user_id)` - One adjustment per client-coach pair
- `UNIQUE(client_email, coach_email)` - One adjustment per client-coach email pair  
- `UNIQUE(client_anon_profile_id, coach_user_id)` - One adjustment per anon client-coach pair

### 2. coach_macro_adjustment_history
**Purpose**: Audit trail tracking all changes made to macro adjustments

| column_name              | data_type                | is_nullable | column_default      | constraints/notes                    |
| ------------------------ | ------------------------ | ----------- | ------------------- | ------------------------------------ |
| id                       | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY                          |
| adjustment_id            | uuid                     | YES         | null                | REFERENCES coach_macro_adjustments   |
| previous_calories        | integer                  | YES         | null                | Values before change                 |
| previous_protein         | integer                  | YES         | null                | Values before change                 |
| previous_carbs           | integer                  | YES         | null                | Values before change                 |
| previous_fat             | integer                  | YES         | null                | Values before change                 |
| new_calories             | integer                  | YES         | null                | Values after change                  |
| new_protein              | integer                  | YES         | null                | Values after change                  |
| new_carbs                | integer                  | YES         | null                | Values after change                  |
| new_fat                  | integer                  | YES         | null                | Values after change                  |
| changed_by_coach_email   | text                     | YES         | null                | Who made the change                  |
| change_reason            | text                     | YES         | null                | Why the change was made              |
| change_type              | text                     | YES         | null                | CHECK IN ('create', 'update', 'delete') |
| created_at               | timestamp with time zone | YES         | now()               |                                      |

## NEW INDEXES ADDED

### Performance Indexes on coach_macro_adjustments:
- `idx_coach_macro_adj_client_user` ON (client_user_id)
- `idx_coach_macro_adj_client_email` ON (client_email)  
- `idx_coach_macro_adj_coach` ON (coach_user_id)
- `idx_coach_macro_adj_updated` ON (updated_at)

### Automatic Indexes (from constraints):
- `coach_macro_adjustments_pkey` (PRIMARY KEY on id)
- `coach_macro_adjustments_client_user_id_coach_user_id_key` (UNIQUE constraint)
- `coach_macro_adjustments_client_email_coach_email_key` (UNIQUE constraint)
- `coach_macro_adjustments_client_anon_profile_id_coach_user_i_key` (UNIQUE constraint)

## NEW FUNCTIONS ADDED

### get_effective_client_macros()
**Purpose**: Smart function that returns coach-adjusted macros if they exist, otherwise AI-generated macros

**Parameters**:
- `p_client_user_id UUID DEFAULT NULL`
- `p_client_email TEXT DEFAULT NULL`  
- `p_client_anon_profile_id UUID DEFAULT NULL`

**Returns**:
```sql
TABLE (
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    source TEXT, -- 'coach_adjusted' or 'ai_generated'
    adjusted_by_coach_email TEXT,
    adjustment_reason TEXT,
    last_updated TIMESTAMP WITH TIME ZONE
)
```

**Priority Logic**:
1. First checks for coach-adjusted macros in `coach_macro_adjustments`
2. If found, returns coach values with source = 'coach_adjusted'
3. If not found, falls back to AI values from `daily_targets` with source = 'ai_generated'

## NEW RLS POLICIES ADDED

### coach_macro_adjustments Table Policies:

1. **"Coaches can manage their own macro adjustments"**
   - **Scope**: FOR ALL (SELECT, INSERT, UPDATE, DELETE)
   - **Rule**: `coach_user_id = auth.uid() OR coach_email = (SELECT email FROM auth.users WHERE id = auth.uid())`
   - **Purpose**: Coaches can only manage adjustments for their assigned clients

2. **"Clients can view their macro adjustments"** 
   - **Scope**: FOR SELECT (read-only)
   - **Rule**: `client_user_id = auth.uid() OR client_email = (SELECT email FROM auth.users WHERE id = auth.uid())`
   - **Purpose**: Clients can see adjustments made for them (transparency)

3. **"Owners and admins have full access to macro adjustments"**
   - **Scope**: FOR ALL (SELECT, INSERT, UPDATE, DELETE)  
   - **Rule**: `EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))`
   - **Purpose**: Owners and admins have unrestricted access for management

### RLS Status:
- `coach_macro_adjustments`: **ENABLED** ✅
- `coach_macro_adjustment_history`: **Inherits from parent table**

## NEW TRIGGERS ADDED

### 1. Updated At Trigger (coach_macro_adjustments)
**Function**: `update_coach_macro_adjustments_updated_at()`
**Trigger**: `trigger_update_coach_macro_adjustments_updated_at`
**Purpose**: Automatically updates `updated_at` timestamp on record changes

### 2. Audit History Trigger (coach_macro_adjustments)  
**Function**: `log_macro_adjustment_changes()`
**Trigger**: `trigger_log_macro_adjustment_changes`
**Purpose**: Automatically logs all INSERT/UPDATE operations to audit history table

## INTEGRATION POINTS

### Coach Dashboard Integration:
- Modified `fetchClientMacrosForDate()` to use `get_effective_client_macros()`
- Added macro adjustment modal UI with form validation
- Added visual indicators for AI vs Coach-adjusted macro sources
- Added "Adjust Macros" and "Revert to AI" functionality

### Client App Integration:  
- Modified `loadDailyTargets()` to use `get_effective_client_macros()`
- Clients automatically see coach-adjusted macros when available
- Seamless fallback to AI-generated macros when no adjustments exist
- No UI changes required - works transparently

## VERIFICATION QUERIES

### Check New Tables Exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('coach_macro_adjustments', 'coach_macro_adjustment_history');
```

### Check Function Exists:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_effective_client_macros';
```

### Check RLS Policies:
```sql
SELECT policyname, cmd, roles FROM pg_policies 
WHERE tablename = 'coach_macro_adjustments';
```

### Test Priority Logic:
```sql
-- Should return coach values if adjustments exist, AI values if not
SELECT * FROM get_effective_client_macros(p_client_email := 'test@example.com');
```

---

## ⚠️ IMPORTANT FOR FUTURE DEVELOPMENT

### **DO NOT RECREATE** - These Already Exist:
- ✅ `coach_macro_adjustments` table
- ✅ `coach_macro_adjustment_history` table  
- ✅ `get_effective_client_macros()` function
- ✅ RLS policies for macro adjustments
- ✅ Triggers and indexes

### **Best Practices for New Features**:
- Always use `get_effective_client_macros()` when fetching macro targets
- Check this documentation before adding new RLS policies to avoid conflicts
- Consider coach adjustments vs AI-generated values in all macro-related features
- Use the audit history table pattern for other sensitive data modifications

### **Integration Guidelines**:
- Coach dashboards should use `get_effective_client_macros()` 
- Client apps should use `get_effective_client_macros()`
- Always provide fallback to AI values if coach adjustments don't exist
- Maintain transparency about whether values are AI or coach-adjusted