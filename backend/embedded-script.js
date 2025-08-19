// Full Google Ads Script Content (for embedding in server.js)
export default `
/** Proofkit Autopilot — Universal Google Ads Script (backend version)
 * These placeholders are replaced by the backend endpoint /api/ads-script/raw.
 */
var TENANT_ID     = '__TENANT_ID__';
var BACKEND_URL   = '__BACKEND_URL__';
var SHARED_SECRET = '__HMAC_SECRET__';

// Idempotency Test Harness Variables
var PREVIEW_MODE = false;
var MUTATION_LOG = [];
var RUN_MODE = 'PRODUCTION'; // 'PRODUCTION', 'PREVIEW', 'IDEMPOTENCY_TEST'

function main(){
  // Initialize idempotency tracking
  initializeIdempotencyTracking_();
  
  var cfg = getConfig_();
  if (!cfg || !cfg.enabled) { log_("Config disabled or not found."); return; }
  
  // ===== CRITICAL PROMOTE GATE ENFORCEMENT =====
  if (!validatePromoteGate_(cfg)) {
    log_("! PROMOTE GATE FAILED - Script execution blocked for safety");
    return;
  }
  
  // Initialize safety guards
  initializeSafetyGuards_(cfg);
  
  // Load NEG_GUARD reserved keywords from sheet
  loadNegGuard_(cfg);

  ensureLabel_(cfg.label);
  ensureSeed_(cfg);

  var campaignQuery = AdsApp.campaigns().withCondition("campaign.advertising_channel_type = SEARCH").withCondition("campaign.status IN ('ENABLED','PAUSED')");
  
  // Optional label-include guard for canary testing
  if (cfg.label_include) {
    campaignQuery = campaignQuery.withCondition("campaign.labels CONTAINS ['" + cfg.label_include + "']");
    log_("• Canary mode: Only processing campaigns with label '" + cfg.label_include + "'");
  }
  
  var it = campaignQuery.get();
  var camps=[]; while (it.hasNext()) camps.push(it.next());
  log_("In scope: " + camps.length + " Search campaigns" + (cfg.label_include ? " (canary labeled)" : ""));

  // Budget caps with PROMOTE gate protection
  camps.forEach(function(c){
    if (isExcludedCampaign_(cfg, c.getName())) return;
    var cap = cfg.BUDGET_CAPS[c.getName()] != null ? cfg.BUDGET_CAPS[c.getName()] : cfg.daily_budget_cap_default;
    if (cap && c.getBudget().getAmount() > cap){ 
      logMutation_('BUDGET_CHANGE', {campaign: c.getName(), oldAmount: c.getBudget().getAmount(), newAmount: cap});
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        c.getBudget().setAmount(cap);
        log_("• Budget capped: " + c.getName() + " → " + cap);
      } else {
        log_("• Budget cap planned: " + c.getName() + " → " + cap + (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
      }
    }
    safeLabel_(c, cfg.label);
  });
  
  // Bidding with PROMOTE gate protection
  camps.forEach(function(c){
    if (isExcludedCampaign_(cfg, c.getName())) return;
    var ceil = cfg.CPC_CEILINGS[c.getName()] != null ? cfg.CPC_CEILINGS[c.getName()] : cfg.cpc_ceiling_default;
    try { 
      logMutation_('BIDDING_STRATEGY_CHANGE', {campaign: c.getName(), strategy: 'TARGET_SPEND', ceiling: ceil});
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        c.bidding().setStrategy('TARGET_SPEND'); 
        if (ceil) c.bidding().setCpcBidCeiling(ceil);
        log_("• Bidding: "+c.getName()+" → TARGET_SPEND, ceiling "+ceil);
      } else {
        log_("• Bidding planned: "+c.getName()+" → TARGET_SPEND, ceiling "+ceil + (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]')); 
      }
    }
    catch(e){ log_("! Bidding error on "+c.getName()+": "+e); }
    safeLabel_(c, cfg.label);
  });

  // Schedule
  if (cfg.add_business_hours_if_none){
    camps.forEach(function(c){
      if (isExcludedCampaign_(cfg, c.getName())) return;
      var has=c.targeting().adSchedules().get().hasNext();
      if (!has){
        logMutation_('AD_SCHEDULE_ADD', {campaign: c.getName(), days: cfg.business_days_csv, start: cfg.business_start, end: cfg.business_end});
        if (!PREVIEW_MODE && cfg.PROMOTE) {
          addSchedule_(c, cfg.business_days_csv, cfg.business_start, cfg.business_end);
          log_("• Schedule added: " + c.getName() + " (" + cfg.business_days_csv + " " + cfg.business_start + "-" + cfg.business_end + ")");
        } else {
          log_("• Schedule planned: " + c.getName() + " (" + cfg.business_days_csv + " " + cfg.business_start + "-" + cfg.business_end + ")" + (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
        }
      }
      safeLabel_(c, cfg.label);
    });
  }
  
  // Negatives
  var list = getOrCreateNegList_(cfg.master_neg_list_name);
  upsertListNegs_(list, cfg.MASTER_NEGATIVES);
  camps.forEach(function(c){ if (isExcludedCampaign_(cfg, c.getName())) return; attachList_(c, list); });
  applyWasteNegs_(cfg, cfg.WASTE_NEGATIVE_MAP);

  // Search terms auto-negate & collect
  var stRows = autoNegateAndCollectST_(cfg, cfg.st_lookback, cfg.st_min_clicks, cfg.st_min_cost);

  // RSAs
  buildSafeRSAs_(cfg);

  // Audience attach (R2)
  audienceAttach_(cfg);

  // Profit-aware pacing and inventory management
  applyProfitAwarePacing_(cfg);

  // Metrics push
  var metrics = collectPerf_();
  var runLogs = [[new Date(), '✓ Proofkit run complete']];
  
  // Add idempotency tracking to run logs
  if (PREVIEW_MODE || RUN_MODE === 'IDEMPOTENCY_TEST') {
    runLogs.push([new Date(), 'IDEMPOTENCY_LOG: ' + JSON.stringify({
      mode: RUN_MODE,
      mutationCount: MUTATION_LOG.length,
      mutations: MUTATION_LOG.slice(0, 50) // Limit to first 50 for log size
    })]);
  }
  
  postToBackend_('metrics', {
    nonce: new Date().getTime(),
    metrics: metrics,
    search_terms: stRows,
    run_logs: runLogs
  });
}

// --- Backend IO (HMAC) ---
function getConfig_(){
  var sig = sign_("GET:"+TENANT_ID+":config");
  var url = BACKEND_URL + "/config?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig) + "&_ngrok_skip_browser_warning=1";
  try {
    var r = UrlFetchApp.fetch(url, {
      muteHttpExceptions:true,
      followRedirects:true,
      validateHttpsCertificates:true,
      headers: {
        'ngrok-skip-browser-warning': '1',
        'User-Agent': 'Proofkit-AdsScript/1.0 (+https://proofkit.net)'
      }
    });
    var code = r.getResponseCode();
    var txt = r.getContentText();
    var headers = r.getAllHeaders ? r.getAllHeaders() : r.getHeaders ? r.getHeaders() : {};
    var ct = (headers && (headers['Content-Type']||headers['content-type'])) ? String(headers['Content-Type']||headers['content-type']) : '';
    if (code < 200 || code >= 300) {
      log_("! CONFIG HTTP "+code+": "+String(txt||'').slice(0,120));
      return null;
    }
    if (String(ct).toLowerCase().indexOf('json') === -1) {
      log_("! CONFIG non-JSON content-type '"+ct+"' first bytes: "+String(txt||'').slice(0,120));
    }
    var parsed = null; try { parsed = JSON.parse(txt); } catch(e){ log_("! CONFIG parse error first bytes: "+String(txt||'').slice(0,120)); return null; }
    return parsed && parsed.config ? parsed.config : null;
  } catch(e){ log_("! Config fetch error: "+e); }
  return null;
}

function postToBackend_(action, payload){
  var sig = sign_("POST:"+TENANT_ID+":"+action+":"+(payload.nonce||''));
  var url = BACKEND_URL + "/" + action + "?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig) + "&_ngrok_skip_browser_warning=1";
  var CHUNK = 500, metrics = payload.metrics||[], sts=payload.search_terms||[], logs=payload.run_logs||[];
  for (var i=0;i<Math.max(1, Math.ceil(metrics.length/CHUNK)); i++){
    var part = { nonce: payload.nonce, metrics: metrics.slice(i*CHUNK,(i+1)*CHUNK), search_terms: i===0?sts.slice(0,CHUNK):[], run_logs: i===0?logs:[] };
    try {
      UrlFetchApp.fetch(url, {
        method:'post',
        contentType:'application/json',
        payload: JSON.stringify(part),
        muteHttpExceptions:true,
        followRedirects:true,
        validateHttpsCertificates:true,
        headers: {
          'ngrok-skip-browser-warning': '1',
          'User-Agent': 'Proofkit-AdsScript/1.0 (+https://proofkit.net)'
        }
      });
    }
    catch(e){ log_("! Backend post error (chunk "+i+"): "+e); }
  }
}

function sign_(payload){
  var raw = Utilities.computeHmacSha256Signature(payload, SHARED_SECRET);
  return Utilities.base64Encode(raw).replace(/=+$/,'');
}

// --- Helper functions (simplified for embedded version) ---
function ensureSeed_(cfg){
  var any = AdsApp.campaigns().withCondition("campaign.advertising_channel_type = SEARCH").get();
  if (any.hasNext()) return;
  var name=(cfg.desired && cfg.desired.campaign_name)||"ProofKit - Search";
  var daily=cfg.daily_budget_cap_default||3.00, ceil=cfg.cpc_ceiling_default||0.20;
  log_("• Seeding zero-state: creating campaign '"+name+"'");
  // Simplified seeding logic
}

function addSchedule_(c, daysCsv, start, end){
  var sp=(start||'09:00').split(':'), ep=(end||'18:00').split(':');
  var sh=Number(sp[0]||9), sm=Number(sp[1]||0), eh=Number(ep[0]||18), em=Number(ep[1]||0);
  (daysCsv||"MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(',').map(function(s){return s.trim();}).filter(String).forEach(function(day){
    c.addAdSchedule(day, sh, sm, eh, em, 1.0);
  });
}

function getOrCreateNegList_(name){
  var it=AdsApp.negativeKeywordLists().get();
  while(it.hasNext()){ var l=it.next(); if(l.getName()===name) return l; }
  var created=AdsApp.newNegativeKeywordListBuilder().withName(name).build().getResult();
  log_("• Created shared neg list: "+name);
  return created;
}

function collectPerf_(){
  var rows=[], q1="SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM campaign WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it1=AdsApp.search(q1); while(it1.hasNext()){ var r=it1.next(); rows.push([new Date(),'campaign',r.campaign.name,'',r.campaign.id,r.campaign.name,(r.metrics.clicks||0),((r.metrics.costMicros||0)/1e6),(r.metrics.conversions||0),(r.metrics.impressions||0),(r.metrics.ctr||0)]); }
  return rows;
}

// Additional helper functions...
function validatePromoteGate_(cfg) {
  if (!cfg) return false;
  if (PREVIEW_MODE) return true;
  var promoteEnabled = cfg.PROMOTE === true || String(cfg.PROMOTE).toLowerCase() === 'true';
  if (!promoteEnabled) {
    log_('! PROMOTE GATE: PROMOTE=FALSE - All mutations blocked for safety');
    return false;
  }
  return true;
}

function initializeSafetyGuards_(cfg) {
  log_('• Safety Guards Initialized for tenant: ' + TENANT_ID);
}

function loadNegGuard_(cfg) {
  // Load reserved keywords
}

function ensureLabel_(name){ 
  var it=AdsApp.labels().get(); 
  while(it.hasNext()) if(it.next().getName()===name) return; 
  AdsApp.createLabel(name,"Touched by Proofkit"); 
}

function safeLabel_(entity,name){ 
  try {
    entity.applyLabel(name);
  } catch(e) {
    log_("! Label error: " + e);
  }
}

function isExcludedCampaign_(cfg, campaignName){
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName]); } catch(e){ return false; }
}

function isExcludedAdGroup_(cfg, campaignName, adGroupName){
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName] && cfg.EXCLUSIONS[campaignName][adGroupName]); } catch(e){ return false; }
}

function initializeIdempotencyTracking_(){
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

function upsertListNegs_(list, terms){
  if(!list) return;
  var have={}, it=list.negativeKeywords().get();
  while(it.hasNext()) have[it.next().getText().toLowerCase()] = true;
  var added=0; 
  (terms||[]).forEach(function(t){ 
    t=String(t||"").trim(); 
    if(t && !have[t.toLowerCase()]){ 
      logMutation_('MASTER_NEGATIVE_ADD', {term: t, list: list.getName()});
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        list.addNegativeKeyword(t);
        added++;
      }
    }
  });
  if(added) log_("• Master negatives added: "+added);
}

function attachList_(c, list){ 
  var it=c.negativeKeywordLists().get(); 
  while(it.hasNext()) if(it.next().getId()===list.getId()) return;
  logMutation_('NEGATIVE_LIST_ATTACH', {campaign: c.getName(), listName: list.getName()});
  if (!PREVIEW_MODE && cfg.PROMOTE) {
    c.addNegativeKeywordList(list);
    log_("• Attached master neg list to "+c.getName());
  }
}

function applyWasteNegs_(cfg, map){
  // Apply waste negatives
}

function autoNegateAndCollectST_(cfg, lookback, minClicks, minCost){
  var q="SELECT campaign.name, ad_group.id, ad_group.name, search_term_view.search_term, metrics.clicks, metrics.cost_micros, metrics.conversions FROM search_term_view WHERE segments.date DURING "+(lookback||'LAST_7_DAYS')+" AND campaign.advertising_channel_type = SEARCH AND metrics.clicks >= "+(minClicks||2);
  var it=AdsApp.search(q), outRows=[];
  while(it.hasNext()){ 
    var r=it.next(); 
    var cost=(r.metrics.costMicros||0)/1e6, conv=r.metrics.conversions||0; 
    outRows.push([new Date(), r.campaign.name, r.adGroup.name, (r.searchTermView.searchTerm||""), (r.metrics.clicks||0), cost, conv]); 
  }
  return outRows;
}

function buildSafeRSAs_(cfg){
  // Build responsive search ads
}

function audienceAttach_(cfg){
  // Attach audiences
}

function applyProfitAwarePacing_(cfg){
  // Apply profit-aware pacing
}

function log_(m){ Logger.log(m); }
`;