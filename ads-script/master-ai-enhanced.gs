/** ProofKit Autopilot - AI-Enhanced Google Ads Script
 * Automated campaign optimization with AI-powered features
 * Version: 2.0
 */
var TENANT_ID = '__TENANT_ID__';
var BACKEND_URL = '__BACKEND_URL__';
var SHARED_SECRET = '__HMAC_SECRET__';

var PREVIEW_MODE = false;
var MUTATION_LOG = [];
var RUN_MODE = 'PRODUCTION';
var AI_FEATURES_ENABLED = true;

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

  // Enable AI features based on configuration
  AI_FEATURES_ENABLED = cfg.AI_FEATURES_ENABLED !== false;

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

  // Collect performance data for AI analysis
  var performanceData = collectDetailedPerformance_();

  // Get AI recommendations if enabled
  var aiRecommendations = {};
  if (AI_FEATURES_ENABLED) {
    aiRecommendations = getAIRecommendations_(performanceData);
  }

  // Budget management with AI insights
  camps.forEach(function(c) {
    if (isExcludedCampaign_(cfg, c.getName())) return;

    // Use AI-recommended budget if available
    var aiRecBudget = aiRecommendations.budgets && aiRecommendations.budgets[c.getName()];
    var cap = aiRecBudget || cfg.BUDGET_CAPS[c.getName()] || cfg.daily_budget_cap_default;

    if (cap && c.getBudget().getAmount() > cap) {
      logMutation_('BUDGET_CHANGE', {
        campaign: c.getName(),
        oldAmount: c.getBudget().getAmount(),
        newAmount: cap,
        source: aiRecBudget ? 'AI' : 'CONFIG'
      });
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        c.getBudget().setAmount(cap);
        log_("Budget adjusted: " + c.getName() + " → $" + cap + (aiRecBudget ? " (AI)" : ""));
      }
    }
    safeLabel_(c, cfg.label);
  });

  // Smart bidding with AI optimization
  camps.forEach(function(c) {
    if (isExcludedCampaign_(cfg, c.getName())) return;

    // Get AI-recommended CPC if available
    var aiRecCPC = aiRecommendations.cpcs && aiRecommendations.cpcs[c.getName()];
    var ceil = aiRecCPC || cfg.CPC_CEILINGS[c.getName()] || cfg.cpc_ceiling_default;

    try {
      logMutation_('BIDDING_STRATEGY_CHANGE', {
        campaign: c.getName(),
        strategy: 'TARGET_SPEND',
        ceiling: ceil,
        source: aiRecCPC ? 'AI' : 'CONFIG'
      });
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        c.bidding().setStrategy('TARGET_SPEND');
        if (ceil) c.bidding().setCpcBidCeiling(ceil);
        log_("Bidding optimized: " + c.getName() + " → $" + ceil + (aiRecCPC ? " (AI)" : ""));
      }
    } catch(e) { log_("Bidding error on " + c.getName() + ": " + e); }
    safeLabel_(c, cfg.label);
  });

  // Business hours schedule
  if (cfg.add_business_hours_if_none) {
    camps.forEach(function(c) {
      if (isExcludedCampaign_(cfg, c.getName())) return;
      var has = c.targeting().adSchedules().get().hasNext();
      if (!has) {
        if (!PREVIEW_MODE && cfg.PROMOTE) {
          addSchedule_(c, cfg.business_days_csv, cfg.business_start, cfg.business_end);
          log_("Schedule added: " + c.getName());
        }
      }
      safeLabel_(c, cfg.label);
    });
  }

  // AI-enhanced negative keywords
  var negativeKeywords = cfg.MASTER_NEGATIVES || [];
  if (AI_FEATURES_ENABLED && aiRecommendations.negatives) {
    negativeKeywords = negativeKeywords.concat(aiRecommendations.negatives);
    log_("Added " + aiRecommendations.negatives.length + " AI-suggested negative keywords");
  }

  var list = getOrCreateNegList_(cfg.master_neg_list_name);
  upsertListNegs_(list, negativeKeywords);
  camps.forEach(function(c) {
    if (isExcludedCampaign_(cfg, c.getName())) return;
    attachList_(c, list);
  });
  applyWasteNegs_(cfg, cfg.WASTE_NEGATIVE_MAP);

  // Search terms analysis with AI insights
  var stRows = autoNegateAndCollectST_(cfg, cfg.st_lookback, cfg.st_min_clicks, cfg.st_min_cost);

  // Send search terms for AI analysis
  if (AI_FEATURES_ENABLED && stRows.length > 0) {
    analyzeSearchTermsWithAI_(stRows);
  }

  // AI-powered RSA creation
  if (AI_FEATURES_ENABLED) {
    buildAIPoweredRSAs_(cfg, aiRecommendations.rsas || {});
  } else {
    buildSafeRSAs_(cfg);
  }

  // Audience targeting with AI recommendations
  if (AI_FEATURES_ENABLED && aiRecommendations.audiences) {
    applyAIAudienceTargeting_(cfg, aiRecommendations.audiences);
  } else {
    audienceAttach_(cfg);
  }

  // AI-driven profit optimization
  if (AI_FEATURES_ENABLED) {
    applyAIProfitOptimization_(cfg, aiRecommendations);
  } else {
    applyProfitAwarePacing_(cfg);
  }

  // Collect and send comprehensive metrics
  var metrics = collectPerf_();
  var runLogs = [[new Date(), 'ProofKit AI-Enhanced run complete']];

  if (AI_FEATURES_ENABLED) {
    runLogs.push([new Date(), 'AI Features Active: ' + JSON.stringify({
      budgetOptimizations: Object.keys(aiRecommendations.budgets || {}).length,
      cpcOptimizations: Object.keys(aiRecommendations.cpcs || {}).length,
      negativeKeywords: (aiRecommendations.negatives || []).length,
      rsaSuggestions: Object.keys(aiRecommendations.rsas || {}).length
    })]);
  }

  if (PREVIEW_MODE || RUN_MODE === 'IDEMPOTENCY_TEST') {
    runLogs.push([new Date(), 'IDEMPOTENCY_LOG: ' + JSON.stringify({
      mode: RUN_MODE,
      mutationCount: MUTATION_LOG.length,
      mutations: MUTATION_LOG.slice(0, 50)
    })]);
  }

  postToBackend_('metrics', {
    nonce: new Date().getTime(),
    metrics: metrics,
    search_terms: stRows,
    run_logs: runLogs,
    ai_enabled: AI_FEATURES_ENABLED,
    ai_recommendations: aiRecommendations
  });
}

// AI Enhancement Functions
function getAIRecommendations_(performanceData) {
  if (!AI_FEATURES_ENABLED) return {};

  var sig = sign_("POST:" + TENANT_ID + ":ai_recommendations:" + new Date().getTime());
  var url = BACKEND_URL + "/ai/recommendations?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);

  try {
    var r = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        performance: performanceData,
        context: {
          account_age_days: 30,
          total_spend: calculateTotalSpend_(performanceData),
          conversion_rate: calculateConversionRate_(performanceData),
          average_cpc: calculateAverageCPC_(performanceData)
        }
      }),
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: { 'User-Agent': 'Proofkit-AdsScript/2.0' }
    });

    var code = r.getResponseCode();
    if (code < 200 || code >= 300) {
      log_("AI recommendations HTTP " + code);
      return {};
    }

    var result = JSON.parse(r.getContentText());
    log_("AI recommendations received: " + JSON.stringify({
      budgets: Object.keys(result.budgets || {}).length,
      cpcs: Object.keys(result.cpcs || {}).length,
      negatives: (result.negatives || []).length
    }));
    return result;
  } catch(e) {
    log_("AI recommendations error: " + e);
    return {};
  }
}

function collectDetailedPerformance_() {
  var data = {
    campaigns: {},
    adGroups: {},
    keywords: {},
    summary: {
      totalImpressions: 0,
      totalClicks: 0,
      totalCost: 0,
      totalConversions: 0
    }
  };

  // Campaign performance
  var q1 = "SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date DURING LAST_30_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it1 = AdsApp.search(q1);
  while (it1.hasNext()) {
    var r = it1.next();
    var cost = (r.metrics.costMicros || 0) / 1e6;
    data.campaigns[r.campaign.name] = {
      clicks: r.metrics.clicks || 0,
      cost: cost,
      conversions: r.metrics.conversions || 0,
      impressions: r.metrics.impressions || 0,
      ctr: r.metrics.ctr || 0,
      avgCpc: r.metrics.averageCpc || 0
    };
    data.summary.totalImpressions += r.metrics.impressions || 0;
    data.summary.totalClicks += r.metrics.clicks || 0;
    data.summary.totalCost += cost;
    data.summary.totalConversions += r.metrics.conversions || 0;
  }

  // Ad group performance
  var q2 = "SELECT campaign.name, ad_group.id, ad_group.name, metrics.clicks, metrics.cost_micros, metrics.conversions FROM ad_group WHERE segments.date DURING LAST_30_DAYS";
  var it2 = AdsApp.search(q2);
  while (it2.hasNext()) {
    var r2 = it2.next();
    if (!data.adGroups[r2.campaign.name]) data.adGroups[r2.campaign.name] = {};
    data.adGroups[r2.campaign.name][r2.adGroup.name] = {
      clicks: r2.metrics.clicks || 0,
      cost: (r2.metrics.costMicros || 0) / 1e6,
      conversions: r2.metrics.conversions || 0
    };
  }

  return data;
}

function analyzeSearchTermsWithAI_(searchTerms) {
  if (!AI_FEATURES_ENABLED || searchTerms.length === 0) return;

  var sig = sign_("POST:" + TENANT_ID + ":ai_search_terms:" + new Date().getTime());
  var url = BACKEND_URL + "/ai/analyze-search-terms?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ search_terms: searchTerms.slice(0, 100) }), // Limit to 100 for API
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: { 'User-Agent': 'Proofkit-AdsScript/2.0' }
    });
    log_("Search terms sent for AI analysis");
  } catch(e) {
    log_("Search term AI analysis error: " + e);
  }
}

function buildAIPoweredRSAs_(cfg, aiRSAs) {
  var it = AdsApp.adGroups()
    .withCondition("campaign.advertising_channel_type = SEARCH")
    .withCondition("ad_group.status IN ('ENABLED','PAUSED')")
    .get();
  var created = 0;

  while (it.hasNext()) {
    var ag = it.next();
    try {
      var hasDSA = ag.ads().withCondition("type = DYNAMIC_SEARCH_AD").get().hasNext();
      if (hasDSA) continue;
    } catch(e) {}

    if (hasLabelledAd_(ag, cfg.label)) continue;

    var finalUrl = inferFinalUrl_(ag) || cfg.default_final_url;
    var camp = ag.getCampaign().getName();
    var name = ag.getName();

    // Check for AI-generated content
    var aiContent = aiRSAs[camp] && aiRSAs[camp][name];
    var H, D;

    if (aiContent) {
      H = lint_(aiContent.headlines || [], 30, 15, 3);
      D = lint_(aiContent.descriptions || [], 90, 4, 10);
      log_("Using AI-generated RSA content for " + camp + " › " + name);
    } else {
      // Fallback to configured or default content
      var ov = (cfg.RSA_MAP[camp] && cfg.RSA_MAP[camp][name]) || null;
      var Hsrc = ov && ov.H && ov.H.length ? ov.H : (cfg.RSA_DEFAULT.H || ["Digital Certificates", "Compliance Reports"]);
      var Dsrc = ov && ov.D && ov.D.length ? ov.D : (cfg.RSA_DEFAULT.D || ["Create inspector-ready PDFs fast."]);
      H = lint_(Hsrc, 30, 15, 3);
      D = lint_(Dsrc, 90, 4, 10);
    }

    var b = ag.newAd().responsiveSearchAdBuilder().withFinalUrl(finalUrl);
    H.forEach(function(h) { b.addHeadline(h); });
    D.forEach(function(d) { b.addDescription(d); });

    try {
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        var op = b.build();
        if (op.isSuccessful()) {
          safeLabelWithGuard_(op.getResult(), cfg.label);
          created++;
          log_("RSA created in " + camp + " › " + name + (aiContent ? " (AI)" : ""));
        }
      }
    } catch(e) { log_("RSA build error in " + camp + " › " + name + ": " + e); }
  }
  if (created) log_("RSAs created: " + created);
}

function applyAIAudienceTargeting_(cfg, aiAudiences) {
  // Implementation would apply AI-recommended audiences
  log_("Applying AI audience recommendations: " + Object.keys(aiAudiences).length + " suggestions");
  // For now, fallback to standard implementation
  audienceAttach_(cfg);
}

function applyAIProfitOptimization_(cfg, recommendations) {
  if (!recommendations.profitSignals) {
    applyProfitAwarePacing_(cfg);
    return;
  }

  log_("Applying AI profit optimization signals");

  recommendations.profitSignals.forEach(function(signal) {
    try {
      var result = applySignalToAdGroup_(signal, cfg);
      if (result.applied) {
        log_("AI profit signal applied: " + signal.reason);
      }
    } catch(e) {
      log_("AI profit signal error: " + e);
    }
  });
}

// Helper functions for AI analysis
function calculateTotalSpend_(data) {
  return data.summary.totalCost || 0;
}

function calculateConversionRate_(data) {
  if (!data.summary.totalClicks) return 0;
  return (data.summary.totalConversions / data.summary.totalClicks) * 100;
}

function calculateAverageCPC_(data) {
  if (!data.summary.totalClicks) return 0;
  return data.summary.totalCost / data.summary.totalClicks;
}

// Include all original helper functions below...
// Backend communication
function getConfig_() {
  var sig = sign_("GET:" + TENANT_ID + ":config");
  var url = BACKEND_URL + "/config?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);
  try {
    var r = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: { 'User-Agent': 'Proofkit-AdsScript/2.0' }
    });
    var code = r.getResponseCode();
    var txt = r.getContentText();
    if (code < 200 || code >= 300) {
      log_("CONFIG HTTP " + code);
      return null;
    }
    var parsed = null;
    try { parsed = JSON.parse(txt); } catch(e) { log_("CONFIG parse error"); return null; }
    return parsed && parsed.config ? parsed.config : null;
  } catch(e) { log_("Config fetch error: " + e); }
  return null;
}

function postToBackend_(action, payload) {
  var sig = sign_("POST:" + TENANT_ID + ":" + action + ":" + (payload.nonce || ''));
  var url = BACKEND_URL + "/" + action + "?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);
  var CHUNK = 500, metrics = payload.metrics || [], sts = payload.search_terms || [], logs = payload.run_logs || [];

  // Include AI data in first chunk
  var firstChunk = {
    nonce: payload.nonce,
    metrics: metrics.slice(0, CHUNK),
    search_terms: sts.slice(0, CHUNK),
    run_logs: logs,
    ai_enabled: payload.ai_enabled,
    ai_recommendations: payload.ai_recommendations
  };

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(firstChunk),
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: { 'User-Agent': 'Proofkit-AdsScript/2.0' }
    });
  } catch(e) { log_("Backend post error: " + e); }

  // Send remaining chunks without AI data
  for (var i = 1; i < Math.max(1, Math.ceil(metrics.length/CHUNK)); i++) {
    var part = {
      nonce: payload.nonce,
      metrics: metrics.slice(i * CHUNK, (i + 1) * CHUNK),
      search_terms: [],
      run_logs: []
    };
    try {
      UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(part),
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: true,
        headers: { 'User-Agent': 'Proofkit-AdsScript/2.0' }
      });
    } catch(e) { log_("Backend post error (chunk " + i + "): " + e); }
  }
}

function sign_(payload) {
  var raw = Utilities.computeHmacSha256Signature(payload, SHARED_SECRET);
  return Utilities.base64Encode(raw).replace(/=+$/, '');
}

// Include all other helper functions from the original script...
// (ensureSeed_, addSchedule_, getOrCreateNegList_, upsertListNegs_, attachList_,
//  applyWasteNegs_, collectPerf_, autoNegateAndCollectST_, buildSafeRSAs_,
//  lint_, hasLabelledAd_, inferFinalUrl_, ensureLabel_, safeLabel_, dedupeWords_,
//  log_, audienceAttach_, isExcludedCampaign_, isExcludedAdGroup_,
//  initializeIdempotencyTracking_, logMutation_, validatePromoteGate_,
//  initializeSafetyGuards_, loadNegGuard_, isReservedKeyword_, safeLabelWithGuard_,
//  applyProfitAwarePacing_, getPaceSignals_, applySignalToAdGroup_)

// [Rest of helper functions continue as in original script...]
function ensureSeed_(cfg) {
  var any = AdsApp.campaigns().withCondition("campaign.advertising_channel_type = SEARCH").get();
  if (any.hasNext()) return;
  var name = (cfg.desired && cfg.desired.campaign_name) || "ProofKit - Search";
  var daily = cfg.daily_budget_cap_default || 3.00;
  var ceil = cfg.cpc_ceiling_default || 0.20;
  var adg = (cfg.desired && cfg.desired.ad_group) || "Default";
  var kw = (cfg.desired && cfg.desired.keyword) || '"digital certificates"';
  log_("Seeding zero-state campaign: " + name);

  var op = AdsApp.newCampaignBuilder().withName(name).withBudget(daily).withBiddingStrategy('TARGET_SPEND').build();
  if (!op.isSuccessful()) { log_("Seed campaign failed: " + op.getErrors().join('; ')); return; }

  var c = op.getResult();
  try { c.bidding().setCpcBidCeiling(ceil); } catch(e) {}
  try {
    (cfg.business_days_csv || "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(',').forEach(function(day) {
      c.addAdSchedule(day.trim(), 9, 0, 18, 0, 1.0);
    });
  } catch(e) {}

  var agop = c.newAdGroupBuilder().withName(adg).build();
  if (!agop.isSuccessful()) { log_("Seed ad group failed"); return; }

  var ag = agop.getResult();
  try { ag.newKeywordBuilder().withText(kw).build(); } catch(e) {}

  var H = ["Digital Certificates", "Compliance Reports", "Export Clean PDFs", "Generate Certs Fast", "Audit-Ready Reports", "Start Free Today"];
  var D = ["Create inspector-ready PDFs fast.", "Replace spreadsheets with an auditable system.", "Templates enforce SOPs. Audit trail included.", "Setup in under 10 minutes."];
  var b = ag.newAd().responsiveSearchAdBuilder().withFinalUrl(cfg.default_final_url || "https://www.proofkit.net");
  H.slice(0, 15).forEach(function(h) { b.addHeadline(h.length > 30 ? h.slice(0, 30) : h); });
  D.slice(0, 4).forEach(function(d) { b.addDescription(d.length > 90 ? d.slice(0, 90) : d); });
  try { b.build(); } catch(e) { log_("Seed RSA failed: " + e); }
  log_("Seeded: " + name + " › " + adg);
}

function addSchedule_(c, daysCsv, start, end) {
  var sp = (start || '09:00').split(':'), ep = (end || '18:00').split(':');
  var sh = Number(sp[0] || 9), sm = Number(sp[1] || 0);
  var eh = Number(ep[0] || 18), em = Number(ep[1] || 0);
  (daysCsv || "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(',').forEach(function(day) {
    c.addAdSchedule(day.trim(), sh, sm, eh, em, 1.0);
  });
}

function getOrCreateNegList_(name) {
  var it = AdsApp.negativeKeywordLists().get();
  while (it.hasNext()) {
    var l = it.next();
    if (l.getName() === name) return l;
  }
  var created = AdsApp.newNegativeKeywordListBuilder().withName(name).build().getResult();
  log_("Created neg list: " + name);
  return created;
}

function upsertListNegs_(list, terms) {
  if (!list) return;
  var have = {}, it = list.negativeKeywords().get();
  while (it.hasNext()) have[it.next().getText().toLowerCase()] = true;
  var added = 0;
  (terms || []).forEach(function(t) {
    t = String(t || "").trim();
    if (t && !have[t.toLowerCase()] && !isReservedKeyword_(t)) {
      if (!PREVIEW_MODE && NEG_GUARD_ACTIVE) {
        list.addNegativeKeyword(t);
        added++;
      }
    }
  });
  if (added) log_("Master negatives added: " + added);
}

function attachList_(c, list) {
  var it = c.negativeKeywordLists().get();
  while (it.hasNext()) if (it.next().getId() === list.getId()) return;
  if (!PREVIEW_MODE && NEG_GUARD_ACTIVE) {
    c.addNegativeKeywordList(list);
    log_("Attached neg list to " + c.getName());
  }
}

function applyWasteNegs_(cfg, map) {
  for (var camp in map) {
    var agMap = map[camp] || {};
    var cit = AdsApp.campaigns().withCondition('campaign.name = "' + camp.replace(/"/g, '\\"') + '"').get();
    if (!cit.hasNext()) continue;
    var cmp = cit.next(), idx = {}, it = cmp.adGroups().get();
    if (isExcludedCampaign_(cfg, cmp.getName())) continue;
    while (it.hasNext()) { var g = it.next(); idx[g.getName()] = g; }
    for (var ag in agMap) {
      if (isExcludedAdGroup_(cfg, cmp.getName(), ag)) continue;
      var grp = idx[ag];
      if (!grp) continue;
      var uniq = {}, terms = agMap[ag] || [], added = 0;
      terms.forEach(function(t) {
        t = String(t || "").toLowerCase();
        if (uniq[t]) return;
        uniq[t] = true;
        try { grp.createNegativeKeyword('[' + t + ']'); added++; } catch(e) {}
      });
      if (added) log_("Added " + added + " negatives in " + camp + " › " + ag);
    }
  }
}

function collectPerf_() {
  var rows = [];
  var q1 = "SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM campaign WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it1 = AdsApp.search(q1);
  while (it1.hasNext()) {
    var r = it1.next();
    rows.push([
      new Date(), 'campaign', r.campaign.name, '', r.campaign.id, r.campaign.name,
      (r.metrics.clicks || 0), ((r.metrics.costMicros || 0) / 1e6),
      (r.metrics.conversions || 0), (r.metrics.impressions || 0), (r.metrics.ctr || 0)
    ]);
  }

  var q2 = "SELECT campaign.name, ad_group.id, ad_group.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM ad_group WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it2 = AdsApp.search(q2);
  while (it2.hasNext()) {
    var r2 = it2.next();
    rows.push([
      new Date(), 'ad_group', r2.campaign.name, r2.adGroup.name, r2.adGroup.id, r2.adGroup.name,
      (r2.metrics.clicks || 0), ((r2.metrics.costMicros || 0) / 1e6),
      (r2.metrics.conversions || 0), (r2.metrics.impressions || 0), (r2.metrics.ctr || 0)
    ]);
  }
  return rows;
}

function autoNegateAndCollectST_(cfg, lookback, minClicks, minCost) {
  var q = "SELECT campaign.name, ad_group.id, ad_group.name, search_term_view.search_term, metrics.clicks, metrics.cost_micros, metrics.conversions FROM search_term_view WHERE segments.date DURING " + (lookback || 'LAST_7_DAYS') + " AND campaign.advertising_channel_type = SEARCH AND metrics.clicks >= " + (minClicks || 2);
  var it = AdsApp.search(q), outRows = [], bucket = {};
  while (it.hasNext()) {
    var r = it.next();
    var cost = (r.metrics.costMicros || 0) / 1e6;
    var conv = r.metrics.conversions || 0;
    if (conv === 0 && cost >= (minCost || 2.82)) {
      var t = (r.searchTermView.searchTerm || "").toLowerCase();
      var id = String(r.adGroup.id);
      (bucket[id] = bucket[id] || []).push(t);
    }
    outRows.push([
      new Date(), r.campaign.name, r.adGroup.name,
      (r.searchTermView.searchTerm || ""), (r.metrics.clicks || 0), cost, conv
    ]);
  }

  for (var id in bucket) {
    var agit = AdsApp.adGroups().withIds([Number(id)]).get();
    if (!agit.hasNext()) continue;
    var ag = agit.next();
    var campName = ag.getCampaign().getName();
    var agName = ag.getName();
    if (isExcludedAdGroup_(cfg, campName, agName)) continue;
    var uniq = {}, list = bucket[id] || [], added = 0;
    list.forEach(function(t) {
      if (uniq[t] || isReservedKeyword_(t)) return;
      uniq[t] = true;
      try {
        if (NEG_GUARD_ACTIVE && cfg.PROMOTE) {
          ag.createNegativeKeyword('[' + t + ']');
          added++;
        }
      } catch(e) {}
    });
    if (added) log_("Auto-negated " + added + " in " + agName);
  }
  return outRows;
}

function buildSafeRSAs_(cfg) {
  var it = AdsApp.adGroups()
    .withCondition("campaign.advertising_channel_type = SEARCH")
    .withCondition("ad_group.status IN ('ENABLED','PAUSED')")
    .get();
  var created = 0;

  while (it.hasNext()) {
    var ag = it.next();
    try {
      var hasDSA = ag.ads().withCondition("type = DYNAMIC_SEARCH_AD").get().hasNext();
      if (hasDSA) continue;
    } catch(e) {}

    if (hasLabelledAd_(ag, cfg.label)) continue;

    var finalUrl = inferFinalUrl_(ag) || cfg.default_final_url;
    var camp = ag.getCampaign().getName();
    var name = ag.getName();
    var ov = (cfg.RSA_MAP[camp] && cfg.RSA_MAP[camp][name]) || null;
    var Hsrc = ov && ov.H && ov.H.length ? ov.H : (cfg.RSA_DEFAULT.H || ["Digital Certificates", "Compliance Reports"]);
    var Dsrc = ov && ov.D && ov.D.length ? ov.D : (cfg.RSA_DEFAULT.D || ["Create inspector-ready PDFs fast."]);
    var H = lint_(Hsrc, 30, 15, 3), D = lint_(Dsrc, 90, 4, 10);

    var b = ag.newAd().responsiveSearchAdBuilder().withFinalUrl(finalUrl);
    H.forEach(function(h) { b.addHeadline(h); });
    D.forEach(function(d) { b.addDescription(d); });

    try {
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        var op = b.build();
        if (op.isSuccessful()) {
          safeLabelWithGuard_(op.getResult(), cfg.label);
          created++;
          log_("RSA created in " + camp + " › " + name);
        }
      }
    } catch(e) { log_("RSA build error in " + camp + " › " + name + ": " + e); }
  }
  if (created) log_("RSAs created: " + created);
}

function lint_(arr, maxLen, maxItems, minLen) {
  var out = [], seen = {};
  for (var i = 0; i < arr.length && out.length < maxItems; i++) {
    var s = String(arr[i] || "").trim();
    if (!s) continue;
    s = dedupeWords_(s);
    if (s.length > maxLen) s = s.slice(0, maxLen);
    if (s.length < minLen) continue;
    var k = s.toLowerCase();
    if (seen[k]) continue;
    seen[k] = true;
    out.push(s);
  }
  return out;
}

function hasLabelledAd_(ag, label) {
  var ads = ag.ads().get();
  while (ads.hasNext()) {
    var ad = ads.next(), labs = ad.labels().get();
    while (labs.hasNext()) if (labs.next().getName() === label) return true;
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
  while (it.hasNext()) if (it.next().getName() === name) return;
  AdsApp.createLabel(name, "AI-Powered by ProofKit");
}

function safeLabel_(entity, name) { safeLabelWithGuard_(entity, name); }

function dedupeWords_(s) {
  var p = s.split(/\s+/), out = [], seen = {};
  for (var i = 0; i < p.length; i++) {
    var w = p[i], k = w.toLowerCase();
    if (seen[k]) continue;
    seen[k] = true;
    out.push(w);
  }
  return out.join(' ');
}

function log_(m) { Logger.log(m); }

function audienceAttach_(cfg) {
  try {
    if (!cfg || !cfg.FEATURE_AUDIENCE_ATTACH) {
      log_('Audience attach disabled');
      return;
    }

    var audienceMap = cfg.AUDIENCE_MAP || {};
    if (Object.keys(audienceMap).length === 0) {
      log_('No audience mappings found');
      return;
    }

    var attached = 0, skipped = 0, errors = 0;
    var minSize = Number(cfg.AUDIENCE_MIN_SIZE || 1000);

    var it = AdsApp.campaigns()
      .withCondition("campaign.advertising_channel_type = SEARCH")
      .withCondition("campaign.status IN ('ENABLED','PAUSED')")
      .get();
    var campaigns = {};
    while (it.hasNext()) {
      var c = it.next();
      campaigns[c.getName()] = c;
    }

    for (var campName in audienceMap) {
      if (isExcludedCampaign_(cfg, campName)) continue;

      var campaign = campaigns[campName];
      if (!campaign) { errors++; continue; }

      var adGroupMap = audienceMap[campName] || {};
      for (var adGroupName in adGroupMap) {
        if (isExcludedAdGroup_(cfg, campName, adGroupName)) continue;

        var audienceRow = adGroupMap[adGroupName];
        if (!audienceRow || !audienceRow.user_list_id) { errors++; continue; }

        var listId = String(audienceRow.user_list_id).trim();
        var mode = String(audienceRow.mode || 'OBSERVE').toUpperCase();
        var bidModifier = audienceRow.bid_modifier ? Number(audienceRow.bid_modifier) : null;

        if (!['OBSERVE', 'TARGET', 'EXCLUDE'].includes(mode)) mode = 'OBSERVE';

        try {
          var alreadyAttached = false;
          var existingAudiences = campaign.targeting().audiences().get();
          while (existingAudiences.hasNext()) {
            var existingAud = existingAudiences.next();
            if (String(existingAud.getId()) === listId) {
              alreadyAttached = true;
              if (bidModifier && mode !== 'EXCLUDE' && !PREVIEW_MODE && cfg.PROMOTE) {
                try {
                  existingAud.setBidModifier(bidModifier);
                  log_('Updated bid modifier: ' + campName + ' id=' + listId);
                } catch(e) {}
              }
              break;
            }
          }

          if (alreadyAttached) { skipped++; continue; }

          if (!PREVIEW_MODE && cfg.PROMOTE) {
            var builder = campaign.targeting().newUserListBuilder().withAudienceId(Number(listId));
            if (mode === 'TARGET') builder.inTargetingMode();
            else if (mode === 'EXCLUDE') {
              try { builder.inExclusionMode(); } catch(e) { continue; }
            }

            var op = builder.build();
            if (op && op.isSuccessful()) {
              var attachedAudience = op.getResult();
              if (bidModifier && mode !== 'EXCLUDE') {
                try { attachedAudience.setBidModifier(bidModifier); } catch(e) {}
              }
              attached++;
            } else { errors++; }
          }
        } catch(e) { errors++; }
      }
    }

    log_('Audience attach: ' + attached + ' attached, ' + skipped + ' skipped, ' + errors + ' errors');
  } catch(e) { log_('Audience attach error: ' + e); }
}

function isExcludedCampaign_(cfg, campaignName) {
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName]); } catch(e) { return false; }
}

function isExcludedAdGroup_(cfg, campaignName, adGroupName) {
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName] && cfg.EXCLUSIONS[campaignName][adGroupName]); } catch(e) { return false; }
}

function initializeIdempotencyTracking_() {
  try {
    var testMode = PropertiesService.getScriptProperties().getProperty('PROOFKIT_TEST_MODE');
    if (testMode === 'PREVIEW' || testMode === 'IDEMPOTENCY_TEST') {
      RUN_MODE = testMode;
      PREVIEW_MODE = (testMode === 'PREVIEW' || testMode === 'IDEMPOTENCY_TEST');
      log_('Idempotency tracking enabled - Mode: ' + RUN_MODE);
    }
  } catch(e) {}
  MUTATION_LOG = [];
}

function logMutation_(type, details) {
  if (!PREVIEW_MODE && RUN_MODE !== 'IDEMPOTENCY_TEST') return;
  MUTATION_LOG.push({
    type: type,
    details: details,
    timestamp: new Date().toISOString(),
    mode: RUN_MODE
  });
}

var NEG_GUARD_ACTIVE = false;
var RESERVED_KEYWORDS = ['proofkit', 'brand', 'competitor', 'important'];

function validatePromoteGate_(cfg) {
  if (!cfg) return false;
  if (PREVIEW_MODE || RUN_MODE === 'IDEMPOTENCY_TEST') return true;

  var promoteEnabled = cfg.PROMOTE === true || String(cfg.PROMOTE).toLowerCase() === 'true';
  if (!promoteEnabled) {
    log_('PROMOTE=FALSE - All mutations blocked');
    return false;
  }

  log_('PROMOTE=TRUE - Live mutations enabled');
  return true;
}

function initializeSafetyGuards_(cfg) {
  if (!cfg) return;
  NEG_GUARD_ACTIVE = cfg.PROMOTE && !PREVIEW_MODE && RUN_MODE !== 'IDEMPOTENCY_TEST';
  log_('Safety Guards: PROMOTE=' + cfg.PROMOTE + ', NEG_GUARD=' + NEG_GUARD_ACTIVE + ', AI=' + AI_FEATURES_ENABLED);
}

function loadNegGuard_(cfg) {
  try {
    RESERVED_KEYWORDS = cfg.NEG_GUARD || ['proofkit', 'brand', 'competitor', 'important'];
    log_('NEG_GUARD: Loaded ' + RESERVED_KEYWORDS.length + ' reserved keywords');
  } catch(e) {
    RESERVED_KEYWORDS = ['proofkit', 'brand', 'competitor', 'important'];
  }
}

function isReservedKeyword_(term) {
  if (!term || RESERVED_KEYWORDS.length === 0) return false;
  var termLower = String(term).toLowerCase().trim();
  for (var i = 0; i < RESERVED_KEYWORDS.length; i++) {
    if (termLower.indexOf(RESERVED_KEYWORDS[i]) !== -1) return true;
  }
  return false;
}

function safeLabelWithGuard_(entity, labelName) {
  if (!entity || !labelName) return;
  try {
    var hasLabel = false;
    var labels = entity.labels().get();
    while (labels.hasNext()) {
      if (labels.next().getName() === labelName) {
        hasLabel = true;
        break;
      }
    }
    if (!hasLabel) entity.applyLabel(labelName);
  } catch(e) {}
}

function applyProfitAwarePacing_(cfg) {
  try {
    if (!cfg || !cfg.FEATURE_INVENTORY_GUARD) {
      log_('Profit pacing disabled');
      return;
    }

    log_('Applying profit-aware pacing');
    var paceSignals = getPaceSignals_();
    if (!paceSignals || paceSignals.length === 0) {
      log_('No pace signals available');
      return;
    }

    var applied = 0, paused = 0, errors = 0;

    for (var i = 0; i < paceSignals.length; i++) {
      var signal = paceSignals[i];
      try {
        var result = applySignalToAdGroup_(signal, cfg);
        if (result.applied) applied++;
        if (result.paused) paused++;
      } catch(e) { errors++; }
    }

    log_('Profit pacing: ' + applied + ' applied, ' + paused + ' paused, ' + errors + ' errors');
  } catch(e) { log_('Profit pacing error: ' + e); }
}

function getPaceSignals_() {
  var sig = sign_("GET:" + TENANT_ID + ":profit_signals");
  var url = BACKEND_URL + "/profit/signals?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);

  try {
    var r = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: { 'User-Agent': 'Proofkit-AdsScript/2.0' }
    });

    var code = r.getResponseCode();
    var txt = r.getContentText();
    if (code < 200 || code >= 300) return null;

    var parsed = null;
    try { parsed = JSON.parse(txt); } catch(e) { return null; }
    return parsed && parsed.signals ? parsed.signals : null;
  } catch(e) { return null; }
}

function applySignalToAdGroup_(signal, cfg) {
  var result = { applied: false, paused: false };
  if (!signal || !signal.ad_group_id) return result;

  var adGroupId = String(signal.ad_group_id);
  var action = String(signal.action || 'MAINTAIN');
  var paceSignal = Number(signal.pace_signal || 1.0);
  var reason = String(signal.reason || 'No reason');

  var adGroupIter = AdsApp.adGroups().withIds([Number(adGroupId)]).get();
  if (!adGroupIter.hasNext()) return result;

  var adGroup = adGroupIter.next();
  var campaign = adGroup.getCampaign();
  var campaignName = campaign.getName();
  var adGroupName = adGroup.getName();

  if (isExcludedAdGroup_(cfg, campaignName, adGroupName)) return result;

  switch (action) {
    case 'PAUSE':
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        try {
          adGroup.pause();
          log_('Paused: ' + campaignName + ' › ' + adGroupName + ' (' + reason + ')');
          result.paused = true;
        } catch(e) {}
      }
      break;

    case 'REDUCE_BUDGET':
    case 'INCREASE_BUDGET':
      var currentBudget = campaign.getBudget().getAmount();
      var newBudget = currentBudget;

      if (action === 'INCREASE') {
        newBudget = Math.min(currentBudget * Math.min(paceSignal, 2.0), 100.0);
      } else {
        newBudget = Math.max(currentBudget * Math.max(paceSignal, 0.1), 1.0);
      }

      if (Math.abs(newBudget - currentBudget) / currentBudget > 0.05) {
        if (!PREVIEW_MODE && cfg.PROMOTE) {
          try {
            campaign.getBudget().setAmount(newBudget);
            log_('Budget ' + action.toLowerCase() + ': ' + campaignName + ' $' + currentBudget.toFixed(2) + ' → $' + newBudget.toFixed(2));
            result.applied = true;
          } catch(e) {}
        }
      }
      break;

    case 'MONITOR_MARGIN':
    case 'MAINTAIN':
    default:
      result.applied = true;
      break;
  }

  return result;
}