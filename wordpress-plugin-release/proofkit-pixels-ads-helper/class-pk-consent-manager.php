<?php
/**
 * ProofKit Consent Management System
 *
 * Handles GDPR-compliant consent filtering and privacy controls
 * for Google Analytics 4 and Google Ads tracking.
 *
 * @package ProofkitPixelsAdsHelper
 * @since 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Consent Management Class
 */
class PK_Consent_Manager {

	/**
	 * Consent types supported by the system.
	 *
	 * @var array
	 */
	private $consent_types = array(
		'analytics_storage'    => 'denied',
		'ad_storage'          => 'denied',
		'ad_user_data'        => 'denied',
		'ad_personalization'  => 'denied',
		'functionality_storage' => 'granted',
		'security_storage'    => 'granted',
	);

	/**
	 * Supported consent management platforms.
	 *
	 * @var array
	 */
	private $supported_cmps = array(
		'onetrust',
		'cookiebot',
		'trustarc',
		'didomi',
		'iubenda',
		'quantcast',
		'usercentrics',
	);

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->init_hooks();
	}

	/**
	 * Initialize WordPress hooks.
	 */
	private function init_hooks() {
		add_action( 'wp_head', array( $this, 'output_consent_script' ), 1 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_consent_scripts' ) );
		add_filter( 'pk_should_track', array( $this, 'filter_tracking_by_consent' ), 10, 2 );
		add_action( 'wp_ajax_pk_update_consent', array( $this, 'handle_consent_update' ) );
		add_action( 'wp_ajax_nopriv_pk_update_consent', array( $this, 'handle_consent_update' ) );
	}

	/**
	 * Output consent mode initialization script.
	 */
	public function output_consent_script() {
		if ( ! $this->should_load_consent_manager() ) {
			return;
		}

		$consent_config = $this->get_consent_configuration();
		$gtag_config = $this->build_gtag_consent_config( $consent_config );

		?>
		<script type="text/javascript">
		// ProofKit Consent Mode v2 Implementation
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}

		// Set default consent state (privacy-first approach)
		gtag('consent', 'default', <?php echo wp_json_encode( $gtag_config['default'] ); ?>);

		// Initialize ProofKit consent manager
		window.pkConsent = {
			initialized: false,
			currentConsent: <?php echo wp_json_encode( $gtag_config['default'] ); ?>,
			
			// Update consent status
			update: function(consentData) {
				const updatedConsent = Object.assign({}, this.currentConsent, consentData);
				gtag('consent', 'update', updatedConsent);
				this.currentConsent = updatedConsent;
				
				// Store consent in backend for compliance
				this.recordConsent(updatedConsent);
				
				console.log('ProofKit: Consent updated', updatedConsent);
			},
			
			// Record consent for compliance
			recordConsent: function(consentData) {
				const consentRecord = {
					timestamp: new Date().toISOString(),
					consent_data: consentData,
					user_agent: navigator.userAgent,
					page_url: window.location.href,
					source: 'pk_consent_manager'
				};
				
				// Send to WordPress AJAX endpoint
				if (typeof ajaxurl !== 'undefined') {
					fetch(ajaxurl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						body: new URLSearchParams({
							action: 'pk_update_consent',
							consent_data: JSON.stringify(consentRecord),
							nonce: '<?php echo wp_create_nonce( 'pk_consent_nonce' ); ?>'
						})
					}).catch(console.error);
				}
			},
			
			// Check if tracking is allowed
			canTrack: function(trackingType) {
				switch(trackingType) {
					case 'analytics':
						return this.currentConsent.analytics_storage === 'granted';
					case 'advertising':
						return this.currentConsent.ad_storage === 'granted';
					case 'personalization':
						return this.currentConsent.ad_personalization === 'granted';
					default:
						return false;
				}
			}
		};

		// Auto-detect consent management platforms
		<?php echo $this->generate_cmp_detection_script(); ?>

		// Mark as initialized
		window.pkConsent.initialized = true;
		console.log('ProofKit: Consent Mode v2 initialized');
		</script>
		<?php
	}

	/**
	 * Enqueue consent management scripts.
	 */
	public function enqueue_consent_scripts() {
		if ( ! $this->should_load_consent_manager() ) {
			return;
		}

		wp_enqueue_script(
			'pk-consent-manager',
			PK_PROOFKIT_PLUGIN_URL . 'assets/js/consent-manager.js',
			array( 'jquery' ),
			PK_PROOFKIT_VERSION,
			true
		);

		wp_localize_script(
			'pk-consent-manager',
			'pkConsentConfig',
			array(
				'ajax_url' => admin_url( 'admin-ajax.php' ),
				'nonce' => wp_create_nonce( 'pk_consent_nonce' ),
				'consent_types' => $this->consent_types,
				'debug_mode' => get_option( 'pk_debug_mode', false ),
			)
		);
	}

	/**
	 * Filter tracking based on consent status.
	 *
	 * @param bool   $should_track Current tracking decision.
	 * @param string $tracking_type Type of tracking (analytics, advertising).
	 * @return bool Whether tracking should proceed.
	 */
	public function filter_tracking_by_consent( $should_track, $tracking_type ) {
		if ( ! $should_track ) {
			return false;
		}

		$consent_status = $this->get_user_consent_status();

		switch ( $tracking_type ) {
			case 'analytics':
				return $consent_status['analytics_storage'] === 'granted';
			
			case 'advertising':
				return $consent_status['ad_storage'] === 'granted' && 
				       $consent_status['ad_user_data'] === 'granted';
			
			case 'personalization':
				return $consent_status['ad_personalization'] === 'granted';
			
			default:
				return $should_track;
		}
	}

	/**
	 * Handle AJAX consent update requests.
	 */
	public function handle_consent_update() {
		// Verify nonce for security
		if ( ! wp_verify_nonce( $_POST['nonce'], 'pk_consent_nonce' ) ) {
			wp_die( 'Security check failed' );
		}

		$consent_data = isset( $_POST['consent_data'] ) ? 
			json_decode( stripslashes( $_POST['consent_data'] ), true ) : array();

		if ( empty( $consent_data ) ) {
			wp_send_json_error( 'Invalid consent data' );
		}

		// Store consent record
		$this->store_consent_record( $consent_data );

		// Forward to backend if configured
		$this->forward_consent_to_backend( $consent_data );

		wp_send_json_success( array(
			'message' => 'Consent updated successfully',
			'timestamp' => current_time( 'c' ),
		) );
	}

	/**
	 * Get current user consent status.
	 *
	 * @return array Consent status for all types.
	 */
	private function get_user_consent_status() {
		// Check for stored consent in cookie/session
		$stored_consent = $this->get_stored_consent();

		if ( ! empty( $stored_consent ) ) {
			return array_merge( $this->consent_types, $stored_consent );
		}

		// Check for CMP consent
		$cmp_consent = $this->detect_cmp_consent();

		if ( ! empty( $cmp_consent ) ) {
			return array_merge( $this->consent_types, $cmp_consent );
		}

		// Default to privacy-first settings
		return $this->consent_types;
	}

	/**
	 * Get consent configuration for the site.
	 *
	 * @return array Consent configuration.
	 */
	private function get_consent_configuration() {
		$config = get_option( 'pk_consent_config', array() );

		$default_config = array(
			'enabled' => true,
			'privacy_first' => true,
			'auto_detect_cmp' => true,
			'consent_expiry_days' => 365,
			'require_explicit_consent' => true,
			'granular_controls' => true,
		);

		return array_merge( $default_config, $config );
	}

	/**
	 * Build Google Tag consent configuration.
	 *
	 * @param array $consent_config Site consent configuration.
	 * @return array Gtag consent configuration.
	 */
	private function build_gtag_consent_config( $consent_config ) {
		$region_map = array(
			// EEA countries require explicit consent
			'AT' => 'eea', 'BE' => 'eea', 'BG' => 'eea', 'HR' => 'eea',
			'CY' => 'eea', 'CZ' => 'eea', 'DK' => 'eea', 'EE' => 'eea',
			'FI' => 'eea', 'FR' => 'eea', 'DE' => 'eea', 'GR' => 'eea',
			'HU' => 'eea', 'IE' => 'eea', 'IT' => 'eea', 'LV' => 'eea',
			'LT' => 'eea', 'LU' => 'eea', 'MT' => 'eea', 'NL' => 'eea',
			'PL' => 'eea', 'PT' => 'eea', 'RO' => 'eea', 'SK' => 'eea',
			'SI' => 'eea', 'ES' => 'eea', 'SE' => 'eea', 'GB' => 'eea',
		);

		$user_country = $this->get_user_country();
		$is_eea = isset( $region_map[ $user_country ] );

		$default_consent = array(
			'analytics_storage' => $is_eea ? 'denied' : 'granted',
			'ad_storage' => 'denied', // Always denied by default
			'ad_user_data' => 'denied',
			'ad_personalization' => 'denied',
			'functionality_storage' => 'granted',
			'security_storage' => 'granted',
			'wait_for_update' => $is_eea ? 2000 : 500, // Wait longer in EEA
		);

		if ( $is_eea ) {
			$default_consent['region'] = array( $user_country );
		}

		return array(
			'default' => $default_consent,
			'is_eea' => $is_eea,
			'user_country' => $user_country,
		);
	}

	/**
	 * Generate CMP detection script.
	 *
	 * @return string JavaScript code for CMP detection.
	 */
	private function generate_cmp_detection_script() {
		return "
		// OneTrust detection
		if (typeof OneTrust !== 'undefined') {
			OneTrust.OnConsentChanged(function() {
				const groups = OneTrust.GetDomainData().Groups;
				const consent = {
					analytics_storage: groups.find(g => g.GroupName.includes('Analytics')).Status ? 'granted' : 'denied',
					ad_storage: groups.find(g => g.GroupName.includes('Advertising')).Status ? 'granted' : 'denied'
				};
				window.pkConsent.update(consent);
			});
		}

		// Cookiebot detection
		if (typeof Cookiebot !== 'undefined') {
			window.addEventListener('CookiebotOnConsentReady', function() {
				const consent = {
					analytics_storage: Cookiebot.consent.statistics ? 'granted' : 'denied',
					ad_storage: Cookiebot.consent.marketing ? 'granted' : 'denied'
				};
				window.pkConsent.update(consent);
			});
		}

		// Custom consent change event listener
		window.addEventListener('consent_changed', function(event) {
			if (event.detail && event.detail.source) {
				const consent = {};
				if (event.detail.analytics !== undefined) {
					consent.analytics_storage = event.detail.analytics ? 'granted' : 'denied';
				}
				if (event.detail.marketing !== undefined) {
					consent.ad_storage = event.detail.marketing ? 'granted' : 'denied';
					consent.ad_user_data = event.detail.marketing ? 'granted' : 'denied';
					consent.ad_personalization = event.detail.marketing ? 'granted' : 'denied';
				}
				window.pkConsent.update(consent);
			}
		});
		";
	}

	/**
	 * Store consent record for compliance.
	 *
	 * @param array $consent_data Consent data to store.
	 */
	private function store_consent_record( $consent_data ) {
		$consent_record = array(
			'timestamp' => current_time( 'mysql' ),
			'user_ip' => $this->get_user_ip_hash(),
			'user_agent' => $this->get_user_agent_hash(),
			'consent_data' => $consent_data,
			'page_url' => isset( $consent_data['page_url'] ) ? $consent_data['page_url'] : '',
			'source' => isset( $consent_data['source'] ) ? $consent_data['source'] : 'unknown',
		);

		// Store in WordPress option (could be extended to custom table)
		$stored_consents = get_option( 'pk_consent_records', array() );
		$stored_consents[] = $consent_record;

		// Keep only last 1000 records to prevent bloat
		if ( count( $stored_consents ) > 1000 ) {
			$stored_consents = array_slice( $stored_consents, -1000 );
		}

		update_option( 'pk_consent_records', $stored_consents );
	}

	/**
	 * Forward consent to backend for processing.
	 *
	 * @param array $consent_data Consent data to forward.
	 */
	private function forward_consent_to_backend( $consent_data ) {
		$backend_url = get_option( 'pk_backend_url' );
		$tenant = get_option( 'pk_tenant' );
		$secret = get_option( 'pk_secret' );

		if ( ! $backend_url || ! $tenant || ! $secret ) {
			return;
		}

		$payload_data = array(
			'nonce' => time() * 1000,
			'consent_record' => $consent_data,
			'site_info' => array(
				'url' => get_site_url(),
				'wordpress_version' => get_bloginfo( 'version' ),
				'plugin_version' => PK_PROOFKIT_VERSION,
			),
		);

		$nonce = $payload_data['nonce'];
		$payload = "POST:{$tenant}:consent:{$nonce}";
		$signature = $this->generate_hmac_signature( $payload, $secret );

		wp_remote_post(
			$backend_url . '/privacy/consent?' . http_build_query(
				array(
					'tenant' => $tenant,
					'sig' => $signature,
				)
			),
			array(
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body' => wp_json_encode( $payload_data ),
				'timeout' => 10,
				'blocking' => false, // Non-blocking
			)
		);
	}

	/**
	 * Check if consent manager should be loaded.
	 *
	 * @return bool Whether to load consent manager.
	 */
	private function should_load_consent_manager() {
		// Don't load in admin
		if ( is_admin() ) {
			return false;
		}

		// Don't load for bots
		if ( $this->is_bot_request() ) {
			return false;
		}

		// Check if consent management is enabled
		$consent_config = $this->get_consent_configuration();
		return ! empty( $consent_config['enabled'] );
	}

	/**
	 * Check if request is from a bot.
	 *
	 * @return bool Whether request is from a bot.
	 */
	private function is_bot_request() {
		$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? $_SERVER['HTTP_USER_AGENT'] : '';
		$bot_patterns = array(
			'googlebot', 'bingbot', 'slurp', 'crawler', 'spider',
			'facebookexternalhit', 'twitterbot', 'linkedinbot',
		);

		foreach ( $bot_patterns as $pattern ) {
			if ( stripos( $user_agent, $pattern ) !== false ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get user's country code.
	 *
	 * @return string Country code.
	 */
	private function get_user_country() {
		// This could be enhanced with GeoIP detection
		// For now, return default
		return 'US';
	}

	/**
	 * Get stored consent from cookies/session.
	 *
	 * @return array Stored consent data.
	 */
	private function get_stored_consent() {
		// Implementation depends on chosen storage method
		return array();
	}

	/**
	 * Detect consent from CMP platforms.
	 *
	 * @return array CMP consent data.
	 */
	private function detect_cmp_consent() {
		// This would need client-side implementation
		return array();
	}

	/**
	 * Get hashed user IP for privacy.
	 *
	 * @return string Hashed IP address.
	 */
	private function get_user_ip_hash() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
		return substr( hash( 'sha256', $ip ), 0, 12 );
	}

	/**
	 * Get hashed user agent for privacy.
	 *
	 * @return string Hashed user agent.
	 */
	private function get_user_agent_hash() {
		$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? $_SERVER['HTTP_USER_AGENT'] : 'unknown';
		return substr( hash( 'sha256', $user_agent ), 0, 12 );
	}

	/**
	 * Generate HMAC signature.
	 *
	 * @param string $payload Payload to sign.
	 * @param string $secret  Secret key.
	 * @return string HMAC signature.
	 */
	private function generate_hmac_signature( $payload, $secret ) {
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