<?php
/**
 * Uninstall script for Proofkit Pixels & Ads Helper
 *
 * This file is executed when the plugin is uninstalled via WordPress admin.
 * It removes all plugin options and data from the database.
 *
 * @package ProofkitPixelsAdsHelper
 * @since 1.0.0
 */

// If uninstall not called from WordPress, then exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Remove plugin options from the database.
 * Handles both single site and multisite installations.
 */
function pk_proofkit_uninstall_cleanup() {
	// Array of option names to delete.
	$options = array(
		'pk_ga4_id',
		'pk_aw_id',
		'pk_aw_label',
		'pk_backend_url',
		'pk_tenant',
		'pk_secret',
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

// Execute cleanup.
pk_proofkit_uninstall_cleanup();
