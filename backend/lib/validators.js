export function validateHeadlines(headlines) {
  const seen = new Set();
  const errors = [];
  
  // Enhanced validation with comprehensive error handling
  if (!Array.isArray(headlines)) {
    return { ok: false, errors: ['headlines_must_be_array'], deduped: [] };
  }

  if (headlines.length === 0) {
    return { ok: false, errors: ['headlines_required'], deduped: [] };
  }

  if (headlines.length > 30) {
    errors.push(`too_many_headlines(${headlines.length}/30_max)`);
  }

  const deduped = headlines
    .filter((h, index) => {
      // Type validation
      if (typeof h !== 'string' && h !== null && h !== undefined) {
        errors.push(`headline_${index}_invalid_type`);
        return false;
      }
      return true;
    })
    .map((h, index) => {
      const str = String(h || "").trim();
      
      // Empty validation
      if (!str) {
        errors.push(`headline_${index}_empty`);
        return null;
      }

      // Character validation
      if (str.includes('<') || str.includes('>')) {
        errors.push(`headline_${index}_contains_html`);
      }

      if (/[^\x00-\x7F]/.test(str.replace(/[\u{1F300}-\u{1FAFF}]/gu, ""))) {
        // Allow some unicode but flag suspicious characters
        console.warn(`Headline ${index} contains non-ASCII characters: ${str}`);
      }

      return str;
    })
    .filter(h => h !== null)
    .filter((h, index, arr) => {
      // Deduplication with case insensitivity
      const key = h.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) {
        errors.push(`headline_duplicate: "${h}"`);
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((h) => h.replace(/[\u{1F300}-\u{1FAFF}]/gu, "")); // Remove emojis

  const clipped = deduped.map((h, index) => {
    if (h.length > 30) {
      errors.push(`headline_${index}_too_long(${h.length}/30_max)`);
      return h.slice(0, 30);
    }
    
    // Additional validation
    if (h.length < 3) {
      errors.push(`headline_${index}_too_short(${h.length})`);
    }

    // Quality checks
    if (!/[a-zA-Z0-9]/.test(h)) {
      errors.push(`headline_${index}_no_alphanumeric`);
    }

    return h;
  });

  // Final quality validation
  if (clipped.length < 3) {
    errors.push(`insufficient_headlines(${clipped.length}/3_min)`);
  }

  return { 
    ok: errors.length === 0, 
    errors: errors.slice(0, 20), // Limit error count for performance
    deduped: clipped.slice(0, 15) // Limit to 15 headlines max
  };
}

export function validateDescriptions(descriptions) {
  const seen = new Set();
  const errors = [];
  
  // Enhanced validation with comprehensive error handling
  if (!Array.isArray(descriptions)) {
    return { ok: false, errors: ['descriptions_must_be_array'], deduped: [] };
  }

  if (descriptions.length === 0) {
    return { ok: false, errors: ['descriptions_required'], deduped: [] };
  }

  if (descriptions.length > 10) {
    errors.push(`too_many_descriptions(${descriptions.length}/10_max)`);
  }

  const deduped = descriptions
    .filter((d, index) => {
      // Type validation
      if (typeof d !== 'string' && d !== null && d !== undefined) {
        errors.push(`description_${index}_invalid_type`);
        return false;
      }
      return true;
    })
    .map((d, index) => {
      const str = String(d || "").trim();
      
      // Empty validation
      if (!str) {
        errors.push(`description_${index}_empty`);
        return null;
      }

      // Character validation
      if (str.includes('<') || str.includes('>')) {
        errors.push(`description_${index}_contains_html`);
      }

      // Security validation - prevent potential XSS
      if (str.toLowerCase().includes('script') || str.toLowerCase().includes('javascript:')) {
        errors.push(`description_${index}_suspicious_content`);
      }

      if (/[^\x00-\x7F]/.test(str.replace(/[\u{1F300}-\u{1FAFF}]/gu, ""))) {
        console.warn(`Description ${index} contains non-ASCII characters: ${str.substring(0, 50)}...`);
      }

      return str;
    })
    .filter(d => d !== null)
    .filter((d, index, arr) => {
      // Deduplication with case insensitivity
      const key = d.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) {
        errors.push(`description_duplicate: "${d.substring(0, 30)}..."`);
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((d) => d.replace(/[\u{1F300}-\u{1FAFF}]/gu, "")); // Remove emojis

  const clipped = deduped.map((d, index) => {
    if (d.length > 90) {
      errors.push(`description_${index}_too_long(${d.length}/90_max)`);
      return d.slice(0, 90);
    }
    
    // Additional validation
    if (d.length < 10) {
      errors.push(`description_${index}_too_short(${d.length}/10_min)`);
    }

    // Quality checks
    if (!/[a-zA-Z0-9]/.test(d)) {
      errors.push(`description_${index}_no_alphanumeric`);
    }

    // Check for proper sentence structure
    if (!d.match(/[.!?]$/)) {
      console.warn(`Description ${index} doesn't end with punctuation`);
    }

    return d;
  });

  // Final quality validation
  if (clipped.length < 2) {
    errors.push(`insufficient_descriptions(${clipped.length}/2_min)`);
  }

  return { 
    ok: errors.length === 0, 
    errors: errors.slice(0, 20), // Limit error count for performance
    deduped: clipped.slice(0, 4) // Limit to 4 descriptions max
  };
}

export function validateRSA(headlines, descriptions) {
  try {
    const vh = validateHeadlines(headlines || []);
    const vd = validateDescriptions(descriptions || []);
    
    // Cross-validation between headlines and descriptions
    const crossErrors = [];
    
    // Check for content overlap between headlines and descriptions
    if (vh.ok && vd.ok) {
      const headlineText = vh.deduped.join(' ').toLowerCase();
      const descriptionText = vd.deduped.join(' ').toLowerCase();
      
      // Check for excessive overlap
      const headlineWords = new Set(headlineText.split(/\s+/).filter(w => w.length > 3));
      const descriptionWords = new Set(descriptionText.split(/\s+/).filter(w => w.length > 3));
      
      const overlap = [...headlineWords].filter(word => descriptionWords.has(word));
      const overlapRatio = overlap.length / Math.max(headlineWords.size, 1);
      
      if (overlapRatio > 0.8) {
        crossErrors.push('excessive_content_overlap_between_headlines_and_descriptions');
      }
    }

    // Quality score calculation
    const qualityScore = calculateRSAQualityScore(vh, vd);
    
    const result = {
      ok: vh.ok && vd.ok && crossErrors.length === 0,
      errors: [...vh.errors, ...vd.errors, ...crossErrors],
      clipped: { h: vh.deduped, d: vd.deduped },
      stats: {
        headlines: vh.deduped.length,
        descriptions: vd.deduped.length,
        totalErrors: vh.errors.length + vd.errors.length + crossErrors.length,
        qualityScore
      },
      warnings: []
    };

    // Add quality warnings
    if (qualityScore < 0.7) {
      result.warnings.push('low_content_quality_score');
    }
    
    if (vh.deduped.length < 8) {
      result.warnings.push('few_headlines_may_limit_performance');
    }

    return result;
  } catch (error) {
    console.error('RSA validation error:', error);
    return {
      ok: false,
      errors: ['validation_system_error'],
      clipped: { h: [], d: [] },
      stats: { headlines: 0, descriptions: 0, totalErrors: 1, qualityScore: 0 }
    };
  }
}

/**
 * Calculate quality score for RSA content
 */
function calculateRSAQualityScore(headlinesResult, descriptionsResult) {
  let score = 1.0;
  
  // Penalize for errors
  const totalErrors = headlinesResult.errors.length + descriptionsResult.errors.length;
  score -= totalErrors * 0.1;
  
  // Reward for good quantity
  if (headlinesResult.deduped.length >= 10) score += 0.1;
  if (descriptionsResult.deduped.length >= 3) score += 0.1;
  
  // Check for variety in length
  const headlineLengths = headlinesResult.deduped.map(h => h.length);
  const lengthVariety = Math.max(...headlineLengths) - Math.min(...headlineLengths);
  if (lengthVariety > 10) score += 0.05;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Validate tenant ID format and security
 */
export function validateTenantId(tenantId) {
  const errors = [];
  
  if (!tenantId) {
    errors.push('tenant_id_required');
    return { ok: false, errors };
  }
  
  if (typeof tenantId !== 'string') {
    errors.push('tenant_id_must_be_string');
    return { ok: false, errors };
  }
  
  // Length validation
  if (tenantId.length < 3) {
    errors.push('tenant_id_too_short');
  }
  
  if (tenantId.length > 100) {
    errors.push('tenant_id_too_long');
  }
  
  // Character validation - only alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    errors.push('tenant_id_invalid_characters');
  }
  
  // Security checks
  if (tenantId.includes('..') || tenantId.includes('//')) {
    errors.push('tenant_id_path_traversal_attempt');
  }
  
  if (['admin', 'root', 'system', 'api', 'test'].includes(tenantId.toLowerCase())) {
    errors.push('tenant_id_reserved_keyword');
  }
  
  return { ok: errors.length === 0, errors, cleaned: tenantId.toLowerCase() };
}

/**
 * Validate campaign data structure
 */
export function validateCampaignData(campaignData) {
  const errors = [];
  
  if (!campaignData || typeof campaignData !== 'object') {
    return { ok: false, errors: ['campaign_data_required'] };
  }
  
  // Required fields
  const requiredFields = ['name', 'budget', 'targetCPA'];
  for (const field of requiredFields) {
    if (!campaignData[field]) {
      errors.push(`campaign_${field}_required`);
    }
  }
  
  // Name validation
  if (campaignData.name) {
    if (typeof campaignData.name !== 'string') {
      errors.push('campaign_name_must_be_string');
    } else {
      if (campaignData.name.length < 3) {
        errors.push('campaign_name_too_short');
      }
      if (campaignData.name.length > 100) {
        errors.push('campaign_name_too_long');
      }
      if (campaignData.name.includes('<') || campaignData.name.includes('>')) {
        errors.push('campaign_name_contains_html');
      }
    }
  }
  
  // Budget validation
  if (campaignData.budget !== undefined) {
    const budget = Number(campaignData.budget);
    if (isNaN(budget)) {
      errors.push('campaign_budget_must_be_number');
    } else {
      if (budget < 0) {
        errors.push('campaign_budget_negative');
      }
      if (budget > 1000000) {
        errors.push('campaign_budget_too_high');
      }
    }
  }
  
  // Target CPA validation
  if (campaignData.targetCPA !== undefined) {
    const cpa = Number(campaignData.targetCPA);
    if (isNaN(cpa)) {
      errors.push('campaign_target_cpa_must_be_number');
    } else {
      if (cpa < 0) {
        errors.push('campaign_target_cpa_negative');
      }
      if (cpa > 10000) {
        errors.push('campaign_target_cpa_too_high');
      }
    }
  }
  
  return { 
    ok: errors.length === 0, 
    errors,
    cleaned: {
      name: campaignData.name?.trim(),
      budget: Number(campaignData.budget) || 0,
      targetCPA: Number(campaignData.targetCPA) || 0,
      finalUrl: campaignData.finalUrl?.trim() || '',
      keywords: Array.isArray(campaignData.keywords) ? campaignData.keywords.slice(0, 100) : []
    }
  };
}

/**
 * Validate email address format
 */
export function validateEmail(email) {
  const errors = [];
  
  if (!email) {
    errors.push('email_required');
    return { ok: false, errors };
  }
  
  if (typeof email !== 'string') {
    errors.push('email_must_be_string');
    return { ok: false, errors };
  }
  
  // Length validation
  if (email.length > 254) {
    errors.push('email_too_long');
  }
  
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('email_invalid_format');
  }
  
  // Security checks
  if (email.includes('<script') || email.includes('javascript:')) {
    errors.push('email_suspicious_content');
  }
  
  return { 
    ok: errors.length === 0, 
    errors, 
    cleaned: email.toLowerCase().trim() 
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(limit, offset, maxLimit = 100) {
  const errors = [];
  
  let cleanLimit = 20; // default
  let cleanOffset = 0; // default
  
  // Limit validation
  if (limit !== undefined) {
    const numLimit = Number(limit);
    if (isNaN(numLimit)) {
      errors.push('limit_must_be_number');
    } else {
      if (numLimit < 1) {
        errors.push('limit_too_small');
      } else if (numLimit > maxLimit) {
        errors.push(`limit_too_large_max_${maxLimit}`);
      } else {
        cleanLimit = numLimit;
      }
    }
  }
  
  // Offset validation
  if (offset !== undefined) {
    const numOffset = Number(offset);
    if (isNaN(numOffset)) {
      errors.push('offset_must_be_number');
    } else {
      if (numOffset < 0) {
        errors.push('offset_negative');
      } else {
        cleanOffset = numOffset;
      }
    }
  }
  
  return { 
    ok: errors.length === 0, 
    errors,
    cleaned: { limit: cleanLimit, offset: cleanOffset }
  };
}
