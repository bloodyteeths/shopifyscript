<?php
/**
 * Enhanced Uninstall script for Proofkit Pixels & Ads Helper
 *
 * This file is executed when the plugin is uninstalled via WordPress admin.
 * It removes all plugin options and data from the database while preserving
 * audit trails required for GDPR compliance.
 *
 * @package ProofkitPixelsAdsHelper
 * @since 1.0.0
 */

// If uninstall not called from WordPress, then exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Enhanced privacy-compliant uninstall cleanup.
 * Removes tracking pixels and theme blocks while preserving Sheets audit trails.
 */
function pk_proofkit_enhanced_uninstall_cleanup() {
	// Step 1: Remove theme customizations and tracking pixels
	pk_remove_theme_pixels();
	
	// Step 2: Clean plugin database options
	pk_remove_plugin_options();
	
	// Step 3: Trigger backend cleanup (preserves audit trails)
	pk_trigger_backend_cleanup();
	
	// Step 4: Log uninstall event for compliance
	pk_log_uninstall_event();
	
	// Step 5: Clean up transients and cached data
	pk_clean_transients();
}

/**
 * Remove theme customizations and tracking pixels.
 * Cleans up any injected code while preserving theme integrity.
 */
function pk_remove_theme_pixels() {
	// Remove any custom CSS/JS that may have been added
	delete_option( 'pk_custom_css' );
	delete_option( 'pk_custom_js' );
	delete_option( 'pk_theme_modifications' );
	
	// Clean up any consent management integrations
	delete_option( 'pk_consent_mode_settings' );
	delete_option( 'pk_privacy_settings' );
	
	// Remove any cookie banner customizations
	delete_option( 'pk_cookie_banner_config' );
}

/**
 * Remove plugin options from the database.
 * Handles both single site and multisite installations.
 */
function pk_remove_plugin_options() {
	// Array of option names to delete.
	$options = array(
		'pk_ga4_id',
		'pk_aw_id',
		'pk_aw_label',
		'pk_backend_url',
		'pk_tenant',
		'pk_secret',
		'pk_plugin_version',
		'pk_installation_date',
		'pk_last_sync',
		'pk_consent_settings',
		'pk_privacy_mode',
		'pk_debug_mode',
	);

	// Check if this is a multisite installation.
	if ( is_multisite() ) {
		// Get all sites in the network.
		$sites = get_sites( array( 'number' => 0 ) );

		foreach ( $sites as $site ) {
			switch_to_blog( $site->blog_id );

			// Delete options for this site.
			foreach ( $options as $option ) {
				delete_option( $option );
			}

			restore_current_blog();
		}

		// Also delete network-wide options if any were set.
		foreach ( $options as $option ) {
			delete_site_option( $option );
		}
	} else {
		// Single site installation - delete options normally.
		foreach ( $options as $option ) {
			delete_option( $option );
		}
	}
}

/**
 * Trigger backend cleanup while preserving audit trails.
 * Notifies backend systems to remove user data but keep compliance logs.
 */
function pk_trigger_backend_cleanup() {
	$backend_url = get_option( 'pk_backend_url' );
	$tenant = get_option( 'pk_tenant' );
	$secret = get_option( 'pk_secret' );
	
	if ( $backend_url && $tenant && $secret ) {
		// Generate HMAC signature for secure cleanup request
		$nonce = time() * 1000;
		$payload = "POST:{$tenant}:uninstall:{$nonce}";
		$signature = pk_generate_hmac_signature( $payload, $secret );
		
		$cleanup_data = array(
			'nonce' => $nonce,
			'action' => 'plugin_uninstall',
			'preserve_audit' => true, // Keep Sheets audit trails
			'remove_pixels' => true,  // Remove theme blocks/pixels
			'gdpr_compliant' => true, // Follow GDPR deletion procedures
			'timestamp' => current_time( 'c' ),
			'wordpress_site' => get_site_url(),
		);
		
		// Send cleanup request to backend
		$response = wp_remote_post(
			$backend_url . '/privacy/uninstall?' . http_build_query(
				array(
					'tenant' => $tenant,
					'sig' => $signature,
				)
			),
			array(
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body' => wp_json_encode( $cleanup_data ),
				'timeout' => 30,
				'blocking' => false, // Non-blocking to prevent uninstall delays
			)
		);
		
		// Log the cleanup attempt (best effort)
		if ( ! is_wp_error( $response ) ) {
			error_log( 'ProofKit: Backend cleanup notification sent successfully' );
		} else {
			error_log( 'ProofKit: Backend cleanup notification failed: ' . $response->get_error_message() );
		}
	}
}

/**
 * Log uninstall event for compliance tracking.
 */
function pk_log_uninstall_event() {
	$tenant = get_option( 'pk_tenant' );
	
	// Create uninstall log entry
	$uninstall_log = array(
		'timestamp' => current_time( 'c' ),
		'action' => 'wordpress_plugin_uninstalled',
		'tenant_id' => $tenant ?: 'unknown',
		'site_url' => get_site_url(),
		'wordpress_version' => get_bloginfo( 'version' ),
		'plugin_version' => get_option( 'pk_plugin_version', '1.0.0' ),
		'uninstall_method' => 'wp_admin',
		'user_agent' => isset( $_SERVER['HTTP_USER_AGENT'] ) ? 
			sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : 'unknown',
		'privacy_compliant' => true,
	);
	
	// Store in WordPress option temporarily (will be cleaned up)
	update_option( 'pk_uninstall_log', $uninstall_log, false );
	
	// Try to send to error log for server-level tracking
	error_log( 'ProofKit Uninstall: ' . wp_json_encode( $uninstall_log ) );
}

/**
 * Clean up transients and cached data.
 */
function pk_clean_transients() {
	// Remove any transients created by the plugin
	$transients = array(
		'pk_ga4_config_cache',
		'pk_ads_config_cache',
		'pk_backend_health_check',
		'pk_consent_status_cache',
		'pk_last_sync_status',
		'pk_api_rate_limit',
	);
	
	foreach ( $transients as $transient ) {
		delete_transient( $transient );
		delete_site_transient( $transient );
	}
	
	// Clean up any scheduled events
	wp_clear_scheduled_hook( 'pk_daily_sync' );
	wp_clear_scheduled_hook( 'pk_consent_check' );
	wp_clear_scheduled_hook( 'pk_health_check' );
}

/**
 * Generate HMAC signature for secure backend communication.
 *
 * @param string $payload The payload to sign.
 * @param string $secret  The secret key.
 * @return string The HMAC signature.
 */
function pk_generate_hmac_signature( $payload, $secret ) {
	return rtrim(
		strtr(
			base64_encode(
				hash_hmac( 'sha256', $payload, $secret, true )
			),
			'+/',
			'-_'
		),
		'='
	);
}

/**
 * Legacy cleanup function for backward compatibility.
 * Handles both single site and multisite installations.
 */
function pk_proofkit_uninstall_cleanup() {
	// Call the enhanced cleanup function
	pk_proofkit_enhanced_uninstall_cleanup();
}

// Execute enhanced cleanup with error handling
try {
	pk_proofkit_enhanced_uninstall_cleanup();
} catch ( Exception $e ) {
	// Log error but don't prevent uninstall
	error_log( 'ProofKit Uninstall Error: ' . $e->getMessage() );
	
	// Fallback to basic cleanup
	pk_remove_plugin_options();
}