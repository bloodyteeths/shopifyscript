# Audience Upload Playbook - Merchant Guide

## Overview

This playbook guides merchants through uploading Customer Match audiences to Google Ads and configuring ProofKit to automatically attach them to campaigns.

## Prerequisites

- Active Google Ads account with Customer Match eligibility
- ProofKit SaaS account with audience features enabled
- Customer data file (emails, phones, or addresses)

## Step 1: Prepare Customer Data

### Data Requirements

Customer Match accepts the following data types:

- **Email addresses** (recommended): Plain text or hashed SHA-256
- **Phone numbers**: E.164 format (+1234567890)
- **Mailing addresses**: Name, country, ZIP code

### File Format

Create a CSV file with appropriate headers:

**For Email Lists:**

```csv
email
john@example.com
mary@example.com
customer@domain.com
```

**For Phone Lists:**

```csv
phone
+1234567890
+1987654321
```

**For Mixed Data:**

```csv
email,phone,first_name,last_name,country_code,postal_code
john@example.com,+1234567890,John,Doe,US,12345
mary@example.com,+1987654321,Mary,Smith,US,54321
```

### Data Quality Tips

- Remove duplicates and invalid entries
- Ensure emails are properly formatted
- Use consistent phone number formatting
- Minimum 1,000 matched users for reliable targeting
- Aim for 10,000+ matched users for optimal performance

## Step 2: Create Customer Match List in Google Ads

### Via Google Ads Interface:

1. Navigate to **Tools & Settings > Shared Library > Audience Manager**
2. Click **+ (Plus)** button
3. Select **Customer list**
4. Choose **Upload emails and/or phone numbers**
5. Upload your CSV file
6. Set **Membership duration** (recommended: 180 days)
7. Name your list descriptively (e.g., "High-Value Customers Q4")
8. Wait for processing (can take 6-24 hours)

### Via Google Ads API:

```javascript
// Example API call structure
const userList = {
  name: "High-Value Customers Q4",
  membershipLifeSpan: 10368000, // 120 days in seconds
  uploadKeyType: "CONTACT_INFO",
  crmBasedUserList: {
    uploadKeyType: "CONTACT_INFO",
    dataSourceType: "FIRST_PARTY",
  },
};
```

## Step 3: Get User List ID

After your list is processed:

### Method 1: Google Ads Interface

1. Go to **Audience Manager**
2. Find your uploaded list
3. Click on the list name
4. Copy the **User List ID** from the URL
   - URL format: `...#userlist/{USER_LIST_ID}`
   - Example: If URL shows `#userlist/123456789`, your ID is `123456789`

### Method 2: Google Ads Scripts

```javascript
function getUserListIds() {
  var userLists = AdsApp.userlists().get();
  while (userLists.hasNext()) {
    var userList = userLists.next();
    Logger.log(userList.getName() + ": " + userList.getId());
  }
}
```

### Method 3: Google Ads API

```bash
# Using gcloud CLI
gcloud ads customer-user-lists list --customer-id=YOUR_CUSTOMER_ID
```

## Step 4: Configure ProofKit Audience Mapping

### Access ProofKit Dashboard

1. Log into your ProofKit account
2. Navigate to **Audiences** section
3. Select **Audience Mapping** tab

### Upload Audience Map

Create a CSV with the following structure:

```csv
campaign,ad_group,user_list_id,mode,bid_modifier
"Brand Campaign","Brand Keywords",123456789,OBSERVE,
"Shopping Campaign","High-Value Products",123456789,TARGET,1.25
"Search Campaign","Competitor Terms",987654321,EXCLUDE,
```

### Column Definitions

| Column       | Required | Description                         | Valid Values                 |
| ------------ | -------- | ----------------------------------- | ---------------------------- |
| campaign     | Yes      | Exact campaign name from Google Ads | Text string                  |
| ad_group     | Yes      | Exact ad group name from Google Ads | Text string                  |
| user_list_id | Yes      | Customer Match list ID from Step 3  | Numeric ID                   |
| mode         | Yes      | How to apply the audience           | OBSERVE, TARGET, EXCLUDE     |
| bid_modifier | No       | Bid adjustment multiplier           | 0.1 to 10.0 (empty for none) |

### Targeting Modes Explained

**OBSERVE (Recommended for new lists)**

- Audience data collected for reporting
- No impact on ad serving or bids
- Use to test audience performance before targeting

**TARGET**

- Ads only shown to users in the audience
- Significantly reduces reach
- Use for high-value, well-defined audiences
- Recommended bid modifier: 1.1 to 2.0

**EXCLUDE**

- Ads never shown to users in the audience
- Use to exclude existing customers or converters
- No bid modifier applied (ignored if provided)

### Bid Modifier Guidelines

| Audience Type        | Suggested Mode | Bid Modifier |
| -------------------- | -------------- | ------------ |
| Past Purchasers      | EXCLUDE        | -            |
| High-Value Customers | TARGET         | 1.5 - 2.0    |
| Cart Abandoners      | TARGET         | 1.2 - 1.5    |
| Email Subscribers    | OBSERVE        | -            |
| Lookalike/Similar    | OBSERVE        | 1.1 - 1.3    |

## Step 5: Upload and Validate

### Upload Process

1. In ProofKit dashboard, click **Upload Audience Map**
2. Select your CSV file
3. Review the preview table
4. Click **Confirm Upload**
5. Monitor the **Run Logs** for processing status

### Validation Checklist

- [ ] Campaign names match exactly (case-sensitive)
- [ ] Ad group names match exactly (case-sensitive)
- [ ] User list IDs are valid and accessible
- [ ] Modes are valid (OBSERVE/TARGET/EXCLUDE)
- [ ] Bid modifiers are reasonable (0.1-10.0)
- [ ] No duplicate campaign/ad_group combinations

### Common Validation Errors

**Campaign Not Found**

- Verify campaign name spelling and case
- Check campaign is enabled and Search type
- Ensure campaign exists in connected Google Ads account

**User List Not Accessible**

- Confirm list ID is correct
- Verify list is processed and active
- Check Google Ads account permissions

**Invalid Bid Modifier**

- Must be between 0.1 and 10.0
- Use decimal format (1.25, not 125%)
- Leave empty for no bid adjustment

## Step 6: Monitor Performance

### ProofKit Run Logs

Monitor audience attachment in the **Run Logs** section:

```
✓ Audience attach started (min_size=1000)
• Audience attached: Brand Campaign id=123456789 mode=OBSERVE
• size_unknown: attached without bid modifier for Shopping Campaign id=123456789
✓ Audience attach complete: 3 attached, 1 skipped, 0 errors
```

### Google Ads Reporting

1. Navigate to **Audiences** in Google Ads
2. Check **Demographics > Audience segments**
3. Monitor performance metrics:
   - Impressions and clicks by audience
   - Conversion rates by audience
   - Cost-per-click differences

### Performance Optimization

- Start with OBSERVE mode for new audiences
- Move to TARGET mode after 2-4 weeks of data
- Adjust bid modifiers based on performance:
  - Higher for converting audiences
  - Lower for non-converting audiences
  - Remove audiences with poor performance

## Safety and Size Guards

### Automatic Safety Features

ProofKit includes several safety mechanisms:

**Size Validation**

- Lists under 1,000 users: attached without bid modifiers
- Configurable minimum size threshold
- Prevents targeting tiny audiences

**Idempotency Protection**

- Already attached audiences are skipped
- Prevents duplicate attachments
- Only updates bid modifiers if changed

**Error Handling**

- Invalid lists are logged but don't stop processing
- Campaign/ad group mismatches are reported
- Graceful handling of API limitations

### Best Practices

**Audience Size Management**

- Aim for 10,000+ matched users for stable performance
- Monitor list size decay over time
- Refresh customer data quarterly

**Testing Protocol**

1. Start with OBSERVE mode
2. Collect 2-4 weeks of data
3. Analyze performance vs. control
4. Graduate to TARGET/EXCLUDE based on results

**Campaign Hygiene**

- Use descriptive audience list names
- Document audience sources and refresh dates
- Regular audit of attached audiences
- Remove underperforming or stale audiences

## Troubleshooting

### Common Issues

**Audience Not Attaching**

1. Check list processing status in Google Ads
2. Verify list meets minimum size requirements
3. Confirm user list ID is correct
4. Check ProofKit feature flags are enabled

**Size Unknown Warnings**

- Normal behavior for script-only approach
- Bid modifiers skipped for safety
- Use Google Ads interface to check actual list size

**Permission Errors**

- Ensure Google Ads account has audience management permissions
- Verify ProofKit has necessary API access
- Check customer ID is correctly configured

### Support Contacts

- ProofKit Support: [support@proofkit.net](mailto:support@proofkit.net)
- Google Ads Help: [Google Ads Customer Match Guide](https://support.google.com/google-ads/answer/6379332)

## Advanced Configuration

### Custom Size Thresholds

Configure minimum audience size in ProofKit settings:

```
AUDIENCE_MIN_SIZE: 5000  # Custom minimum size
```

### Feature Toggles

```
FEATURE_AUDIENCE_ATTACH: true   # Enable/disable audience features
FEATURE_AUDIENCE_EXPORT: true  # Enable audience building tools
```

### API Integration

For advanced users with API access:

```javascript
// Get list size via Google Ads API
const listSize = await googleAds.customers.userLists.get({
  resourceName: `customers/${customerId}/userLists/${listId}`,
});
```

## Compliance and Privacy

### Data Handling

- Customer data is hashed by Google Ads, not ProofKit
- ProofKit only stores list IDs and targeting preferences
- Follow local privacy regulations (GDPR, CCPA, etc.)

### Consent Requirements

- Ensure proper consent for marketing use
- Include audience targeting in privacy policies
- Provide opt-out mechanisms where required

---

**Last Updated**: August 2025  
**Version**: 2.0  
**Author**: ProofKit Engineering Team
