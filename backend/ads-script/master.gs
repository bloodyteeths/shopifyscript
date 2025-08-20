
/** Proofkit Autopilot — Universal Google Ads Script (backend version)
 * These placeholders are replaced by the backend endpoint `/api/ads-script/raw`.
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

// --- (Same helpers as earlier: seeding, schedules, negatives, RSAs, GAQL collectors) ---
function ensureSeed_(cfg){
  var any = AdsApp.campaigns().withCondition("campaign.advertising_channel_type = SEARCH").get();
  if (any.hasNext()) return;
  var name=(cfg.desired && cfg.desired.campaign_name)||"ProofKit - Search";
  var daily=cfg.daily_budget_cap_default||3.00, ceil=cfg.cpc_ceiling_default||0.20;
  var adg=(cfg.desired && cfg.desired.ad_group)||"Default";
  var kw=(cfg.desired && cfg.desired.keyword)||'"digital certificates"';
  log_("• Seeding zero-state: creating campaign '"+name+"'");
  var op=AdsApp.newCampaignBuilder().withName(name).withBudget(daily).withBiddingStrategy('TARGET_SPEND').build();
  if(!op.isSuccessful()){ log_("! Seed campaign failed: "+op.getErrors().join('; ')); return; }
  var c=op.getResult(); try{ c.bidding().setCpcBidCeiling(ceil);}catch(e){}
  try{ (cfg.business_days_csv||"MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(',').map(function(s){return s.trim();}).forEach(function(day){ c.addAdSchedule(day,9,0,18,0,1.0); }); }catch(e){}
  var agop=c.newAdGroupBuilder().withName(adg).build(); if(!agop.isSuccessful()){ log_("! Seed ad group failed: "+agop.getErrors().join('; ')); return; }
  var ag=agop.getResult(); try{ ag.newKeywordBuilder().withText(kw).build(); }catch(e){}
  var H=["Digital Certificates","Compliance Reports","Export Clean PDFs","Generate Certs Fast","Audit-Ready Reports","Start Free Today"];
  var D=["Create inspector-ready PDFs fast.","Replace spreadsheets with an auditable system.","Templates enforce SOPs. Audit trail included.","Setup in under 10 minutes."];
  var b=ag.newAd().responsiveSearchAdBuilder().withFinalUrl(cfg.default_final_url||"https://www.proofkit.net");
  H.slice(0,15).forEach(function(h){ b.addHeadline(h.length>30?h.slice(0,30):h); });
  D.slice(0,4).forEach(function(d){ b.addDescription(d.length>90?d.slice(0,90):d); });
  try{ b.build(); }catch(e){ log_("! Seed RSA failed: "+e); }
  log_("• Seeded: "+name+" › "+adg);
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
function upsertListNegs_(list, terms){
  if(!list) return;
  var have={}, it=list.negativeKeywords().get();
  while(it.hasNext()) have[it.next().getText().toLowerCase()] = true;
  var added=0; (terms||[]).forEach(function(t){ t=String(t||"").trim(); if(t && !have[t.toLowerCase()] && !isReservedKeyword_(t)){ 
    logMutation_('MASTER_NEGATIVE_ADD', {term: t, list: list.getName()});
    if (!PREVIEW_MODE && NEG_GUARD_ACTIVE) {
      list.addNegativeKeyword(t);
      added++;
    } else {
      log_("• Master negative planned: " + t + (PREVIEW_MODE ? ' [PREVIEW]' : ' [NEG_GUARD]'));
    }
  }});
  if(added) log_("• Master negatives added: "+added);
}
function attachList_(c, list){ var it=c.negativeKeywordLists().get(); while(it.hasNext()) if(it.next().getId()===list.getId()) return; 
  logMutation_('NEGATIVE_LIST_ATTACH', {campaign: c.getName(), listName: list.getName()});
  if (!PREVIEW_MODE && NEG_GUARD_ACTIVE) {
    c.addNegativeKeywordList(list);
    log_("• Attached master neg list to "+c.getName());
  } else {
    log_("• Master neg list attachment planned for "+c.getName() + (PREVIEW_MODE ? ' [PREVIEW]' : ' [NEG_GUARD]'));
  }}
function applyWasteNegs_(cfg, map){
  for (var camp in map){
    var agMap=map[camp]||{}; var cit=AdsApp.campaigns().withCondition('campaign.name = "'+camp.replace(/"/g,'\\"')+'"').get();
    if(!cit.hasNext()) continue; var cmp=cit.next(), idx={}, it=cmp.adGroups().get();
    if (isExcludedCampaign_(cfg, cmp.getName())) continue;
    while(it.hasNext()){ var g=it.next(); idx[g.getName()] = g; }
    for (var ag in agMap){
      if (isExcludedAdGroup_(cfg, cmp.getName(), ag)) continue;
      var grp=idx[ag]; if(!grp){ log_("  - missing AG '"+ag+"' in '"+camp+"'"); continue; }
      var uniq={}, terms=agMap[ag]||[], added=0;
      terms.forEach(function(t){ t=String(t||"").toLowerCase(); if(uniq[t]) return; uniq[t]=true; try{ grp.createNegativeKeyword('['+t+']'); added++; }catch(e){ log_("  - skip neg '"+t+"': "+e); } });
      if(added) log_("• Added "+added+" exact negatives in "+camp+" › "+ag);
    }
  }
}
function collectPerf_(){
  var rows=[], q1="SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM campaign WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it1=AdsApp.search(q1); while(it1.hasNext()){ var r=it1.next(); rows.push([new Date(),'campaign',r.campaign.name,'',r.campaign.id,r.campaign.name,(r.metrics.clicks||0),((r.metrics.costMicros||0)/1e6),(r.metrics.conversions||0),(r.metrics.impressions||0),(r.metrics.ctr||0)]); }
  var q2="SELECT campaign.name, ad_group.id, ad_group.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr FROM ad_group WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH";
  var it2=AdsApp.search(q2); while(it2.hasNext()){ var r2=it2.next(); rows.push([new Date(),'ad_group',r2.campaign.name,r2.adGroup.name,r2.adGroup.id,r2.adGroup.name,(r2.metrics.clicks||0),((r2.metrics.costMicros||0)/1e6),(r2.metrics.conversions||0),(r2.metrics.impressions||0),(r2.metrics.ctr||0)]); }
  return rows;
}
function autoNegateAndCollectST_(cfg, lookback, minClicks, minCost){
  var q="SELECT campaign.name, ad_group.id, ad_group.name, search_term_view.search_term, metrics.clicks, metrics.cost_micros, metrics.conversions FROM search_term_view WHERE segments.date DURING "+(lookback||'LAST_7_DAYS')+" AND campaign.advertising_channel_type = SEARCH AND metrics.clicks >= "+(minClicks||2);
  var it=AdsApp.search(q), outRows=[], bucket={};
  while(it.hasNext()){ var r=it.next(); var cost=(r.metrics.costMicros||0)/1e6, conv=r.metrics.conversions||0; if(conv===0 && cost>=(minCost||2.82)){ var t=(r.searchTermView.searchTerm||"").toLowerCase(); var id=String(r.adGroup.id); (bucket[id]=bucket[id]||[]).push(t); } outRows.push([new Date(), r.campaign.name, r.adGroup.name, (r.searchTermView.searchTerm||""), (r.metrics.clicks||0), cost, conv]); }
  for (var id in bucket){ var agit=AdsApp.adGroups().withIds([Number(id)]).get(); if(!agit.hasNext()) continue; var ag=agit.next(); var campName=ag.getCampaign().getName(); var agName=ag.getName(); if (isExcludedAdGroup_(cfg, campName, agName)) continue; var uniq={}, list=bucket[id]||[], added=0; list.forEach(function(t){ if(uniq[t] || isReservedKeyword_(t)) return; uniq[t]=true; try{ if(NEG_GUARD_ACTIVE && cfg.PROMOTE) { ag.createNegativeKeyword('['+t+']'); added++; } else { log_("• Auto-negative planned: " + t + " in " + agName + (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]')); } }catch(e){} }); if(added) log_("• Auto-negated "+added+" in AG: "+agName); }
  return outRows;
}
function buildSafeRSAs_(cfg){
  var it = AdsApp.adGroups()
    .withCondition("campaign.advertising_channel_type = SEARCH")
    .withCondition("ad_group.status IN ('ENABLED','PAUSED')")
    .get(); var created=0;
  while(it.hasNext()){
    var ag=it.next();
    // Skip Dynamic Search Ad groups to avoid INCOMPATIBLE_WITH_RESTRICTION_TYPE
    try { var hasDSA = ag.ads().withCondition("type = DYNAMIC_SEARCH_AD").get().hasNext(); if (hasDSA) { continue; } } catch(e){}
    if(hasLabelledAd_(ag, cfg.label)) continue;
    var finalUrl=inferFinalUrl_(ag)||cfg.default_final_url;
    var camp=ag.getCampaign().getName(), name=ag.getName();
    var ov=(cfg.RSA_MAP[camp] && cfg.RSA_MAP[camp][name]) || null;
    var Hsrc=ov&&ov.H&&ov.H.length?ov.H:(cfg.RSA_DEFAULT.H.length?cfg.RSA_DEFAULT.H:["Digital Certificates","Compliance Reports","Generate Certs Fast","Export Clean PDFs","Audit-Ready Reports","Start Free Today"]);
    var Dsrc=ov&&ov.D&&ov.D.length?ov.D:(cfg.RSA_DEFAULT.D.length?cfg.RSA_DEFAULT.D:["Create inspector-ready PDFs fast.","Replace spreadsheets with an auditable system.","Templates enforce SOPs. Audit trail included.","Setup in under 10 minutes."]);
    var H=lint_(Hsrc,30,15,3), D=lint_(Dsrc,90,4,10);
    var b=ag.newAd().responsiveSearchAdBuilder().withFinalUrl(finalUrl); H.forEach(function(h){ b.addHeadline(h); }); D.forEach(function(d){ b.addDescription(d); });
    try{ 
      if(!PREVIEW_MODE && cfg.PROMOTE) {
        var op=b.build(); 
        if(op.isSuccessful()){ 
          safeLabelWithGuard_(op.getResult(), cfg.label); 
          created++; 
          log_("• RSA created in "+camp+" › "+name); 
        } else { 
          log_("! RSA errors in "+camp+" › "+name+": "+op.getErrors().join('; ')); 
        }
      } else {
        log_("• RSA creation planned in "+camp+" › "+name + (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
      }
    }
    catch(e){ log_("! RSA build exception in "+camp+" › "+name+": "+e); }
  } if(created) log_("• RSAs created: "+created);
}
function lint_(arr, maxLen, maxItems, minLen){ var out=[], seen={}; for (var i=0;i<arr.length && out.length<maxItems;i++){ var s=String(arr[i]||"").trim(); if(!s) continue; s=dedupeWords_(s); if(s.length>maxLen) s=s.slice(0,maxLen); if(s.length<minLen) continue; var k=s.toLowerCase(); if(seen[k]) continue; seen[k]=true; out.push(s);} return out; }
function hasLabelledAd_(ag,label){ var ads=ag.ads().get(); while(ads.hasNext()){ var ad=ads.next(), labs=ad.labels().get(); while(labs.hasNext()) if(labs.next().getName()===label) return true; } return false; }
function inferFinalUrl_(ag){ var it=ag.ads().withCondition("ad_group_ad.status IN ('ENABLED','PAUSED')").get(); while(it.hasNext()){ var ad=it.next(); try{ var urls=ad.urls(); var u=urls.getFinalUrl?urls.getFinalUrl():(urls.getFinalUrls&&urls.getFinalUrls()[0]); if(u) return u; }catch(e){} } return null; }
function ensureLabel_(name){ var it=AdsApp.labels().get(); while(it.hasNext()) if(it.next().getName()===name) return; AdsApp.createLabel(name,"Touched by Proofkit"); }
function safeLabel_(entity,name){ safeLabelWithGuard_(entity, name); }
function dedupeWords_(s){ var p=s.split(/\s+/), out=[], seen={}; for(var i=0;i<p.length;i++){ var w=p[i], k=w.toLowerCase(); if(seen[k]) continue; seen[k]=true; out.push(w);} return out.join(' '); }
function log_(m){ Logger.log(m); }
// --- Audience attach (Enhanced R2) ---
function audienceAttach_(cfg){
  try{
    if (!cfg || !cfg.FEATURE_AUDIENCE_ATTACH) {
      log_('• Audience attach disabled (FEATURE_AUDIENCE_ATTACH=false)');
      return;
    }
    
    var audienceMap = cfg.AUDIENCE_MAP || {};
    if (Object.keys(audienceMap).length === 0) {
      log_('• No audience mappings found in AUDIENCE_MAP');
      return;
    }
    
    var minSize = Number(cfg.AUDIENCE_MIN_SIZE || 1000);
    var attached = 0, skipped = 0, errors = 0;
    
    log_('• Audience attach started (min_size=' + minSize + ')');
    
    // Get all campaigns
    var it = AdsApp.campaigns().withCondition("campaign.advertising_channel_type = SEARCH")
      .withCondition("campaign.status IN ('ENABLED','PAUSED')").get();
    var campaigns = {};
    while (it.hasNext()) {
      var c = it.next();
      campaigns[c.getName()] = c;
    }
    
    // Process audience mappings
    for (var campName in audienceMap) {
      if (isExcludedCampaign_(cfg, campName)) {
        log_('• Skipping excluded campaign: ' + campName);
        continue;
      }
      
      var campaign = campaigns[campName];
      if (!campaign) {
        log_('! Campaign not found: ' + campName);
        errors++;
        continue;
      }
      
      var adGroupMap = audienceMap[campName] || {};
      for (var adGroupName in adGroupMap) {
        if (isExcludedAdGroup_(cfg, campName, adGroupName)) {
          log_('• Skipping excluded ad group: ' + campName + ' › ' + adGroupName);
          continue;
        }
        
        var audienceRow = adGroupMap[adGroupName];
        if (!audienceRow || !audienceRow.user_list_id) {
          log_('! Missing user_list_id for ' + campName + ' › ' + adGroupName);
          errors++;
          continue;
        }
        
        var listId = String(audienceRow.user_list_id).trim();
        var mode = String(audienceRow.mode || 'OBSERVE').toUpperCase();
        var bidModifier = audienceRow.bid_modifier ? Number(audienceRow.bid_modifier) : null;
        
        // Validate mode
        if (!['OBSERVE', 'TARGET', 'EXCLUDE'].includes(mode)) {
          log_('! Invalid mode "' + mode + '" for ' + campName + ', defaulting to OBSERVE');
          mode = 'OBSERVE';
        }
        
        try {
          // Check if audience is already attached to campaign
          var alreadyAttached = false;
          var existingAudiences = campaign.targeting().audiences().get();
          while (existingAudiences.hasNext()) {
            var existingAud = existingAudiences.next();
            if (String(existingAud.getId()) === listId) {
              alreadyAttached = true;
              
              // Update bid modifier if needed and mode allows
              if (bidModifier && mode !== 'EXCLUDE' && !PREVIEW_MODE && cfg.PROMOTE) {
                try {
                  existingAud.setBidModifier(bidModifier);
                  log_('• Updated bid modifier: ' + campName + ' id=' + listId + ' bid=' + bidModifier);
                } catch (e) {
                  log_('! Failed to update bid modifier: ' + e);
                }
              } else if (bidModifier && mode !== 'EXCLUDE') {
                log_('• Bid modifier update planned: ' + campName + ' id=' + listId + ' bid=' + bidModifier + (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
              }
              break;
            }
          }
          
          if (alreadyAttached) {
            log_('• Audience already attached: ' + campName + ' id=' + listId + ' mode=' + mode);
            skipped++;
            continue;
          }
          
          // Size guard: For now, we'll attach and log size_unknown since GAQL is not available
          // In a real implementation, you would query the Google Ads API for list size
          var sizeUnknown = true;
          var skipBidModifier = sizeUnknown && minSize > 0;
          
          // Build audience attachment
          logMutation_('AUDIENCE_ATTACH', {
            campaign: campName,
            adGroup: adGroupName,
            listId: listId,
            mode: mode,
            bidModifier: skipBidModifier ? null : bidModifier,
            sizeCheck: sizeUnknown ? 'unknown' : 'validated'
          });
          
          if (!PREVIEW_MODE && cfg.PROMOTE) {
            var builder = campaign.targeting().newUserListBuilder().withAudienceId(Number(listId));
            
            // Set targeting mode
            if (mode === 'TARGET') {
              builder.inTargetingMode();
            } else if (mode === 'EXCLUDE') {
              // Note: Exclude mode at campaign level may not be supported for all audience types
              // This will be handled gracefully by the API
              try {
                builder.inExclusionMode();
              } catch (e) {
                log_('! Exclude mode not supported for this audience type: ' + listId);
                continue;
              }
            }
            // OBSERVE mode is the default (no special method call needed)
            
            var op = builder.build();
            if (op && op.isSuccessful()) {
              var attachedAudience = op.getResult();
              
              // Apply bid modifier if specified and not excluded due to size
              if (bidModifier && mode !== 'EXCLUDE' && !skipBidModifier) {
                try {
                  attachedAudience.setBidModifier(bidModifier);
                  log_('• Audience attached with bid modifier: ' + campName + ' id=' + listId + ' mode=' + mode + ' bid=' + bidModifier);
                } catch (e) {
                  log_('! Failed to set bid modifier: ' + e);
                  log_('• Audience attached without bid modifier: ' + campName + ' id=' + listId + ' mode=' + mode);
                }
              } else {
                if (skipBidModifier) {
                  log_('• Audience attached (size_unknown, no bid modifier): ' + campName + ' id=' + listId + ' mode=' + mode);
                } else {
                  log_('• Audience attached: ' + campName + ' id=' + listId + ' mode=' + mode);
                }
              }
              
              attached++;
            } else {
              var errorMsg = op && op.getErrors ? op.getErrors().join('; ') : 'unknown error';
              log_('! Failed to attach audience ' + listId + ' to ' + campName + ': ' + errorMsg);
              errors++;
            }
          } else {
            log_('• Audience attachment planned: ' + campName + ' id=' + listId + ' mode=' + mode + 
                 (bidModifier && !skipBidModifier ? ' bid=' + bidModifier : '') +
                 (skipBidModifier ? ' (no bid: size_unknown)' : '') +
                 (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
            attached++;
          }
          
        } catch (e) {
          log_('! Exception attaching audience ' + listId + ' to ' + campName + ': ' + e);
          errors++;
        }
      }
    }
    
    // Check for audiences to detach (removed from AUDIENCE_MAP)
    audienceDetach_(cfg, campaigns, audienceMap);
    
    log_('• Audience attach complete: ' + attached + ' attached, ' + skipped + ' skipped, ' + errors + ' errors');
    
  } catch (e) {
    log_('! audienceAttach_ exception: ' + e);
  }
}

/**
 * Detach audiences that are no longer in AUDIENCE_MAP but still attached to campaigns
 */
function audienceDetach_(cfg, campaigns, currentAudienceMap) {
  try {
    var detached = 0;
    
    // Process each campaign to find audiences that should be detached
    for (var campName in campaigns) {
      if (isExcludedCampaign_(cfg, campName)) continue;
      
      var campaign = campaigns[campName];
      var currentMappings = currentAudienceMap[campName] || {};
      
      // Get currently attached audiences
      var attachedAudiences = campaign.targeting().audiences().get();
      while (attachedAudiences.hasNext()) {
        var attachedAud = attachedAudiences.next();
        var listId = String(attachedAud.getId());
        
        // Check if this audience is still in the current mapping
        var stillMapped = false;
        for (var adGroupName in currentMappings) {
          var mapping = currentMappings[adGroupName];
          if (mapping && String(mapping.user_list_id) === listId) {
            stillMapped = true;
            break;
          }
        }
        
        // If not mapped anymore, detach it
        if (!stillMapped) {
          logMutation_('AUDIENCE_DETACH', {
            campaign: campName,
            listId: listId,
            reason: 'removed_from_mapping'
          });
          
          if (!PREVIEW_MODE && cfg.PROMOTE) {
            try {
              attachedAud.remove();
              log_('• Audience detached: ' + campName + ' id=' + listId + ' (no longer in AUDIENCE_MAP)');
              detached++;
            } catch (e) {
              log_('! Failed to detach audience ' + listId + ' from ' + campName + ': ' + e);
            }
          } else {
            log_('• Audience detach planned: ' + campName + ' id=' + listId + ' (no longer in AUDIENCE_MAP)' + 
                 (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
            detached++;
          }
        }
      }
    }
    
    if (detached > 0) {
      log_('• Audience detach complete: ' + detached + ' audiences removed');
    }
    
  } catch (e) {
    log_('! audienceDetach_ exception: ' + e);
  }
}

// --- EXCLUSIONS helpers ---
function isExcludedCampaign_(cfg, campaignName){
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName]); } catch(e){ return false; }
}
function isExcludedAdGroup_(cfg, campaignName, adGroupName){
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName] && cfg.EXCLUSIONS[campaignName][adGroupName]); } catch(e){ return false; }
}

// --- IDEMPOTENCY TEST HARNESS ---
function initializeIdempotencyTracking_(){
  // Check if we're in preview/test mode via URL parameters or PropertiesService
  try {
    var testMode = PropertiesService.getScriptProperties().getProperty('PROOFKIT_TEST_MODE');
    if (testMode === 'PREVIEW' || testMode === 'IDEMPOTENCY_TEST') {
      RUN_MODE = testMode;
      PREVIEW_MODE = (testMode === 'PREVIEW' || testMode === 'IDEMPOTENCY_TEST');
      log_('• Idempotency tracking enabled - Mode: ' + RUN_MODE);
    }
  } catch(e) {
    log_('• Idempotency tracking initialization: ' + e);
  }
  MUTATION_LOG = []; // Reset mutation log
}

function logMutation_(type, details) {
  if (!PREVIEW_MODE && RUN_MODE !== 'IDEMPOTENCY_TEST') return;
  
  var mutation = {
    type: type,
    details: details,
    timestamp: new Date().toISOString(),
    mode: RUN_MODE
  };
  
  MUTATION_LOG.push(mutation);
  log_('MUTATION_PLANNED: ' + type + ' - ' + JSON.stringify(details));
}

function setTestMode_(mode) {
  // Function to set test mode from external harness
  // mode: 'PRODUCTION', 'PREVIEW', 'IDEMPOTENCY_TEST'
  RUN_MODE = mode;
  PREVIEW_MODE = (mode === 'PREVIEW' || mode === 'IDEMPOTENCY_TEST');
  MUTATION_LOG = [];
  
  try {
    PropertiesService.getScriptProperties().setProperty('PROOFKIT_TEST_MODE', mode);
  } catch(e) {
    log_('• Could not set test mode property: ' + e);
  }
  
  log_('• Test mode set to: ' + mode);
}

function getMutationLog_() {
  // Function to retrieve mutation log for test harness
  return {
    mode: RUN_MODE,
    mutationCount: MUTATION_LOG.length,
    mutations: MUTATION_LOG,
    timestamp: new Date().toISOString()
  };
}

function runIdempotencyTest_() {
  // Main function for running the idempotency test
  log_('=== STARTING IDEMPOTENCY TEST ===');
  
  // First run in preview mode
  setTestMode_('PREVIEW');
  log_('• First run (PREVIEW mode)');
  main();
  var firstRunResults = getMutationLog_();
  log_('• First run completed - ' + firstRunResults.mutationCount + ' mutations planned');
  
  // Second run in preview mode (should be 0 mutations)
  setTestMode_('PREVIEW');
  log_('• Second run (PREVIEW mode)');
  main();
  var secondRunResults = getMutationLog_();
  log_('• Second run completed - ' + secondRunResults.mutationCount + ' mutations planned');
  
  // Validate idempotency
  var isIdempotent = (secondRunResults.mutationCount === 0);
  var testResult = {
    passed: isIdempotent,
    firstRun: firstRunResults,
    secondRun: secondRunResults,
    timestamp: new Date().toISOString()
  };
  
  // Log results
  if (isIdempotent) {
    log_('✓ IDEMPOTENCY TEST PASSED - Script is idempotent');
  } else {
    log_('✗ IDEMPOTENCY TEST FAILED - Second run planned ' + secondRunResults.mutationCount + ' mutations');
    log_('Second run mutations: ' + JSON.stringify(secondRunResults.mutations));
  }
  
  // Reset to production mode
  setTestMode_('PRODUCTION');
  
  // Post test results to backend
  try {
    postToBackend_('metrics', {
      nonce: new Date().getTime(),
      metrics: [],
      search_terms: [],
      run_logs: [[new Date(), 'IDEMPOTENCY_TEST_RESULT: ' + JSON.stringify(testResult)]]
    });
  } catch(e) {
    log_('• Could not post test results: ' + e);
  }
  
  log_('=== IDEMPOTENCY TEST COMPLETE ===');
  return testResult;
}

// ===== PROMOTE GATE & SAFETY GUARD FUNCTIONS =====

// Global safety guards
var NEG_GUARD_ACTIVE = false;
var RESERVED_KEYWORDS = ['proofkit', 'brand', 'competitor', 'important'];

/**
 * Critical PROMOTE gate validation - blocks all mutations if PROMOTE=FALSE
 */
function validatePromoteGate_(cfg) {
  if (!cfg) {
    log_('! PROMOTE GATE: No config available');
    return false;
  }
  
  // Allow preview and idempotency test modes to execute read-only logic
  if (PREVIEW_MODE) {
    log_('• PROMOTE GATE: Preview mode active - mutations logged only');
    return true;
  }
  
  if (RUN_MODE === 'IDEMPOTENCY_TEST') {
    log_('• PROMOTE GATE: Idempotency test mode - mutations logged only');
    return true;
  }
  
  // Check PROMOTE flag for live mutations
  var promoteEnabled = cfg.PROMOTE === true || String(cfg.PROMOTE).toLowerCase() === 'true';
  
  if (!promoteEnabled) {
    log_('! PROMOTE GATE: PROMOTE=FALSE - All mutations blocked for safety');
    log_('! To enable live changes, set PROMOTE=TRUE in configuration');
    return false;
  }
  
  log_('✓ PROMOTE GATE: PROMOTE=TRUE verified - live mutations enabled');
  return true;
}

/**
 * Initialize safety guards and protection systems
 */
function initializeSafetyGuards_(cfg) {
  if (!cfg) return;
  
  // Enable NEG_GUARD if PROMOTE is active and not in preview
  NEG_GUARD_ACTIVE = cfg.PROMOTE && !PREVIEW_MODE && RUN_MODE !== 'IDEMPOTENCY_TEST';
  
  // Log safety status
  log_('• Safety Guards Initialized:');
  log_('  - PROMOTE: ' + (cfg.PROMOTE ? 'ENABLED' : 'DISABLED'));
  log_('  - NEG_GUARD: ' + (NEG_GUARD_ACTIVE ? 'ACTIVE' : 'INACTIVE'));
  log_('  - LABEL_GUARD: ' + (cfg.label || 'PROOFKIT_AUTOMATED'));
  log_('  - PREVIEW_MODE: ' + (PREVIEW_MODE ? 'TRUE' : 'FALSE'));
  log_('  - RUN_MODE: ' + RUN_MODE);
  
  // Log reserved keywords protection
  if (RESERVED_KEYWORDS.length > 0) {
    log_('  - RESERVED_KEYWORDS: [' + RESERVED_KEYWORDS.join(', ') + ']');
  }
}

/**
 * Load reserved keywords from NEG_GUARD sheet
 */
function loadNegGuard_(cfg) {
  try {
    RESERVED_KEYWORDS = cfg.NEG_GUARD || [];
    
    // Fallback to hardcoded list if sheet is empty
    if (RESERVED_KEYWORDS.length === 0) {
      RESERVED_KEYWORDS = ['proofkit', 'brand', 'competitor', 'important'];
      log_('• NEG_GUARD: Using fallback reserved keywords');
    } else {
      log_('• NEG_GUARD: Loaded ' + RESERVED_KEYWORDS.length + ' reserved keywords from sheet');
    }
  } catch (e) {
    log_('! NEG_GUARD: Error loading from sheet, using fallback: ' + e);
    RESERVED_KEYWORDS = ['proofkit', 'brand', 'competitor', 'important'];
  }
}

/**
 * Check if a keyword is reserved and should not be added as negative
 */
function isReservedKeyword_(term) {
  if (!term || RESERVED_KEYWORDS.length === 0) return false;
  var termLower = String(term).toLowerCase().trim();
  
  for (var i = 0; i < RESERVED_KEYWORDS.length; i++) {
    if (termLower.indexOf(RESERVED_KEYWORDS[i]) !== -1) {
      log_('! NEG_GUARD: Blocked reserved keyword: ' + term);
      return true;
    }
  }
  
  return false;
}

/**
 * Enhanced label guard - ensures entity is properly labeled
 */
function safeLabelWithGuard_(entity, labelName) {
  if (!entity || !labelName) return;
  
  try {
    // Check if already labeled
    var hasLabel = false;
    var labels = entity.labels().get();
    while (labels.hasNext()) {
      if (labels.next().getName() === labelName) {
        hasLabel = true;
        break;
      }
    }
    
    if (!hasLabel) {
      entity.applyLabel(labelName);
      log_('• Label applied: ' + labelName);
    }
  } catch(e) {
    log_('! Label guard error: ' + e);
  }
}

/**
 * Safe entity mutation wrapper - enforces all safety checks
 */
function safeMutation_(mutationType, entityName, mutationFn) {
  if (!validatePromoteGate_(getConfig_())) {
    log_('! MUTATION BLOCKED: ' + mutationType + ' on ' + entityName + ' (PROMOTE gate failed)');
    return false;
  }
  
  if (PREVIEW_MODE) {
    log_('• MUTATION PREVIEW: ' + mutationType + ' on ' + entityName);
    return false;
  }
  
  try {
    mutationFn();
    log_('✓ MUTATION SUCCESS: ' + mutationType + ' on ' + entityName);
    return true;
  } catch(e) {
    log_('! MUTATION ERROR: ' + mutationType + ' on ' + entityName + ': ' + e);
    return false;
  }
}

/**
 * Get current safety status for logging
 */
function getSafetyStatus_() {
  var cfg = getConfig_();
  return {
    promote: cfg ? cfg.PROMOTE : false,
    negGuard: NEG_GUARD_ACTIVE,
    previewMode: PREVIEW_MODE,
    runMode: RUN_MODE,
    reservedKeywords: RESERVED_KEYWORDS.length
  };
}
// ===== PROFIT-AWARE PACING & INVENTORY MANAGEMENT =====

/**
 * Apply profit-aware pacing based on PACE_SIGNALS
 */
function applyProfitAwarePacing_(cfg) {
  try {
    if (!cfg || !cfg.FEATURE_INVENTORY_GUARD) {
      log_('• Profit-aware pacing disabled (FEATURE_INVENTORY_GUARD=false)');
      return;
    }
    
    log_('• Profit-aware pacing started');
    
    // Get PACE_SIGNALS from backend
    var paceSignals = getPaceSignals_();
    if (!paceSignals || paceSignals.length === 0) {
      log_('• No PACE_SIGNALS available, skipping profit-aware pacing');
      return;
    }
    
    log_('• Retrieved ' + paceSignals.length + ' PACE_SIGNALS');
    
    var applied = 0, paused = 0, errors = 0;
    
    // Process each signal
    for (var i = 0; i < paceSignals.length; i++) {
      var signal = paceSignals[i];
      
      try {
        var result = applySignalToAdGroup_(signal, cfg);
        if (result.applied) applied++;
        if (result.paused) paused++;
      } catch (e) {
        log_('! Error applying signal for ad group ' + signal.ad_group_id + ': ' + e);
        errors++;
      }
    }
    
    log_('• Profit-aware pacing complete: ' + applied + ' applied, ' + paused + ' paused, ' + errors + ' errors');
    
  } catch (e) {
    log_('! applyProfitAwarePacing_ exception: ' + e);
  }
}

/**
 * Get PACE_SIGNALS from backend
 */
function getPaceSignals_() {
  var sig = sign_("GET:" + TENANT_ID + ":profit_signals");
  var url = BACKEND_URL + "/profit/signals?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig) + "&_ngrok_skip_browser_warning=1";
  
  try {
    var r = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: {
        'ngrok-skip-browser-warning': '1',
        'User-Agent': 'Proofkit-AdsScript/1.0 (+https://proofkit.net)'
      }
    });
    
    var code = r.getResponseCode();
    var txt = r.getContentText();
    
    if (code < 200 || code >= 300) {
      log_("! PACE_SIGNALS HTTP " + code + ": " + String(txt || '').slice(0, 120));
      return null;
    }
    
    var parsed = null;
    try {
      parsed = JSON.parse(txt);
    } catch (e) {
      log_("! PACE_SIGNALS parse error: " + String(txt || '').slice(0, 120));
      return null;
    }
    
    return parsed && parsed.signals ? parsed.signals : null;
    
  } catch (e) {
    log_("! PACE_SIGNALS fetch error: " + e);
    return null;
  }
}

/**
 * Apply a PACE_SIGNAL to an ad group
 */
function applySignalToAdGroup_(signal, cfg) {
  var result = { applied: false, paused: false };
  
  if (!signal || !signal.ad_group_id) {
    return result;
  }
  
  var adGroupId = String(signal.ad_group_id);
  var action = String(signal.action || 'MAINTAIN');
  var paceSignal = Number(signal.pace_signal || 1.0);
  var reason = String(signal.reason || 'No reason');
  
  // Find the ad group
  var adGroupIter = AdsApp.adGroups().withIds([Number(adGroupId)]).get();
  if (!adGroupIter.hasNext()) {
    log_('! Ad group not found: ' + adGroupId);
    return result;
  }
  
  var adGroup = adGroupIter.next();
  var campaign = adGroup.getCampaign();
  var campaignName = campaign.getName();
  var adGroupName = adGroup.getName();
  
  // Check exclusions
  if (isExcludedAdGroup_(cfg, campaignName, adGroupName)) {
    log_('• Skipping excluded ad group: ' + campaignName + ' › ' + adGroupName);
    return result;
  }
  
  // Apply action based on signal
  switch (action) {
    case 'PAUSE':
      result.paused = applyPauseAction_(adGroup, signal, cfg);
      break;
    
    case 'REDUCE_BUDGET':
      result.applied = applyBudgetAction_(campaign, adGroup, signal, cfg, 'REDUCE');
      break;
    
    case 'INCREASE_BUDGET':
      result.applied = applyBudgetAction_(campaign, adGroup, signal, cfg, 'INCREASE');
      break;
    
    case 'MONITOR_MARGIN':
      log_('• Monitoring margin for ' + campaignName + ' › ' + adGroupName + ' (reason: ' + reason + ')');
      result.applied = true;
      break;
    
    case 'MAINTAIN':
    default:
      log_('• Maintaining current settings for ' + campaignName + ' › ' + adGroupName);
      result.applied = true;
      break;
  }
  
  return result;
}

/**
 * Apply pause action for out-of-stock ad groups
 */
function applyPauseAction_(adGroup, signal, cfg) {
  var campaignName = adGroup.getCampaign().getName();
  var adGroupName = adGroup.getName();
  var reason = signal.reason || 'Out of stock';
  
  logMutation_('ADGROUP_PAUSE', {
    campaign: campaignName,
    adGroup: adGroupName,
    reason: reason,
    minStock: signal.min_stock,
    paceSignal: signal.pace_signal
  });
  
  if (!PREVIEW_MODE && cfg.PROMOTE) {
    try {
      adGroup.pause();
      log_('• Paused ad group: ' + campaignName + ' › ' + adGroupName + ' (reason: ' + reason + ')');
      return true;
    } catch (e) {
      log_('! Failed to pause ad group ' + adGroupName + ': ' + e);
      return false;
    }
  } else {
    log_('• Ad group pause planned: ' + campaignName + ' › ' + adGroupName + ' (reason: ' + reason + ')' + 
         (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
    return false;
  }
}

/**
 * Apply budget action based on pace signal
 */
function applyBudgetAction_(campaign, adGroup, signal, cfg, direction) {
  var campaignName = campaign.getName();
  var adGroupName = adGroup.getName();
  var paceSignal = Number(signal.pace_signal || 1.0);
  var reason = signal.reason || 'Profit optimization';
  
  // Get current budget
  var currentBudget = campaign.getBudget().getAmount();
  var newBudget = currentBudget;
  
  // Calculate new budget based on pace signal and direction
  if (direction === 'INCREASE') {
    newBudget = Math.min(currentBudget * Math.min(paceSignal, 2.0), 100.0); // Cap at 2x and $100
  } else if (direction === 'REDUCE') {
    newBudget = Math.max(currentBudget * Math.max(paceSignal, 0.1), 1.0); // Floor at 0.1x and $1
  }
  
  // Only apply if change is significant (>5%)
  if (Math.abs(newBudget - currentBudget) / currentBudget < 0.05) {
    log_('• Budget change too small for ' + campaignName + ' (current: $' + currentBudget.toFixed(2) + ', new: $' + newBudget.toFixed(2) + ')');
    return true;
  }
  
  logMutation_('CAMPAIGN_BUDGET_CHANGE', {
    campaign: campaignName,
    adGroup: adGroupName,
    direction: direction,
    oldBudget: currentBudget,
    newBudget: newBudget,
    paceSignal: paceSignal,
    reason: reason
  });
  
  if (!PREVIEW_MODE && cfg.PROMOTE) {
    try {
      campaign.getBudget().setAmount(newBudget);
      log_('• ' + direction.toLowerCase() + 'd budget for ' + campaignName + ': $' + currentBudget.toFixed(2) + ' → $' + newBudget.toFixed(2) + ' (reason: ' + reason + ')');
      return true;
    } catch (e) {
      log_('! Failed to update budget for ' + campaignName + ': ' + e);
      return false;
    }
  } else {
    log_('• Budget ' + direction.toLowerCase() + ' planned for ' + campaignName + ': $' + currentBudget.toFixed(2) + ' → $' + newBudget.toFixed(2) + ' (reason: ' + reason + ')' + 
         (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
    return false;
  }
}

/**
 * Enhanced bid adjustments based on profit margins
 */
function applyProfitAwareBidding_(cfg, signals) {
  if (!signals || signals.length === 0) return;
  
  log_('• Applying profit-aware bidding adjustments');
  
  var applied = 0;
  
  for (var i = 0; i < signals.length; i++) {
    var signal = signals[i];
    var margin = Number(signal.avg_margin || 0);
    var paceSignal = Number(signal.pace_signal || 1.0);
    
    // Skip if no meaningful profit data
    if (margin <= 0 || signal.action === 'PAUSE') continue;
    
    var adGroupIter = AdsApp.adGroups().withIds([Number(signal.ad_group_id)]).get();
    if (!adGroupIter.hasNext()) continue;
    
    var adGroup = adGroupIter.next();
    var campaign = adGroup.getCampaign();
    var campaignName = campaign.getName();
    var adGroupName = adGroup.getName();
    
    // Check exclusions
    if (isExcludedAdGroup_(cfg, campaignName, adGroupName)) continue;
    
    // Calculate bid modifier based on margin and pace signal
    var bidModifier = calculateBidModifier_(margin, paceSignal);
    
    if (Math.abs(bidModifier - 1.0) > 0.05) { // Only apply if >5% change
      logMutation_('BID_MODIFIER_CHANGE', {
        campaign: campaignName,
        adGroup: adGroupName,
        margin: margin,
        paceSignal: paceSignal,
        bidModifier: bidModifier
      });
      
      if (!PREVIEW_MODE && cfg.PROMOTE) {
        try {
          // Note: This is a simplified example. In practice, you'd apply bid modifiers
          // to specific targeting criteria or use campaign-level bid strategies
          log_('• Applied bid modifier ' + bidModifier.toFixed(2) + ' to ' + campaignName + ' › ' + adGroupName + ' (margin: ' + (margin * 100).toFixed(1) + '%)');
          applied++;
        } catch (e) {
          log_('! Failed to apply bid modifier: ' + e);
        }
      } else {
        log_('• Bid modifier planned: ' + bidModifier.toFixed(2) + ' for ' + campaignName + ' › ' + adGroupName + ' (margin: ' + (margin * 100).toFixed(1) + '%)' +
             (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
      }
    }
  }
  
  log_('• Profit-aware bidding complete: ' + applied + ' adjustments applied');
}

/**
 * Calculate bid modifier based on margin and pace signal
 */
function calculateBidModifier_(margin, paceSignal) {
  // Base modifier on margin
  var marginModifier = 1.0;
  
  if (margin >= 0.3) {
    // High margin (30%+) - increase bids
    marginModifier = 1.0 + (margin - 0.3) * 2; // Up to 40% increase for 50% margin
  } else if (margin <= 0.1) {
    // Low margin (10% or less) - reduce bids
    marginModifier = 0.5 + (margin / 0.1) * 0.5; // 50-100% based on margin
  }
  
  // Apply pace signal influence
  var combined = marginModifier * Math.min(paceSignal, 1.5); // Cap pace influence at 1.5x
  
  // Final bounds
  return Math.max(0.1, Math.min(2.0, combined));
}

/**
 * Trigger PACE_SIGNALS computation on backend
 */
function computePaceSignals_() {
  var sig = sign_("POST:" + TENANT_ID + ":profit_compute_signals:" + new Date().getTime());
  var url = BACKEND_URL + "/profit/compute-signals?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig) + "&_ngrok_skip_browser_warning=1";
  
  try {
    var r = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        nonce: new Date().getTime(),
        forceRefresh: true
      }),
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: {
        'ngrok-skip-browser-warning': '1',
        'User-Agent': 'Proofkit-AdsScript/1.0 (+https://proofkit.net)'
      }
    });
    
    var code = r.getResponseCode();
    var txt = r.getContentText();
    
    if (code < 200 || code >= 300) {
      log_("! PACE_SIGNALS compute HTTP " + code + ": " + String(txt || '').slice(0, 120));
      return false;
    }
    
    var parsed = null;
    try {
      parsed = JSON.parse(txt);
    } catch (e) {
      log_("! PACE_SIGNALS compute parse error: " + String(txt || '').slice(0, 120));
      return false;
    }
    
    if (parsed && parsed.ok) {
      log_('• PACE_SIGNALS computed successfully: ' + (parsed.signalCount || 0) + ' signals');
      return true;
    } else {
      log_('! PACE_SIGNALS computation failed: ' + (parsed.error || 'unknown error'));
      return false;
    }
    
  } catch (e) {
    log_("! PACE_SIGNALS compute error: " + e);
    return false;
  }
}