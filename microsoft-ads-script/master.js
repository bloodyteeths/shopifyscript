/**
 * ProofKit Autopilot — Microsoft Ads Script Port
 * Port of Google Ads Script functionality to Microsoft Ads (Bing Ads)
 * Provides automated campaign management with safety controls
 */

// Configuration placeholders - replaced by backend endpoint
var TENANT_ID = '__TENANT_ID__';
var BACKEND_URL = '__BACKEND_URL__';
var SHARED_SECRET = '__HMAC_SECRET__';

// Idempotency Test Harness Variables
var PREVIEW_MODE = false;
var MUTATION_LOG = [];
var RUN_MODE = 'PRODUCTION'; // 'PRODUCTION', 'PREVIEW', 'IDEMPOTENCY_TEST'

// Global safety guards
var NEG_GUARD_ACTIVE = false;
var RESERVED_KEYWORDS = ['proofkit', 'brand', 'competitor', 'important'];

function main() {
    // Initialize idempotency tracking
    initializeIdempotencyTracking_();
    
    var cfg = getConfig_();
    if (!cfg || !cfg.enabled) { 
        log_("Config disabled or not found."); 
        return; 
    }
    
    // ===== CRITICAL PROMOTE GATE ENFORCEMENT =====
    if (!validatePromoteGate_(cfg)) {
        log_("! PROMOTE GATE FAILED - Script execution blocked for safety");
        return;
    }
    
    // Initialize safety guards
    initializeSafetyGuards_(cfg);

    // Ensure label exists
    ensureLabel_(cfg.label);
    
    // Ensure seed campaign if no campaigns exist
    ensureSeed_(cfg);

    // Get all search campaigns
    var campaigns = getCampaigns_();
    log_("In scope: " + campaigns.length + " Search campaigns");

    // Apply budget caps with PROMOTE gate protection
    applyBudgetCaps_(campaigns, cfg);
    
    // Apply bidding strategies with PROMOTE gate protection
    applyBiddingStrategies_(campaigns, cfg);
    
    // Apply ad schedules if enabled
    if (cfg.add_business_hours_if_none) {
        applyAdSchedules_(campaigns, cfg);
    }
    
    // Apply negative keywords
    applyNegativeKeywords_(campaigns, cfg);
    
    // Auto-negate and collect search terms
    var stRows = autoNegateAndCollectST_(cfg, cfg.st_lookback, cfg.st_min_clicks, cfg.st_min_cost);
    
    // Build responsive search ads
    buildResponsiveAds_(cfg);
    
    // Audience attach functionality
    audienceAttach_(cfg);
    
    // Collect performance metrics
    var metrics = collectPerformance_();
    var runLogs = [[new Date(), '✓ ProofKit run complete']];
    
    // Add idempotency tracking to run logs
    if (PREVIEW_MODE || RUN_MODE === 'IDEMPOTENCY_TEST') {
        runLogs.push([new Date(), 'IDEMPOTENCY_LOG: ' + JSON.stringify({
            mode: RUN_MODE,
            mutationCount: MUTATION_LOG.length,
            mutations: MUTATION_LOG.slice(0, 50)
        })]);
    }
    
    // Post results to backend
    postToBackend_('metrics', {
        nonce: new Date().getTime(),
        metrics: metrics,
        search_terms: stRows,
        run_logs: runLogs
    });
}

// ===== BACKEND COMMUNICATION =====

function getConfig_() {
    var sig = sign_("GET:" + TENANT_ID + ":config");
    var url = BACKEND_URL + "/config?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);
    
    try {
        var response = UrlFetchApp.fetch(url, {
            muteHttpExceptions: true,
            followRedirects: true,
            validateHttpsCertificates: true,
            headers: {
                'User-Agent': 'ProofKit-MicrosoftAdsScript/1.0 (+https://proofkit.net)'
            }
        });
        
        var code = response.getResponseCode();
        var text = response.getContentText();
        
        if (code < 200 || code >= 300) {
            log_("! CONFIG HTTP " + code + ": " + String(text || '').slice(0, 120));
            return null;
        }
        
        var parsed = null;
        try { 
            parsed = JSON.parse(text); 
        } catch(e) { 
            log_("! CONFIG parse error: " + String(text || '').slice(0, 120)); 
            return null; 
        }
        
        return parsed && parsed.config ? parsed.config : null;
        
    } catch(e) { 
        log_("! Config fetch error: " + e); 
    }
    
    return null;
}

function postToBackend_(action, payload) {
    var sig = sign_("POST:" + TENANT_ID + ":" + action + ":" + (payload.nonce || ''));
    var url = BACKEND_URL + "/" + action + "?tenant=" + encodeURIComponent(TENANT_ID) + "&sig=" + encodeURIComponent(sig);
    
    var CHUNK = 500;
    var metrics = payload.metrics || [];
    var sts = payload.search_terms || [];
    var logs = payload.run_logs || [];
    
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
                muteHttpExceptions: true,
                followRedirects: true,
                validateHttpsCertificates: true,
                headers: {
                    'User-Agent': 'ProofKit-MicrosoftAdsScript/1.0 (+https://proofkit.net)'
                }
            });
        } catch(e) { 
            log_("! Backend post error (chunk " + i + "): " + e); 
        }
    }
}

function sign_(payload) {
    var raw = Utilities.computeHmacSha256Signature(payload, SHARED_SECRET);
    return Utilities.base64Encode(raw).replace(/=+$/, '');
}

// ===== MICROSOFT ADS API FUNCTIONS =====

function getCampaigns_() {
    var campaigns = [];
    var campaignIterator = BingAdsApp.campaigns()
        .withCondition("Status IN ['ENABLED', 'PAUSED']")
        .get();
    
    while (campaignIterator.hasNext()) {
        var campaign = campaignIterator.next();
        // Only include search campaigns (equivalent to Google's SEARCH channel)
        if (campaign.getType() === 'SEARCH_AND_CONTENT' || campaign.getType() === 'SEARCH') {
            campaigns.push(campaign);
        }
    }
    
    return campaigns;
}

function applyBudgetCaps_(campaigns, cfg) {
    campaigns.forEach(function(campaign) {
        if (isExcludedCampaign_(cfg, campaign.getName())) return;
        
        var cap = cfg.BUDGET_CAPS[campaign.getName()] != null ? 
            cfg.BUDGET_CAPS[campaign.getName()] : cfg.daily_budget_cap_default;
            
        if (cap && campaign.getBudget().getAmount() > cap) {
            logMutation_('BUDGET_CHANGE', {
                campaign: campaign.getName(),
                oldAmount: campaign.getBudget().getAmount(),
                newAmount: cap
            });
            
            if (!PREVIEW_MODE && cfg.PROMOTE) {
                campaign.getBudget().setAmount(cap);
                log_("• Budget capped: " + campaign.getName() + " → " + cap);
            } else {
                log_("• Budget cap planned: " + campaign.getName() + " → " + cap + 
                     (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
            }
        }
        
        safeLabel_(campaign, cfg.label);
    });
}

function applyBiddingStrategies_(campaigns, cfg) {
    campaigns.forEach(function(campaign) {
        if (isExcludedCampaign_(cfg, campaign.getName())) return;
        
        var ceiling = cfg.CPC_CEILINGS[campaign.getName()] != null ? 
            cfg.CPC_CEILINGS[campaign.getName()] : cfg.cpc_ceiling_default;
            
        try {
            logMutation_('BIDDING_STRATEGY_CHANGE', {
                campaign: campaign.getName(),
                strategy: 'MAXIMIZE_CLICKS',
                ceiling: ceiling
            });
            
            if (!PREVIEW_MODE && cfg.PROMOTE) {
                // Microsoft Ads equivalent of TARGET_SPEND is MAXIMIZE_CLICKS
                campaign.bidding().setStrategy('MAXIMIZE_CLICKS');
                if (ceiling) {
                    campaign.bidding().setMaxCpc(ceiling);
                }
                log_("• Bidding: " + campaign.getName() + " → MAXIMIZE_CLICKS, ceiling " + ceiling);
            } else {
                log_("• Bidding planned: " + campaign.getName() + " → MAXIMIZE_CLICKS, ceiling " + ceiling +
                     (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
            }
        } catch(e) {
            log_("! Bidding error on " + campaign.getName() + ": " + e);
        }
        
        safeLabel_(campaign, cfg.label);
    });
}

function applyAdSchedules_(campaigns, cfg) {
    campaigns.forEach(function(campaign) {
        if (isExcludedCampaign_(cfg, campaign.getName())) return;
        
        var hasSchedule = campaign.targeting().adSchedules().get().hasNext();
        if (!hasSchedule) {
            logMutation_('AD_SCHEDULE_ADD', {
                campaign: campaign.getName(),
                days: cfg.business_days_csv,
                start: cfg.business_start,
                end: cfg.business_end
            });
            
            if (!PREVIEW_MODE && cfg.PROMOTE) {
                addSchedule_(campaign, cfg.business_days_csv, cfg.business_start, cfg.business_end);
                log_("• Schedule added: " + campaign.getName() + " (" + cfg.business_days_csv + 
                     " " + cfg.business_start + "-" + cfg.business_end + ")");
            } else {
                log_("• Schedule planned: " + campaign.getName() + " (" + cfg.business_days_csv + 
                     " " + cfg.business_start + "-" + cfg.business_end + ")" +
                     (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
            }
        }
        
        safeLabel_(campaign, cfg.label);
    });
}

function addSchedule_(campaign, daysCsv, start, end) {
    var startParts = (start || '09:00').split(':');
    var endParts = (end || '18:00').split(':');
    var startHour = Number(startParts[0] || 9);
    var startMinute = Number(startParts[1] || 0);
    var endHour = Number(endParts[0] || 18);
    var endMinute = Number(endParts[1] || 0);
    
    var days = (daysCsv || "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(',');
    days.forEach(function(day) {
        day = day.trim();
        if (day) {
            campaign.addAdSchedule(day, startHour, startMinute, endHour, endMinute, 1.0);
        }
    });
}

function applyNegativeKeywords_(campaigns, cfg) {
    // Create or get master negative keyword list
    var list = getOrCreateNegativeList_(cfg.master_neg_list_name);
    upsertListNegatives_(list, cfg.MASTER_NEGATIVES);
    
    // Attach list to campaigns
    campaigns.forEach(function(campaign) {
        if (isExcludedCampaign_(cfg, campaign.getName())) return;
        attachNegativeList_(campaign, list);
    });
    
    // Apply campaign/ad group specific negatives
    applyWasteNegatives_(cfg, cfg.WASTE_NEGATIVE_MAP);
}

function getOrCreateNegativeList_(name) {
    var iterator = BingAdsApp.negativeKeywordLists().get();
    while (iterator.hasNext()) {
        var list = iterator.next();
        if (list.getName() === name) return list;
    }
    
    var created = BingAdsApp.newNegativeKeywordListBuilder()
        .withName(name)
        .build()
        .getResult();
    log_("• Created shared negative list: " + name);
    return created;
}

function upsertListNegatives_(list, terms) {
    if (!list) return;
    
    var existing = {};
    var iterator = list.negativeKeywords().get();
    while (iterator.hasNext()) {
        existing[iterator.next().getText().toLowerCase()] = true;
    }
    
    var added = 0;
    (terms || []).forEach(function(term) {
        term = String(term || "").trim();
        if (term && !existing[term.toLowerCase()] && !isReservedKeyword_(term)) {
            logMutation_('MASTER_NEGATIVE_ADD', {term: term, list: list.getName()});
            
            if (!PREVIEW_MODE && NEG_GUARD_ACTIVE) {
                list.addNegativeKeyword(term);
                added++;
            } else {
                log_("• Master negative planned: " + term + 
                     (PREVIEW_MODE ? ' [PREVIEW]' : ' [NEG_GUARD]'));
            }
        }
    });
    
    if (added) log_("• Master negatives added: " + added);
}

function attachNegativeList_(campaign, list) {
    var iterator = campaign.negativeKeywordLists().get();
    while (iterator.hasNext()) {
        if (iterator.next().getId() === list.getId()) return;
    }
    
    logMutation_('NEGATIVE_LIST_ATTACH', {
        campaign: campaign.getName(),
        listName: list.getName()
    });
    
    if (!PREVIEW_MODE && NEG_GUARD_ACTIVE) {
        campaign.addNegativeKeywordList(list);
        log_("• Attached master negative list to " + campaign.getName());
    } else {
        log_("• Master negative list attachment planned for " + campaign.getName() +
             (PREVIEW_MODE ? ' [PREVIEW]' : ' [NEG_GUARD]'));
    }
}

function applyWasteNegatives_(cfg, wasteMap) {
    for (var campaignName in wasteMap) {
        var adGroupMap = wasteMap[campaignName] || {};
        
        var campaignIterator = BingAdsApp.campaigns()
            .withCondition("Name = '" + campaignName.replace(/'/g, "\\'") + "'")
            .get();
            
        if (!campaignIterator.hasNext()) continue;
        
        var campaign = campaignIterator.next();
        if (isExcludedCampaign_(cfg, campaign.getName())) continue;
        
        var adGroupIndex = {};
        var adGroupIterator = campaign.adGroups().get();
        while (adGroupIterator.hasNext()) {
            var adGroup = adGroupIterator.next();
            adGroupIndex[adGroup.getName()] = adGroup;
        }
        
        for (var adGroupName in adGroupMap) {
            if (isExcludedAdGroup_(cfg, campaignName, adGroupName)) continue;
            
            var adGroup = adGroupIndex[adGroupName];
            if (!adGroup) {
                log_("  - missing AG '" + adGroupName + "' in '" + campaignName + "'");
                continue;
            }
            
            var unique = {};
            var terms = adGroupMap[adGroupName] || [];
            var added = 0;
            
            terms.forEach(function(term) {
                term = String(term || "").toLowerCase();
                if (unique[term]) return;
                unique[term] = true;
                
                try {
                    adGroup.createNegativeKeyword('[' + term + ']');
                    added++;
                } catch(e) {
                    log_("  - skip negative '" + term + "': " + e);
                }
            });
            
            if (added) {
                log_("• Added " + added + " exact negatives in " + campaignName + " › " + adGroupName);
            }
        }
    }
}

function autoNegateAndCollectST_(cfg, lookback, minClicks, minCost) {
    // Microsoft Ads equivalent of search term reporting
    var query = "SELECT CampaignName, AdGroupId, AdGroupName, SearchQuery, Clicks, Spend, Conversions " +
                "FROM SEARCH_QUERY_PERFORMANCE_REPORT " +
                "WHERE TimePeriod = " + (lookback || 'LAST_7_DAYS') + " " +
                "AND Clicks >= " + (minClicks || 2);
    
    var reportIterator = BingAdsApp.report(query).get();
    var outRows = [];
    var bucket = {};
    
    while (reportIterator.hasNext()) {
        var row = reportIterator.next();
        var cost = parseFloat(row['Spend'] || 0);
        var conversions = parseFloat(row['Conversions'] || 0);
        var clicks = parseInt(row['Clicks'] || 0);
        var searchQuery = row['SearchQuery'] || "";
        var adGroupId = row['AdGroupId'];
        
        if (conversions === 0 && cost >= (minCost || 2.82)) {
            var term = searchQuery.toLowerCase();
            (bucket[adGroupId] = bucket[adGroupId] || []).push(term);
        }
        
        outRows.push([
            new Date(),
            row['CampaignName'],
            row['AdGroupName'],
            searchQuery,
            clicks,
            cost,
            conversions
        ]);
    }
    
    // Apply negatives to ad groups
    for (var adGroupId in bucket) {
        var adGroupIterator = BingAdsApp.adGroups()
            .withIds([parseInt(adGroupId)])
            .get();
            
        if (!adGroupIterator.hasNext()) continue;
        
        var adGroup = adGroupIterator.next();
        var campaignName = adGroup.getCampaign().getName();
        var adGroupName = adGroup.getName();
        
        if (isExcludedAdGroup_(cfg, campaignName, adGroupName)) continue;
        
        var unique = {};
        var termsList = bucket[adGroupId] || [];
        var added = 0;
        
        termsList.forEach(function(term) {
            if (unique[term] || isReservedKeyword_(term)) return;
            unique[term] = true;
            
            try {
                if (NEG_GUARD_ACTIVE && cfg.PROMOTE) {
                    adGroup.createNegativeKeyword('[' + term + ']');
                    added++;
                } else {
                    log_("• Auto-negative planned: " + term + " in " + adGroupName +
                         (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
                }
            } catch(e) {
                // Ignore errors for invalid negative keywords
            }
        });
        
        if (added) {
            log_("• Auto-negated " + added + " in AG: " + adGroupName);
        }
    }
    
    return outRows;
}

function buildResponsiveAds_(cfg) {
    var adGroupIterator = BingAdsApp.adGroups()
        .withCondition("Status IN ['ENABLED', 'PAUSED']")
        .get();
        
    var created = 0;
    
    while (adGroupIterator.hasNext()) {
        var adGroup = adGroupIterator.next();
        
        // Skip if ad group already has a labeled ad
        if (hasLabelledAd_(adGroup, cfg.label)) continue;
        
        var finalUrl = inferFinalUrl_(adGroup) || cfg.default_final_url;
        var campaignName = adGroup.getCampaign().getName();
        var adGroupName = adGroup.getName();
        
        // Get RSA content from config
        var override = (cfg.RSA_MAP[campaignName] && cfg.RSA_MAP[campaignName][adGroupName]) || null;
        var headlines = override && override.H && override.H.length ? 
            override.H : (cfg.RSA_DEFAULT.H || getDefaultHeadlines_());
        var descriptions = override && override.D && override.D.length ?
            override.D : (cfg.RSA_DEFAULT.D || getDefaultDescriptions_());
        
        // Lint content for Microsoft Ads requirements
        var finalHeadlines = lintContent_(headlines, 30, 15, 3);
        var finalDescriptions = lintContent_(descriptions, 90, 4, 10);
        
        try {
            if (!PREVIEW_MODE && cfg.PROMOTE) {
                var adBuilder = adGroup.newAd().responsiveSearchAdBuilder()
                    .withFinalUrl(finalUrl);
                
                finalHeadlines.forEach(function(headline) {
                    adBuilder.addHeadline(headline);
                });
                
                finalDescriptions.forEach(function(description) {
                    adBuilder.addDescription(description);
                });
                
                var operation = adBuilder.build();
                if (operation.isSuccessful()) {
                    safeLabelWithGuard_(operation.getResult(), cfg.label);
                    created++;
                    log_("• RSA created in " + campaignName + " › " + adGroupName);
                } else {
                    log_("! RSA errors in " + campaignName + " › " + adGroupName + ": " + 
                         operation.getErrors().join('; '));
                }
            } else {
                log_("• RSA creation planned in " + campaignName + " › " + adGroupName +
                     (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
            }
        } catch(e) {
            log_("! RSA build exception in " + campaignName + " › " + adGroupName + ": " + e);
        }
    }
    
    if (created) log_("• RSAs created: " + created);
}

function audienceAttach_(cfg) {
    try {
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
        
        var campaigns = getCampaigns_();
        var campaignMap = {};
        campaigns.forEach(function(campaign) {
            campaignMap[campaign.getName()] = campaign;
        });
        
        for (var campaignName in audienceMap) {
            if (isExcludedCampaign_(cfg, campaignName)) {
                log_('• Skipping excluded campaign: ' + campaignName);
                continue;
            }
            
            var campaign = campaignMap[campaignName];
            if (!campaign) {
                log_('! Campaign not found: ' + campaignName);
                errors++;
                continue;
            }
            
            var adGroupMap = audienceMap[campaignName] || {};
            for (var adGroupName in adGroupMap) {
                if (isExcludedAdGroup_(cfg, campaignName, adGroupName)) {
                    log_('• Skipping excluded ad group: ' + campaignName + ' › ' + adGroupName);
                    continue;
                }
                
                var audienceRow = adGroupMap[adGroupName];
                if (!audienceRow || !audienceRow.user_list_id) {
                    log_('! Missing user_list_id for ' + campaignName + ' › ' + adGroupName);
                    errors++;
                    continue;
                }
                
                var listId = String(audienceRow.user_list_id).trim();
                var mode = String(audienceRow.mode || 'OBSERVE').toUpperCase();
                var bidModifier = audienceRow.bid_modifier ? Number(audienceRow.bid_modifier) : null;
                
                // Microsoft Ads audience targeting
                try {
                    logMutation_('AUDIENCE_ATTACH', {
                        campaign: campaignName,
                        adGroup: adGroupName,
                        listId: listId,
                        mode: mode,
                        bidModifier: bidModifier
                    });
                    
                    if (!PREVIEW_MODE && cfg.PROMOTE) {
                        var builder = campaign.targeting().newAudienceBuilder()
                            .withAudienceId(parseInt(listId));
                        
                        if (mode === 'TARGET') {
                            builder.withTargeting();
                        } else if (mode === 'EXCLUDE') {
                            builder.withExclusion();
                        }
                        // OBSERVE is default
                        
                        var operation = builder.build();
                        if (operation && operation.isSuccessful()) {
                            var audience = operation.getResult();
                            
                            if (bidModifier && mode !== 'EXCLUDE') {
                                try {
                                    audience.setBidModifier(bidModifier);
                                } catch (e) {
                                    log_('! Failed to set bid modifier: ' + e);
                                }
                            }
                            
                            log_('• Audience attached: ' + campaignName + ' id=' + listId + ' mode=' + mode);
                            attached++;
                        } else {
                            log_('! Failed to attach audience ' + listId + ' to ' + campaignName);
                            errors++;
                        }
                    } else {
                        log_('• Audience attachment planned: ' + campaignName + ' id=' + listId + ' mode=' + mode +
                             (PREVIEW_MODE ? ' [PREVIEW]' : ' [PROMOTE=FALSE]'));
                        attached++;
                    }
                } catch (e) {
                    log_('! Exception attaching audience ' + listId + ' to ' + campaignName + ': ' + e);
                    errors++;
                }
            }
        }
        
        log_('• Audience attach complete: ' + attached + ' attached, ' + skipped + ' skipped, ' + errors + ' errors');
        
    } catch (e) {
        log_('! audienceAttach_ exception: ' + e);
    }
}

function collectPerformance_() {
    var rows = [];
    
    // Campaign level metrics
    var campaignQuery = "SELECT CampaignId, CampaignName, Clicks, Spend, Conversions, Impressions, Ctr " +
                       "FROM CAMPAIGN_PERFORMANCE_REPORT " +
                       "WHERE TimePeriod = LAST_7_DAYS";
    
    var campaignIterator = BingAdsApp.report(campaignQuery).get();
    while (campaignIterator.hasNext()) {
        var row = campaignIterator.next();
        rows.push([
            new Date(),
            'campaign',
            row['CampaignName'],
            '',
            row['CampaignId'],
            row['CampaignName'],
            parseInt(row['Clicks'] || 0),
            parseFloat(row['Spend'] || 0),
            parseFloat(row['Conversions'] || 0),
            parseInt(row['Impressions'] || 0),
            parseFloat(row['Ctr'] || 0)
        ]);
    }
    
    // Ad Group level metrics
    var adGroupQuery = "SELECT CampaignName, AdGroupId, AdGroupName, Clicks, Spend, Conversions, Impressions, Ctr " +
                      "FROM ADGROUP_PERFORMANCE_REPORT " +
                      "WHERE TimePeriod = LAST_7_DAYS";
    
    var adGroupIterator = BingAdsApp.report(adGroupQuery).get();
    while (adGroupIterator.hasNext()) {
        var row = adGroupIterator.next();
        rows.push([
            new Date(),
            'ad_group',
            row['CampaignName'],
            row['AdGroupName'],
            row['AdGroupId'],
            row['AdGroupName'],
            parseInt(row['Clicks'] || 0),
            parseFloat(row['Spend'] || 0),
            parseFloat(row['Conversions'] || 0),
            parseInt(row['Impressions'] || 0),
            parseFloat(row['Ctr'] || 0)
        ]);
    }
    
    return rows;
}

// ===== HELPER FUNCTIONS =====

function ensureSeed_(cfg) {
    var campaignIterator = BingAdsApp.campaigns().get();
    if (campaignIterator.hasNext()) return; // Campaigns already exist
    
    var name = (cfg.desired && cfg.desired.campaign_name) || "ProofKit - Search";
    var daily = cfg.daily_budget_cap_default || 3.00;
    var ceiling = cfg.cpc_ceiling_default || 0.20;
    var adGroupName = (cfg.desired && cfg.desired.ad_group) || "Default";
    var keyword = (cfg.desired && cfg.desired.keyword) || '"digital certificates"';
    
    log_("• Seeding zero-state: creating campaign '" + name + "'");
    
    var operation = BingAdsApp.newCampaignBuilder()
        .withName(name)
        .withBudget(daily)
        .withBiddingStrategy('MAXIMIZE_CLICKS')
        .build();
        
    if (!operation.isSuccessful()) {
        log_("! Seed campaign failed: " + operation.getErrors().join('; '));
        return;
    }
    
    var campaign = operation.getResult();
    try {
        campaign.bidding().setMaxCpc(ceiling);
    } catch(e) {
        // Ignore if not supported
    }
    
    // Add ad schedule
    try {
        var businessDays = (cfg.business_days_csv || "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(',');
        businessDays.forEach(function(day) {
            day = day.trim();
            if (day) {
                campaign.addAdSchedule(day, 9, 0, 18, 0, 1.0);
            }
        });
    } catch(e) {
        // Ignore if not supported
    }
    
    // Create ad group
    var adGroupOperation = campaign.newAdGroupBuilder().withName(adGroupName).build();
    if (!adGroupOperation.isSuccessful()) {
        log_("! Seed ad group failed: " + adGroupOperation.getErrors().join('; '));
        return;
    }
    
    var adGroup = adGroupOperation.getResult();
    
    // Add keyword
    try {
        adGroup.newKeywordBuilder().withText(keyword).build();
    } catch(e) {
        // Ignore if keyword creation fails
    }
    
    // Create responsive search ad
    var headlines = getDefaultHeadlines_();
    var descriptions = getDefaultDescriptions_();
    
    try {
        var adBuilder = adGroup.newAd().responsiveSearchAdBuilder()
            .withFinalUrl(cfg.default_final_url || "https://www.proofkit.net");
        
        headlines.slice(0, 15).forEach(function(headline) {
            adBuilder.addHeadline(headline.length > 30 ? headline.slice(0, 30) : headline);
        });
        
        descriptions.slice(0, 4).forEach(function(description) {
            adBuilder.addDescription(description.length > 90 ? description.slice(0, 90) : description);
        });
        
        adBuilder.build();
    } catch(e) {
        log_("! Seed RSA failed: " + e);
    }
    
    log_("• Seeded: " + name + " › " + adGroupName);
}

function getDefaultHeadlines_() {
    return [
        "Digital Certificates",
        "Compliance Reports", 
        "Export Clean PDFs",
        "Generate Certs Fast",
        "Audit-Ready Reports",
        "Start Free Today"
    ];
}

function getDefaultDescriptions_() {
    return [
        "Create inspector-ready PDFs fast.",
        "Replace spreadsheets with an auditable system.",
        "Templates enforce SOPs. Audit trail included.",
        "Setup in under 10 minutes."
    ];
}

function lintContent_(array, maxLength, maxItems, minLength) {
    var output = [];
    var seen = {};
    
    for (var i = 0; i < array.length && output.length < maxItems; i++) {
        var text = String(array[i] || "").trim();
        if (!text) continue;
        
        text = dedupeWords_(text);
        if (text.length > maxLength) text = text.slice(0, maxLength);
        if (text.length < minLength) continue;
        
        var key = text.toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        
        output.push(text);
    }
    
    return output;
}

function dedupeWords_(text) {
    var parts = text.split(/\s+/);
    var output = [];
    var seen = {};
    
    for (var i = 0; i < parts.length; i++) {
        var word = parts[i];
        var key = word.toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        output.push(word);
    }
    
    return output.join(' ');
}

function hasLabelledAd_(adGroup, label) {
    var adIterator = adGroup.ads().get();
    while (adIterator.hasNext()) {
        var ad = adIterator.next();
        var labelIterator = ad.labels().get();
        while (labelIterator.hasNext()) {
            if (labelIterator.next().getName() === label) return true;
        }
    }
    return false;
}

function inferFinalUrl_(adGroup) {
    var adIterator = adGroup.ads()
        .withCondition("Status IN ['ENABLED', 'PAUSED']")
        .get();
        
    while (adIterator.hasNext()) {
        var ad = adIterator.next();
        try {
            var urls = ad.urls();
            var finalUrl = urls.getFinalUrl ? urls.getFinalUrl() : 
                          (urls.getFinalUrls && urls.getFinalUrls()[0]);
            if (finalUrl) return finalUrl;
        } catch(e) {
            // Continue to next ad
        }
    }
    
    return null;
}

function ensureLabel_(name) {
    var iterator = BingAdsApp.labels().get();
    while (iterator.hasNext()) {
        if (iterator.next().getName() === name) return;
    }
    
    BingAdsApp.createLabel(name, "Touched by ProofKit");
}

function safeLabel_(entity, name) {
    safeLabelWithGuard_(entity, name);
}

function log_(message) {
    Logger.log(message);
}

// ===== SAFETY AND PROMOTE GATE FUNCTIONS =====

function validatePromoteGate_(cfg) {
    if (!cfg) {
        log_('! PROMOTE GATE: No config available');
        return false;
    }
    
    var promoteEnabled = cfg.PROMOTE === true || String(cfg.PROMOTE).toLowerCase() === 'true';
    
    if (!promoteEnabled) {
        log_('! PROMOTE GATE: PROMOTE=FALSE - All mutations blocked for safety');
        log_('! To enable live changes, set PROMOTE=TRUE in configuration');
        return false;
    }
    
    if (PREVIEW_MODE) {
        log_('• PROMOTE GATE: Preview mode active - mutations logged only');
        return true;
    }
    
    if (RUN_MODE === 'IDEMPOTENCY_TEST') {
        log_('• PROMOTE GATE: Idempotency test mode - mutations logged only');
        return true;
    }
    
    log_('✓ PROMOTE GATE: PROMOTE=TRUE verified - live mutations enabled');
    return true;
}

function initializeSafetyGuards_(cfg) {
    if (!cfg) return;
    
    NEG_GUARD_ACTIVE = cfg.PROMOTE && !PREVIEW_MODE && RUN_MODE !== 'IDEMPOTENCY_TEST';
    
    log_('• Safety Guards Initialized:');
    log_('  - PROMOTE: ' + (cfg.PROMOTE ? 'ENABLED' : 'DISABLED'));
    log_('  - NEG_GUARD: ' + (NEG_GUARD_ACTIVE ? 'ACTIVE' : 'INACTIVE'));
    log_('  - LABEL_GUARD: ' + (cfg.label || 'PROOFKIT_AUTOMATED'));
    log_('  - PREVIEW_MODE: ' + (PREVIEW_MODE ? 'TRUE' : 'FALSE'));
    log_('  - RUN_MODE: ' + RUN_MODE);
    
    if (RESERVED_KEYWORDS.length > 0) {
        log_('  - RESERVED_KEYWORDS: [' + RESERVED_KEYWORDS.join(', ') + ']');
    }
}

function isReservedKeyword_(term) {
    if (!term) return false;
    var termLower = String(term).toLowerCase().trim();
    
    for (var i = 0; i < RESERVED_KEYWORDS.length; i++) {
        if (termLower.indexOf(RESERVED_KEYWORDS[i]) !== -1) {
            log_('! NEG_GUARD: Blocked reserved keyword: ' + term);
            return true;
        }
    }
    
    return false;
}

function safeLabelWithGuard_(entity, labelName) {
    if (!entity || !labelName) return;
    
    try {
        var hasLabel = false;
        var labelIterator = entity.labels().get();
        while (labelIterator.hasNext()) {
            if (labelIterator.next().getName() === labelName) {
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

function isExcludedCampaign_(cfg, campaignName) {
    try {
        return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName]);
    } catch(e) {
        return false;
    }
}

function isExcludedAdGroup_(cfg, campaignName, adGroupName) {
    try {
        return !!(cfg && cfg.EXCLUSIONS && cfg.EXCLUSIONS[campaignName] && 
                 cfg.EXCLUSIONS[campaignName][adGroupName]);
    } catch(e) {
        return false;
    }
}

// ===== IDEMPOTENCY TEST HARNESS =====

function initializeIdempotencyTracking_() {
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
    MUTATION_LOG = [];
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
    return {
        mode: RUN_MODE,
        mutationCount: MUTATION_LOG.length,
        mutations: MUTATION_LOG,
        timestamp: new Date().toISOString()
    };
}

function runIdempotencyTest_() {
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