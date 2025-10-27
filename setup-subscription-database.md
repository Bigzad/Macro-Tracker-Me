# 🚀 Subscription System Database Setup Guide

## Step-by-Step Instructions

### 1. **Access Your Supabase Dashboard**
- Go to [supabase.com](https://supabase.com)
- Navigate to your project: `xnpsjajyjtczlxciatfy`
- Click on **"SQL Editor"** in the left sidebar

### 2. **Run the Database Schema**
- Copy the entire contents of `database-subscription-schema.sql`
- Paste it into the SQL Editor
- Click **"Run"** to execute the schema

### 3. **Verify Tables Were Created**
Go to **"Table Editor"** and confirm these new tables exist:
- ✅ `subscription_plans` (with 5 plans: 2 client + 3 coach)
- ✅ `user_subscriptions`
- ✅ `coach_client_assignments`
- ✅ `subscription_overages`  
- ✅ `webhook_events`

### 4. **Check User Profiles Table**
In the `user_profiles` table, verify these new columns were added:
- ✅ `user_type` (client/coach/admin)
- ✅ `subscription_status` (active/inactive/trial/expired/canceled)
- ✅ `subscription_expires_at` (timestamp)
- ✅ `stripe_customer_id` (text)
- ✅ `assigned_coach_id` (UUID reference)

## 📊 Your Subscription Plans (Already Inserted)

### **Client Plans (B2C)**
| Plan Code | Name | Price | Billing |
|-----------|------|-------|---------|
| `client_monthly` | Client Monthly | $9.99 | Monthly |
| `client_annual` | Client Annual | $79.99 | Annual (2 months free!) |

### **Coach Plans (B2B)**
| Plan Code | Name | Price | Client Limit |
|-----------|------|-------|--------------|
| `coach_starter` | Coach Starter | $29.00 | 5 clients |
| `coach_pro` | Coach Pro | $59.00 | 20 clients |
| `coach_elite` | Coach Elite | $99.00 | 50 clients |

**Overage Rule**: $2.00/client/month above plan limits

## 🔒 Security Features Included

### **Row Level Security (RLS)**
- ✅ Users can only see their own subscriptions
- ✅ Coaches can only manage their own clients
- ✅ Plans are publicly readable (for pricing display)
- ✅ Webhook events are admin-only

### **Data Integrity**
- ✅ Foreign key constraints
- ✅ Check constraints for valid values
- ✅ Unique constraints prevent duplicates
- ✅ Indexes for fast queries

## 📈 Helpful Views Created

### **`coach_active_client_count`**
```sql
SELECT * FROM coach_active_client_count;
```
Shows each coach's current client count for overage calculations.

### **`user_subscription_details`**
```sql  
SELECT * FROM user_subscription_details WHERE user_id = 'your-user-id';
```
Complete subscription info including plan details and client counts.

## 🧪 Test Queries

### **View All Plans**
```sql
SELECT plan_code, plan_name, price_cents/100 as price_dollars, client_limit 
FROM subscription_plans 
ORDER BY plan_type, price_cents;
```

### **Check Your User Profile**
```sql
SELECT user_type, subscription_status, subscription_expires_at, assigned_coach_id
FROM user_profiles 
WHERE email = 'your-email@example.com';
```

### **Test Coach Client Assignment**
```sql
-- This would be done via your app, but you can test manually:
INSERT INTO coach_client_assignments (coach_id, client_id, status)
VALUES ('coach-user-id', 'client-user-id', 'active');
```

## ⚠️ Important Notes

1. **Stripe Integration**: The `stripe_price_id` fields are NULL for now. We'll populate these when you set up Stripe.

2. **Existing Users**: Current users will have default values:
   - `user_type`: 'client'  
   - `subscription_status`: 'inactive'
   - No subscription expiry date

3. **Gradual Rollout**: The system is designed to fail gracefully. Existing functionality won't break.

## 🔧 Troubleshooting

### **If Schema Fails to Run:**
1. Check for any existing tables with the same names
2. Ensure you have admin privileges in Supabase  
3. Run sections separately if the full script fails

### **If RLS Policies Block Access:**
- Policies are designed to be restrictive
- Test with actual user authentication
- Check that users have proper `user_id` in `user_profiles`

## ✅ Next Steps After Database Setup

1. **Add JavaScript Files**: Include the subscription management scripts in your HTML files
2. **Test Basic Functionality**: Check that plans load and user detection works
3. **Set Up Stripe**: Create Stripe products and update `stripe_price_id` fields
4. **Deploy Webhook**: Set up the Stripe webhook handler as an Edge Function
5. **Enable Enforcement**: Gradually enable subscription checking in your app

## 🆘 Need Help?

If you encounter any issues:
1. Check the Supabase logs for error details
2. Verify your user authentication is working
3. Test queries manually in the SQL Editor
4. Share any error messages for troubleshooting

**The foundation is now ready for your subscription business model!** 🎉