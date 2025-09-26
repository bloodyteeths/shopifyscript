// Campaign configuration templates based on user input

// Generate keywords based on user input
export function generateKeywords(config) {
  const { mainProducts, businessType, keywordStrategy, customKeywords, businessName } = config;

  if (keywordStrategy === 'custom' && customKeywords) {
    return customKeywords.split(',').map(k => k.trim());
  }

  const keywords = [];

  // Parse products
  const products = mainProducts.toLowerCase().split(',').map(p => p.trim());

  // Base keywords by strategy
  switch (keywordStrategy) {
    case 'brand':
      keywords.push(businessName.toLowerCase());
      keywords.push(`${businessName.toLowerCase()} store`);
      keywords.push(`${businessName.toLowerCase()} shop`);
      keywords.push(`${businessName.toLowerCase()} online`);
      break;

    case 'competitor':
      products.forEach(product => {
        keywords.push(`best ${product}`);
        keywords.push(`${product} reviews`);
        keywords.push(`${product} comparison`);
        keywords.push(`${product} alternatives`);
      });
      break;

    default: // 'auto'
      // Product-based keywords
      products.forEach(product => {
        keywords.push(product);
        keywords.push(`buy ${product}`);
        keywords.push(`${product} online`);
        keywords.push(`${product} sale`);
      });

      // Business type specific
      if (businessType === 'ecommerce') {
        keywords.push('free shipping');
        keywords.push('online shopping');
        keywords.push('best deals');
      } else if (businessType === 'local') {
        keywords.push('near me');
        keywords.push('local store');
        keywords.push('open now');
      }
  }

  return keywords;
}

// Generate headlines based on user preferences
export function generateHeadlines(config) {
  const { businessName, mainProducts, adTone, hasOffer, offerText, goal } = config;

  const headlines = [];
  const products = mainProducts.split(',')[0].trim(); // First product

  // Base headlines
  headlines.push(`${businessName} Official Site`);
  headlines.push(`Shop ${businessName} Today`);

  // Tone-specific headlines
  switch (adTone) {
    case 'professional':
      headlines.push('Trusted Quality Since 2020');
      headlines.push('Industry Leading Service');
      headlines.push('Professional Solutions');
      headlines.push('Certified Excellence');
      headlines.push('Expert Recommended');
      headlines.push('Premium Quality Guaranteed');
      break;

    case 'urgent':
      headlines.push('Limited Time Offer!');
      headlines.push('Sale Ends Soon');
      headlines.push('Don\'t Miss Out!');
      headlines.push('Hurry - While Supplies Last');
      headlines.push('Flash Sale Today Only');
      headlines.push('Act Now - Save Big');
      break;

    case 'luxury':
      headlines.push('Exclusive Collection');
      headlines.push('Premium Quality');
      headlines.push('Luxury Experience');
      headlines.push('Sophisticated Style');
      headlines.push('Elite Selection');
      headlines.push('Curated Excellence');
      break;

    default: // 'friendly'
      headlines.push('Free Shipping Available');
      headlines.push('Loved by Customers');
      headlines.push('Join Our Community');
      headlines.push('Your Trusted Partner');
      headlines.push('We\'re Here to Help');
      headlines.push('Making Shopping Easy');
  }

  // Goal-specific headlines
  if (goal === 'sales') {
    headlines.push('Save Up To 50% Today');
    headlines.push('Best Prices Online');
    headlines.push('Unbeatable Deals');
  } else if (goal === 'traffic') {
    headlines.push('Discover Our Collection');
    headlines.push('Browse New Arrivals');
    headlines.push('Explore Our Range');
  } else { // leads
    headlines.push('Get Free Quote');
    headlines.push('Request Information');
    headlines.push('Contact Us Today');
  }

  // Offer headline
  if (hasOffer && offerText) {
    headlines.push(offerText.substring(0, 30));
  }

  // Product-specific
  headlines.push(`Best ${products} Online`);
  headlines.push(`Quality ${products}`);
  headlines.push(`Shop ${products} Now`);

  // Ensure all headlines are max 30 chars
  return headlines.map(h => h.substring(0, 30)).slice(0, 15);
}

// Generate descriptions based on user preferences
export function generateDescriptions(config) {
  const { targetAudience, mainProducts, adTone, hasOffer, offerText, businessType } = config;

  const descriptions = [];

  // Tone-based descriptions
  switch (adTone) {
    case 'professional':
      descriptions.push(`Professional service for ${targetAudience}. Quality guaranteed.`);
      descriptions.push('Industry expertise you can trust. Contact our specialists today.');
      break;

    case 'urgent':
      descriptions.push(`Limited time offers for ${targetAudience}. Shop now before it\'s too late!`);
      descriptions.push('Sale ends soon! Don\'t miss these incredible deals. Order today!');
      break;

    case 'luxury':
      descriptions.push(`Exclusive ${mainProducts} for discerning ${targetAudience}.`);
      descriptions.push('Experience luxury shopping. Premium quality, exceptional service.');
      break;

    default: // 'friendly'
      descriptions.push(`Perfect ${mainProducts} for ${targetAudience}. Shop with confidence!`);
      descriptions.push('Join thousands of happy customers. Fast shipping & easy returns!');
  }

  // Business type specific
  if (businessType === 'ecommerce') {
    descriptions.push('Free shipping on all orders. Secure checkout. Shop online 24/7.');
  } else if (businessType === 'local') {
    descriptions.push('Visit our local store or shop online. Serving our community with pride.');
  }

  // Add offer description
  if (hasOffer && offerText) {
    descriptions.push(`Special offer: ${offerText}. Limited time only!`);
  }

  // Ensure all descriptions are max 90 chars
  return descriptions.map(d => d.substring(0, 90)).slice(0, 4);
}

// Generate ad groups based on user configuration
export function generateAdGroups(config) {
  const { keywordStrategy, mainProducts, businessName } = config;
  const keywords = generateKeywords(config);

  // Split keywords into themed groups
  const adGroups = [];

  if (keywordStrategy === 'brand') {
    adGroups.push({
      name: 'Brand - ' + businessName,
      keywords: keywords.filter(k => k.includes(businessName.toLowerCase()))
    });
    adGroups.push({
      name: 'Brand - Generic',
      keywords: keywords.filter(k => !k.includes(businessName.toLowerCase()))
    });
  } else {
    // Create groups based on intent
    adGroups.push({
      name: 'High Intent - Buy',
      keywords: keywords.filter(k => k.includes('buy') || k.includes('sale') || k.includes('shop'))
    });

    adGroups.push({
      name: 'Research - Browse',
      keywords: keywords.filter(k => k.includes('best') || k.includes('review') || !k.includes('buy'))
    });

    // Product-specific group
    const products = mainProducts.split(',')[0].trim();
    adGroups.push({
      name: 'Products - ' + products.substring(0, 20),
      keywords: keywords.filter(k => k.includes(products.toLowerCase()))
    });
  }

  // Ensure each group has at least some keywords
  return adGroups.filter(ag => ag.keywords.length > 0);
}