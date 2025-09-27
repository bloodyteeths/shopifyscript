#!/usr/bin/env node

/**
 * Test script for AI writer functionality
 */

import { handleInlineAIWriter } from './backend/api/ai-writer-inline.js';

// Set required environment variables for testing
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
process.env.AI_PROVIDER = 'google';
process.env.AI_MODEL = 'gemini-2.5-flash';
process.env.VERCEL = 'true'; // Simulate serverless environment

async function testAIWriter() {
  console.log('=== Testing AI Writer Functionality ===\n');

  try {
    console.log('Testing with tenant: test-tenant, limit: 3');
    const result = await handleInlineAIWriter('test-tenant', 3);

    console.log('\n=== Results ===');
    console.log('Success:', result.success);
    console.log('Provider:', result.provider);
    console.log('Results count:', result.results?.length || 0);
    console.log('Written to sheets:', result.wrote);

    if (result.results) {
      console.log('\n=== Generated Content ===');
      result.results.forEach((item, index) => {
        console.log(`\n${index + 1}. Theme: ${item.theme}`);
        console.log('   Source:', item.source || 'unknown');
        console.log('   Headlines:', item.headlines?.slice(0, 2).join(', '));
        console.log('   Descriptions:', item.descriptions?.slice(0, 1).join(', '));
      });
    }

    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testAIWriter();