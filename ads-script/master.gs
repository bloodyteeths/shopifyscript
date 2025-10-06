/** Ads Autopilot AI - Google Ads Script
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

  // Budget management
  camps.forEach(function(c) {
    if (isExcludedCampaign_(cfg, c.getName())) return;
    var cap = cfg.BUDGET_CAPS[c.getName()] != null ? cfg.BUDGET_CAPS[c.getName()] : cfg.daily_budget_cap_default;
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
    var ceil = cfg.CPC_CEILINGS[c.getName()] != null ? cfg.CPC_CEILINGS[c.getName()] : cfg.cpc_ceiling_default;
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
  var b = ag.newAd().responsiveSearchAdBuilder().withFinalUrl(cfg.default_final_url || "https://www.adsautopilot.net");
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

// Performance collection
function collectPerf_() {
  var rows = [];

  // Use Legacy API for TODAY and YESTERDAY (more reliable for recent data)
  var periods = ["TODAY", "YESTERDAY"];
  var campaigns = AdsApp.campaigns()
    .withCondition("campaign.advertising_channel_type = SEARCH")
    .withCondition("campaign.status IN ('ENABLED','PAUSED')")
    .get();

  var periodCounts = {TODAY: 0, YESTERDAY: 0};

  while(campaigns.hasNext()){
    var campaign = campaigns.next();
    var campaignId = campaign.getId();
    var campaignName = campaign.getName();

    for(var p = 0; p < periods.length; p++){
      var period = periods[p];
      try{
        var stats = campaign.getStatsFor(period);
        var impr = stats.getImpressions();
        if(impr > 0 || stats.getClicks() > 0 || stats.getCost() > 0){
          rows.push([period, new Date(), 'campaign', campaignName, '', campaignId, campaignName, stats.getClicks(), stats.getCost(), stats.getConversions(), impr, stats.getCtr()]);
          periodCounts[period]++;
        }
      }catch(e){}
    }
  }

  if(periodCounts.TODAY > 0) log_('• TODAY: Collected '+periodCounts.TODAY+' campaigns with data');
  if(periodCounts.YESTERDAY > 0) log_('• YESTERDAY: Collected '+periodCounts.YESTERDAY+' campaigns with data');

  // Collect LAST_7_DAYS metrics
  var q1Week = "SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM campaign WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it3 = AdsApp.search(q1Week);
  while (it3.hasNext()) {
    var r3 = it3.next();
    rows.push(['LAST_7_DAYS', new Date(), 'campaign', r3.campaign.name, '', r3.campaign.id, r3.campaign.name, (r3.metrics.clicks || 0), ((r3.metrics.costMicros || 0) / 1e6), (r3.metrics.conversions || 0), (r3.metrics.impressions || 0), (r3.metrics.ctr || 0)]);
  }

  var q2Week = "SELECT campaign.name, ad_group.id, ad_group.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM ad_group WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it4 = AdsApp.search(q2Week);
  while (it4.hasNext()) {
    var r4 = it4.next();
    rows.push(['LAST_7_DAYS', new Date(), 'ad_group', r4.campaign.name, r4.adGroup.name, r4.adGroup.id, r4.adGroup.name, (r4.metrics.clicks || 0), ((r4.metrics.costMicros || 0) / 1e6), (r4.metrics.conversions || 0), (r4.metrics.impressions || 0), (r4.metrics.ctr || 0)]);
  }

  // Collect LAST_30_DAYS metrics
  var q1Month = "SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM campaign WHERE segments.date DURING LAST_30_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it5 = AdsApp.search(q1Month);
  while (it5.hasNext()) {
    var r5 = it5.next();
    rows.push(['LAST_30_DAYS', new Date(), 'campaign', r5.campaign.name, '', r5.campaign.id, r5.campaign.name, (r5.metrics.clicks || 0), ((r5.metrics.costMicros || 0) / 1e6), (r5.metrics.conversions || 0), (r5.metrics.impressions || 0), (r5.metrics.ctr || 0)]);
  }

  var q2Month = "SELECT campaign.name, ad_group.id, ad_group.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM ad_group WHERE segments.date DURING LAST_30_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it6 = AdsApp.search(q2Month);
  while (it6.hasNext()) {
    var r6 = it6.next();
    rows.push(['LAST_30_DAYS', new Date(), 'ad_group', r6.campaign.name, r6.adGroup.name, r6.adGroup.id, r6.adGroup.name, (r6.metrics.clicks || 0), ((r6.metrics.costMicros || 0) / 1e6), (r6.metrics.conversions || 0), (r6.metrics.impressions || 0), (r6.metrics.ctr || 0)]);
  }

  // Collect LAST_90_DAYS metrics (Enterprise tier)
  var q1Quarter = "SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM campaign WHERE segments.date DURING LAST_90_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it7 = AdsApp.search(q1Quarter);
  while (it7.hasNext()) {
    var r7 = it7.next();
    rows.push(['LAST_90_DAYS', new Date(), 'campaign', r7.campaign.name, '', r7.campaign.id, r7.campaign.name, (r7.metrics.clicks || 0), ((r7.metrics.costMicros || 0) / 1e6), (r7.metrics.conversions || 0), (r7.metrics.impressions || 0), (r7.metrics.ctr || 0)]);
  }

  var q2Quarter = "SELECT campaign.name, ad_group.id, ad_group.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM ad_group WHERE segments.date DURING LAST_90_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it8 = AdsApp.search(q2Quarter);
  while (it8.hasNext()) {
    var r8 = it8.next();
    rows.push(['LAST_90_DAYS', new Date(), 'ad_group', r8.campaign.name, r8.adGroup.name, r8.adGroup.id, r8.adGroup.name, (r8.metrics.clicks || 0), ((r8.metrics.costMicros || 0) / 1e6), (r8.metrics.conversions || 0), (r8.metrics.impressions || 0), (r8.metrics.ctr || 0)]);
  }

  log_('• Collected ' + rows.length + ' metric rows across all periods');
  return rows;
}

// Search term auto-negation
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

// Label management
function ensureLabel_(name) {
  var it = AdsApp.labels().get();
  while (it.hasNext()) if (it.next().getName() === name) return;
  AdsApp.createLabel(name, "Managed by Ads Autopilot AI");
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
    var testMode = PropertiesService.getScriptProperties().getProperty('ADS_AUTOPILOT_AI_TEST_MODE');
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
}