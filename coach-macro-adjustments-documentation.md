# 🎯 Coach Macro Adjustments Feature Documentation

## Overview
This feature allows coaches to override AI-generated macros for their clients while maintaining the original AI calculations as a baseline for reference and historical comparison.

## 🗄️ Database Schema

### Primary Table: `coach_macro_adjustments`
Stores coach-customized macro values that override AI-generated targets.

**Key Fields:**
- `client_user_id`, `client_email`, `client_anon_profile_id` - Client identification
- `coach_user_id`, `coach_email` - Coach identification  
- `adjusted_calories`, `adjusted_protein`, `adjusted_carbs`, `adjusted_fat` - Coach-set values
- `original_ai_calories`, `original_ai_protein`, `original_ai_carbs`, `original_ai_fat` - AI baseline snapshot
- `adjustment_reason` - Optional coach note explaining the change
- `created_at`, `updated_at` - Timestamps

### Audit Table: `coach_macro_adjustment_history`
Tracks all changes made to macro adjustments for accountability and rollback capability.

**Key Fields:**
- `adjustment_id` - Links to main adjustment record
- `previous_*` and `new_*` values - Before/after comparison
- `change_type` - 'create', 'update', or 'delete'
- `changed_by_coach_email` - Who made the change

## 🔧 Core Functions

### `get_effective_client_macros()`
**Database Function** - Returns the effective macros for a client:
1. **First Priority**: Coach-adjusted values (if they exist)
2. **Fallback**: AI-generated values from `daily_targets`

**Returns:**
- Macro values (calories, protein, carbs, fat)
- Source type ('coach_adjusted' or 'ai_generated')  
- Coach information (if adjusted)
- Last updated timestamp

### Backend Integration
The existing `fetchClientMacrosForDate()` function now:
1. Calls `get_effective_client_macros()` via Supabase RPC
2. Falls back to original `daily_targets` query if RPC fails
3. Returns additional metadata: `macroSource`, `adjustedBy`, `adjustmentReason`

## 🎨 User Interface Features

### Client Cards Enhancement
Each client card now displays:

**Visual Indicators:**
- 🤖 **AI Generated Targets** - Gray badge for AI-calculated macros
- 👨‍🎓 **Coach Adjusted** - Blue badge for coach-customized macros (shows adjustment reason)

**Action Buttons:**
- 📝 **"Adjust Macros"** - Opens macro adjustment modal
- 📊 **"View Details"** - Existing client details functionality

### Macro Adjustment Modal
**Full-featured modal interface:**

**Client Information Section:**
- Client name and email display
- Current target source indicator (AI vs Coach-adjusted)

**Macro Input Form:**
- 🔥 **Calories** (800-5000 range, step: 50)
- 🥩 **Protein** (50-300g range, step: 5) 
- 🍞 **Carbohydrates** (50-400g range, step: 5)
- 🧀 **Fat** (20-200g range, step: 5)
- 💭 **Adjustment Reason** (optional 200-char textarea)

**Validation:**
- Min/max value enforcement
- Required field validation  
- Reasonable range recommendations displayed

**Action Buttons:**
- 💾 **"Save Changes"** - Creates/updates coach adjustment
- ↩️ **"Revert to AI"** - Removes coach adjustment, returns to AI values
- ❌ **"Cancel"** - Closes modal without changes

**User Experience:**
- ESC key closes modal
- Background scroll prevention when modal open
- Form auto-population with current values
- Success/error notifications via professional notification system

## 🔄 Business Logic Flow

### Viewing Client Macros:
1. Dashboard loads client list
2. For each client, calls `get_effective_client_macros()`
3. Function checks for coach adjustments first
4. Falls back to AI values if no coach adjustments exist
5. Returns appropriate values with source metadata
6. UI displays values with correct visual indicators

### Adjusting Client Macros:
1. Coach clicks "Adjust Macros" on client card
2. Modal opens with current values (AI or previously adjusted)
3. Coach modifies values and adds optional reason
4. Form validation ensures reasonable ranges
5. Save action creates/updates record in `coach_macro_adjustments`
6. Original AI values are snapshot for comparison
7. Dashboard refreshes to show new "Coach Adjusted" indicator
8. Change is logged in audit history

### Reverting to AI Macros:
1. Coach clicks "Revert to AI" in adjustment modal
2. Confirmation dialog prevents accidental reverts
3. Coach adjustment record is deleted
4. System automatically falls back to AI-generated values
5. Dashboard refreshes to show "AI Generated" indicator

## 🛡️ Security & Permissions

### Row Level Security (RLS) Policies:
- **Coaches**: Can manage adjustments for their assigned clients only
- **Clients**: Can view (read-only) adjustments made for them  
- **Owners/Admins**: Full access to all macro adjustments
- **Anonymous**: No access to adjustment data

### Data Validation:
- **Database Constraints**: Enforce positive values and reasonable ranges
- **Frontend Validation**: Real-time input validation with user feedback
- **Backend Validation**: Server-side checks before database writes

## 📊 Usage Examples

### Creating an Adjustment:
```javascript
// Coach adjusts client macros to 2200 calories, 140g protein
const adjustment = {
    client_email: 'client@example.com',
    adjusted_calories: 2200,
    adjusted_protein: 140,
    adjusted_carbs: 275, 
    adjusted_fat: 73,
    adjustment_reason: 'Increased calories for bulk phase'
};
```

### Querying Effective Macros:
```sql
-- Always returns the "right" macros (coach-adjusted if exist, AI if not)
SELECT * FROM get_effective_client_macros(
    p_client_email := 'client@example.com'
);
```

### Dashboard Integration:
```javascript
// Existing dashboard code now automatically gets effective macros
const macroData = await fetchClientMacrosForDate(clientEmail, selectedDate);
// macroData.macroSource = 'coach_adjusted' or 'ai_generated'
// macroData.adjustedBy = coach email (if adjusted)
// macroData.adjustmentReason = explanation (if provided)
```

## 🚀 Benefits Achieved

### For Coaches:
- ✅ **Personalize client targets** based on individual needs
- ✅ **Override AI calculations** when professional judgment differs
- ✅ **Track adjustment reasoning** for client communication
- ✅ **Easy revert capability** to return to AI baseline
- ✅ **Clear visual feedback** on what's been customized

### For Clients:  
- ✅ **More accurate targets** based on coach expertise
- ✅ **Transparency** - can see when targets are coach-adjusted
- ✅ **Consistency** - targets remain stable until coach changes them

### For System:
- ✅ **Data integrity** - AI values never lost or overwritten
- ✅ **Audit trail** - Complete history of all changes
- ✅ **Backwards compatibility** - Existing functionality unchanged
- ✅ **Scalability** - Efficient lookup with proper indexing

## 🧪 Testing Checklist

### Database Testing:
- [ ] Run schema creation SQL successfully
- [ ] Verify RLS policies work correctly for different roles
- [ ] Test function `get_effective_client_macros()` with various scenarios
- [ ] Confirm audit history logging works on create/update/delete

### UI Testing:
- [ ] Client cards display correct visual indicators
- [ ] Modal opens/closes properly with ESC key
- [ ] Form validation prevents invalid inputs
- [ ] Success/error notifications appear appropriately
- [ ] Dashboard refreshes after macro adjustments

### Integration Testing:
- [ ] Existing dashboard functionality remains unchanged
- [ ] Coach-adjusted values override AI values correctly
- [ ] Fallback to AI values works when adjustments don't exist
- [ ] Revert functionality properly removes coach adjustments

### Performance Testing:
- [ ] Dashboard load time remains acceptable with new queries
- [ ] RPC function performs efficiently at scale
- [ ] Database indexes provide good query performance

## 📈 Future Enhancements

### Potential Additions:
- **Bulk Macro Adjustment** - Apply templates to multiple clients
- **Macro Scheduling** - Set different targets for different days/periods
- **Client Notifications** - Alert clients when targets are adjusted
- **Advanced Analytics** - Compare AI vs coach-adjusted performance
- **Macro Templates** - Save/reuse common adjustment patterns
- **Goal Progression** - Gradual macro changes over time periods

### Integration Opportunities:
- **Mobile App Support** - Extend adjustments to mobile coach interface
- **Client Portal** - Allow clients to view adjustment history and reasoning
- **Reporting Dashboard** - Analytics on coaching effectiveness vs AI baseline
- **API Endpoints** - Enable third-party integrations for macro management