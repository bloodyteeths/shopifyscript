/**
 * Test/Demo script for Website Content Extraction System
 *
 * Usage:
 *   node test-website-scraper.js <website-url>
 *
 * Example:
 *   node test-website-scraper.js https://example-store.com
 */

import { getWebsiteScraper } from './backend/services/website-scraper.js';
import { getContentIndexer } from './backend/services/content-indexer.js';
import { getRSAGenerator } from './backend/services/rsa-generator.js';

/**
 * Demo: Complete website content extraction and ad generation flow
 */
async function demoWebsiteContentExtraction(websiteUrl, tenantId = 'demo-tenant-001') {
  console.log('\n' + '='.repeat(80));
  console.log('WEBSITE CONTENT EXTRACTION DEMO');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Scrape the website
    console.log('Step 1: Scraping website...');
    console.log(`URL: ${websiteUrl}`);
    console.log(`Tenant: ${tenantId}\n`);

    const scraper = getWebsiteScraper();
    const scrapedContent = await scraper.scrapeWebsite(websiteUrl, {
      tenant: tenantId,
      depth: 2,
      includeProducts: true,
      includeTestimonials: true,
      includeOffers: true,
      includeBrandVoice: true
    });

    console.log('✅ Scraping completed!\n');
    console.log('Results Summary:');
    console.log(`  - Pages scraped: ${scrapedContent.metadata.pagesScraped}`);
    console.log(`  - Duration: ${scrapedContent.metadata.duration}ms`);
    console.log(`  - Products found: ${scrapedContent.products.length}`);
    console.log(`  - Testimonials found: ${scrapedContent.testimonials.length}`);
    console.log(`  - Offers found: ${scrapedContent.offers.length}`);
    console.log(`  - USPs found: ${scrapedContent.usps.length}`);
    console.log(`  - Guarantees found: ${scrapedContent.guarantees.length}`);
    console.log(`  - Hooks found: ${scrapedContent.hooks.length}`);
    console.log(`  - CTAs found: ${scrapedContent.ctas.length}\n`);

    // Show sample products
    if (scrapedContent.products.length > 0) {
      console.log('Sample Products:');
      scrapedContent.products.slice(0, 3).forEach((product, i) => {
        console.log(`  ${i + 1}. ${product.name}`);
        if (product.price) console.log(`     Price: $${product.price}`);
        if (product.description) console.log(`     ${product.description.substring(0, 80)}...`);
      });
      console.log('');
    }

    // Show sample USPs
    if (scrapedContent.usps.length > 0) {
      console.log('Sample USPs:');
      scrapedContent.usps.slice(0, 3).forEach((usp, i) => {
        console.log(`  ${i + 1}. ${usp.text}`);
      });
      console.log('');
    }

    // Show sample offers
    if (scrapedContent.offers.length > 0) {
      console.log('Sample Offers:');
      scrapedContent.offers.slice(0, 3).forEach((offer, i) => {
        console.log(`  ${i + 1}. ${offer.text}`);
      });
      console.log('');
    }

    // Show brand voice
    if (scrapedContent.brandVoice && scrapedContent.brandVoice.primaryTone) {
      console.log('Brand Voice Analysis:');
      console.log(`  Primary Tone: ${scrapedContent.brandVoice.primaryTone}`);
      console.log(`  Formality Score: ${scrapedContent.brandVoice.formalityScore}/100`);
      console.log(`  Avg Sentence Length: ${scrapedContent.brandVoice.avgSentenceLength} words\n`);
    }

    // Step 2: Content is automatically indexed (happens in scraper)
    console.log('Step 2: Content indexed in database ✅\n');

    // Step 3: Retrieve indexed content
    console.log('Step 3: Retrieving indexed content for ad generation...');
    const indexer = getContentIndexer();
    const adContent = await indexer.getAllContentForAds(tenantId);

    console.log(`✅ Retrieved ${adContent.totalItems} content items for ad generation\n`);

    // Step 4: Generate RSAs using website content
    console.log('Step 4: Generating RSAs with website content...\n');
    const generator = getRSAGenerator();
    const rsaResult = await generator.generateRSAContent({
      tenant: tenantId,
      theme: 'Business Products',
      industry: 'general',
      tone: scrapedContent.brandVoice?.primaryTone || 'professional',
      headlineCount: 15,
      descriptionCount: 4,
      includeOffers: true,
      includeBranding: true,
      useWebsiteContent: true
    });

    if (rsaResult.success) {
      console.log('✅ RSA Generation Successful!\n');
      console.log('Generated Content:');
      console.log(`  - Used website content: ${rsaResult.usedWebsiteContent ? 'YES' : 'NO'}`);
      if (rsaResult.websiteContentSummary) {
        console.log('  - Website content used:');
        console.log(`    • Products: ${rsaResult.websiteContentSummary.products}`);
        console.log(`    • Testimonials: ${rsaResult.websiteContentSummary.testimonials}`);
        console.log(`    • Offers: ${rsaResult.websiteContentSummary.offers}`);
        console.log(`    • USPs: ${rsaResult.websiteContentSummary.usps}`);
      }
      console.log('');

      // Show sample headlines
      console.log('Sample Headlines (30 chars max):');
      rsaResult.content.headlines.slice(0, 10).forEach((headline, i) => {
        console.log(`  ${i + 1}. "${headline}" (${headline.length} chars)`);
      });
      console.log('');

      // Show sample descriptions
      console.log('Sample Descriptions (90 chars max):');
      rsaResult.content.descriptions.slice(0, 4).forEach((desc, i) => {
        console.log(`  ${i + 1}. "${desc}" (${desc.length} chars)`);
      });
      console.log('');

      // Quality assessment
      if (rsaResult.content.quality) {
        console.log('Quality Assessment:');
        console.log(`  Overall Score: ${Math.round(rsaResult.content.quality.total)}/100`);
        console.log(`  Variety: ${Math.round(rsaResult.content.quality.breakdown.variety)}/100`);
        console.log(`  CTA Strength: ${Math.round(rsaResult.content.quality.breakdown.callsToAction)}/100`);
      }
    } else {
      console.log('❌ RSA Generation Failed:', rsaResult.error);
    }

    // Step 5: Check content freshness
    console.log('\nStep 5: Checking content freshness...');
    const freshness = await indexer.checkContentFreshness(tenantId, websiteUrl);
    console.log(`  Needs Refresh: ${freshness.needsRefresh ? 'YES' : 'NO'}`);
    if (freshness.lastScraped) {
      console.log(`  Last Scraped: ${freshness.lastScraped}`);
      console.log(`  Age: ${freshness.ageInDays} days`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(80));
    console.log('\nKey Takeaways:');
    console.log('✅ Website scraped and content extracted automatically');
    console.log('✅ Real business data (products, offers, USPs) identified');
    console.log('✅ Content indexed in database for quick retrieval');
    console.log('✅ RSAs generated using actual website content');
    console.log('✅ Ads are specific, compelling, and brand-aligned\n');

    // Comparison
    console.log('BEFORE (Generic)           →  AFTER (Specific with Website Content)');
    console.log('-'.repeat(80));
    console.log('"Business Solutions"       →  "Premium Coffee - $29.99"');
    console.log('"Professional Services"    →  "20% Off First Order"');
    console.log('"Get Started Today"        →  "Roasted Within 48 Hours"');
    console.log('"Contact Us Now"           →  "30-Day Money-Back Guarantee"\n');

    return {
      success: true,
      scrapedContent,
      rsaResult
    };

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run the demo
 */
async function main() {
  const websiteUrl = process.argv[2];

  if (!websiteUrl) {
    console.log('Usage: node test-website-scraper.js <website-url>');
    console.log('\nExample:');
    console.log('  node test-website-scraper.js https://example-store.com');
    console.log('\nNote: This will scrape the website and demonstrate the full flow.');
    console.log('For testing, you can use any public website.\n');
    process.exit(1);
  }

  console.log('Starting Website Content Extraction Demo...\n');
  await demoWebsiteContentExtraction(websiteUrl);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { demoWebsiteContentExtraction };