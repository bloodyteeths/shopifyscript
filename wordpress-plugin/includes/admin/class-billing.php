<?php
/**
 * ProofKit WordPress Billing Management
 * Handles Stripe billing integration for WordPress users
 */

if (!defined('ABSPATH')) {
    exit;
}

class ProofKit_Billing {
    
    private $api_base;
    private $stripe_public_key;
    
    public function __construct() {
        $this->api_base = defined('PROOFKIT_API_BASE') ? PROOFKIT_API_BASE : 'https://api.proofkit.com';
        $this->stripe_public_key = defined('PROOFKIT_STRIPE_PUBLIC_KEY') ? PROOFKIT_STRIPE_PUBLIC_KEY : get_option('proofkit_stripe_public_key');
        
        add_action('admin_menu', array($this, 'add_billing_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_billing_scripts'));
        add_action('wp_ajax_proofkit_create_checkout', array($this, 'create_checkout_session'));
        add_action('wp_ajax_proofkit_get_subscription', array($this, 'get_subscription_status'));
        add_action('wp_ajax_proofkit_cancel_subscription', array($this, 'cancel_subscription'));
        add_action('wp_ajax_proofkit_create_portal', array($this, 'create_portal_session'));
    }
    
    /**
     * Add billing menu to WordPress admin
     */
    public function add_billing_menu() {
        add_submenu_page(
            'proofkit',
            __('Billing & Subscription', 'proofkit'),
            __('Billing', 'proofkit'),
            'manage_options',
            'proofkit-billing',
            array($this, 'billing_page')
        );
    }
    
    /**
     * Enqueue scripts for billing page
     */
    public function enqueue_billing_scripts($hook) {
        if ($hook !== 'proofkit_page_proofkit-billing') {
            return;
        }
        
        // Enqueue Stripe.js
        wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', array(), '3.0', true);
        
        // Enqueue our billing script
        wp_enqueue_script(
            'proofkit-billing',
            plugin_dir_url(__FILE__) . '../../assets/js/billing.js',
            array('jquery', 'stripe-js'),
            PROOFKIT_VERSION,
            true
        );
        
        // Localize script with data
        wp_localize_script('proofkit-billing', 'proofkitBilling', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('proofkit_billing'),
            'stripePublicKey' => $this->stripe_public_key,
            'apiBase' => $this->api_base,
            'strings' => array(
                'loading' => __('Loading...', 'proofkit'),
                'error' => __('An error occurred. Please try again.', 'proofkit'),
                'confirmCancel' => __('Are you sure you want to cancel your subscription?', 'proofkit'),
                'success' => __('Success!', 'proofkit')
            )
        ));
        
        // Enqueue styles
        wp_enqueue_style(
            'proofkit-billing',
            plugin_dir_url(__FILE__) . '../../assets/css/billing.css',
            array(),
            PROOFKIT_VERSION
        );
    }
    
    /**
     * Render billing page
     */
    public function billing_page() {
        $current_user = wp_get_current_user();
        $customer_id = get_user_meta($current_user->ID, 'proofkit_stripe_customer_id', true);
        ?>
        <div class="wrap">
            <h1><?php _e('ProofKit Billing & Subscription', 'proofkit'); ?></h1>
            
            <div id="proofkit-billing-container">
                <div id="billing-loading" class="notice notice-info">
                    <p><?php _e('Loading billing information...', 'proofkit'); ?></p>
                </div>
                
                <div id="billing-error" class="notice notice-error" style="display: none;">
                    <p id="billing-error-message"></p>
                </div>
                
                <div id="billing-success" class="notice notice-success" style="display: none;">
                    <p id="billing-success-message"></p>
                </div>
                
                <!-- Current Subscription -->
                <div id="current-subscription" class="card" style="display: none;">
                    <h2><?php _e('Current Subscription', 'proofkit'); ?></h2>
                    <div id="subscription-details"></div>
                    <div class="subscription-actions">
                        <button id="manage-billing" class="button button-secondary">
                            <?php _e('Manage Billing', 'proofkit'); ?>
                        </button>
                        <button id="cancel-subscription" class="button button-link-delete">
                            <?php _e('Cancel Subscription', 'proofkit'); ?>
                        </button>
                    </div>
                </div>
                
                <!-- Pricing Plans -->
                <div id="pricing-plans" class="pricing-grid">
                    <h2><?php _e('Choose Your Plan', 'proofkit'); ?></h2>
                    <div class="plans-container">
                        <!-- Plans will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Hidden form for checkout -->
        <form id="checkout-form" style="display: none;">
            <input type="hidden" id="selected-tier" name="tier" value="">
            <?php wp_nonce_field('proofkit_billing', 'proofkit_billing_nonce'); ?>
        </form>
        
        <script type="text/template" id="subscription-template">
            <div class="subscription-info">
                <div class="subscription-tier">
                    <h3>{{tierName}}</h3>
                    <p class="tier-price">${{amount}}/month</p>
                    <span class="status-badge status-{{status}}">{{status}}</span>
                </div>
                <div class="subscription-details">
                    <p><strong><?php _e('Next billing:', 'proofkit'); ?></strong> {{nextBilling}}</p>
                    <p><strong><?php _e('Customer ID:', 'proofkit'); ?></strong> {{customerId}}</p>
                    {{#cancelAtPeriodEnd}}
                    <p class="notice-inline notice-warning">
                        <?php _e('Your subscription will be canceled at the end of the current billing period.', 'proofkit'); ?>
                    </p>
                    {{/cancelAtPeriodEnd}}
                </div>
            </div>
        </script>
        
        <script type="text/template" id="plan-template">
            <div class="pricing-plan {{#popular}}popular{{/popular}} {{#currentPlan}}current{{/currentPlan}}">
                <div class="plan-header">
                    <h3>{{name}}</h3>
                    <div class="plan-price">
                        <span class="currency">$</span>
                        <span class="amount">{{price}}</span>
                        <span class="period">/month</span>
                    </div>
                    {{#popular}}<span class="popular-badge"><?php _e('Popular', 'proofkit'); ?></span>{{/popular}}
                    {{#currentPlan}}<span class="current-badge"><?php _e('Current Plan', 'proofkit'); ?></span>{{/currentPlan}}
                </div>
                <div class="plan-description">
                    <p>{{description}}</p>
                </div>
                <div class="plan-features">
                    <h4><?php _e('Features:', 'proofkit'); ?></h4>
                    <ul>
                        {{#features}}
                        <li>{{.}}</li>
                        {{/features}}
                    </ul>
                </div>
                <div class="plan-limits">
                    <h4><?php _e('Limits:', 'proofkit'); ?></h4>
                    <div class="limits-grid">
                        {{#limits}}
                        <div class="limit-item">
                            <span class="limit-label">{{label}}</span>
                            <span class="limit-value">{{value}}</span>
                        </div>
                        {{/limits}}
                    </div>
                </div>
                <div class="plan-action">
                    {{#currentPlan}}
                    <button class="button button-disabled" disabled><?php _e('Current Plan', 'proofkit'); ?></button>
                    {{/currentPlan}}
                    {{^currentPlan}}
                        {{#hasSubscription}}
                        <button class="button {{#isUpgrade}}button-primary{{/isUpgrade}}{{^isUpgrade}}button-secondary{{/isUpgrade}}" 
                                data-tier="{{index}}" onclick="changePlan({{index}})">
                            {{#isUpgrade}}<?php _e('Upgrade', 'proofkit'); ?>{{/isUpgrade}}{{^isUpgrade}}<?php _e('Downgrade', 'proofkit'); ?>{{/isUpgrade}} to {{name}}
                        </button>
                        {{/hasSubscription}}
                        {{^hasSubscription}}
                        <button class="button button-primary" data-tier="{{index}}" onclick="subscribe({{index}})">
                            <?php _e('Subscribe to', 'proofkit'); ?> {{name}}
                        </button>
                        {{/hasSubscription}}
                    {{/currentPlan}}
                </div>
            </div>
        </script>
        <?php
    }
    
    /**
     * Create Stripe checkout session
     */
    public function create_checkout_session() {
        check_ajax_referer('proofkit_billing', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Insufficient permissions', 'proofkit'));
        }
        
        $tier_index = intval($_POST['tierIndex']);
        $current_user = wp_get_current_user();
        
        $response = wp_remote_post($this->api_base . '/api/billing/stripe/checkout', array(
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode(array(
                'email' => $current_user->user_email,
                'name' => $current_user->display_name,
                'tierIndex' => $tier_index,
                'successUrl' => admin_url('admin.php?page=proofkit-billing&success=true'),
                'cancelUrl' => admin_url('admin.php?page=proofkit-billing&canceled=true'),
                'metadata' => array(
                    'wp_user_id' => $current_user->ID,
                    'site_url' => get_site_url()
                )
            )),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && $data['success']) {
            // Store customer ID
            update_user_meta($current_user->ID, 'proofkit_stripe_customer_id', $data['customerId']);
            
            wp_send_json_success(array(
                'sessionUrl' => $data['sessionUrl'],
                'customerId' => $data['customerId']
            ));
        } else {
            wp_send_json_error($data['error'] ?? __('Failed to create checkout session', 'proofkit'));
        }
    }
    
    /**
     * Get subscription status
     */
    public function get_subscription_status() {
        check_ajax_referer('proofkit_billing', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Insufficient permissions', 'proofkit'));
        }
        
        $current_user = wp_get_current_user();
        $customer_id = get_user_meta($current_user->ID, 'proofkit_stripe_customer_id', true);
        
        if (!$customer_id) {
            wp_send_json_success(array('subscription' => null));
            return;
        }
        
        $response = wp_remote_get($this->api_base . '/api/billing/stripe/subscriptions/' . $customer_id, array(
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && $data['success']) {
            wp_send_json_success($data);
        } else {
            wp_send_json_error($data['error'] ?? __('Failed to get subscription', 'proofkit'));
        }
    }
    
    /**
     * Cancel subscription
     */
    public function cancel_subscription() {
        check_ajax_referer('proofkit_billing', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Insufficient permissions', 'proofkit'));
        }
        
        $subscription_id = sanitize_text_field($_POST['subscriptionId']);
        $immediately = isset($_POST['immediately']) ? (bool) $_POST['immediately'] : false;
        
        $response = wp_remote_post($this->api_base . '/api/billing/stripe/subscriptions/' . $subscription_id . '/cancel', array(
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode(array(
                'immediately' => $immediately
            )),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && $data['success']) {
            wp_send_json_success($data);
        } else {
            wp_send_json_error($data['error'] ?? __('Failed to cancel subscription', 'proofkit'));
        }
    }
    
    /**
     * Create billing portal session
     */
    public function create_portal_session() {
        check_ajax_referer('proofkit_billing', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Insufficient permissions', 'proofkit'));
        }
        
        $current_user = wp_get_current_user();
        $customer_id = get_user_meta($current_user->ID, 'proofkit_stripe_customer_id', true);
        
        if (!$customer_id) {
            wp_send_json_error(__('No customer ID found', 'proofkit'));
            return;
        }
        
        $response = wp_remote_post($this->api_base . '/api/billing/stripe/portal/' . $customer_id, array(
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode(array(
                'returnUrl' => admin_url('admin.php?page=proofkit-billing')
            )),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && $data['success']) {
            wp_send_json_success(array(
                'portalUrl' => $data['portalUrl']
            ));
        } else {
            wp_send_json_error($data['error'] ?? __('Failed to create portal session', 'proofkit'));
        }
    }
}

// Initialize billing management
new ProofKit_Billing();