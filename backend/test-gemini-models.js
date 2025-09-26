#!/usr/bin/env node

/**
 * Test script to check available Gemini models
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

async function testModels() {
  console.log('🔍 Testing Gemini Model Availability\n');

  if (!API_KEY) {
    console.error('❌ No API key found. Set GEMINI_API_KEY in your .env file');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(API_KEY);

  // List of models to test
  const models = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash-8b-latest',
    'gemini-1.0-pro',
    'gemini-1.0-pro-latest'
  ];

  console.log('Testing models...\n');

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "Hello" in one word');
      const response = result.response.text();
      console.log(`✅ ${modelName}: Working! Response: "${response.trim()}"`);
    } catch (error) {
      if (error.message.includes('404')) {
        console.log(`❌ ${modelName}: Not available`);
      } else if (error.message.includes('API key')) {
        console.log(`🔑 ${modelName}: API key issue - ${error.message.substring(0, 50)}...`);
      } else {
        console.log(`⚠️ ${modelName}: Error - ${error.message.substring(0, 100)}...`);
      }
    }
  }

  console.log('\n📝 Recommendation:');
  console.log('Use one of the working models above in your AI_MODEL environment variable.');
  console.log('\nFor best performance and cost efficiency:');
  console.log('- gemini-1.5-flash-latest: Fast, efficient, good for most tasks');
  console.log('- gemini-1.5-pro-latest: More capable but slower and more expensive');
}

testModels().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});