# Profit & Inventory-Aware Pacing System

A comprehensive system for optimizing Google Ads campaigns based on SKU-level profit margins and inventory levels. This high-ROI feature automatically adjusts budgets, pauses out-of-stock campaigns, and optimizes bidding based on real-time profitability data.

## Architecture Overview

The system consists of three main components:

1. **Backend Service** (`backend/services/profit-pacer.js`) - Core profit/inventory logic
2. **API Endpoints** - RESTful API for managing profit data and signals
3. **Enhanced Google Ads Script** - Profit-aware automation in Google Ads

## Key Features

### 🎯 PACE_SIGNALS Computation

- Calculates profit-based pacing signals from SKU margin and stock data
- Combines margin analysis with inventory levels for intelligent prioritization
- Provides actionable signals: PAUSE, REDUCE_BUDGET, INCREASE_BUDGET, MONITOR_MARGIN, MAINTAIN

### 💰 Profit-Aware Budget Reallocation

- Automatically reallocates budgets within min/max caps based on profitability
- High-margin products get increased budget allocation
- Low-margin products get reduced spending
- Respects campaign-level budget constraints

### 📦 Out-of-Stock Management

- Automatically pauses ad groups mapped to out-of-stock SKUs
- Prevents wasted ad spend on unavailable products
- Real-time inventory monitoring with configurable thresholds

### 🔄 Real-Time Monitoring

- Continuous inventory level monitoring
- Automated alerts for critical stock levels
- Performance tracking and optimization recommendations

## Data Model

### Required Google Sheets Tabs

#### `SKU_MARGIN_{tenant}`

| Column | Description             | Example    |
| ------ | ----------------------- | ---------- |
| sku    | Product SKU identifier  | "PROD-001" |
| margin | Profit margin (0.0-1.0) | 0.35       |

#### `SKU_STOCK_{tenant}`

| Column | Description            | Example    |
| ------ | ---------------------- | ---------- |
| sku    | Product SKU identifier | "PROD-001" |
| stock  | Current stock level    | 45         |

#### `ADGROUP_SKU_MAP_{tenant}`

| Column      | Description            | Example     |
| ----------- | ---------------------- | ----------- |
| ad_group_id | Google Ads Ad Group ID | "123456789" |
| sku         | Product SKU identifier | "PROD-001"  |

#### `PACE_SIGNALS_{tenant}` (Auto-generated)

| Column      | Description                |
| ----------- | -------------------------- |
| ad_group_id | Google Ads Ad Group ID     |
| skus        | Comma-separated SKU list   |
| avg_margin  | Average profit margin      |
| total_stock | Total stock across SKUs    |
| min_stock   | Minimum stock level        |
| pace_signal | Computed pace multiplier   |
| action      | Recommended action         |
| timestamp   | Signal generation time     |
| reason      | Human-readable explanation |

## API Endpoints

### Core Operations

#### Compute PACE_SIGNALS

```http
POST /api/profit/compute-signals?tenant={tenant}&sig={signature}
Content-Type: application/json

{
  "nonce": 1234567890,
  "forceRefresh": true
}
```

#### Get PACE_SIGNALS

```http
GET /api/profit/signals?tenant={tenant}&sig={signature}&refresh=1
```

#### Reallocate Budgets

```http
POST /api/profit/reallocate-budgets?tenant={tenant}&sig={signature}
Content-Type: application/json

{
  "nonce": 1234567890,
  "campaignBudgets": {
    "123456": 25.00,
    "789012": 15.00
  },
  "minBudget": 1.0,
  "maxBudget": 100.0
}
```

#### Get Out-of-Stock Ad Groups

```http
GET /api/profit/out-of-stock?tenant={tenant}&sig={signature}
```

#### Monitor Inventory

```http
GET /api/profit/monitor-inventory?tenant={tenant}&sig={signature}&critical_stock=5&low_stock=10
```

### Data Management

#### Update SKU Margins

```http
POST /api/profit/sku-margins?tenant={tenant}&sig={signature}
Content-Type: application/json

{
  "nonce": 1234567890,
  "margins": [
    {"sku": "PROD-001", "margin": 0.35},
    {"sku": "PROD-002", "margin": 0.22}
  ]
}
```

#### Update SKU Stock

```http
POST /api/profit/sku-stock?tenant={tenant}&sig={signature}
Content-Type: application/json

{
  "nonce": 1234567890,
  "stocks": [
    {"sku": "PROD-001", "stock": 45},
    {"sku": "PROD-002", "stock": 0}
  ]
}
```

#### Update Ad Group SKU Mapping

```http
POST /api/profit/adgroup-sku-map?tenant={tenant}&sig={signature}
Content-Type: application/json

{
  "nonce": 1234567890,
  "mappings": [
    {"ad_group_id": "123456789", "sku": "PROD-001"},
    {"ad_group_id": "987654321", "sku": "PROD-002"}
  ]
}
```

## Google Ads Script Integration

The enhanced Google Ads script includes profit-aware pacing functionality:

### New Functions

- `applyProfitAwarePacing_(cfg)` - Main entry point for profit-aware automation
- `getPaceSignals_()` - Fetches PACE_SIGNALS from backend
- `applySignalToAdGroup_(signal, cfg)` - Applies signals to specific ad groups
- `applyPauseAction_(adGroup, signal, cfg)` - Pauses out-of-stock ad groups
- `applyBudgetAction_(campaign, adGroup, signal, cfg, direction)` - Adjusts budgets
- `computePaceSignals_()` - Triggers backend signal computation

### Configuration

Enable profit-aware pacing by setting `FEATURE_INVENTORY_GUARD=TRUE` in your tenant configuration.

## Configuration Options

### Profit Pacer Service Configuration

```javascript
{
  lowStockThreshold: 10,        // Low stock alert threshold
  outOfStockThreshold: 0,       // Out-of-stock threshold
  highMarginThreshold: 0.3,     // High margin threshold (30%)
  lowMarginThreshold: 0.1,      // Low margin threshold (10%)
  maxBudgetMultiplier: 2.0,     // Maximum budget increase (2x)
  minBudgetMultiplier: 0.1,     // Minimum budget multiplier (0.1x)
  signalTtlMs: 300000          // Signal cache TTL (5 minutes)
}
```

## Pace Signal Calculation

The system calculates pace signals using a sophisticated algorithm that considers:

1. **Stock Level Impact**
   - Out of stock (≤0): Multiplier = 0.1 (minimum)
   - Low stock (≤10): Multiplier = 0.3-1.0 (scaled)
   - Good stock (>10): Multiplier = 1.1 (slight boost)

2. **Margin Impact**
   - High margin (≥30%): Boost spending proportionally
   - Low margin (≤10%): Reduce spending proportionally
   - Normal margin (10-30%): Neutral impact

3. **Final Bounds**
   - Minimum multiplier: 0.1 (90% reduction)
   - Maximum multiplier: 2.0 (100% increase)

## Action Determination

Based on the computed pace signal and inventory data:

- **PAUSE**: Out of stock (stock ≤ 0)
- **REDUCE_BUDGET**: Low stock or low signal (≤ 0.5)
- **INCREASE_BUDGET**: High signal (≥ 1.5)
- **MONITOR_MARGIN**: Low margin products
- **MAINTAIN**: Normal conditions

## Safety Features

### PROMOTE Gate Protection

- All mutations respect the PROMOTE gate system
- Preview mode available for testing
- Comprehensive mutation logging

### Exclusions Support

- Respects campaign and ad group exclusions
- Configurable via `EXCLUSIONS_{tenant}` sheet

### Bounds and Limits

- Budget changes capped at min/max values
- Significant change threshold (>5%) prevents noise
- Reserved keyword protection for negatives

## Monitoring and Alerts

### Inventory Alerts

- **CRITICAL**: Out of stock
- **HIGH**: Critical stock levels (≤5)
- **MEDIUM**: Low stock levels (≤10)

### Performance Tracking

- Signal computation timestamps
- Applied action counts
- Error tracking and reporting
- Run logs integration

## Implementation Steps

### 1. Backend Setup

1. Ensure `backend/services/profit-pacer.js` is deployed
2. Verify API endpoints are accessible
3. Configure profit pacer settings

### 2. Google Sheets Setup

1. Create required sheets: `SKU_MARGIN_{tenant}`, `SKU_STOCK_{tenant}`, `ADGROUP_SKU_MAP_{tenant}`
2. Populate with initial data
3. Verify sheet permissions

### 3. Google Ads Script Update

1. Deploy enhanced `master.gs` with profit-aware functions
2. Enable `FEATURE_INVENTORY_GUARD=TRUE` in configuration
3. Test in preview mode first

### 4. Data Integration

1. Set up automated feeds for SKU margin data
2. Configure inventory level synchronization
3. Map ad groups to SKUs

## Testing

### Preview Mode

Enable preview mode to test without making live changes:

```javascript
PREVIEW_MODE = true;
```

### API Testing

Use the provided API endpoints to verify data flow:

```bash
# Compute signals
curl -X POST "http://localhost:3001/api/profit/compute-signals?tenant=TEST&sig={signature}"

# Get signals
curl "http://localhost:3001/api/profit/signals?tenant=TEST&sig={signature}"
```

### Validation Checklist

- [ ] SKU margin data populated
- [ ] Stock levels synchronized
- [ ] Ad group mapping complete
- [ ] PACE_SIGNALS generating correctly
- [ ] Preview mode functioning
- [ ] Safety guards active

## Performance Impact

### Expected Benefits

- **Improved ROAS**: Focus spend on high-margin products
- **Reduced Waste**: Eliminate spend on out-of-stock items
- **Automated Optimization**: Continuous profit-based adjustments
- **Real-time Response**: Immediate reaction to inventory changes

### Monitoring Metrics

- Budget reallocation count
- Out-of-stock pause actions
- Profit margin improvements
- Inventory turnover optimization

## Troubleshooting

### Common Issues

#### No PACE_SIGNALS Generated

- Verify SKU margin and stock data exists
- Check ad group to SKU mapping
- Ensure API endpoints are accessible

#### Signals Not Applied

- Confirm `FEATURE_INVENTORY_GUARD=TRUE`
- Check PROMOTE gate status
- Verify ad group IDs are correct

#### Budget Changes Not Significant

- Adjust change threshold in configuration
- Review min/max budget settings
- Check pace signal calculations

### Debug Information

Enable detailed logging by checking run logs in the `RUN_LOGS_{tenant}` sheet.

## Security Considerations

- All API endpoints require HMAC authentication
- PROMOTE gate protection prevents unauthorized changes
- Tenant isolation ensures data security
- Input validation prevents malicious data

## Future Enhancements

- Machine learning-based profit predictions
- Advanced bidding strategy integration
- Cross-channel inventory optimization
- Seasonal adjustment algorithms
- Competitive analysis integration

---

This profit and inventory-aware pacing system represents a high-ROI feature that can significantly improve campaign performance by automatically optimizing for profitability while preventing wasted spend on out-of-stock products.
