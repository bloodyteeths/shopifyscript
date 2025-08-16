<?php
/**
 * Main plugin class file.
 *
 * @package ProofkitPixelsAdsHelper
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

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
			__( 'Proofkit', 'pk-proofkit' ),
			__( 'Proofkit', 'pk-proofkit' ),
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
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'pk-proofkit' ) );
		}

		// Handle form submission.
		if ( isset( $_POST['pk_save'] ) ) {
			// Verify nonce.
			if ( ! isset( $_POST['pk_proofkit_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['pk_proofkit_nonce'] ) ), 'pk_proofkit_settings' ) ) {
				wp_die( esc_html__( 'Security check failed. Please try again.', 'pk-proofkit' ) );
			}

			// Sanitize and save settings.
			if ( isset( $_POST['ga4'] ) ) {
				update_option( 'pk_ga4_id', sanitize_text_field( wp_unslash( $_POST['ga4'] ) ) );
			}
			if ( isset( $_POST['aw'] ) ) {
				update_option( 'pk_aw_id', sanitize_text_field( wp_unslash( $_POST['aw'] ) ) );
			}
			if ( isset( $_POST['aw_label'] ) ) {
				update_option( 'pk_aw_label', sanitize_text_field( wp_unslash( $_POST['aw_label'] ) ) );
			}
			if ( isset( $_POST['backend_url'] ) ) {
				update_option( 'pk_backend_url', esc_url_raw( wp_unslash( $_POST['backend_url'] ) ) );
			}
			if ( isset( $_POST['tenant'] ) ) {
				update_option( 'pk_tenant', sanitize_text_field( wp_unslash( $_POST['tenant'] ) ) );
			}
			if ( isset( $_POST['secret'] ) ) {
				update_option( 'pk_secret', sanitize_text_field( wp_unslash( $_POST['secret'] ) ) );
			}

			echo '<div class="updated"><p>' . esc_html__( 'Settings saved successfully.', 'pk-proofkit' ) . '</p></div>';
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
							<label for="ga4"><?php esc_html_e( 'GA4 ID (G-XXXX):', 'pk-proofkit' ); ?></label>
						</th>
						<td>
							<input type="text" id="ga4" name="ga4" value="<?php echo esc_attr( $ga4 ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your Google Analytics 4 Measurement ID.', 'pk-proofkit' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="aw"><?php esc_html_e( 'Google Ads Conversion ID (AW-XXXXXX):', 'pk-proofkit' ); ?></label>
						</th>
						<td>
							<input type="text" id="aw" name="aw" value="<?php echo esc_attr( $aw ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your Google Ads Conversion ID.', 'pk-proofkit' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="aw_label"><?php esc_html_e( 'Google Ads Conversion Label:', 'pk-proofkit' ); ?></label>
						</th>
						<td>
							<input type="text" id="aw_label" name="aw_label" value="<?php echo esc_attr( $lbl ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your Google Ads Conversion Label.', 'pk-proofkit' ); ?></p>
						</td>
					</tr>
				</table>
				<h2><?php esc_html_e( 'Backend Configuration', 'pk-proofkit' ); ?></h2>
				<table class="form-table">
					<tr>
						<th scope="row">
							<label for="backend_url"><?php esc_html_e( 'Backend URL:', 'pk-proofkit' ); ?></label>
						</th>
						<td>
							<input type="url" id="backend_url" name="backend_url" value="<?php echo esc_attr( $backend ); ?>" class="large-text" />
							<p class="description"><?php esc_html_e( 'Enter your backend API URL.', 'pk-proofkit' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="tenant"><?php esc_html_e( 'Tenant ID:', 'pk-proofkit' ); ?></label>
						</th>
						<td>
							<input type="text" id="tenant" name="tenant" value="<?php echo esc_attr( $ten ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your tenant identifier.', 'pk-proofkit' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="secret"><?php esc_html_e( 'HMAC Secret:', 'pk-proofkit' ); ?></label>
						</th>
						<td>
							<input type="password" id="secret" name="secret" value="<?php echo esc_attr( $sec ); ?>" class="regular-text" />
							<p class="description"><?php esc_html_e( 'Enter your HMAC secret key for secure authentication.', 'pk-proofkit' ); ?></p>
						</td>
					</tr>
				</table>
				<?php submit_button( __( 'Save Settings', 'pk-proofkit' ), 'primary', 'pk_save' ); ?>
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
			wp_enqueue_script(
				'pk-gtag',
				esc_url( 'https://www.googletagmanager.com/gtag/js?id=' . $ga4 ),
				array(),
				PK_PROOFKIT_VERSION,
				false
			);

			$gtag_config = sprintf(
				'window.dataLayer = window.dataLayer || [];
				function gtag(){dataLayer.push(arguments);}
				gtag("js", new Date());
				gtag("config", "%s");',
				esc_js( $ga4 )
			);

			wp_add_inline_script( 'pk-gtag', $gtag_config );
		}

		if ( ! empty( $aw ) ) {
			$aw_config = sprintf(
				'window.gtag = window.gtag || function(){(window.dataLayer = window.dataLayer || []).push(arguments)};
				gtag("config", "%s");',
				esc_js( $aw )
			);

			if ( wp_script_is( 'pk-gtag', 'enqueued' ) ) {
				wp_add_inline_script( 'pk-gtag', $aw_config );
			} else {
				wp_enqueue_script( 'pk-gtag-aw', '', array(), PK_PROOFKIT_VERSION, false );
				wp_add_inline_script( 'pk-gtag-aw', $aw_config );
			}
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

		$purchase_script = sprintf(
			'window.gtag && gtag("event", "purchase", {value: %s, currency: "%s"});',
			$value,
			$currency
		);

		if ( ! empty( $aw ) && ! empty( $label ) ) {
			$conversion_script = sprintf(
				'window.gtag && gtag("event", "conversion", {send_to: "%s/%s", value: %s, currency: "%s"});',
				$aw,
				$label,
				$value,
				$currency
			);
			$purchase_script  .= $conversion_script;
		}

		wp_enqueue_script( 'pk-purchase-tracking', '', array(), PK_PROOFKIT_VERSION, true );
		wp_add_inline_script( 'pk-purchase-tracking', $purchase_script );

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
				base64_encode( // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
					hash_hmac( 'sha256', $payload, $secret, true )
				),
				'+/',
				'-_'
			),
			'='
		);
	}
}