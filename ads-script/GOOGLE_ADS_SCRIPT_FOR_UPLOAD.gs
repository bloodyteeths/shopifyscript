/** Proofkit Autopilot — Universal Google Ads Script (backend version)
 * CONFIGURED FOR YOUR CANARY TEST
 * Ready to upload to Google Ads Scripts Editor
 */
var TENANT_ID     = 'TENANT_123';
var BACKEND_URL   = 'https://99f9e96b3102.ngrok-free.app/api';
var SHARED_SECRET = 'f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5';

function main(){
  var cfg = getConfig_();
  if (!cfg || !cfg.enabled) { log_("Config disabled or not found."); return; }

  ensureLabel_(cfg.label);
  ensureSeed_(cfg);

  var it = AdsApp.campaigns().withCondition("campaign.advertising_channel_type = SEARCH").withCondition("campaign.status IN ('ENABLED','PAUSED')").get();
  var camps=[]; while (it.hasNext()) camps.push(it.next());
  log_("In scope: " + camps.length + " Search campaigns");

  // Budget caps
  camps.forEach(function(c){
    if (isExcludedCampaign_(cfg, c.getName())) return;
    var cap = cfg.BUDGET_CAPS[c.getName()] != null ? cfg.BUDGET_CAPS[c.getName()] : cfg.daily_budget_cap_default;
    if (cap && c.getBudget().getAmount() > cap){ c.getBudget().setAmount(cap); log_("• Budget capped: " + c.getName() + " → " + cap); }
    safeLabel_(c, cfg.label);
  });
  // Bidding
  camps.forEach(function(c){
    if (isExcludedCampaign_(cfg, c.getName())) return;
    var ceil = cfg.CPC_CEILINGS[c.getName()] != null ? cfg.CPC_CEILINGS[c.getName()] : cfg.cpc_ceiling_default;
    try { c.bidding().setStrategy('TARGET_SPEND'); if (ceil) c.bidding().setCpcBidCeiling(ceil); log_("• Bidding: "+c.getName()+" → TARGET_SPEND, ceiling "+ceil); }
    catch(e){ log_("! Bidding error on "+c.getName()+": "+e); }
    safeLabel_(c, cfg.label);
  });
  // Schedule
  if (cfg.add_business_hours_if_none){
    camps.forEach(function(c){
      if (isExcludedCampaign_(cfg, c.getName())) return;
      var has=c.targeting().adSchedules().get().hasNext();
      if (!has){
        addSchedule_(c, cfg.business_days_csv, cfg.business_start, cfg.business_end);
        log_("• Schedule added: " + c.getName() + " (" + cfg.business_days_csv + " " + cfg.business_start + "-" + cfg.business_end + ")");
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

  // Metrics push
  var metrics = collectPerf_();
  postToBackend_('metrics', {
    nonce: new Date().getTime(),
    metrics: metrics,
    search_terms: stRows,
    run_logs: [[new Date(), '✓ Proofkit run complete']]
  });
}

// --- Backend IO (HMAC) ---
function getConfig_(){
  var sig = sign_("GET:"+TENANT_ID+":config");
  var url = BACKEND_URL + "/config?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);
  try {
    var r = UrlFetchApp.fetch(url, { 
      muteHttpExceptions:true, 
      followRedirects:true, 
      validateHttpsCertificates:true,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'GoogleAdsScript/1.0'
      }
    });
    if (r.getResponseCode()>=200 && r.getResponseCode()<300) return JSON.parse(r.getContentText()).config;
  } catch(e){ log_("! Config fetch error: "+e); }
  return null;
}
function postToBackend_(action, payload){
  var sig = sign_("POST:"+TENANT_ID+":"+action+":"+(payload.nonce||''));
  var url = BACKEND_URL + "/" + action + "?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);
  var CHUNK = 500, metrics = payload.metrics||[], sts=payload.search_terms||[], logs=payload.run_logs||[];
  for (var i=0;i<Math.max(1, Math.ceil(metrics.length/CHUNK)); i++){
    var part = { nonce: payload.nonce, metrics: metrics.slice(i*CHUNK,(i+1)*CHUNK), search_terms: i===0?sts.slice(0,CHUNK):[], run_logs: i===0?logs:[] };
    try { 
      UrlFetchApp.fetch(url, { 
        method:'post', 
        contentType:'application/json', 
        payload: JSON.stringify(part), 
        muteHttpExceptions:true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'GoogleAdsScript/1.0'
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
  var added=0; (terms||[]).forEach(function(t){ t=String(t||"").trim(); if(t && !have[t.toLowerCase()]){ list.addNegativeKeyword(t); added++; }});
  if(added) log_("• Master negatives added: "+added);
}
function attachList_(c, list){ var it=c.negativeKeywordLists().get(); while(it.hasNext()) if(it.next().getId()===list.getId()) return; c.addNegativeKeywordList(list); log_("• Attached master neg list to "+c.getName()); }
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
  for (var id in bucket){ var agit=AdsApp.adGroups().withIds([Number(id)]).get(); if(!agit.hasNext()) continue; var ag=agit.next(); var campName=ag.getCampaign().getName(); var agName=ag.getName(); if (isExcludedAdGroup_(cfg, campName, agName)) continue; var uniq={}, list=bucket[id]||[], added=0; list.forEach(function(t){ if(uniq[t]) return; uniq[t]=true; try{ ag.createNegativeKeyword('['+t+']'); added++; }catch(e){} }); if(added) log_("• Auto-negated "+added+" in AG: "+agName); }
  return outRows;
}
function buildSafeRSAs_(cfg){
  var it=AdsApp.adGroups().withCondition("ad_group.status IN ('ENABLED','PAUSED')").get(); var created=0;
  while(it.hasNext()){
    var ag=it.next(); if(hasLabelledAd_(ag, cfg.label)) continue;
    var finalUrl=inferFinalUrl_(ag)||cfg.default_final_url;
    var camp=ag.getCampaign().getName(), name=ag.getName();
    var ov=(cfg.RSA_MAP[camp] && cfg.RSA_MAP[camp][name]) || null;
    var Hsrc=ov&&ov.H&&ov.H.length?ov.H:(cfg.RSA_DEFAULT.H.length?cfg.RSA_DEFAULT.H:["Digital Certificates","Compliance Reports","Generate Certs Fast","Export Clean PDFs","Audit-Ready Reports","Start Free Today"]);
    var Dsrc=ov&&ov.D&&ov.D.length?ov.D:(cfg.RSA_DEFAULT.D.length?cfg.RSA_DEFAULT.D:["Create inspector-ready PDFs fast.","Replace spreadsheets with an auditable system.","Templates enforce SOPs. Audit trail included.","Setup in under 10 minutes."]);
    var H=lint_(Hsrc,30,15,3), D=lint_(Dsrc,90,4,10);
    var b=ag.newAd().responsiveSearchAdBuilder().withFinalUrl(finalUrl); H.forEach(function(h){ b.addHeadline(h); }); D.forEach(function(d){ b.addDescription(d); });
    try{ var op=b.build(); if(op.isSuccessful()){ safeLabel_(op.getResult(), cfg.label); created++; log_("• RSA created in "+camp+" › "+name); } else { log_("! RSA errors in "+camp+" › "+name+": "+op.getErrors().join('; ')); } }
    catch(e){ log_("! RSA build exception in "+camp+" › "+name+": "+e); }
  } if(created) log_("• RSAs created: "+created);
}
function lint_(arr, maxLen, maxItems, minLen){ var out=[], seen={}; for (var i=0;i<arr.length && out.length<maxItems;i++){ var s=String(arr[i]||"").trim(); if(!s) continue; s=dedupeWords_(s); if(s.length>maxLen) s=s.slice(0,maxLen); if(s.length<minLen) continue; var k=s.toLowerCase(); if(seen[k]) continue; seen[k]=true; out.push(s);} return out; }
function hasLabelledAd_(ag,label){ var ads=ag.ads().get(); while(ads.hasNext()){ var ad=ads.next(), labs=ad.labels().get(); while(labs.hasNext()) if(labs.next().getName()===label) return true; } return false; }
function inferFinalUrl_(ag){ var it=ag.ads().withCondition("ad_group_ad.status IN ('ENABLED','PAUSED')").get(); while(it.hasNext()){ var ad=it.next(); try{ var urls=ad.urls(); var u=urls.getFinalUrl?urls.getFinalUrl():(urls.getFinalUrls&&urls.getFinalUrls()[0]); if(u) return u; }catch(e){} } return null; }
function ensureLabel_(name){ var it=AdsApp.labels().get(); while(it.hasNext()) if(it.next().getName()===name) return; AdsApp.createLabel(name,"Touched by Proofkit"); }
function safeLabel_(entity,name){ try{ entity.applyLabel(name); }catch(e){} }
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
              if (bidModifier && mode !== 'EXCLUDE') {
                try {
                  existingAud.setBidModifier(bidModifier);
                  log_('• Updated bid modifier: ' + campName + ' id=' + listId + ' bid=' + bidModifier);
                } catch (e) {
                  log_('! Failed to update bid modifier: ' + e);
                }
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
          
        } catch (e) {
          log_('! Exception attaching audience ' + listId + ' to ' + campName + ': ' + e);
          errors++;
        }
      }
    }
    
    log_('• Audience attach complete: ' + attached + ' attached, ' + skipped + ' skipped, ' + errors + ' errors');
    
  } catch (e) {
    log_('! audienceAttach_ exception: ' + e);
  }
}

// --- EXCLUSIONS helpers ---
function isExcludedCampaign_(cfg, campaignName){
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName]); } catch(e){ return false; }
}
function isExcludedAdGroup_(cfg, campaignName, adGroupName){
  try { return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName] && cfg.EXCLUSIONS[campaignName][adGroupName]); } catch(e){ return false; }
}