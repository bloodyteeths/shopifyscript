
// ProofKit Shopify Web Pixel Extension with Consent Mode v2 & GA4/Google Ads Integration
// Compliant with GDPR, CCPA, and other privacy regulations

function sign(payload, secret) {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret||'');
  const data = enc.encode(payload);
  return window.crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']).then(k=>
    window.crypto.subtle.sign('HMAC', k, data).then(sigBuf=>{
      const b = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=+$/,'');
      return encodeURIComponent(b);
    })
  );
}

// Consent Mode v2 Implementation
function initializeConsentMode() {
  // Initialize gtag with default consent state (denied)
  if (typeof gtag !== 'undefined') {
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'functionality_storage': 'granted',
      'security_storage': 'granted'
    });
    
    // Set up region-specific defaults for EEA/UK
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'region': ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI', 'NO']
    });
  }
}

// Enhanced consent checking with multiple consent providers
function getConsentStatus() {
  // Check Shopify's native consent (Customer Privacy API)
  const shopifyConsent = window?.shopify?.customerPrivacy;
  if (shopifyConsent) {
    try {
      const granted = shopifyConsent.userDataSharingConsentGiven();
      return {
        analytics: granted,
        marketing: granted,
        preferences: granted,
        source: 'shopify'
      };
    } catch (e) {
      console.warn('ProofKit: Error reading Shopify consent:', e);
    }
  }
  
  // Check Google Consent Mode v2
  if (typeof google_tag_data !== 'undefined' && google_tag_data.ics) {
    try {
      const analyticsConsent = google_tag_data.ics.get('analytics_storage') === 'granted';
      const adConsent = google_tag_data.ics.get('ad_storage') === 'granted';
      const adUserData = google_tag_data.ics.get('ad_user_data') === 'granted';
      const adPersonalization = google_tag_data.ics.get('ad_personalization') === 'granted';
      
      return {
        analytics: analyticsConsent,
        marketing: adConsent && adUserData,
        advertising: adConsent && adPersonalization,
        source: 'gtag'
      };
    } catch (e) {
      console.warn('ProofKit: Error reading Google consent:', e);
    }
  }
  
  // Check common CMP providers
  const cmpChecks = [
    // OneTrust
    () => window.OptanonActiveGroups && window.OptanonActiveGroups.includes('C0002'),
    // Cookiebot
    () => window.Cookiebot && window.Cookiebot.consent && window.Cookiebot.consent.marketing,
    // Cookie Consent v3
    () => window.cookieconsent_options && window.cookieconsent_options.marketing,
    // TrustArc
    () => window.truste && window.truste.eu && window.truste.eu.bindMap && window.truste.eu.bindMap.marketing,
    // Didomi
    () => window.Didomi && window.Didomi.getUserConsentStatusForPurpose && window.Didomi.getUserConsentStatusForPurpose('marketing'),
    // GDPR Cookie Consent
    () => window.wp_gdpr_cookie_consent_settings && window.wp_gdpr_cookie_consent_settings.categories_accepted && window.wp_gdpr_cookie_consent_settings.categories_accepted.includes('marketing')
  ];
  
  for (let check of cmpChecks) {
    try {
      const hasConsent = check();
      if (typeof hasConsent === 'boolean') {
        return {
          analytics: hasConsent,
          marketing: hasConsent,
          preferences: hasConsent,
          source: 'cmp'
        };
      }
    } catch (e) {
      // Continue to next check
    }
  }
  
  // Default: assume consent required regions need explicit consent
  const consentRequiredRegions = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'];
  const userRegion = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const assumeConsentNeeded = consentRequiredRegions.some(region => userRegion.includes(region));
  
  return {
    analytics: !assumeConsentNeeded,
    marketing: !assumeConsentNeeded,
    preferences: true,
    source: 'default'
  };
}

// GA4 and Google Ads conversion tracking
function fireGA4Event(eventName, parameters, consent) {
  if (!consent.marketing && !consent.analytics) {
    console.log('ProofKit: GA4 event blocked due to consent:', eventName);
    return;
  }
  
  // Fire to GA4
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, {
      ...parameters,
      send_to: window?.shopify?.proofkit_ga4_id || 'GA_MEASUREMENT_ID',
      debug_mode: window?.shopify?.proofkit_debug || false
    });
  }
  
  // Fire to Google Ads (conversion events only)
  if (eventName === 'purchase' && consent.marketing && window?.shopify?.proofkit_google_ads_id) {
    gtag('event', 'conversion', {
      'send_to': `${window.shopify.proofkit_google_ads_id}/${window?.shopify?.proofkit_conversion_label || 'CONVERSION_LABEL'}`,
      'value': parameters.value || 0,
      'currency': parameters.currency || 'USD',
      'transaction_id': parameters.transaction_id || parameters.order_id
    });
  }
}

// Enhanced pixel data collection with privacy safeguards
function createPrivacySafePayload(eventData, consent) {
  const basePayload = {
    timestamp: Date.now(),
    url: consent.analytics ? window.location.href : '[redacted]',
    referrer: consent.analytics ? document.referrer : '[redacted]',
    user_agent: consent.analytics ? navigator.userAgent : '[redacted]',
    consent_status: {
      analytics: consent.analytics,
      marketing: consent.marketing,
      source: consent.source
    }
  };
  
  // Only include detailed data if consent is granted
  if (consent.analytics || consent.marketing) {
    return { ...basePayload, ...eventData };
  }
  
  // Minimal data for consent-denied users
  return {
    ...basePayload,
    event_type: eventData.event_type || 'unknown',
    value: eventData.value ? '[redacted]' : undefined
  };
}

export function registerAnalytics(analytics) {
  // Initialize consent mode
  initializeConsentMode();
  
  const backend = (window?.shopify?.proofkit_backend || 'http://localhost:3001/api').replace(/\/$/, '');
  const tenant = window?.shopify?.proofkit_tenant || 'TENANT_123';
  const secret = window?.shopify?.proofkit_secret || '';
  
  async function postPixel(event, payload){
    try {
      const consent = getConsentStatus();
      const privacySafePayload = createPrivacySafePayload(payload, consent);
      
      const nonce = Date.now();
      const op = `POST:${tenant}:pixel_ingest:${nonce}`;
      const sig = await sign(op, secret);
      
      await fetch(`${backend}/pixels/ingest?tenant=${encodeURIComponent(tenant)}&sig=${sig}`,{
        method:'POST', 
        headers:{ 'content-type':'application/json' }, 
        body: JSON.stringify({ 
          nonce, 
          shop: window?.location?.host||'', 
          event, 
          payload: privacySafePayload,
          consent_metadata: {
            granted: consent.analytics || consent.marketing,
            source: consent.source,
            timestamp: Date.now()
          }
        })
      });
    } catch(e){
      console.warn('ProofKit: Pixel send failed:', e);
    }
  }

  // Enhanced consent checking function
  const canSend = () => {
    const consent = getConsentStatus();
    return consent.analytics || consent.marketing;
  };

  // Subscribe to Shopify Analytics events with enhanced consent checking and GA4 integration
  analytics.subscribe('page_viewed', (e) => {
    const consent = getConsentStatus();
    if (!canSend()) return;
    
    const pageData = { 
      event_type: 'page_viewed',
      url: e?.context?.document?.location?.href || '',
      title: e?.context?.document?.title || ''
    };
    
    postPixel('page_viewed', pageData);
    
    // Fire to GA4
    fireGA4Event('page_view', {
      page_title: e?.context?.document?.title || '',
      page_location: e?.context?.document?.location?.href || ''
    }, consent);
  });

  analytics.subscribe('product_viewed', (e) => {
    const consent = getConsentStatus();
    if (!canSend()) return;
    
    const product = e?.data?.productVariant?.product || e?.data?.product;
    const productData = {
      event_type: 'product_viewed',
      handle: product?.handle || '',
      product_id: product?.id || '',
      variant_id: e?.data?.productVariant?.id || '',
      price: e?.data?.productVariant?.price?.amount || product?.price?.amount || 0,
      currency: e?.data?.productVariant?.price?.currencyCode || product?.price?.currencyCode || 'USD'
    };
    
    postPixel('product_viewed', productData);
    
    // Fire to GA4
    fireGA4Event('view_item', {
      currency: productData.currency,
      value: parseFloat(productData.price) || 0,
      items: [{
        item_id: productData.product_id,
        item_name: product?.title || '',
        item_category: product?.type || '',
        item_variant: productData.variant_id,
        price: parseFloat(productData.price) || 0,
        quantity: 1
      }]
    }, consent);
  });

  analytics.subscribe('search_submitted', (e) => {
    const consent = getConsentStatus();
    if (!canSend()) return;
    
    const query = e?.data?.searchResult?.query || e?.data?.search?.searchTerm || '';
    const searchData = {
      event_type: 'search_submitted',
      query: String(query || '').slice(0, 80)
    };
    
    postPixel('search_submitted', searchData);
    
    // Fire to GA4
    fireGA4Event('search', {
      search_term: searchData.query
    }, consent);
  });

  analytics.subscribe('cart_viewed', (e) => {
    const consent = getConsentStatus();
    if (!canSend()) return;
    
    const cart = e?.data?.cart;
    const cartData = {
      event_type: 'cart_viewed',
      value: Number(cart?.cost?.subtotalAmount?.amount || 0),
      currency: cart?.cost?.subtotalAmount?.currencyCode || 'USD',
      item_count: cart?.lineItems?.length || 0
    };
    
    postPixel('cart_viewed', cartData);
    
    // Fire to GA4
    fireGA4Event('view_cart', {
      currency: cartData.currency,
      value: cartData.value,
      items: (cart?.lineItems || []).map(item => ({
        item_id: item?.merchandise?.product?.id || '',
        item_name: item?.merchandise?.product?.title || '',
        item_category: item?.merchandise?.product?.type || '',
        item_variant: item?.merchandise?.id || '',
        price: parseFloat(item?.merchandise?.price?.amount || 0),
        quantity: item?.quantity || 1
      }))
    }, consent);
  });

  analytics.subscribe('checkout_started', (e) => {
    const consent = getConsentStatus();
    if (!canSend()) return;
    
    const checkout = e?.data?.checkout;
    const checkoutData = {
      event_type: 'checkout_started',
      value: Number(checkout?.subtotalPrice?.amount || 0),
      currency: checkout?.subtotalPrice?.currencyCode || 'USD',
      item_count: checkout?.lineItems?.length || 0
    };
    
    postPixel('checkout_started', checkoutData);
    
    // Fire to GA4
    fireGA4Event('begin_checkout', {
      currency: checkoutData.currency,
      value: checkoutData.value,
      items: (checkout?.lineItems || []).map(item => ({
        item_id: item?.variant?.product?.id || '',
        item_name: item?.variant?.product?.title || '',
        item_category: item?.variant?.product?.type || '',
        item_variant: item?.variant?.id || '',
        price: parseFloat(item?.variant?.price?.amount || 0),
        quantity: item?.quantity || 1
      }))
    }, consent);
  });

  // Enhanced checkout_completed event with GA4 and Google Ads conversion tracking
  analytics.subscribe('checkout_completed', (e) => {
    const consent = getConsentStatus();
    if (!canSend()) return;
    
    const checkout = e?.data?.checkout;
    const order = e?.data?.order || checkout;
    
    const purchaseData = {
      event_type: 'purchase_completed',
      transaction_id: order?.id || checkout?.token || '',
      value: Number(checkout?.subtotalPrice?.amount || checkout?.totalPrice?.amount || 0),
      currency: checkout?.subtotalPrice?.currencyCode || checkout?.totalPrice?.currencyCode || 'USD',
      tax: Number(checkout?.totalTax?.amount || 0),
      shipping: Number(checkout?.shippingCost?.amount || 0),
      items: Number(checkout?.lineItems?.length || 0),
      order_id: order?.orderNumber || order?.name || ''
    };
    
    postPixel('purchase_completed', purchaseData);
    
    // Fire GA4 purchase event
    fireGA4Event('purchase', {
      transaction_id: purchaseData.transaction_id,
      value: purchaseData.value,
      currency: purchaseData.currency,
      tax: purchaseData.tax,
      shipping: purchaseData.shipping,
      items: (checkout?.lineItems || []).map(item => ({
        item_id: item?.variant?.product?.id || '',
        item_name: item?.variant?.product?.title || '',
        item_category: item?.variant?.product?.type || '',
        item_variant: item?.variant?.id || '',
        price: parseFloat(item?.variant?.price?.amount || 0),
        quantity: item?.quantity || 1
      }))
    }, consent);
    
    // Log successful conversion
    console.log('ProofKit: Purchase conversion tracked', {
      transaction_id: purchaseData.transaction_id,
      value: purchaseData.value,
      currency: purchaseData.currency,
      consent_status: consent
    });
  });

  // Listen for consent changes and update gtag accordingly
  if (window.addEventListener) {
    window.addEventListener('consent_changed', (event) => {
      const newConsent = event.detail || getConsentStatus();
      
      if (typeof gtag !== 'undefined') {
        gtag('consent', 'update', {
          'ad_storage': newConsent.marketing ? 'granted' : 'denied',
          'analytics_storage': newConsent.analytics ? 'granted' : 'denied',
          'ad_user_data': newConsent.marketing ? 'granted' : 'denied',
          'ad_personalization': newConsent.marketing ? 'granted' : 'denied'
        });
      }
      
      console.log('ProofKit: Consent updated', newConsent);
    });
  }
  
  console.log('ProofKit Web Pixel initialized with Consent Mode v2');
}
