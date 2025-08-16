/**
 * ProofKit WordPress Billing JavaScript
 * Handles billing UI interactions and Stripe integration
 */

(function($) {
    'use strict';

    let stripe;
    let currentSubscription = null;
    let pricingTiers = [];

    const PRICING_TIERS = [
        {
            id: 'starter',
            name: 'Starter',
            price: 29,
            description: 'Perfect for small stores getting started with Google Ads automation',
            features: [
                'Instant "safe starter" Search campaigns',
                'Daily optimizer with budget caps',
                'Auto-block money-wasting queries',
                'Brand protection',
                'Pixel health check',
                'Weekly email summary',
                'Slack/email alerts',
                'Full audit trail',
                'Campaign exclusions'
            ],
            limits: {
                campaigns: 5,
                adGroups: 25,
                keywords: 500,
                monthlySpend: 5000
            }
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 99,
            description: 'Advanced features for growing stores that want AI-powered optimization',
            features: [
                'Everything in Starter',
                'AI ad copywriter (RSA)',
                'RSA Test Queue with significance testing',
                'Keyword Promotions from search terms',
                'Phrase-level waste blocker',
                'Budget pacer with guardrails',
                'Sitelinks/Callouts/Snippets drafts',
                'AI landing page section drafts',
                'Plain-English change notes'
            ],
            limits: {
                campaigns: 20,
                adGroups: 100,
                keywords: 2000,
                monthlySpend: 25000
            },
            popular: true
        },
        {
            id: 'growth',
            name: 'Growth',
            price: 249,
            description: 'Comprehensive tools for multi-store operations and team collaboration',
            features: [
                'Everything in Pro',
                'Asset Library with themed pools',
                'Geo & daypart optimization hints',
                'Promo page generator',
                'Brand/Non-brand mapping',
                'Pacer rules editor',
                'Multi-store support',
                'Team roles & advanced alerts',
                'Looker Studio template'
            ],
            limits: {
                campaigns: 50,
                adGroups: 250,
                keywords: 5000,
                monthlySpend: 100000,
                stores: 3,
                teamMembers: 5
            }
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 699,
            description: 'Custom solutions for high-volume advertisers and agencies',
            features: [
                'Everything in Growth',
                'Custom rules & guardrails',
                'Server-side tagging consultation',
                'Private model prompts',
                'Onboarding/implementation help',
                'SSO & audit logs export',
                'SLA support'
            ],
            limits: {
                campaigns: 'Unlimited',
                adGroups: 'Unlimited',
                keywords: 'Unlimited',
                monthlySpend: 'Unlimited',
                stores: 'Unlimited',
                teamMembers: 'Unlimited'
            }
        }
    ];

    $(document).ready(function() {
        initializeBilling();
    });

    function initializeBilling() {
        // Initialize Stripe
        if (proofkitBilling.stripePublicKey) {
            stripe = Stripe(proofkitBilling.stripePublicKey);
        }

        pricingTiers = PRICING_TIERS;
        
        // Load current subscription
        loadSubscription();
        
        // Set up event handlers
        setupEventHandlers();
    }

    function setupEventHandlers() {
        $('#manage-billing').on('click', createPortalSession);
        $('#cancel-subscription').on('click', confirmCancelSubscription);
    }

    function loadSubscription() {
        showLoading();
        
        $.ajax({
            url: proofkitBilling.ajaxUrl,
            type: 'POST',
            data: {
                action: 'proofkit_get_subscription',
                nonce: proofkitBilling.nonce
            },
            success: function(response) {
                hideLoading();
                
                if (response.success) {
                    currentSubscription = response.data.subscriptions?.[0] || null;
                    renderBillingInterface();
                } else {
                    showError(response.data || proofkitBilling.strings.error);
                }
            },
            error: function() {
                hideLoading();
                showError(proofkitBilling.strings.error);
            }
        });
    }

    function renderBillingInterface() {
        if (currentSubscription) {
            renderCurrentSubscription();
        }
        renderPricingPlans();
    }

    function renderCurrentSubscription() {
        const tier = pricingTiers.find(t => t.price === currentSubscription.amount);
        const template = $('#subscription-template').html();
        
        const data = {
            tierName: tier?.name || 'Unknown Plan',
            amount: currentSubscription.amount,
            status: currentSubscription.status,
            nextBilling: new Date(currentSubscription.currentPeriodEnd).toLocaleDateString(),
            customerId: currentSubscription.id.substring(0, 12) + '...',
            cancelAtPeriodEnd: currentSubscription.cancelAtPeriodEnd
        };

        const rendered = Mustache.render(template, data);
        $('#subscription-details').html(rendered);
        $('#current-subscription').show();
    }

    function renderPricingPlans() {
        const template = $('#plan-template').html();
        const container = $('.plans-container');
        container.empty();

        pricingTiers.forEach((tier, index) => {
            const currentTier = getCurrentTier();
            const isCurrentTier = currentTier && currentTier.id === tier.id;
            const isUpgrade = currentTier && pricingTiers.findIndex(t => t.id === currentTier.id) < index;
            
            const data = {
                ...tier,
                index: index,
                currentPlan: isCurrentTier,
                hasSubscription: !!currentSubscription,
                isUpgrade: isUpgrade,
                features: tier.features.slice(0, 5),
                limits: formatLimits(tier.limits)
            };

            const rendered = Mustache.render(template, data);
            container.append(rendered);
        });
    }

    function getCurrentTier() {
        if (!currentSubscription) return null;
        return pricingTiers.find(tier => tier.price === currentSubscription.amount);
    }

    function formatLimits(limits) {
        return Object.entries(limits).map(([key, value]) => ({
            label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            value: value === -1 || value === 'Unlimited' ? 'Unlimited' : value.toLocaleString()
        })).slice(0, 3);
    }

    // Global functions for plan interactions
    window.subscribe = function(tierIndex) {
        if (!stripe) {
            showError('Stripe is not properly configured.');
            return;
        }

        showLoading();
        
        $.ajax({
            url: proofkitBilling.ajaxUrl,
            type: 'POST',
            data: {
                action: 'proofkit_create_checkout',
                tierIndex: tierIndex,
                nonce: proofkitBilling.nonce
            },
            success: function(response) {
                hideLoading();
                
                if (response.success) {
                    // Redirect to Stripe Checkout
                    window.location.href = response.data.sessionUrl;
                } else {
                    showError(response.data || proofkitBilling.strings.error);
                }
            },
            error: function() {
                hideLoading();
                showError(proofkitBilling.strings.error);
            }
        });
    };

    window.changePlan = function(tierIndex) {
        if (!currentSubscription) return;
        
        const newTier = pricingTiers[tierIndex];
        const currentTier = getCurrentTier();
        const isUpgrade = pricingTiers.findIndex(t => t.id === currentTier.id) < tierIndex;
        
        const message = isUpgrade 
            ? `Upgrade to ${newTier.name} plan for $${newTier.price}/month?`
            : `Downgrade to ${newTier.name} plan for $${newTier.price}/month?`;
            
        if (!confirm(message)) return;
        
        // For plan changes, we'll create a new checkout session
        // This allows Stripe to handle prorations properly
        subscribe(tierIndex);
    };

    function createPortalSession() {
        showLoading();
        
        $.ajax({
            url: proofkitBilling.ajaxUrl,
            type: 'POST',
            data: {
                action: 'proofkit_create_portal',
                nonce: proofkitBilling.nonce
            },
            success: function(response) {
                hideLoading();
                
                if (response.success) {
                    window.location.href = response.data.portalUrl;
                } else {
                    showError(response.data || proofkitBilling.strings.error);
                }
            },
            error: function() {
                hideLoading();
                showError(proofkitBilling.strings.error);
            }
        });
    }

    function confirmCancelSubscription() {
        if (!confirm(proofkitBilling.strings.confirmCancel)) return;
        
        showLoading();
        
        $.ajax({
            url: proofkitBilling.ajaxUrl,
            type: 'POST',
            data: {
                action: 'proofkit_cancel_subscription',
                subscriptionId: currentSubscription.id,
                immediately: false,
                nonce: proofkitBilling.nonce
            },
            success: function(response) {
                hideLoading();
                
                if (response.success) {
                    showSuccess('Subscription will be canceled at the end of the current billing period.');
                    loadSubscription(); // Reload to show updated status
                } else {
                    showError(response.data || proofkitBilling.strings.error);
                }
            },
            error: function() {
                hideLoading();
                showError(proofkitBilling.strings.error);
            }
        });
    }

    function showLoading() {
        $('#billing-loading').show();
        $('#billing-error').hide();
        $('#billing-success').hide();
    }

    function hideLoading() {
        $('#billing-loading').hide();
    }

    function showError(message) {
        $('#billing-error-message').text(message);
        $('#billing-error').show();
        $('#billing-success').hide();
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            $('#billing-error').fadeOut();
        }, 5000);
    }

    function showSuccess(message) {
        $('#billing-success-message').text(message);
        $('#billing-success').show();
        $('#billing-error').hide();
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            $('#billing-success').fadeOut();
        }, 3000);
    }

    // Handle URL parameters for success/cancel
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
        showSuccess('Subscription created successfully!');
        loadSubscription();
    } else if (urlParams.get('canceled') === 'true') {
        showError('Subscription creation was canceled.');
    }

})(jQuery);

// Include Mustache.js for templating (simplified version)
if (typeof Mustache === 'undefined') {
    window.Mustache = {
        render: function(template, data) {
            return template.replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/g, function(match, key, content) {
                if (data[key]) {
                    if (Array.isArray(data[key])) {
                        return data[key].map(item => {
                            if (typeof item === 'object') {
                                return Mustache.render(content, item);
                            }
                            return content.replace(/\{\{\.\}\}/g, item);
                        }).join('');
                    }
                    return content;
                }
                return '';
            }).replace(/\{\{\^(\w+)\}\}(.*?)\{\{\/\1\}\}/g, function(match, key, content) {
                return !data[key] ? content : '';
            }).replace(/\{\{(\w+)\}\}/g, function(match, key) {
                return data[key] || '';
            });
        }
    };
}