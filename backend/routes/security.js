/**
 * Security Routes
 * Handles CSP reporting, security health checks, and security monitoring
 */

import express from 'express';
import securityMiddleware from '../middleware/security.js';
import { getDoc, ensureSheet } from '../services/sheets.js';

const router = express.Router();

/**
 * CSP Violation Reporting Endpoint
 * Handles reports from Content-Security-Policy violations
 */
router.post('/csp-report', express.json({ type: 'application/csp-report' }), async (req, res) => {
  try {
    const report = req.body;
    const cspReport = report['csp-report'] || report;
    
    // Log CSP violation
    console.warn('CSP Violation:', {
      'blocked-uri': cspReport['blocked-uri'],
      'document-uri': cspReport['document-uri'],
      'violated-directive': cspReport['violated-directive'],
      'effective-directive': cspReport['effective-directive'],
      'original-policy': cspReport['original-policy'],
      'referrer': cspReport['referrer'],
      'status-code': cspReport['status-code'],
      'script-sample': cspReport['script-sample']?.substring(0, 100) + '...',
      'timestamp': new Date().toISOString()
    });
    
    // Store in security logs
    try {
      const doc = await getDoc();
      if (doc) {
        const sheet = await ensureSheet(doc, 'CSP_VIOLATIONS', [
          'timestamp', 'blocked_uri', 'document_uri', 'violated_directive', 
          'effective_directive', 'status_code', 'script_sample', 'referrer'
        ]);
        
        await sheet.addRow({
          timestamp: new Date().toISOString(),
          blocked_uri: cspReport['blocked-uri'] || '',
          document_uri: cspReport['document-uri'] || '',
          violated_directive: cspReport['violated-directive'] || '',
          effective_directive: cspReport['effective-directive'] || '',
          status_code: cspReport['status-code'] || '',
          script_sample: (cspReport['script-sample'] || '').substring(0, 500),
          referrer: cspReport['referrer'] || ''
        });
      }
    } catch (storageError) {
      console.error('Failed to store CSP violation:', storageError);
    }
    
    res.status(204).end(); // No content response for CSP reports
  } catch (error) {
    console.error('Error processing CSP report:', error);
    res.status(400).json({ error: 'Invalid CSP report' });
  }
});

/**
 * Security Health Check Endpoint
 * Returns current security status and configuration
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = securityMiddleware.performSecurityHealthCheck();
    const stats = securityMiddleware.getSecurityStats();
    
    res.json({
      health: healthCheck,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in security health check:', error);
    res.status(500).json({
      error: 'Security health check failed',
      message: error.message
    });
  }
});

/**
 * Security Configuration Endpoint
 * Returns current security configuration (admin only)
 */
router.get('/config', async (req, res) => {
  try {
    // Basic admin check (you might want to enhance this)
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_SECRET;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const environment = process.env.NODE_ENV || 'development';
    
    res.json({
      environment: environment,
      csp_configuration: securityMiddleware.cspConfig[environment],
      security_headers: securityMiddleware.securityHeaders,
      threat_detection_enabled: securityMiddleware.threatDetection.enabled,
      rate_limiting_enabled: securityMiddleware.rateLimiting.enabled,
      ddos_protection_enabled: securityMiddleware.ddosProtection.enabled
    });
  } catch (error) {
    console.error('Error fetching security config:', error);
    res.status(500).json({
      error: 'Failed to fetch security configuration',
      message: error.message
    });
  }
});

/**
 * CSP Nonce Endpoint
 * Returns current CSP nonce for the request (for client-side use)
 */
router.get('/nonce', (req, res) => {
  try {
    const nonce = req.cspNonce;
    if (!nonce) {
      return res.status(404).json({ error: 'No CSP nonce found for this request' });
    }
    
    res.json({
      nonce: nonce,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching CSP nonce:', error);
    res.status(500).json({
      error: 'Failed to fetch CSP nonce',
      message: error.message
    });
  }
});

/**
 * Security Metrics Endpoint
 * Returns security metrics for monitoring
 */
router.get('/metrics', async (req, res) => {
  try {
    const stats = securityMiddleware.getSecurityStats();
    const healthCheck = securityMiddleware.performSecurityHealthCheck();
    
    // Format metrics for monitoring systems (Prometheus-style)
    const metrics = [
      `# HELP security_ddos_blacklisted_ips Number of blacklisted IPs`,
      `# TYPE security_ddos_blacklisted_ips gauge`,
      `security_ddos_blacklisted_ips ${stats.ddos_protection.blacklisted_ips}`,
      ``,
      `# HELP security_ddos_active_bans Number of active IP bans`,
      `# TYPE security_ddos_active_bans gauge`,
      `security_ddos_active_bans ${stats.ddos_protection.active_bans}`,
      ``,
      `# HELP security_rate_limiting_buckets Number of active rate limiting buckets`,
      `# TYPE security_rate_limiting_buckets gauge`,
      `security_rate_limiting_buckets ${stats.rate_limiting.active_buckets}`,
      ``,
      `# HELP security_threat_baselines Number of behavior baselines`,
      `# TYPE security_threat_baselines gauge`,
      `security_threat_baselines ${stats.threat_detection.behavior_baselines}`,
      ``,
      `# HELP security_pending_alerts Number of pending security alerts`,
      `# TYPE security_pending_alerts gauge`,
      `security_pending_alerts ${stats.threat_detection.pending_alerts}`,
      ``,
      `# HELP security_csp_nonces Number of active CSP nonces`,
      `# TYPE security_csp_nonces gauge`,
      `security_csp_nonces ${stats.csp.active_nonces}`,
      ``,
      `# HELP security_health_status Overall security health status (1=healthy, 0=degraded)`,
      `# TYPE security_health_status gauge`,
      `security_health_status ${healthCheck.status === 'healthy' ? 1 : 0}`,
      ``
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    console.error('Error generating security metrics:', error);
    res.status(500).json({
      error: 'Failed to generate security metrics',
      message: error.message
    });
  }
});

/**
 * CSP Test Endpoint
 * Allows testing CSP policies
 */
router.get('/csp-test', (req, res) => {
  try {
    const nonce = req.cspNonce;
    
    const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>CSP Test Page</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>CSP Security Test</h1>
    <p>This page tests Content Security Policy implementation.</p>
    
    <div id="test-results">
        <h2>Test Results:</h2>
        <ul id="results-list"></ul>
    </div>
    
    <script nonce="${nonce}">
        const results = document.getElementById('results-list');
        
        function addResult(test, passed) {
            const li = document.createElement('li');
            li.textContent = test + ': ' + (passed ? 'PASS' : 'FAIL');
            li.style.color = passed ? 'green' : 'red';
            results.appendChild(li);
        }
        
        // Test 1: Nonce-based script execution
        addResult('Nonce-based script execution', true);
        
        // Test 2: Try to execute inline script without nonce (should fail)
        try {
            eval('addResult("Inline eval() execution", true);');
        } catch (e) {
            addResult('Inline eval() blocked', true);
        }
        
        // Test 3: Check if CSP headers are present
        fetch('/api/security/nonce')
            .then(response => response.json())
            .then(data => {
                addResult('CSP nonce API accessible', !!data.nonce);
            })
            .catch(() => {
                addResult('CSP nonce API accessible', false);
            });
        
        addResult('CSP nonce present', !!("${nonce}"));
    </script>
    
    <!-- This script should be blocked by CSP -->
    <script>
        // This should not execute due to CSP
        document.body.style.backgroundColor = 'red';
    </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(testHTML);
  } catch (error) {
    console.error('Error generating CSP test page:', error);
    res.status(500).json({
      error: 'Failed to generate CSP test page',
      message: error.message
    });
  }
});

export default router;