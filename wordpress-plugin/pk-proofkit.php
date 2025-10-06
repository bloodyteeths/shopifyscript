<?php
/**
 * Plugin Name: Ads Autopilot AI Pixels & Ads Helper
 * Plugin URI: https://wordpress.org/plugins/adsautopilot-pixels-ads-helper/
 * Description: GA4 + Google Ads pixels, Woo events, Enhanced Conversions (hashed), backend forward. Easily integrate Google Analytics 4 and Google Ads tracking with your WooCommerce store.
 * Version: 1.0.0
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * Author: Ads Autopilot AI
 * Author URI: https://adsautopilot.com/
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: pk-adsautopilot
 * Domain Path: /languages
 * Network: false
 * WC requires at least: 3.0
 * WC tested up to: 8.0
 *
 * @package Ads Autopilot AIPixelsAdsHelper
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// Define plugin constants.
define( 'PK_ADS_AUTOPILOT_AI_VERSION', '1.0.0' );
define( 'PK_ADS_AUTOPILOT_AI_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'PK_ADS_AUTOPILOT_AI_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'PK_ADS_AUTOPILOT_AI_TEXT_DOMAIN', 'pk-adsautopilot' );

/**
 * Load plugin textdomain for internationalization.
 */
function pk_adsautopilot_load_textdomain() {
	load_plugin_textdomain(
		'pk-adsautopilot',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages/'
	);
}
add_action( 'plugins_loaded', 'pk_adsautopilot_load_textdomain' );

// Load the main plugin class.
require_once plugin_dir_path( __FILE__ ) . 'class-pk-adsautopilot.php';

// Initialize the plugin.
new PK_Ads Autopilot AI();
