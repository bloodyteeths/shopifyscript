# Supabase Setup for AI Writer

## Current Status
✅ Supabase credentials configured
✅ Database tables exist (`rsa_assets`, `tenant_metrics`, etc.)
✅ Google Ads script writing data to Supabase
❌ Backend not reading from Supabase (missing env variable)

## Required Vercel Environment Variable

Add this to your Vercel project environment variables:

```
SUPABASE_ENABLED=true
```

**How to add:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add new variable:
   - **Name:** `SUPABASE_ENABLED`
   - **Value:** `true`
   - **Environments:** Production, Preview, Development
4. Redeploy your application

## What This Enables

### Before (Current State - Sheets Only)
```
AI Writer Job → Google Sheets (rate limits!)
/api/ai/drafts → Google Sheets (slow)
```

### After (Supabase First)
```
AI Writer Job → Read context from Supabase (fast, no rate limits)
             → Write to BOTH Supabase + Sheets (dual-write)

/api/ai/drafts → Try Supabase first (instant)
              → Fallback to Sheets if needed
```

## Benefits

1. **Reduced Google Sheets API calls** by 70-80%
2. **Faster response times** (Supabase = 50-100ms vs Sheets = 500-2000ms)
3. **Avoid rate limits** on Google Sheets
4. **Better scalability** with relational database
5. **Maintains compatibility** with Sheets as fallback

## Verification After Deployment

Check backend logs for these messages:

```
✅ Business context fetched from Supabase
✅ RSA content written to Supabase
✅ RSA drafts fetched from Supabase
```

And in the API response from `/api/ai/drafts`, you should see:
```json
{
  "ok": true,
  "source": "supabase",
  "rsa_default": [...],
  "library": [...]
}
```

## Troubleshooting

If Supabase writes fail:
1. Check Vercel logs for Supabase errors
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
3. Check Row Level Security (RLS) policies in Supabase
4. Verify service role key has write permissions

System will automatically fall back to Google Sheets if Supabase fails.