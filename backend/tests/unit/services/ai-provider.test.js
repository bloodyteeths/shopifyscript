import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Google Generative AI
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn();

jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel
  }))
}));

const { AIProviderService, generateAIContent, validateAIConfig } = await import('../../../services/ai-provider.js');

describe('AIProviderService', () => {
  let aiService;
  let mockModel;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockModel = {
      generateContent: mockGenerateContent
    };
    
    mockGetGenerativeModel.mockReturnValue(mockModel);
    aiService = new AIProviderService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(aiService.apiKey).toBeDefined();
      expect(aiService.model).toBe('gemini-1.5-flash');
      expect(aiService.maxTokens).toBe(1000);
      expect(aiService.temperature).toBe(0.7);
    });

    it('should use environment variables for configuration', () => {
      process.env.GEMINI_API_KEY = 'test-api-key';
      process.env.GEMINI_MODEL = 'test-model';
      process.env.GEMINI_MAX_TOKENS = '2000';
      process.env.GEMINI_TEMPERATURE = '0.5';
      
      const service = new AIProviderService();
      
      expect(service.apiKey).toBe('test-api-key');
      expect(service.model).toBe('test-model');
      expect(service.maxTokens).toBe(2000);
      expect(service.temperature).toBe(0.5);
    });
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const mockResponse = {
        response: {
          text: () => 'Generated content'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.generateContent('Test prompt');
      
      expect(mockGenerateContent).toHaveBeenCalledWith('Test prompt');
      expect(result).toEqual({
        success: true,
        content: 'Generated content',
        usage: expect.any(Object),
        timestamp: expect.any(Number)
      });
    });

    it('should handle generation errors', async () => {
      const error = new Error('API Error');
      mockGenerateContent.mockRejectedValue(error);
      
      const result = await aiService.generateContent('Test prompt');
      
      expect(result).toEqual({
        success: false,
        error: 'API Error',
        timestamp: expect.any(Number)
      });
    });

    it('should validate prompt length', async () => {
      const longPrompt = 'a'.repeat(10001); // Exceeds max length
      
      const result = await aiService.generateContent(longPrompt);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should apply content filters', async () => {
      const inappropriatePrompt = 'Generate harmful content';
      
      const result = await aiService.generateContent(inappropriatePrompt);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('safety filter');
    });
  });

  describe('generateRSAContent', () => {
    it('should generate RSA ad content', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            responsiveSearchAd: {
              headlines: ['Headline 1', 'Headline 2'],
              descriptions: ['Description 1', 'Description 2']
            }
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);
      
      const input = {
        businessType: 'E-commerce',
        targetAudience: 'Young adults',
        keywords: ['fashion', 'trendy']
      };
      
      const result = await aiService.generateRSAContent(input);
      
      expect(result.success).toBe(true);
      expect(result.content.responsiveSearchAd).toBeDefined();
      expect(result.content.responsiveSearchAd.headlines).toHaveLength(2);
    });

    it('should validate RSA input parameters', async () => {
      const invalidInput = {
        businessType: '', // Missing required field
        targetAudience: 'Young adults'
      };
      
      const result = await aiService.generateRSAContent(invalidInput);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('businessType is required');
    });

    it('should enforce headline and description limits', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            responsiveSearchAd: {
              headlines: Array(20).fill('Headline'), // Too many headlines
              descriptions: ['Description 1', 'Description 2']
            }
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);
      
      const input = {
        businessType: 'E-commerce',
        targetAudience: 'Young adults',
        keywords: ['fashion']
      };
      
      const result = await aiService.generateRSAContent(input);
      
      expect(result.content.responsiveSearchAd.headlines).toHaveLength(15); // Max 15 headlines
    });
  });

  describe('generateAudienceInsights', () => {
    it('should generate audience insights', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            insights: {
              demographics: { age: '25-34', gender: 'mixed' },
              interests: ['technology', 'fashion'],
              behaviors: ['online shopping', 'social media']
            }
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);
      
      const audienceData = {
        audienceSize: 10000,
        conversions: 500,
        clickThroughRate: 2.5
      };
      
      const result = await aiService.generateAudienceInsights(audienceData);
      
      expect(result.success).toBe(true);
      expect(result.content.insights).toBeDefined();
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      // Simulate multiple rapid requests
      const promises = Array(20).fill().map(() => 
        aiService.generateContent('Test prompt')
      );
      
      const results = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedCount = results.filter(r => 
        !r.success && r.error && r.error.includes('rate limit')
      ).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('caching', () => {
    it('should cache similar requests', async () => {
      const mockResponse = {
        response: {
          text: () => 'Cached content'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);
      
      // Make the same request twice
      await aiService.generateContent('Same prompt');
      await aiService.generateContent('Same prompt');
      
      // Should only call the API once due to caching
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('usage tracking', () => {
    it('should track API usage', async () => {
      const mockResponse = {
        response: {
          text: () => 'Test content'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);
      
      await aiService.generateContent('Test prompt');
      
      const usage = aiService.getUsageStats();
      
      expect(usage.totalRequests).toBe(1);
      expect(usage.totalTokens).toBeGreaterThan(0);
    });
  });
});

describe('Utility Functions', () => {
  describe('generateAIContent', () => {
    it('should provide a simple interface for content generation', async () => {
      const result = await generateAIContent('Test prompt');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('content');
    });
  });

  describe('validateAIConfig', () => {
    it('should validate AI configuration', () => {
      process.env.GEMINI_API_KEY = 'test-key';
      
      const result = validateAIConfig();
      
      expect(result.valid).toBe(true);
    });

    it('should detect missing API key', () => {
      delete process.env.GEMINI_API_KEY;
      
      const result = validateAIConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GEMINI_API_KEY is required');
    });
  });
});