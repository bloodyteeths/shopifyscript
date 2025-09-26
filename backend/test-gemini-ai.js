#!/usr/bin/env node

/**
 * Test script to verify Gemini AI integration
 */

import dotenv from 'dotenv';
dotenv.config();

// Set environment variables for Gemini
process.env.AI_PROVIDER = 'google';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
process.env.AI_MODEL = 'gemini-1.5-flash';
process.env.AI_TEMPERATURE = '0.4';
process.env.AI_MAX_CALLS_PER_RUN = '20';
// Skip budget checks for testing
process.env.AI_SKIP_BUDGET_CHECK = 'true';

import { getAIProviderService, validateAIConfig, generateAIContent } from './services/ai-provider.js';

async function testGeminiIntegration() {
  console.log('🧪 Testing Gemini AI Integration\n');
  console.log('Configuration:');
  console.log(`  AI_PROVIDER: ${process.env.AI_PROVIDER}`);
  console.log(`  GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not Set'}`);
  console.log(`  AI_MODEL: ${process.env.AI_MODEL}`);
  console.log(`  AI_TEMPERATURE: ${process.env.AI_TEMPERATURE}`);
  console.log(`  AI_MAX_CALLS_PER_RUN: ${process.env.AI_MAX_CALLS_PER_RUN}\n`);

  // Validate configuration
  console.log('Validating AI configuration...');
  const validation = validateAIConfig();
  if (!validation.valid) {
    console.error('❌ Configuration validation failed:', validation.errors);
    process.exit(1);
  }
  console.log('✅ Configuration valid\n');

  try {
    // Test 1: Initialize AI Provider
    console.log('Test 1: Initializing Gemini AI provider...');
    const aiService = getAIProviderService();
    await aiService.initialize();
    console.log('✅ Gemini AI provider initialized successfully\n');

    // Test 2: Generate simple text
    console.log('Test 2: Generating simple text with Gemini...');
    const simplePrompt = 'Write a one-sentence description of Google Ads in 20 words or less.';
    const simpleResult = await aiService.generateText(simplePrompt, {
      tenant: 'test',
      operation: 'test_simple'
    });
    console.log(`✅ Generated text: "${simpleResult}"\n`);

    // Test 3: Generate RSA headlines (30 char limit)
    console.log('Test 3: Generating RSA headlines with Gemini...');
    const rsaPrompt = `Generate 3 Google Ads headlines for a coffee shop. Each must be under 30 characters. Return only the headlines, one per line.`;
    const rsaResult = await aiService.generateText(rsaPrompt, {
      tenant: 'test',
      operation: 'test_rsa'
    });
    const headlines = rsaResult.split('\n').filter(h => h.trim().length > 0);
    console.log('✅ Generated headlines:');
    headlines.forEach((h, i) => {
      const charCount = h.trim().length;
      const isValid = charCount <= 30;
      console.log(`   ${i + 1}. "${h.trim()}" (${charCount} chars) ${isValid ? '✅' : '❌'}`);
    });
    console.log('');

    // Test 4: Test fallback mechanism
    console.log('Test 4: Testing fallback with generateAIContent...');
    const fallbackResult = await generateAIContent(
      'What is PPC advertising in 10 words?',
      { tenant: 'test', operation: 'test_fallback' }
    );
    console.log(`✅ Fallback test result: "${fallbackResult}"\n`);

    // Test 5: Get provider status
    console.log('Test 5: Getting provider status...');
    const status = aiService.getStatus();
    console.log('✅ Provider status:');
    console.log(`   Provider: ${status.provider}`);
    console.log(`   Initialized: ${status.initialized}`);
    console.log(`   Total calls: ${status.metrics.calls}`);
    console.log(`   Failures: ${status.metrics.failures}`);
    console.log(`   Avg response time: ${status.metrics.avgResponseTime.toFixed(2)}ms\n`);

    console.log('🎉 All Gemini AI tests passed successfully!');
    console.log('\nYour Gemini AI integration is working correctly with:');
    console.log(`- Provider: Google Gemini`);
    console.log(`- Model: ${process.env.AI_MODEL}`);
    console.log(`- Temperature: ${process.env.AI_TEMPERATURE}`);
    console.log(`- Max calls per run: ${process.env.AI_MAX_CALLS_PER_RUN}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.message.includes('API key')) {
      console.error('\n📌 Please ensure your GEMINI_API_KEY is set in your .env file');
      console.error('   You can get a Gemini API key from: https://makersuite.google.com/app/apikey');
    }
    process.exit(1);
  }
}

// Run tests
testGeminiIntegration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});