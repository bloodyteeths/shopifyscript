/**
 * Support API Testing Script
 * Tests tier-based support routing without requiring Supabase connection
 */

import express from 'express';
import supportRoutes from './routes/support.js';

// Mock the middleware to simulate different tiers
function mockSubscriptionCheck() {
  return (req, res, next) => {
    // Simulate different tiers based on query parameter
    const mockTier = req.query.mock_tier || 'starter';
    req.subscription = {
      tier: mockTier,
      status: 'active',
      trialEndsAt: null
    };
    next();
  };
}

// Create test app
const app = express();
app.use(express.json());

// Replace the actual subscription middleware with mock
app.use('/api/support', mockSubscriptionCheck(), supportRoutes);

const PORT = 3001;

async function runTests() {
  const server = app.listen(PORT, () => {
    console.log(`🧪 Test server running on port ${PORT}`);
  });

  // Test cases for different tiers and scenarios
  const testCases = [
    {
      name: "Starter - Create General Ticket",
      method: "POST",
      url: `/api/support/tickets?tenant=test-tenant&mock_tier=starter`,
      body: {
        tenant: "test-tenant",
        subject: "Need help with campaign setup",
        description: "I'm having trouble setting up my first campaign",
        category: "general",
        priority: "normal",
        customer_name: "John Doe",
        customer_email: "john@example.com"
      }
    },
    {
      name: "Starter - Try High Priority (Should Fail)",
      method: "POST", 
      url: `/api/support/tickets?tenant=test-tenant&mock_tier=starter`,
      body: {
        tenant: "test-tenant",
        subject: "Urgent issue",
        description: "This is urgent",
        category: "general",
        priority: "high",
        customer_name: "John Doe",
        customer_email: "john@example.com"
      }
    },
    {
      name: "Professional - Create High Priority Ticket",
      method: "POST",
      url: `/api/support/tickets?tenant=test-tenant&mock_tier=professional`,
      body: {
        tenant: "test-tenant", 
        subject: "Critical performance issue",
        description: "Campaigns are not optimizing properly",
        category: "technical",
        priority: "high",
        customer_name: "Jane Smith",
        customer_email: "jane@example.com"
      }
    },
    {
      name: "Professional - Try Urgent Category (Should Fail)",
      method: "POST",
      url: `/api/support/tickets?tenant=test-tenant&mock_tier=professional`,
      body: {
        tenant: "test-tenant",
        subject: "Urgent enterprise issue",
        description: "This needs urgent attention",
        category: "urgent",
        priority: "urgent",
        customer_name: "Jane Smith", 
        customer_email: "jane@example.com"
      }
    },
    {
      name: "Enterprise - Create Urgent Ticket",
      method: "POST",
      url: `/api/support/tickets?tenant=test-tenant&mock_tier=enterprise`,
      body: {
        tenant: "test-tenant",
        subject: "Critical system outage",
        description: "Our ad campaigns are completely down",
        category: "urgent",
        priority: "urgent",
        customer_name: "Bob Johnson",
        customer_email: "bob@enterprise.com",
        customer_phone: "+1-555-123-4567"
      }
    },
    {
      name: "Get Contact Methods - Starter",
      method: "GET",
      url: `/api/support/contact-methods?tenant=test-tenant&mock_tier=starter`
    },
    {
      name: "Get Contact Methods - Professional", 
      method: "GET",
      url: `/api/support/contact-methods?tenant=test-tenant&mock_tier=professional`
    },
    {
      name: "Get Contact Methods - Enterprise",
      method: "GET", 
      url: `/api/support/contact-methods?tenant=test-tenant&mock_tier=enterprise`
    },
    {
      name: "Get SLA Info - Enterprise Urgent",
      method: "GET",
      url: `/api/support/sla-info?tenant=test-tenant&mock_tier=enterprise&category=urgent&priority=urgent`
    }
  ];

  console.log('\n🚀 Running Support API Tests...\n');

  for (const testCase of testCases) {
    try {
      console.log(`📝 Test: ${testCase.name}`);
      
      let response;
      if (testCase.method === 'POST') {
        response = await fetch(`http://localhost:${PORT}${testCase.url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCase.body)
        });
      } else {
        response = await fetch(`http://localhost:${PORT}${testCase.url}`);
      }

      const result = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Status: ${response.status}`);
        if (result.ticket) {
          console.log(`   📋 Ticket: ${result.ticket.ticket_number || result.ticket.id}`);
          console.log(`   🎯 Tier: ${result.ticket.subscription_tier} -> ${result.ticket.support_tier}`);
          console.log(`   ⏰ SLA: ${result.ticket.sla_response_hours}h response`);
        }
        if (result.contact_methods) {
          console.log(`   📧 Email: ${result.contact_methods.email_support}`);
          console.log(`   📞 Phone: ${result.contact_methods.phone_support}`);
          console.log(`   ⚡ Priority: ${result.contact_methods.priority_routing}`);
        }
        if (result.sla_info) {
          console.log(`   ⏰ Response: ${result.sla_info.response_time_hours}h`);
          console.log(`   ✅ Resolution: ${result.sla_info.resolution_time_hours || 'N/A'}h`);
          console.log(`   📱 Channels: ${result.sla_info.support_channels.join(', ')}`);
        }
      } else {
        console.log(`   ❌ Status: ${response.status} - ${result.error}`);
        console.log(`   💬 Message: ${result.message}`);
        
        // This is expected for tier restriction tests
        if (result.error === 'tier_restriction') {
          console.log(`   ✅ Tier restriction working correctly`);
        }
      }
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('🎉 Support API testing complete!\n');
  server.close();
}

// Handle the fact that some services might not be available in test mode
console.log('⚠️  Note: This test runs without Supabase - database operations will fail but tier logic will be tested');
console.log('🔧 Starting test suite...\n');

runTests().catch(console.error);