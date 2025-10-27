# Progress Reports Feature - Backend Documentation Addition

## Overview
This document summarizes the Progress Reports feature addition to the Supabase backend on October 4, 2025.

## Database Schema Changes

### New Tables Added

#### 1. progress_reports
- **Purpose**: Store generated reports with metadata and processing status
- **Key Features**: Report type tracking, file storage links, generation time metrics
- **Relationships**: Links to coaches, clients, and report templates

#### 2. report_templates  
- **Purpose**: Customizable report templates for different report types
- **Key Features**: System vs custom templates, usage tracking, JSON configuration
- **Default Templates**: 3 system templates (Weekly, Monthly, Quick Check)

#### 3. report_metrics_cache
- **Purpose**: Performance optimization for complex metric calculations  
- **Key Features**: Adherence scores, macro breakdowns, streak tracking
- **Caching**: 7-day expiration with version control for cache invalidation

#### 4. report_shares
- **Purpose**: Secure report sharing with access controls
- **Key Features**: Token-based access, expiration controls, usage tracking
- **Security**: Unique share tokens with optional access limits

### New Functions Added

#### 1. calculate_client_report_metrics()
```sql
Parameters:
- p_client_user_id UUID
- p_client_email TEXT  
- p_client_anon_profile_id UUID
- p_date_from DATE
- p_date_to DATE

Returns: JSONB with comprehensive metrics including:
- Period information
- Macro consumption vs targets
- Adherence scores and tracking
- Daily meal breakdown data
```

#### 2. cleanup_expired_reports()
```sql
Purpose: Automated cleanup of expired data
Actions:
- Deletes expired report shares
- Removes expired metrics cache
- Archives old completed reports (1+ year)
Returns: Integer count of deleted records
```

### Security (RLS Policies)
- **Coaches**: Full access to their own reports and templates
- **Clients**: View-only access to reports about them  
- **System Templates**: Read access for all authenticated users
- **Report Shares**: Token-based access with email verification
- **Admins/Owners**: Full access to all data

### Performance Optimizations
- **Indexes**: 16 strategic indexes on commonly queried columns
- **Triggers**: Automatic timestamp updates and usage tracking
- **Constraints**: Data integrity checks and validation rules
- **Caching**: Intelligent cache system with version control

## Integration Points

### With Existing Tables
- `daily_meals` - Source data for report calculations
- `coach_assignments` - Coach-client relationship verification  
- `user_profiles` - User identification and role checking
- `anonymous_profiles` - Support for anonymous users
- Integrates with existing `get_effective_client_macros()` function

### With Frontend Features
- **Coach Dashboard**: Report generation and management interface
- **Client App**: Access to shared reports  
- **PDF Generation**: jsPDF and Chart.js integration planned
- **Export System**: Multiple format support (PDF, Excel, Web)

## Files Added to Documentation
- `progress-reports-schema-fixed.sql` - Complete SQL setup (20KB)
- `progress-reports-backend-addition.md` - This documentation file
- Updated `supabase-backend-setup.md` with new tables and relationships

## Verification Queries Results
✅ **Tables Created**: 4/4 (progress_reports, report_templates, report_metrics_cache, report_shares)  
✅ **Functions Created**: 2/2 (calculate_client_report_metrics, cleanup_expired_reports)  
✅ **System Templates**: 3/3 (Standard Weekly, Detailed Monthly, Quick Progress Check)

## Next Development Phase
Ready for UI implementation in coach dashboard with:
- Report generation interface
- Template selection and customization
- PDF export functionality  
- Report sharing management
- Performance metrics display

---
*Documentation completed October 4, 2025*