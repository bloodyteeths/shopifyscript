=== Proofkit Pixels & Ads Helper ===
Contributors: proofkit
Tags: google-analytics, google-ads, woocommerce, tracking, pixels, ga4, enhanced-conversions
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Easily integrate Google Analytics 4 and Google Ads tracking with your WooCommerce store. Enhanced conversions and backend forwarding included.

== Description ==

Proofkit Pixels & Ads Helper is a lightweight, efficient plugin that seamlessly integrates Google Analytics 4 (GA4) and Google Ads tracking with your WooCommerce store. This plugin is designed to help you track conversions accurately and optimize your advertising campaigns.

**Key Features:**

* **Google Analytics 4 Integration**: Automatically install GA4 tracking code on your website
* **Google Ads Conversion Tracking**: Track conversions from your Google Ads campaigns
* **WooCommerce Enhanced Conversions**: Automatically track purchase events with proper value and currency
* **Backend API Integration**: Optional backend forwarding for advanced analytics
* **Security First**: Implements WordPress security best practices with nonce validation and proper sanitization
* **Translation Ready**: Full internationalization support for multiple languages
* **Lightweight**: Minimal impact on your website's performance

**Perfect for:**

* E-commerce stores using WooCommerce
* Businesses running Google Ads campaigns
* Store owners who need accurate conversion tracking
* Agencies managing multiple client websites

**Professional Support:**

This plugin is developed and maintained by Proofkit, a trusted name in e-commerce analytics and tracking solutions.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/proofkit-pixels-ads-helper` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Use the Settings -> Proofkit screen to configure the plugin.
4. Enter your Google Analytics 4 Measurement ID (G-XXXX).
5. Enter your Google Ads Conversion ID (AW-XXXX) and Label.
6. Optionally configure backend integration settings.
7. Save your settings and start tracking!

== Frequently Asked Questions ==

= Do I need WooCommerce for this plugin to work? =

While the plugin will install Google Analytics 4 and Google Ads tracking on any WordPress site, the enhanced conversion tracking features require WooCommerce to be active.

= Where do I find my Google Analytics 4 Measurement ID? =

You can find your GA4 Measurement ID in your Google Analytics account under Admin > Data Streams > Your Website Stream. It will look like "G-XXXXXXXXXX".

= Where do I find my Google Ads Conversion ID and Label? =

In your Google Ads account, go to Tools & Settings > Conversions. Create or edit a conversion action and you'll find the Conversion ID (AW-XXXXXXXXX) and Label in the tag setup.

= Is this plugin GDPR compliant? =

This plugin implements tracking codes as provided by Google. You are responsible for ensuring your website's privacy policy and cookie consent mechanisms comply with applicable privacy laws including GDPR.

= What is the backend integration feature? =

The backend integration allows you to forward purchase events to a custom API endpoint for advanced analytics and data processing. This is optional and not required for basic functionality.

= Does this plugin slow down my website? =

No, the plugin is designed to be lightweight and follows WordPress best practices for performance. The tracking codes are loaded asynchronously to minimize impact on page load times.

== Screenshots ==

1. Simple and intuitive settings page
2. Google Analytics integration settings
3. Google Ads conversion tracking setup
4. Backend API configuration (optional)

== Changelog ==

= 1.0.0 =
* Initial release
* Google Analytics 4 integration
* Google Ads conversion tracking
* WooCommerce enhanced conversions
* Backend API forwarding
* Full internationalization support
* WordPress Coding Standards compliance
* Security hardening with nonce validation
* Multisite support in uninstaller

== Upgrade Notice ==

= 1.0.0 =
Initial release of Proofkit Pixels & Ads Helper. Install now to start tracking your conversions accurately!

== Privacy Policy ==

This plugin integrates with Google Analytics and Google Ads services. When using this plugin:

* Google Analytics may collect user data according to their privacy policy
* Google Ads may collect conversion data according to their privacy policy
* The plugin may send purchase data to a configured backend API (optional)
* No personal data is stored locally by this plugin

Please ensure your website's privacy policy accurately reflects the use of these tracking services.

== Support ==

For support, feature requests, or bug reports, please visit our website at https://proofkit.com/ or contact our support team.

== Technical Requirements ==

* WordPress 5.0 or higher
* PHP 7.4 or higher
* WooCommerce 3.0 or higher (for enhanced conversion tracking)
* Active Google Analytics 4 property
* Google Ads account (for conversion tracking)