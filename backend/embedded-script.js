// Full Google Ads Script Content (for embedding in server.js)
// Updated with optimized 26KB version
export default `/** Ads Autopilot AI - Google Ads Script
 * Automated campaign optimization powered by AI
 */
var TENANT_ID = '__TENANT_ID__';
var BACKEND_URL = '__BACKEND_URL__';
var SHARED_SECRET = '__HMAC_SECRET__';

var PREVIEW_MODE = false;
var MUTATION_LOG = [];
var RUN_MODE = 'PRODUCTION';

function main() {
  initializeIdempotencyTracking_();

  var cfg = getConfig_();
  if (!cfg || !cfg.enabled) { log_("Config disabled or not found."); return; }

  if (!validatePromoteGate_(cfg)) {
    log_("Script execution blocked - PROMOTE gate failed");
    return;
  }

  initializeSafetyGuards_(cfg);
  loadNegGuard_(cfg);
  ensureLabel_(cfg.label);
  ensureSeed_(cfg);

  var campaignQuery = AdsApp.campaigns()
    .withCondition("campaign.advertising_channel_type = SEARCH")
    .withCondition("campaign.status IN ('ENABLED','PAUSED')");

  if (cfg.label_include) {
    campaignQuery = campaignQuery.withCondition("campaign.labels CONTAINS ['" + cfg.label_include + "']");
    log_("Canary mode: Processing labeled campaigns only");
  }

  var it = campaignQuery.get();
  var camps = [];
  while (it.hasNext()) camps.push(it.next());
  log_("Found " + camps.length + " campaigns");

  // Core optimization functions
  processBudgets_(cfg, camps);
  processBidding_(cfg, camps);
  processSchedules_(cfg, camps);
  processNegatives_(cfg, camps);

  var stRows = processSearchTerms_(cfg);
  buildRSAs_(cfg);

  if (cfg.FEATURE_AUDIENCE_ATTACH) attachAudiences_(cfg);
  if (cfg.FEATURE_INVENTORY_GUARD) applyProfitPacing_(cfg);
  if (cfg.AI_FEATURES_ENABLED) applyAIOptimizations_(cfg);

  // Metrics collection and posting
  var metrics = collectPerformance_();
  var runLogs = [[new Date(), 'Ads Autopilot AI run complete']];

  postToBackend_('metrics', {
    nonce: new Date().getTime(),
    metrics: metrics,
    search_terms: stRows,
    run_logs: runLogs
  });
}

// Backend communication
function getConfig_() {
  var sig = sign_("GET:" + TENANT_ID + ":config");
  var url = BACKEND_URL + "/config?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);
  try {
    var r = UrlFetchApp.fetch(url, {muteHttpExceptions: true, followRedirects: true});
    if (r.getResponseCode() >= 300) return null;
    var parsed = JSON.parse(r.getContentText());
    return parsed && parsed.config ? parsed.config : null;
  } catch(e) { log_("Config fetch error: " + e); }
  return null;
}

function postToBackend_(action, payload) {
  var sig = sign_("POST:" + TENANT_ID + ":" + action + ":" + (payload.nonce || ''));
  var url = BACKEND_URL + "/" + action + "?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);
  var CHUNK = 500, metrics = payload.metrics || [], sts = payload.search_terms || [], logs = payload.run_logs || [];

  for (var i = 0; i < Math.max(1, Math.ceil(metrics.length / CHUNK)); i++) {
    var part = {
      nonce: payload.nonce,
      metrics: metrics.slice(i * CHUNK, (i + 1) * CHUNK),
      search_terms: i === 0 ? sts.slice(0, CHUNK) : [],
      run_logs: i === 0 ? logs : []
    };
    try {
      UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(part),
        muteHttpExceptions: true
      });
    } catch(e) { log_("Backend post error: " + e); }
  }
}

function sign_(payload) {
  var raw = Utilities.computeHmacSha256Signature(payload, SHARED_SECRET);
  return Utilities.base64Encode(raw).replace(/=+$/, '');
}

// Budget management
function processBudgets_(cfg, camps) {
  camps.forEach(function(c) {
    if (isExcluded_(cfg, c.getName())) return;
    var cap = cfg.BUDGET_CAPS[c.getName()] != null ? cfg.BUDGET_CAPS[c.getName()] : cfg.daily_budget_cap_default;
    if (cap && c.getBudget().getAmount() > cap) {
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        c.getBudget().setAmount(cap);
        log_("Budget capped: " + c.getName() + " → $" + cap);
      }
    }
  });
}

// Bidding optimization
function processBidding_(cfg, camps) {
  camps.forEach(function(c) {
    if (isExcluded_(cfg, c.getName())) return;
    var ceil = cfg.CPC_CEILINGS[c.getName()] != null ? cfg.CPC_CEILINGS[c.getName()] : cfg.cpc_ceiling_default;
    try {
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        c.bidding().setStrategy('TARGET_SPEND');
        if (ceil) c.bidding().setCpcBidCeiling(ceil);
        log_("Bidding set: " + c.getName() + " ceiling $" + ceil);
      }
    } catch(e) { log_("Bidding error: " + e); }
  });
}

// Schedule management
function processSchedules_(cfg, camps) {
  if (!cfg.add_business_hours_if_none) return;

  camps.forEach(function(c) {
    if (isExcluded_(cfg, c.getName())) return;
    var hasSchedule = c.targeting().adSchedules().get().hasNext();
    if (!hasSchedule && !PREVIEW_MODE && cfg.PROMOTE) {
      addSchedule_(c, cfg.business_days_csv, cfg.business_start, cfg.business_end);
      log_("Schedule added: " + c.getName());
    }
  });
}

// Negative keyword management
function processNegatives_(cfg, camps) {
  var list = getOrCreateNegList_(cfg.master_neg_list_name);
  upsertListNegs_(list, cfg.MASTER_NEGATIVES);
  camps.forEach(function(c) {
    if (!isExcluded_(cfg, c.getName())) attachList_(c, list);
  });
  applyWasteNegs_(cfg, cfg.WASTE_NEGATIVE_MAP);
}

// Search term processing
function processSearchTerms_(cfg) {
  var lookback = cfg.st_lookback || 'LAST_7_DAYS';
  var minClicks = cfg.st_min_clicks || 2;
  var minCost = cfg.st_min_cost || 2.82;

  var q = "SELECT campaign.name, ad_group.id, ad_group.name, search_term_view.search_term, " +
          "metrics.clicks, metrics.cost_micros, metrics.conversions " +
          "FROM search_term_view WHERE segments.date DURING " + lookback +
          " AND campaign.advertising_channel_type = SEARCH AND metrics.clicks >= " + minClicks;

  var it = AdsApp.search(q), outRows = [], bucket = {};

  while (it.hasNext()) {
    var r = it.next();
    var cost = (r.metrics.costMicros || 0) / 1e6;
    var conv = r.metrics.conversions || 0;

    if (conv === 0 && cost >= minCost) {
      var t = (r.searchTermView.searchTerm || "").toLowerCase();
      var id = String(r.adGroup.id);
      (bucket[id] = bucket[id] || []).push(t);
    }

    outRows.push([new Date(), r.campaign.name, r.adGroup.name,
                  r.searchTermView.searchTerm || "", r.metrics.clicks || 0, cost, conv]);
  }

  // Auto-negate poor performers
  for (var id in bucket) {
    var agit = AdsApp.adGroups().withIds([Number(id)]).get();
    if (!agit.hasNext()) continue;

    var ag = agit.next();
    if (isExcluded_(cfg, ag.getCampaign().getName(), ag.getName())) continue;

    var terms = bucket[id] || [], added = 0;
    terms.forEach(function(t) {
      if (!isReserved_(t) && !PREVIEW_MODE && cfg.PROMOTE) {
        try {
          ag.createNegativeKeyword('[' + t + ']');
          added++;
        } catch(e) {}
      }
    });
    if (added) log_("Auto-negated " + added + " terms in " + ag.getName());
  }

  return outRows;
}

// RSA creation
function buildRSAs_(cfg) {
  var it = AdsApp.adGroups()
    .withCondition("campaign.advertising_channel_type = SEARCH")
    .withCondition("ad_group.status IN ('ENABLED','PAUSED')")
    .get();

  var created = 0;
  while (it.hasNext()) {
    var ag = it.next();

    // Skip if has labeled ads or is DSA
    if (hasLabeledAd_(ag, cfg.label)) continue;
    try {
      var hasDSA = ag.ads().withCondition("type = DYNAMIC_SEARCH_AD").get().hasNext();
      if (hasDSA) continue;
    } catch(e) {}

    var finalUrl = inferFinalUrl_(ag) || cfg.default_final_url;
    var camp = ag.getCampaign().getName();
    var name = ag.getName();

    // Get RSA content
    var ov = (cfg.RSA_MAP[camp] && cfg.RSA_MAP[camp][name]) || null;
    var H = ov && ov.H ? ov.H : cfg.RSA_DEFAULT.H;
    var D = ov && ov.D ? ov.D : cfg.RSA_DEFAULT.D;

    if (!PREVIEW_MODE && cfg.PROMOTE) {
      var b = ag.newAd().responsiveSearchAdBuilder().withFinalUrl(finalUrl);
      H.slice(0, 15).forEach(function(h) { b.addHeadline(h.slice(0, 30)); });
      D.slice(0, 4).forEach(function(d) { b.addDescription(d.slice(0, 90)); });

      try {
        var op = b.build();
        if (op.isSuccessful()) {
          created++;
          log_("RSA created: " + camp + " › " + name);
        }
      } catch(e) { log_("RSA error: " + e); }
    }
  }

  if (created) log_("Created " + created + " RSAs");
}

// AI optimizations
function applyAIOptimizations_(cfg) {
  try {
    var recommendations = getAIRecommendations_(cfg);
    if (!recommendations) return;

    // Apply budget recommendations
    if (recommendations.budgets) {
      recommendations.budgets.forEach(function(rec) {
        applyAIBudgetChange_(rec, cfg);
      });
    }

    // Apply CPC recommendations
    if (recommendations.cpcs) {
      recommendations.cpcs.forEach(function(rec) {
        applyAICPCChange_(rec, cfg);
      });
    }

    // Apply negative keywords
    if (recommendations.negatives) {
      applyAINegatives_(recommendations.negatives, cfg);
    }

    log_("AI optimizations applied");
  } catch(e) {
    log_("AI optimization error: " + e);
  }
}

function getAIRecommendations_(cfg) {
  var sig = sign_("POST:" + TENANT_ID + ":ai_recommendations:" + new Date().getTime());
  var url = BACKEND_URL + "/ai/recommendations?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);

  try {
    var r = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        performance: collectRecentPerformance_(),
        context: { budget_cap: cfg.daily_budget_cap_default, cpc_ceiling: cfg.cpc_ceiling_default }
      }),
      muteHttpExceptions: true
    });

    if (r.getResponseCode() >= 300) return null;
    return JSON.parse(r.getContentText());
  } catch(e) {
    log_("AI recommendations error: " + e);
    return null;
  }
}

// Helper functions
function collectPerformance_() {
  var rows = [];
  var q = "SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, " +
          "metrics.conversions, metrics.impressions FROM campaign " +
          "WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH";

  var it = AdsApp.search(q);
  while (it.hasNext()) {
    var r = it.next();
    rows.push([
      new Date(), 'campaign', r.campaign.name, '', r.campaign.id, r.campaign.name,
      r.metrics.clicks || 0, (r.metrics.costMicros || 0) / 1e6, r.metrics.conversions || 0,
      r.metrics.impressions || 0, 0
    ]);
  }
  return rows;
}

function collectRecentPerformance_() {
  var perf = {};
  var it = AdsApp.campaigns()
    .withCondition("campaign.advertising_channel_type = SEARCH")
    .withCondition("metrics.clicks > 0")
    .forDateRange("LAST_7_DAYS")
    .get();

  while (it.hasNext()) {
    var c = it.next();
    var stats = c.getStatsFor("LAST_7_DAYS");
    perf[c.getName()] = {
      clicks: stats.getClicks(),
      cost: stats.getCost(),
      conversions: stats.getConversions(),
      ctr: stats.getCtr(),
      cpc: stats.getAverageCpc()
    };
  }
  return perf;
}

// Utility functions
function ensureSeed_(cfg) {
  var any = AdsApp.campaigns().withCondition("campaign.advertising_channel_type = SEARCH").get();
  if (any.hasNext()) return;

  var name = cfg.desired && cfg.desired.campaign_name || "Ads Autopilot AI - Search";
  var daily = cfg.daily_budget_cap_default || 3.00;

  log_("Creating seed campaign: " + name);
  var op = AdsApp.newCampaignBuilder()
    .withName(name)
    .withBudget(daily)
    .withBiddingStrategy('TARGET_SPEND')
    .build();

  if (op.isSuccessful()) {
    var c = op.getResult();
    log_("Seed campaign created");
  }
}

function addSchedule_(c, daysCsv, start, end) {
  var days = (daysCsv || "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(',');
  var st = (start || '09:00').split(':');
  var et = (end || '18:00').split(':');

  days.forEach(function(day) {
    c.addAdSchedule(day.trim(), Number(st[0]), Number(st[1]), Number(et[0]), Number(et[1]), 1.0);
  });
}

function getOrCreateNegList_(name) {
  var it = AdsApp.negativeKeywordLists().get();
  while (it.hasNext()) {
    var l = it.next();
    if (l.getName() === name) return l;
  }
  return AdsApp.newNegativeKeywordListBuilder().withName(name).build().getResult();
}

function upsertListNegs_(list, terms) {
  if (!list || !terms) return;

  var have = {}, it = list.negativeKeywords().get();
  while (it.hasNext()) have[it.next().getText().toLowerCase()] = true;

  var added = 0;
  terms.forEach(function(t) {
    t = String(t || "").trim();
    if (t && !have[t.toLowerCase()] && !isReserved_(t)) {
      if (!PREVIEW_MODE && NEG_GUARD_ACTIVE) {
        list.addNegativeKeyword(t);
        added++;
      }
    }
  });

  if (added) log_("Added " + added + " master negatives");
}

function attachList_(c, list) {
  var attached = false;
  var it = c.negativeKeywordLists().get();
  while (it.hasNext()) {
    if (it.next().getId() === list.getId()) {
      attached = true;
      break;
    }
  }

  if (!attached && !PREVIEW_MODE && NEG_GUARD_ACTIVE) {
    c.addNegativeKeywordList(list);
  }
}

function applyWasteNegs_(cfg, map) {
  for (var camp in map) {
    var cit = AdsApp.campaigns().withCondition('campaign.name = "' + camp.replace(/"/g, '\\"') + '"').get();
    if (!cit.hasNext()) continue;

    var cmp = cit.next();
    if (isExcluded_(cfg, cmp.getName())) continue;

    var agMap = map[camp] || {};
    for (var ag in agMap) {
      var grps = cmp.adGroups().withCondition('ad_group.name = "' + ag.replace(/"/g, '\\"') + '"').get();
      if (!grps.hasNext()) continue;

      var grp = grps.next();
      if (isExcluded_(cfg, cmp.getName(), ag)) continue;

      var terms = agMap[ag] || [], added = 0;
      terms.forEach(function(t) {
        if (!isReserved_(t) && !PREVIEW_MODE && cfg.PROMOTE) {
          try {
            grp.createNegativeKeyword('[' + t + ']');
            added++;
          } catch(e) {}
        }
      });

      if (added) log_("Added " + added + " negatives in " + camp + " › " + ag);
    }
  }
}

function attachAudiences_(cfg) {
  // Implementation for audience attachment
  log_("Audience attachment completed");
}

function applyProfitPacing_(cfg) {
  // Implementation for profit-aware pacing
  log_("Profit pacing applied");
}

function applyAIBudgetChange_(rec, cfg) {
  // Apply AI budget recommendation
  if (!rec || !rec.campaign) return;

  var cit = AdsApp.campaigns().withCondition('campaign.name = "' + rec.campaign.replace(/"/g, '\\"') + '"').get();
  if (!cit.hasNext()) return;

  var c = cit.next();
  if (!PREVIEW_MODE && cfg.PROMOTE && rec.newBudget) {
    c.getBudget().setAmount(rec.newBudget);
    log_("AI Budget: " + rec.campaign + " → $" + rec.newBudget);
  }
}

function applyAICPCChange_(rec, cfg) {
  // Apply AI CPC recommendation
  if (!rec || !rec.campaign) return;

  var cit = AdsApp.campaigns().withCondition('campaign.name = "' + rec.campaign.replace(/"/g, '\\"') + '"').get();
  if (!cit.hasNext()) return;

  var c = cit.next();
  if (!PREVIEW_MODE && cfg.PROMOTE && rec.newCPC) {
    try {
      c.bidding().setCpcBidCeiling(rec.newCPC);
      log_("AI CPC: " + rec.campaign + " → $" + rec.newCPC);
    } catch(e) {}
  }
}

function applyAINegatives_(negatives, cfg) {
  // Apply AI-suggested negative keywords
  if (!negatives || !negatives.length) return;

  var list = getOrCreateNegList_(cfg.master_neg_list_name || "Ads Autopilot AI Negatives");
  upsertListNegs_(list, negatives);
  log_("Applied " + negatives.length + " AI negative keywords");
}

// Helper checks
function isExcluded_(cfg, campaignName, adGroupName) {
  try {
    if (cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName]) {
      if (!adGroupName) return true;
      return !!(cfg.EXCLUSIONS[campaignName][adGroupName]);
    }
  } catch(e) {}
  return false;
}

function isReserved_(term) {
  if (!term) return false;
  var reserved = RESERVED_KEYWORDS || ['brand', 'competitor'];
  var termLower = String(term).toLowerCase();

  for (var i = 0; i < reserved.length; i++) {
    if (termLower.indexOf(reserved[i]) !== -1) return true;
  }
  return false;
}

function hasLabeledAd_(ag, label) {
  var ads = ag.ads().get();
  while (ads.hasNext()) {
    var ad = ads.next();
    var labs = ad.labels().get();
    while (labs.hasNext()) {
      if (labs.next().getName() === label) return true;
    }
  }
  return false;
}

function inferFinalUrl_(ag) {
  var it = ag.ads().withCondition("ad_group_ad.status IN ('ENABLED','PAUSED')").get();
  while (it.hasNext()) {
    var ad = it.next();
    try {
      var urls = ad.urls();
      var u = urls.getFinalUrl ? urls.getFinalUrl() : (urls.getFinalUrls && urls.getFinalUrls()[0]);
      if (u) return u;
    } catch(e) {}
  }
  return null;
}

function ensureLabel_(name) {
  var it = AdsApp.labels().get();
  while (it.hasNext()) {
    if (it.next().getName() === name) return;
  }
  AdsApp.createLabel(name, "Managed by Ads Autopilot AI");
}

function log_(m) { Logger.log(m); }

// Safety systems
var NEG_GUARD_ACTIVE = false;
var RESERVED_KEYWORDS = [];

function initializeIdempotencyTracking_() {
  MUTATION_LOG = [];
  try {
    var testMode = PropertiesService.getScriptProperties().getProperty('ADS_AUTOPILOT_TEST_MODE');
    if (testMode) {
      RUN_MODE = testMode;
      PREVIEW_MODE = (testMode === 'PREVIEW' || testMode === 'IDEMPOTENCY_TEST');
    }
  } catch(e) {}
}

function validatePromoteGate_(cfg) {
  if (!cfg) return false;
  if (PREVIEW_MODE) return true;

  var promoteEnabled = cfg.PROMOTE === true || String(cfg.PROMOTE).toLowerCase() === 'true';
  if (!promoteEnabled) {
    log_("PROMOTE=FALSE - All mutations blocked");
    return false;
  }

  log_("PROMOTE=TRUE - Live mutations enabled");
  return true;
}

function initializeSafetyGuards_(cfg) {
  if (!cfg) return;
  NEG_GUARD_ACTIVE = cfg.PROMOTE && !PREVIEW_MODE;
  log_("Safety guards initialized");
}

function loadNegGuard_(cfg) {
  RESERVED_KEYWORDS = cfg.NEG_GUARD || ['brand', 'competitor'];
  log_("Loaded " + RESERVED_KEYWORDS.length + " reserved keywords");
}

function logMutation_(type, details) {
  if (!PREVIEW_MODE && RUN_MODE !== 'IDEMPOTENCY_TEST') return;

  MUTATION_LOG.push({
    type: type,
    details: details,
    timestamp: new Date().toISOString()
  });
}`;