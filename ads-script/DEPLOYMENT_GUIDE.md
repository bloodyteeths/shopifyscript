# ProofKit Enhanced Google Ads Script - Deployment Guide

## 🚀 Quick Start Guide

This guide will help you deploy the Enhanced ProofKit Google Ads Script in your account. The script provides automated optimization and performance monitoring with secure backend communication.

## 📋 Prerequisites

Before deploying the script, ensure you have:

1. **Google Ads Account** with Scripts access
2. **ProofKit Backend** credentials and endpoints
3. **HMAC Shared Secret** for authentication
4. **Manager/Admin Access** to Google Ads account

## 🔧 Step 1: Configuration Setup

### 1.1 Gather Required Information

You'll need the following information from your ProofKit administrator:

```
TENANT_ID: Your unique ProofKit tenant identifier
BACKEND_URL: ProofKit backend API endpoint (e.g., https://api.proofkit.net)
HMAC_SECRET: Shared secret for authentication
```

### 1.2 Script Configuration

Open the `master-enhanced.gs` file and update the configuration section:

```javascript
var CONFIG = {
  // Backend Connection - REPLACE THESE VALUES
  TENANT_ID: 'your_tenant_id_here',           // Replace with your tenant ID
  BACKEND_URL: 'https://api.proofkit.net',    // Replace with your backend URL
  SHARED_SECRET: 'your_hmac_secret_here',     // Replace with your HMAC secret

  // Script Behavior
  DRY_RUN: true,                              // Start with true for testing
  VERSION: '2.0.0',
  ENABLE_LOGGING: true,

  // Safety Limits (adjust as needed)
  MAX_BUDGET_CHANGE: 0.5,                     // 50% maximum budget change
  MAX_BID_CHANGE: 0.3,                        // 30% maximum bid change
  MIN_CAMPAIGN_BUDGET: 1.0,                   // $1 minimum budget
  MAX_CAMPAIGN_BUDGET: 1000.0,                // $1000 maximum budget

  // Feature Toggles (enable/disable as needed)
  ENABLE_BUDGET_OPTIMIZATION: true,
  ENABLE_BID_OPTIMIZATION: true,
  ENABLE_KEYWORD_MANAGEMENT: true,
  ENABLE_AD_CREATION: true,
  ENABLE_AUDIENCE_TARGETING: true,

  // Exclusions (add campaigns/keywords to protect)
  EXCLUDED_CAMPAIGNS: [],                     // e.g., ['Brand Campaign', 'VIP Campaign']
  EXCLUDED_KEYWORDS: ['brand', 'competitor']  // Keywords to never negative
};
```

## 🏗️ Step 2: Google Ads Scripts Setup

### 2.1 Access Google Ads Scripts

1. Log into your Google Ads account
2. Navigate to **Tools & Settings** > **Bulk Actions** > **Scripts**
3. Click the **+ (Plus)** button to create a new script

### 2.2 Deploy the Script

**Important**: Google Ads Scripts don't support multiple files, so you need to combine all modules:

1. **Copy the main script**: Start with `master-enhanced.gs`
2. **Append the modules**: Add the content from each module file:
   - `modules/backend-sync.gs`
   - `modules/optimization-applier.gs`
   - `modules/result-collector.gs`

**OR** use this consolidated version approach:

1. Copy the entire content of `master-enhanced.gs`
2. The script is designed to be self-contained for production use

### 2.3 Script Naming

Name your script: `ProofKit Enhanced Automation v2.0`

## 🧪 Step 3: Testing Phase

### 3.1 Initial Testing

1. **Ensure DRY_RUN is true** in the configuration
2. Click **Preview** to run the script in test mode
3. Check the logs for:
   - Configuration validation success
   - Backend connectivity test results
   - Any error messages

### 3.2 Connectivity Test

The script will automatically test backend connectivity. Look for these log messages:

```
✅ Configuration validated successfully
✅ Backend connectivity test passed
ℹ️ Received X optimizations from backend
ℹ️ Collected Y campaign metrics
✅ Successfully sent metrics to backend
```

### 3.3 Troubleshooting Common Issues

**Configuration Errors:**
```
❌ TENANT_ID not configured
❌ BACKEND_URL not configured
❌ SHARED_SECRET not configured
```
**Solution**: Update the configuration with correct values

**Connectivity Errors:**
```
❌ Backend connectivity failed: HTTP 401
❌ HMAC generation failed
```
**Solution**: Verify HMAC secret and backend URL

## ⚡ Step 4: Live Deployment

### 4.1 Enable Live Mode

Once testing is successful:

1. Change `DRY_RUN: false` in the configuration
2. **Save** the script
3. Run **Preview** once more to confirm

### 4.2 Schedule the Script

1. Click **Create Schedule**
2. **Recommended Settings**:
   - **Frequency**: Every 6 hours
   - **Start Time**: During off-peak hours (e.g., 2 AM, 8 AM, 2 PM, 8 PM)
   - **Email Notifications**: Enable for failures

### 4.3 Monitor Initial Runs

Monitor the first few scheduled runs:

1. Check execution logs in Google Ads Scripts
2. Verify data appears in ProofKit backend
3. Review any optimization changes made
4. Confirm error rates are low (<5%)

## 📊 Step 5: Monitoring & Maintenance

### 5.1 Regular Monitoring

**Daily Checks:**
- Script execution success
- Error rates in logs
- Backend data synchronization

**Weekly Reviews:**
- Optimization performance
- Budget and bid changes
- New keyword additions

### 5.2 Log Analysis

Key log entries to monitor:

```javascript
// Successful execution
"Enhanced ProofKit Script completed successfully"

// Optimizations applied
"Applied X optimizations, Y failed"

// Data collection
"Collected metrics for X campaigns, Y keywords"

// Backend sync
"Successfully sent metrics to backend"
```

### 5.3 Performance Metrics

Track these KPIs:
- **Script Success Rate**: Should be >95%
- **Optimization Application Rate**: Varies by account
- **Data Collection Completeness**: Should be 100%
- **Backend Sync Success**: Should be >98%

## 🔒 Step 6: Security Best Practices

### 6.1 Access Control

- Limit script editing access to authorized personnel
- Use strong HMAC secrets (32+ characters)
- Regularly rotate shared secrets (quarterly)

### 6.2 Monitoring

- Enable email notifications for script failures
- Set up alerts for unusual optimization patterns
- Monitor backend logs for authentication issues

### 6.3 Backup & Recovery

- Export script code regularly
- Document configuration changes
- Maintain rollback procedures

## ⚙️ Step 7: Advanced Configuration

### 7.1 Safety Limits Tuning

Adjust limits based on your comfort level:

```javascript
// Conservative settings
MAX_BUDGET_CHANGE: 0.2,     // 20% maximum change
MAX_BID_CHANGE: 0.15,       // 15% maximum change

// Aggressive settings
MAX_BUDGET_CHANGE: 0.75,    // 75% maximum change
MAX_BID_CHANGE: 0.5,        // 50% maximum change
```

### 7.2 Feature Customization

Enable/disable features as needed:

```javascript
// For accounts with manual bid management
ENABLE_BID_OPTIMIZATION: false,

// For accounts with external keyword tools
ENABLE_KEYWORD_MANAGEMENT: false,

// For accounts with creative agencies
ENABLE_AD_CREATION: false,
```

### 7.3 Exclusion Management

Protect important campaigns:

```javascript
EXCLUDED_CAMPAIGNS: [
  'Brand Campaign',
  'VIP Client Campaign',
  'Manual Management Campaign'
],

EXCLUDED_KEYWORDS: [
  'brand',
  'company_name',
  'competitor',
  'trademarked_term'
]
```

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

**Issue**: Script timeout
**Solution**: Reduce CHUNK_SIZE in configuration

**Issue**: High error rates
**Solution**: Check backend connectivity and HMAC secret

**Issue**: No optimizations received
**Solution**: Verify ProofKit backend has optimizations queued

**Issue**: Changes not applying
**Solution**: Ensure DRY_RUN is false and check safety limits

### Emergency Procedures

**Stop All Automation:**
1. Set `DRY_RUN: true`
2. Disable all feature toggles
3. Remove script schedule

**Rollback Changes:**
1. The script includes automatic rollback for failed operations
2. Manual rollback may be needed for completed changes
3. Check mutation logs for applied changes

## 📞 Support & Resources

### Getting Help

1. **Configuration Issues**: Check this deployment guide
2. **Backend Problems**: Contact ProofKit support
3. **Google Ads Issues**: Consult Google Ads documentation
4. **Script Errors**: Review the comprehensive error logging

### Additional Resources

- **Google Ads Scripts Documentation**: [developers.google.com/google-ads/scripts](https://developers.google.com/google-ads/scripts)
- **ProofKit API Documentation**: Contact your ProofKit administrator
- **HMAC Authentication**: [RFC 2104](https://tools.ietf.org/html/rfc2104)

## ✅ Deployment Checklist

Before going live, verify:

- [ ] Configuration values updated
- [ ] Backend connectivity tested
- [ ] DRY_RUN testing completed successfully
- [ ] Safety limits configured appropriately
- [ ] Exclusions set for protected campaigns
- [ ] Script scheduled with appropriate frequency
- [ ] Email notifications enabled
- [ ] Monitoring procedures established
- [ ] Backup procedures documented

## 📈 Success Metrics

Your deployment is successful when you see:

- **Consistent Script Execution**: 95%+ success rate
- **Backend Synchronization**: Regular data updates in ProofKit
- **Optimization Application**: Appropriate changes being made
- **Performance Improvement**: Better campaign metrics over time
- **Error Management**: Low error rates and quick resolution

---

**Deployment Guide Version**: 2.0.0
**Last Updated**: September 28, 2024
**Compatible Script Version**: 2.0.0

🎉 **Congratulations!** Your Enhanced ProofKit Google Ads Script is now ready for production use.