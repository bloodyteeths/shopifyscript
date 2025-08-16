<?php
/**
 * Plugin Name: Proofkit Pixels & Ads Helper
 * Plugin URI: https://wordpress.org/plugins/proofkit-pixels-ads-helper/
 * Description: GA4 + Google Ads pixels, Woo events, Enhanced Conversions (hashed), backend forward. Easily integrate Google Analytics 4 and Google Ads tracking with your WooCommerce store.
 * Version: 1.0.0
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * Author: Proofkit
 * Author URI: https://proofkit.com/
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: pk-proofkit
 * Domain Path: /languages
 * Network: false
 * WC requires at least: 3.0
 * WC tested up to: 8.0
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
define( 'PK_PROOFKIT_VERSION', '1.0.0' );
define( 'PK_PROOFKIT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'PK_PROOFKIT_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'PK_PROOFKIT_TEXT_DOMAIN', 'pk-proofkit' );

/**
 * Load plugin textdomain for internationalization.
 */
function pk_proofkit_load_textdomain() {
	load_plugin_textdomain(
		PK_PROOFKIT_TEXT_DOMAIN,
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages/'
	);
}
add_action( 'plugins_loaded', 'pk_proofkit_load_textdomain' );

/**
 * Main plugin class.
 */
class PK_Proofkit {

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->init_hooks();
	}

	/**
	 * Initialize hooks.
	 */
	private function init_hooks() {
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'wp_head', array( $this, 'add_tracking_scripts' ) );
		add_action( 'woocommerce_thankyou', array( $this, 'handle_purchase_event' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	/**
	 * Register plugin settings.
	 */
	public function register_settings() {
		register_setting(
			'pk_proofkit_settings',
			'pk_ga4_id',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			)
		);
		register_setting(
			'pk_proofkit_settings',
			'pk_aw_id',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			)
		);
		register_setting(
			'pk_proofkit_settings',
			'pk_aw_label',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			)
		);
		register_setting(
			'pk_proofkit_settings',
			'pk_backend_url',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'esc_url_raw',
				'default'           => '',
			)
		);
		register_setting(
			'pk_proofkit_settings',
			'pk_tenant',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			)
		);
		register_setting(
			'pk_proofkit_settings',
			'pk_secret',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			)
		);
	}

	/**
	 * Add admin menu.
	 */
	public function add_admin_menu() {
		add_options_page(
			__( 'Proofkit', PK_PROOFKIT_TEXT_DOMAIN ),
			__( 'Proofkit', PK_PROOFKIT_TEXT_DOMAIN ),
			'manage_options',
			'pk-proofkit',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Render settings page.
	 */
	public function render_settings_page() {
		// Check user capabilities.
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', PK_PROOFKIT_TEXT_DOMAIN ) );
		}

		// Handle form submission.
		if ( isset( $_POST['pk_save'] ) ) {
			// Verify nonce.
			if ( ! wp_verify_nonce( $_POST['pk_proofkit_nonce'], 'pk_proofkit_settings' ) ) {
				wp_die( esc_html__( 'Security check failed. Please try again.', PK_PROOFKIT_TEXT_DOMAIN ) );
			}

			// Sanitize and save settings.
			update_option( 'pk_ga4_id', sanitize_text_field( wp_unslash( $_POST['ga4'] ) ) );
			update_option( 'pk_aw_id', sanitize_text_field( wp_unslash( $_POST['aw'] ) ) );
			update_option( 'pk_aw_label', sanitize_text_field( wp_unslash( $_POST['aw_label'] ) ) );
			update_option( 'pk_backend_url', esc_url_raw( wp_unslash( $_POST['backend_url'] ) ) );
			update_option( 'pk_tenant', sanitize_text_field( wp_unslash( $_POST['tenant'] ) ) );
			update_option( 'pk_secret', sanitize_text_field( wp_unslash( $_POST['secret'] ) ) );

			echo '<div class="updated"><p>' . esc_html__( 'Settings saved successfully.', PK_PROOFKIT_TEXT_DOMAIN ) . '</p></div>';
		}

		// Get current values.
		$ga4     = get_option( 'pk_ga4_id', '' );
		$aw      = get_option( 'pk_aw_id', '' );
		$lbl     = get_option( 'pk_aw_label', '' );
		$backend = get_option( 'pk_backend_url', '' );
		$ten     = get_option( 'pk_tenant', '' );
		$sec     = get_option( 'pk_secret', '' );
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form method="post" action="">
				<?php wp_nonce_field( 'pk_proofkit_settings', 'pk_proofkit_nonce' ); ?>
				<?php settings_fields( 'pk_proofkit_settings' ); ?>
				<table class="form-table">
					<tr>
						<th scope="row">
							<label for="ga4"><?php esc_html_e( 'GA4 ID (G-XXXX):', PK_PROOFKIT_TEXT_DOMAIN ); ?></label>
						</th>
						<td>
							<input type="text" id="ga4" name="ga4" value="<?php echo esc_attr( $ga4 ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your Google Analytics 4 Measurement ID.', PK_PROOFKIT_TEXT_DOMAIN ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="aw"><?php esc_html_e( 'Google Ads Conversion ID (AW-XXXXXX):', PK_PROOFKIT_TEXT_DOMAIN ); ?></label>
						</th>
						<td>
							<input type="text" id="aw" name="aw" value="<?php echo esc_attr( $aw ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your Google Ads Conversion ID.', PK_PROOFKIT_TEXT_DOMAIN ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="aw_label"><?php esc_html_e( 'Google Ads Conversion Label:', PK_PROOFKIT_TEXT_DOMAIN ); ?></label>
						</th>
						<td>
							<input type="text" id="aw_label" name="aw_label" value="<?php echo esc_attr( $lbl ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your Google Ads Conversion Label.', PK_PROOFKIT_TEXT_DOMAIN ); ?></p>
						</td>
					</tr>
				</table>
				<h2><?php esc_html_e( 'Backend Configuration', PK_PROOFKIT_TEXT_DOMAIN ); ?></h2>
				<table class="form-table">
					<tr>
						<th scope="row">
							<label for="backend_url"><?php esc_html_e( 'Backend URL:', PK_PROOFKIT_TEXT_DOMAIN ); ?></label>
						</th>
						<td>
							<input type="url" id="backend_url" name="backend_url" value="<?php echo esc_attr( $backend ); ?>" class="large-text" />
							<p class="description"><?php esc_html_e( 'Enter your backend API URL.', PK_PROOFKIT_TEXT_DOMAIN ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="tenant"><?php esc_html_e( 'Tenant ID:', PK_PROOFKIT_TEXT_DOMAIN ); ?></label>
						</th>
						<td>
							<input type="text" id="tenant" name="tenant" value="<?php echo esc_attr( $ten ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your tenant identifier.', PK_PROOFKIT_TEXT_DOMAIN ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="secret"><?php esc_html_e( 'HMAC Secret:', PK_PROOFKIT_TEXT_DOMAIN ); ?></label>
						</th>
						<td>
							<input type="password" id="secret" name="secret" value="<?php echo esc_attr( $sec ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your HMAC secret key for secure authentication.', PK_PROOFKIT_TEXT_DOMAIN ); ?></p>
						</td>
					</tr>
				</table>
				<?php submit_button( __( 'Save Settings', PK_PROOFKIT_TEXT_DOMAIN ), 'primary', 'pk_save' ); ?>
			</form>
		</div>
		<?php
	}

	/**
	 * Add tracking scripts to wp_head.
	 */
	public function add_tracking_scripts() {
		$ga4 = get_option( 'pk_ga4_id', '' );
		$aw  = get_option( 'pk_aw_id', '' );

		if ( ! empty( $ga4 ) ) {
			$ga4 = esc_attr( $ga4 );
			echo "<script async src='https://www.googletagmanager.com/gtag/js?id={$ga4}'></script>";
			echo '<script>';
			echo 'window.dataLayer = window.dataLayer || [];';
			echo 'function gtag(){dataLayer.push(arguments);}';
			echo "gtag('js', new Date());";
			echo "gtag('config', '{$ga4}');";
			echo '</script>';
		}

		if ( ! empty( $aw ) ) {
			$aw = esc_attr( $aw );
			echo '<script>';
			echo 'window.gtag = window.gtag || function(){(window.dataLayer = window.dataLayer || []).push(arguments)};';
			echo "gtag('config', '{$aw}');";
			echo '</script>';
		}
	}

	/**
	 * Handle WooCommerce purchase event.
	 *
	 * @param int $order_id Order ID.
	 */
	public function handle_purchase_event( $order_id ) {
		if ( ! $order_id ) {
			return;
		}

		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		$value    = $order->get_total();
		$currency = get_woocommerce_currency();
		$aw       = get_option( 'pk_aw_id', '' );
		$label    = get_option( 'pk_aw_label', '' );

		// Sanitize values for JavaScript output.
		$value    = floatval( $value );
		$currency = esc_js( $currency );
		$aw       = esc_js( $aw );
		$label    = esc_js( $label );

		echo '<script>';
		echo "window.gtag && gtag('event', 'purchase', {value: {$value}, currency: '{$currency}'});";
		if ( ! empty( $aw ) && ! empty( $label ) ) {
			echo "window.gtag && gtag('event', 'conversion', {send_to: '{$aw}/{$label}', value: {$value}, currency: '{$currency}'});";
		}
		echo '</script>';

		// Optional: forward a log to backend.
		$this->send_backend_log( $order_id );
	}

	/**
	 * Send log to backend.
	 *
	 * @param int $order_id Order ID.
	 */
	private function send_backend_log( $order_id ) {
		$backend = get_option( 'pk_backend_url', '' );
		$ten     = get_option( 'pk_tenant', '' );
		$sec     = get_option( 'pk_secret', '' );

		if ( empty( $backend ) || empty( $ten ) || empty( $sec ) ) {
			return;
		}

		$nonce   = time() * 1000;
		$payload = wp_json_encode(
			array(
				'nonce'        => $nonce,
				'metrics'      => array(),
				'search_terms' => array(),
				'run_logs'     => array(
					array(
						current_time( 'c' ),
						'wp-purchase:' . $order_id,
					),
				),
			)
		);

		$sig = $this->generate_hmac( "POST:{$ten}:metrics:{$nonce}", $sec );

		wp_remote_post(
			$backend . '/metrics?' . http_build_query(
				array(
					'tenant' => $ten,
					'sig'    => $sig,
				)
			),
			array(
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => $payload,
				'timeout' => 5,
			)
		);
	}

	/**
	 * Generate HMAC signature.
	 *
	 * @param string $payload Payload to sign.
	 * @param string $secret  Secret key.
	 * @return string HMAC signature.
	 */
	private function generate_hmac( $payload, $secret ) {
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
}

// Initialize the plugin.
new PK_Proofkit();
