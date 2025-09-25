// Full Google Ads Script Content (for embedding in server.js)
// Updated with optimized 26KB version
export default String.raw`/** Ads Autopilot AI - Google Ads Script v2.1
 * Automated campaign optimization powered by AI
 * Version: 2.1 - User value injection and RSA extraction
 */
var TENANT_ID = '__TENANT_ID__';
var BACKEND_URL = '__BACKEND_URL__';
var SHARED_SECRET = '__HMAC_SECRET__';

// User-configured fallback values (will be replaced during generation)
var USER_BUDGET = parseFloat('__USER_BUDGET__') || 20.00;
var USER_CPC = parseFloat('__USER_CPC__') || 0.50;
var USER_URL = '__USER_URL__';
var USER_LABEL = '__USER_LABEL__' || '__TENANT_ID__ • Managed';

var PREVIEW_MODE = false;
var MUTATION_LOG = [];
var RUN_MODE = 'PRODUCTION';

function main() {
  initializeIdempotencyTracking_();

  var cfg = getConfig_();
  if (!cfg || !cfg.enabled) { log_("Config disabled or not found."); return; }

  // Force user values to override backend config
  cfg.daily_budget_cap_default = USER_BUDGET;
  cfg.cpc_ceiling_default = USER_CPC;
  if (USER_URL && USER_URL !== '__USER_URL__' && USER_URL !== '') {
    cfg.default_final_url = USER_URL;
  }
  cfg.label = USER_LABEL;

  // Log loaded configuration values
  var displayUrl = cfg.default_final_url || USER_URL || 'not set';
  log_("Config loaded - Budget: $" + cfg.daily_budget_cap_default +
       ", CPC: $" + cfg.cpc_ceiling_default +
       ", Label: " + cfg.label +
       ", URL: " + displayUrl);

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

  // Budget management
  camps.forEach(function(c) {
    if (isExcludedCampaign_(cfg, c.getName())) return;
    var cap = cfg.BUDGET_CAPS[c.getName()] != null ? cfg.BUDGET_CAPS[c.getName()] : (parseFloat(cfg.daily_budget_cap_default) || parseFloat(cfg.USER_BUDGET_CAP) || 3.00);
    if (cap && c.getBudget().getAmount() > cap) {
      logMutation_('BUDGET_CHANGE', {campaign: c.getName(), oldAmount: c.getBudget().getAmount(), newAmount: cap});
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        c.getBudget().setAmount(cap);
        log_("Budget capped: " + c.getName() + " → $" + cap);
      }
    }
    safeLabel_(c, cfg.label);
  });

  // Bidding strategy
  camps.forEach(function(c) {
    if (isExcludedCampaign_(cfg, c.getName())) return;
    var ceil = cfg.CPC_CEILINGS[c.getName()] != null ? cfg.CPC_CEILINGS[c.getName()] : (parseFloat(cfg.cpc_ceiling_default) || parseFloat(cfg.USER_CPC_CEILING) || 0.20);
    try {
      logMutation_('BIDDING_STRATEGY_CHANGE', {campaign: c.getName(), strategy: 'TARGET_SPEND', ceiling: ceil});
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        c.bidding().setStrategy('TARGET_SPEND');
        if (ceil) c.bidding().setCpcBidCeiling(ceil);
        log_("Bidding set: " + c.getName() + " → TARGET_SPEND, ceiling $" + ceil);
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

  // Negative keywords
  var list = getOrCreateNegList_(cfg.master_neg_list_name);
  upsertListNegs_(list, cfg.MASTER_NEGATIVES);
  camps.forEach(function(c) {
    if (isExcludedCampaign_(cfg, c.getName())) return;
    attachList_(c, list);
  });
  applyWasteNegs_(cfg, cfg.WASTE_NEGATIVE_MAP);

  // Search terms analysis
  var stRows = autoNegateAndCollectST_(cfg, cfg.st_lookback, cfg.st_min_clicks, cfg.st_min_cost);

  // RSA creation
  buildSafeRSAs_(cfg);

  // Audience targeting
  audienceAttach_(cfg);

  // Profit-aware optimization
  applyProfitAwarePacing_(cfg);

  // Send metrics to backend
  var metrics = collectPerf_();
  var runLogs = [[new Date(), 'Ads Autopilot AI run complete']];

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
    run_logs: runLogs
  });
}

// Backend communication
function getConfig_() {
  var sig = sign_("GET:" + TENANT_ID + ":config");
  var url = BACKEND_URL + "/config?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);
  try {
    var r = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: { 'User-Agent': 'AdsAutopilotAI/1.0' }
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
  for (var i = 0; i < Math.max(1, Math.ceil(metrics.length/CHUNK)); i++) {
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
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: true,
        headers: { 'User-Agent': 'AdsAutopilotAI/1.0' }
      });
    } catch(e) { log_("Backend post error (chunk " + i + "): " + e); }
  }
}

function sign_(payload) {
  var raw = Utilities.computeHmacSha256Signature(payload, SHARED_SECRET);
  return Utilities.base64Encode(raw).replace(/=+$/, '');
}

// Campaign seeding
function ensureSeed_(cfg) {
  var any = AdsApp.campaigns().withCondition("campaign.advertising_channel_type = SEARCH").get();
  if (any.hasNext()) return;
  var name = (cfg.desired && cfg.desired.campaign_name) || "Ads Autopilot AI - Search";
  var daily = parseFloat(cfg.daily_budget_cap_default) || parseFloat(cfg.USER_BUDGET_CAP) || 3.00;
  var ceil = parseFloat(cfg.cpc_ceiling_default) || parseFloat(cfg.USER_CPC_CEILING) || 0.20;
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
  var b = ag.newAd().responsiveSearchAdBuilder().withFinalUrl(cfg.default_final_url || cfg.USER_LANDING_URL || "https://www.proofkit.net");
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

// Negative keyword management
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
    var cit = AdsApp.campaigns().withCondition('campaign.name = "' + camp.replace(/"/g, '\\\\"') + '"').get();
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

// Performance collection - Using Legacy API for reliability
function collectPerf_() {
  var rows = [];

  try {
    // Use the legacy API which is more reliable
    var campaigns = AdsApp.campaigns()
      .withCondition("AdvertisingChannelType = SEARCH")
      .withCondition("Status IN ['ENABLED', 'PAUSED', 'REMOVED']")
      .get();

    while (campaigns.hasNext()) {
      var campaign = campaigns.next();
      var campaignId = campaign.getId();
      var campaignName = campaign.getName();

      // Get stats for different periods including ALL_TIME to capture historical data
      var periods = ["ALL_TIME", "LAST_30_DAYS", "LAST_7_DAYS", "TODAY", "YESTERDAY"];

      for (var i = 0; i < periods.length; i++) {
        try {
          var stats = campaign.getStatsFor(periods[i]);

          // Always record data, even if 0 (to show campaigns exist even without activity)
          rows.push([
            new Date(), 'campaign', campaignName, '', campaignId, campaignName,
            stats.getClicks(), stats.getCost(), stats.getConversions(),
            stats.getImpressions(), stats.getCtr()
          ]);

          // Log for debugging - show all periods
          log_("Campaign " + campaignName + " [" + periods[i] + "] - Impressions: " + stats.getImpressions() + ", Clicks: " + stats.getClicks() + ", Cost: $" + stats.getCost() + ", Conv: " + stats.getConversions());
        } catch (e) {
          log_("Error getting stats for " + campaignName + " [" + periods[i] + "]: " + e);
        }
      }

      // Get ad groups for this campaign
      var adGroups = campaign.adGroups()
        .withCondition("Status IN ['ENABLED', 'PAUSED', 'REMOVED']")
        .get();

      while (adGroups.hasNext()) {
        var adGroup = adGroups.next();
        var adGroupId = adGroup.getId();
        var adGroupName = adGroup.getName();

        // Try multiple periods for ad groups too
        var agPeriods = ["ALL_TIME", "LAST_30_DAYS", "LAST_7_DAYS"];
        for (var j = 0; j < agPeriods.length; j++) {
          try {
            var agStats = adGroup.getStatsFor(agPeriods[j]);

            // Always record, even with 0 metrics
            rows.push([
              new Date(), 'ad_group', campaignName, adGroupName, adGroupId, adGroupName,
              agStats.getClicks(), agStats.getCost(), agStats.getConversions(),
              agStats.getImpressions(), agStats.getCtr()
            ]);

            // Log first period that has data
            if (agStats.getImpressions() > 0 && j === 0) {
              log_("Ad Group " + adGroupName + " [" + agPeriods[j] + "] has data - Impressions: " + agStats.getImpressions());
            }
          } catch (e) {
            log_("Error getting ad group stats for " + adGroupName + " [" + agPeriods[j] + "]: " + e);
          }
        }
      }
    }

    log_("Collected metrics for " + rows.length + " entities");

    // If no rows collected, try Report API as well
    if (rows.length === 0) {
      log_("No data from Legacy API, trying Report API...");
      try {
        var report = AdsApp.report(
          "SELECT CampaignName, CampaignId, Clicks, Cost, Conversions, Impressions, Ctr " +
          "FROM CAMPAIGN_PERFORMANCE_REPORT " +
          "WHERE CampaignStatus IN ['ENABLED', 'PAUSED'] " +
          "DURING LAST_30_DAYS"
        );

        var reportRows = report.rows();
        while (reportRows.hasNext()) {
          var row = reportRows.next();
          rows.push([
            new Date(), 'campaign', row['CampaignName'], '', row['CampaignId'], row['CampaignName'],
            parseInt(row['Clicks']) || 0,
            parseFloat(row['Cost']) || 0,
            parseFloat(row['Conversions']) || 0,
            parseInt(row['Impressions']) || 0,
            parseFloat(row['Ctr']) || 0
          ]);

          log_("Report API - Campaign: " + row['CampaignName'] + ", Impressions: " + row['Impressions'] + ", Cost: " + row['Cost']);
        }
      } catch (reportError) {
        log_("Report API also failed: " + reportError);
      }
    }

  } catch (e) {
    log_("Performance collection error: " + e);

    // Fallback to GAQL if legacy fails
    try {
      log_("Trying GAQL fallback...");
      var q1 = "SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM campaign WHERE segments.date DURING LAST_30_DAYS";
      var it1 = AdsApp.search(q1);

      while (it1.hasNext()) {
        var r = it1.next();
        // Note: GAQL returns cost_micros in micros (1 million micros = $1)
        var costInDollars = (r.metrics && r.metrics.cost_micros) ? r.metrics.cost_micros / 1000000 : 0;

        rows.push([
          new Date(), 'campaign', r.campaign.name, '', r.campaign.id, r.campaign.name,
          (r.metrics && r.metrics.clicks) || 0,
          costInDollars,
          (r.metrics && r.metrics.conversions) || 0,
          (r.metrics && r.metrics.impressions) || 0,
          (r.metrics && r.metrics.ctr) || 0
        ]);

        log_("GAQL - Campaign: " + r.campaign.name + ", Impressions: " + ((r.metrics && r.metrics.impressions) || 0));
      }
    } catch (gaqlError) {
      log_("GAQL fallback also failed: " + gaqlError);
    }
  }

  log_("Total rows collected: " + rows.length);
  return rows;
}

// Search term auto-negation
function autoNegateAndCollectST_(cfg, lookback, minClicks, minCost) {
  var outRows = [], bucket = {};

  try {
    // Try GAQL approach with proper property access
    var q = "SELECT campaign.name, ad_group.id, ad_group.name, search_term_view.search_term, metrics.clicks, metrics.cost_micros, metrics.conversions FROM search_term_view WHERE segments.date DURING " + (lookback || 'LAST_7_DAYS') + " AND campaign.advertising_channel_type = SEARCH AND metrics.clicks >= " + (minClicks || 2);
    var it = AdsApp.search(q);

    while (it.hasNext()) {
      var r = it.next();

      // Safely access nested properties
      var campaignName = (r.campaign && r.campaign.name) || "";
      var adGroupId = (r.adGroup && r.adGroup.id) || (r.ad_group && r.ad_group.id) || "";
      var adGroupName = (r.adGroup && r.adGroup.name) || (r.ad_group && r.ad_group.name) || "";
      var searchTerm = (r.searchTermView && r.searchTermView.searchTerm) || (r.search_term_view && r.search_term_view.search_term) || "";
      var clicks = (r.metrics && r.metrics.clicks) || 0;
      var costMicros = (r.metrics && (r.metrics.costMicros || r.metrics.cost_micros)) || 0;
      var conversions = (r.metrics && r.metrics.conversions) || 0;

      // Convert cost from micros to dollars
      var cost = costMicros / 1000000;

      if (conversions === 0 && cost >= (minCost || 2.82)) {
        var t = searchTerm.toLowerCase();
        var id = String(adGroupId);
        (bucket[id] = bucket[id] || []).push(t);
      }

      outRows.push([
        new Date(), campaignName, adGroupName,
        searchTerm, clicks, cost, conversions
      ]);
    }

    log_("Collected " + outRows.length + " search terms");

  } catch (e) {
    log_("Search term collection error: " + e);
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

// Extract existing ad content for reuse
function extractExistingAdContent_(campaign) {
  var headlines = [];
  var descriptions = [];
  var seenH = {};
  var seenD = {};

  try {
    // Get all ad groups in this campaign
    var agIt = campaign.adGroups()
      .withCondition("Status IN ['ENABLED','PAUSED']")
      .get();

    while (agIt.hasNext()) {
      var ag = agIt.next();
      var adsIt = ag.ads()
        .withCondition("Status IN ['ENABLED','PAUSED']")
        .get();

      while (adsIt.hasNext()) {
        var ad = adsIt.next();
        try {
          // Get RSA assets
          var rsaAd = ad.asType().responsiveSearchAd();

          // Extract headlines
          var adHeadlines = rsaAd.getHeadlines();
          for (var i = 0; i < adHeadlines.length; i++) {
            var h = adHeadlines[i].text;
            var hKey = h.toLowerCase();
            if (!seenH[hKey] && h.length >= 3 && h.length <= 30) {
              seenH[hKey] = true;
              headlines.push(h);
            }
          }

          // Extract descriptions
          var adDescriptions = rsaAd.getDescriptions();
          for (var j = 0; j < adDescriptions.length; j++) {
            var d = adDescriptions[j].text;
            var dKey = d.toLowerCase();
            if (!seenD[dKey] && d.length >= 10 && d.length <= 90) {
              seenD[dKey] = true;
              descriptions.push(d);
            }
          }
        } catch(rsaError) {
          // Not an RSA - try expanded text ad as fallback
          try {
            var expandedAd = ad.asType().expandedTextAd();

            // Get headlines from ETA
            var h1 = expandedAd.getHeadlinePart1();
            var h2 = expandedAd.getHeadlinePart2();
            var h3 = expandedAd.getHeadlinePart3 ? expandedAd.getHeadlinePart3() : null;

            if (h1 && !seenH[h1.toLowerCase()]) {
              seenH[h1.toLowerCase()] = true;
              headlines.push(h1);
            }
            if (h2 && !seenH[h2.toLowerCase()]) {
              seenH[h2.toLowerCase()] = true;
              headlines.push(h2);
            }
            if (h3 && !seenH[h3.toLowerCase()]) {
              seenH[h3.toLowerCase()] = true;
              headlines.push(h3);
            }

            // Get descriptions from ETA
            var d1 = expandedAd.getDescription1();
            var d2 = expandedAd.getDescription2 ? expandedAd.getDescription2() : null;

            if (d1 && !seenD[d1.toLowerCase()]) {
              seenD[d1.toLowerCase()] = true;
              descriptions.push(d1);
            }
            if (d2 && !seenD[d2.toLowerCase()]) {
              seenD[d2.toLowerCase()] = true;
              descriptions.push(d2);
            }
          } catch(etaError) {
            // Not an ETA either - continue
          }
        }
      }
    }
  } catch(e) {
    log_("Error extracting ad content: " + e);
  }

  return {
    headlines: headlines.slice(0, 15), // Max 15 headlines
    descriptions: descriptions.slice(0, 4) // Max 4 descriptions
  };
}

// RSA creation
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

    var finalUrl = inferFinalUrl_(ag) || cfg.default_final_url || cfg.USER_LANDING_URL;
    var camp = ag.getCampaign().getName();
    var name = ag.getName();
    var ov = (cfg.RSA_MAP[camp] && cfg.RSA_MAP[camp][name]) || null;
    var Hsrc = ov && ov.H && ov.H.length ? ov.H : (cfg.RSA_DEFAULT && cfg.RSA_DEFAULT.H ? cfg.RSA_DEFAULT.H : []);
    var Dsrc = ov && ov.D && ov.D.length ? ov.D : (cfg.RSA_DEFAULT && cfg.RSA_DEFAULT.D ? cfg.RSA_DEFAULT.D : []);

    // If no configured content, try to extract from existing ads in the campaign
    if ((!Hsrc || Hsrc.length < 3) || (!Dsrc || Dsrc.length < 2)) {
      var campaign = ag.getCampaign();
      var extracted = extractExistingAdContent_(campaign);

      if (extracted.headlines.length >= 3) {
        Hsrc = extracted.headlines;
        log_("Using " + extracted.headlines.length + " existing headlines from " + camp);
      }
      if (extracted.descriptions.length >= 2) {
        Dsrc = extracted.descriptions;
        log_("Using " + extracted.descriptions.length + " existing descriptions from " + camp);
      }
    }

    var H = lint_(Hsrc, 30, 15, 3), D = lint_(Dsrc, 90, 4, 10);

    // Skip RSA creation if we still don't have enough content
    if (H.length < 3 || D.length < 2) {
      log_("Skipping RSA in " + camp + " › " + name + " (need 3+ headlines, 2+ descriptions)");
      continue;
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

// Label management
function ensureLabel_(name) {
  var it = AdsApp.labels().get();
  while (it.hasNext()) if (it.next().getName() === name) return;
  AdsApp.createLabel(name, "Managed by Ads Autopilot AI");
}

function safeLabel_(entity, name) { safeLabelWithGuard_(entity, name); }

function dedupeWords_(s) {
  var p = s.split(/\\s+/), out = [], seen = {};
  for (var i = 0; i < p.length; i++) {
    var w = p[i], k = w.toLowerCase();
    if (seen[k]) continue;
    seen[k] = true;
    out.push(w);
  }
  return out.join(' ');
}

function log_(m) { Logger.log(m); }

// Audience targeting
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

// Exclusion helpers
function isExcludedCampaign_(cfg, campaignName) {
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName]); } catch(e) { return false; }
}

function isExcludedAdGroup_(cfg, campaignName, adGroupName) {
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName] && cfg.EXCLUSIONS[campaignName][adGroupName]); } catch(e) { return false; }
}

// Idempotency tracking
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

// Safety guards
var NEG_GUARD_ACTIVE = false;
var RESERVED_KEYWORDS = ['brand', 'competitor', 'important'];

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
  log_('Safety Guards: PROMOTE=' + cfg.PROMOTE + ', NEG_GUARD=' + NEG_GUARD_ACTIVE);
}

function loadNegGuard_(cfg) {
  try {
    RESERVED_KEYWORDS = cfg.NEG_GUARD || ['brand', 'competitor', 'important'];
    log_('NEG_GUARD: Loaded ' + RESERVED_KEYWORDS.length + ' reserved keywords');
  } catch(e) {
    RESERVED_KEYWORDS = ['brand', 'competitor', 'important'];
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

// Profit-aware pacing
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
      headers: { 'User-Agent': 'AdsAutopilotAI/1.0' }
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
}`;
// Cache bust: 1758762098
