/**
 * Business Detection Service
 * Dynamically determines business type and generates relevant content
 */

import { WebFetch } from '../utils/web-fetch.js';

/**
 * Business types and their associated content templates
 */
const BUSINESS_TEMPLATES = {
  ecommerce: {
    name: "E-commerce",
    headlines: [
      "Shop Premium Products",
      "Free Shipping Available", 
      "Best Deals Online",
      "Quality Products Fast",
      "Secure Online Shopping",
      "Great Customer Reviews"
    ],
    descriptions: [
      "Discover amazing products with fast, free shipping.",
      "Shop with confidence. Easy returns and great support.", 
      "Quality products at competitive prices with secure checkout.",
      "Join thousands of satisfied customers today."
    ],
    keywords: ['"online shopping"', '"buy online"', '"free shipping"']
  },
  
  saas: {
    name: "SaaS/Software",
    headlines: [
      "Powerful Software Solution",
      "Free Trial Available",
      "Automate Your Workflow", 
      "Boost Productivity Today",
      "Secure Cloud Platform",
      "Start Free Today"
    ],
    descriptions: [
      "Streamline operations with our powerful software platform.",
      "Try free for 14 days. No credit card required.",
      "Join thousands of businesses saving time and money.",
      "Enterprise-grade security with 24/7 support."
    ],
    keywords: ['"software solution"', '"free trial"', '"productivity"']
  },
  
  professional_services: {
    name: "Professional Services", 
    headlines: [
      "Expert Professional Services",
      "Trusted Industry Leaders",
      "Free Consultation Available",
      "Proven Track Record",
      "Licensed Professionals",
      "Get Quote Today"
    ],
    descriptions: [
      "Professional expertise you can trust for your business needs.",
      "Free consultation to discuss your specific requirements.", 
      "Years of experience serving satisfied clients.",
      "Licensed, insured, and ready to help you succeed."
    ],
    keywords: ['"professional services"', '"consultation"', '"expert"']
  },
  
  health_fitness: {
    name: "Health & Fitness",
    headlines: [
      "Transform Your Health",
      "Expert Fitness Coaching",
      "Proven Results Guaranteed", 
      "Start Your Journey Today",
      "Personalized Programs",
      "Free Assessment"
    ],
    descriptions: [
      "Achieve your health goals with personalized coaching.",
      "Proven methods that deliver real, lasting results.",
      "Start with a free fitness assessment and consultation.",
      "Join our community of success stories."
    ],
    keywords: ['"fitness coaching"', '"health transformation"', '"workout"']
  },
  
  education: {
    name: "Education & Training",
    headlines: [
      "Learn New Skills Today",
      "Expert-Led Training",
      "Career Advancement",
      "Flexible Learning Options",
      "Certification Programs", 
      "Enroll Now"
    ],
    descriptions: [
      "Advance your career with industry-recognized training.",
      "Learn from experts with flexible, online courses.",
      "Get certified and stand out in your field.",
      "Start learning today with our proven programs."
    ],
    keywords: ['"online training"', '"certification"', '"learn"']
  },
  
  food_beverage: {
    name: "Food & Beverage",
    headlines: [
      "Fresh Quality Ingredients",
      "Delicious Meals Delivered",
      "Family Recipe Favorites",
      "Order Online Today",
      "Satisfaction Guaranteed",
      "Fast Local Delivery"
    ],
    descriptions: [
      "Made fresh daily with the finest quality ingredients.",
      "Order online for fast delivery or convenient pickup.",
      "Family recipes perfected over generations.",
      "100% satisfaction guarantee on every order."
    ],
    keywords: ['"food delivery"', '"restaurant"', '"fresh ingredients"']
  },
  
  automotive: {
    name: "Automotive",
    headlines: [
      "Quality Auto Services",
      "Certified Technicians",
      "Warranty Protected Work",
      "Same Day Service",
      "Competitive Pricing",
      "Schedule Today"
    ],
    descriptions: [
      "Professional auto service by certified technicians.",
      "All work backed by our comprehensive warranty.",
      "Fast, reliable service at competitive prices.",
      "Schedule your appointment online today."
    ],
    keywords: ['"auto repair"', '"car service"', '"automotive"']
  },
  
  beauty: {
    name: "Beauty & Wellness",
    headlines: [
      "Premium Beauty Products",
      "Professional Treatments",
      "Look Your Best Today",
      "Expert Stylists",
      "Luxury Experience",
      "Book Appointment"
    ],
    descriptions: [
      "Premium products and professional treatments for you.",
      "Expert stylists dedicated to making you look amazing.",
      "Luxury experience with personalized service.",
      "Book your appointment for a transformation."
    ],
    keywords: ['"beauty salon"', '"professional treatment"', '"styling"']
  },
  
  finance: {
    name: "Financial Services",
    headlines: [
      "Expert Financial Advice",
      "Secure Your Future",
      "Trusted Advisors",
      "Free Consultation",
      "Personalized Solutions",
      "Plan Today"
    ],
    descriptions: [
      "Expert financial planning tailored to your goals.",
      "Secure your financial future with trusted advisors.",
      "Free consultation to review your current situation.",
      "Personalized strategies for long-term success."
    ],
    keywords: ['"financial planning"', '"investment"', '"retirement"']
  },
  
  // Fallback/default for unknown businesses
  general: {
    name: "Professional Business",
    headlines: [
      "Quality Service Guaranteed",
      "Trusted by Customers",
      "Professional Results",
      "Get Started Today",
      "Expert Solutions",
      "Contact Us Now"
    ],
    descriptions: [
      "Professional service with guaranteed satisfaction.",
      "Trusted by customers for quality and reliability.",
      "Expert solutions tailored to your specific needs.",
      "Contact us today to discuss your requirements."
    ],
    keywords: ['"professional service"', '"quality"', '"trusted"']
  }
};

/**
 * Detect business type from domain/URL
 */
export async function detectBusinessType(shopDomain, finalUrl) {
  try {
    // First, try domain-based detection
    const domainType = detectFromDomain(shopDomain);
    if (domainType !== 'general') {
      return domainType;
    }
    
    // If domain detection isn't specific, try content analysis
    if (finalUrl) {
      const contentType = await detectFromContent(finalUrl);
      if (contentType !== 'general') {
        return contentType;
      }
    }
    
    // Fallback to shopify-specific detection
    if (shopDomain && shopDomain.includes('myshopify.com')) {
      return 'ecommerce'; // Most Shopify stores are e-commerce
    }
    
    return 'general';
    
  } catch (error) {
    console.error('Business detection error:', error);
    return 'general';
  }
}

/**
 * Detect business type from domain keywords
 */
function detectFromDomain(domain) {
  if (!domain) return 'general';
  
  const domainLower = domain.toLowerCase();
  
  // E-commerce indicators
  if (domainLower.includes('shop') || domainLower.includes('store') || 
      domainLower.includes('boutique') || domainLower.includes('market')) {
    return 'ecommerce';
  }
  
  // SaaS indicators  
  if (domainLower.includes('app') || domainLower.includes('software') ||
      domainLower.includes('tool') || domainLower.includes('platform')) {
    return 'saas';
  }
  
  // Health/Fitness indicators
  if (domainLower.includes('fitness') || domainLower.includes('health') ||
      domainLower.includes('gym') || domainLower.includes('wellness')) {
    return 'health_fitness';
  }
  
  // Food/Beverage indicators
  if (domainLower.includes('food') || domainLower.includes('restaurant') ||
      domainLower.includes('cafe') || domainLower.includes('kitchen')) {
    return 'food_beverage';
  }
  
  // Beauty indicators
  if (domainLower.includes('beauty') || domainLower.includes('salon') ||
      domainLower.includes('spa') || domainLower.includes('style')) {
    return 'beauty';
  }
  
  // Auto indicators
  if (domainLower.includes('auto') || domainLower.includes('car') ||
      domainLower.includes('motor') || domainLower.includes('vehicle')) {
    return 'automotive';
  }
  
  return 'general';
}

/**
 * Detect business type from website content
 */
async function detectFromContent(url) {
  try {
    if (!url || !url.startsWith('http')) {
      return 'general';
    }
    
    // Use WebFetch to analyze content (if available)
    // This would analyze page content for business type indicators
    // For now, return general to avoid external dependencies
    
    return 'general';
    
  } catch (error) {
    console.error('Content detection error:', error);
    return 'general';
  }
}

/**
 * Get content template for business type
 */
export function getBusinessTemplate(businessType) {
  return BUSINESS_TEMPLATES[businessType] || BUSINESS_TEMPLATES.general;
}

/**
 * Generate dynamic RSA content for business
 */
export function generateBusinessContent(shopDomain, finalUrl, businessType = null) {
  // Detect business type if not provided
  if (!businessType) {
    // For sync operation, use domain-only detection
    businessType = detectFromDomain(shopDomain);
  }
  
  const template = getBusinessTemplate(businessType);
  
  // Customize content based on shop name if available
  const shopName = shopDomain ? shopDomain.replace('.myshopify.com', '').replace(/[^a-zA-Z0-9]/g, ' ') : '';
  
  let customizedTemplate = { ...template };
  
  if (shopName) {
    // Add shop name to some headlines
    customizedTemplate.headlines = template.headlines.map((headline, index) => {
      if (index === 0) {
        return headline.replace('Quality', shopName).replace('Premium', shopName);
      }
      return headline;
    });
  }
  
  return customizedTemplate;
}

/**
 * Replace generic "Digital Certificates" content in config
 */
export function replaceGenericContent(config, shopDomain, finalUrl) {
  try {
    const businessContent = generateBusinessContent(shopDomain, finalUrl);
    
    // Replace default RSA content if it's still generic
    if (config.RSA_DEFAULT) {
      const hasGenericContent = config.RSA_DEFAULT.H && 
        config.RSA_DEFAULT.H.some(h => h.includes('Digital Certificates'));
      
      if (hasGenericContent) {
        console.log(`🎯 Replacing generic content with ${businessContent.name} template for ${shopDomain}`);
        
        config.RSA_DEFAULT = {
          H: businessContent.headlines.slice(0, 15), // Google Ads limit
          D: businessContent.descriptions.slice(0, 4)  // Google Ads limit
        };
      }
    }
    
    // Add suggested keywords if not present
    if (!config.SUGGESTED_KEYWORDS && businessContent.keywords) {
      config.SUGGESTED_KEYWORDS = businessContent.keywords;
    }
    
    // Add business type for future reference
    config._business_type = businessContent.name;
    config._content_personalized = true;
    config._personalization_date = new Date().toISOString();
    
    return config;
    
  } catch (error) {
    console.error('Error replacing generic content:', error);
    return config; // Return unchanged on error
  }
}

export default {
  detectBusinessType,
  getBusinessTemplate,
  generateBusinessContent,
  replaceGenericContent
};