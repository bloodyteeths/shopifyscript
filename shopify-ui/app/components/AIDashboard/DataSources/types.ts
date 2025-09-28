/**
 * Shared TypeScript interfaces for AI Dashboard Data Sources
 * These interfaces define the data structures for all 5 data sources
 */

// ========================
// Common Types
// ========================

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MetricValue {
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ChartDataPoint {
  date: string;
  value: number;
  [key: string]: string | number;
}

export interface FilterOption {
  label: string;
  value: string;
  selected: boolean;
}

// ========================
// Website Insights Types
// ========================

export interface ExtractedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  qualityScore: number;
  imageUrl?: string;
  category: string;
  lastUpdated: string;
}

export interface USPData {
  id: string;
  text: string;
  confidence: number;
  category: 'pricing' | 'quality' | 'service' | 'features' | 'other';
  source: string;
  lastDetected: string;
}

export interface TestimonialData {
  id: string;
  text: string;
  author: string;
  rating: number;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  extractedDate: string;
}

export interface OfferData {
  id: string;
  title: string;
  description: string;
  type: 'discount' | 'guarantee' | 'shipping' | 'bonus' | 'other';
  value: string;
  urgency: 'high' | 'medium' | 'low';
  lastSeen: string;
}

export interface ContentQualityMetrics {
  overallScore: number;
  readabilityScore: number;
  seoScore: number;
  engagementScore: number;
  trustScore: number;
  wordCount: number;
  headingStructure: number;
  imageOptimization: number;
}

export interface WebsiteInsightsData {
  products: ExtractedProduct[];
  usps: USPData[];
  testimonials: TestimonialData[];
  offers: OfferData[];
  contentQuality: ContentQualityMetrics;
  lastAnalyzed: string;
  totalPages: number;
  analysisStatus: 'analyzing' | 'completed' | 'error';
}

// ========================
// Competitor Intelligence Types
// ========================

export interface CompetitorProfile {
  id: string;
  name: string;
  domain: string;
  threatLevel: 'high' | 'medium' | 'low';
  marketPosition: {
    x: number; // Market share
    y: number; // Growth rate
  };
  estimatedRevenue: number;
  employeeCount: number;
  lastUpdated: string;
}

export interface AdCopyData {
  id: string;
  competitorId: string;
  headline: string;
  description: string;
  cta: string;
  platform: 'google' | 'facebook' | 'instagram' | 'linkedin' | 'other';
  performance: {
    estimatedImpressions: number;
    estimatedClicks: number;
    estimatedCTR: number;
  };
  firstSeen: string;
  lastSeen: string;
  status: 'active' | 'paused' | 'ended';
}

export interface CompetitiveAdvantage {
  id: string;
  category: string;
  advantage: string;
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendation: string;
}

export interface CompetitiveGap {
  id: string;
  category: string;
  gap: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  recommendation: string;
}

export interface CompetitorChange {
  id: string;
  competitorId: string;
  changeType: 'pricing' | 'product' | 'marketing' | 'website' | 'other';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  detectedDate: string;
  details: string;
}

export interface CompetitorIntelData {
  competitors: CompetitorProfile[];
  adCopies: AdCopyData[];
  advantages: CompetitiveAdvantage[];
  gaps: CompetitiveGap[];
  recentChanges: CompetitorChange[];
  threatMatrix: {
    high: CompetitorProfile[];
    medium: CompetitorProfile[];
    low: CompetitorProfile[];
  };
  lastAnalyzed: string;
  analysisStatus: 'analyzing' | 'completed' | 'error';
}

// ========================
// Traffic Patterns Types
// ========================

export interface HourlyTrafficData {
  hour: number;
  sessions: number;
  conversions: number;
  revenue: number;
  day: string;
}

export interface TrafficTrend {
  date: string;
  sessions: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  revenue: number;
}

export interface PeakTime {
  period: string;
  type: 'hourly' | 'daily' | 'weekly';
  sessions: number;
  conversions: number;
  conversionRate: number;
}

export interface DeviceBreakdown {
  device: 'desktop' | 'mobile' | 'tablet';
  sessions: number;
  percentage: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

export interface LocationBreakdown {
  country: string;
  countryCode: string;
  sessions: number;
  percentage: number;
  conversions: number;
  revenue: number;
  avgSessionDuration: number;
}

export interface SeasonalTrend {
  month: string;
  year: number;
  sessions: number;
  conversions: number;
  revenue: number;
  changeFromPrevious: number;
}

export interface TrafficPatternsData {
  hourlyHeatmap: HourlyTrafficData[];
  dailyTrends: TrafficTrend[];
  weeklyTrends: TrafficTrend[];
  peakTimes: PeakTime[];
  deviceBreakdown: DeviceBreakdown[];
  locationBreakdown: LocationBreakdown[];
  seasonalTrends: SeasonalTrend[];
  summary: {
    totalSessions: number;
    totalConversions: number;
    totalRevenue: number;
    avgConversionRate: number;
    peakHour: number;
    peakDay: string;
  };
  lastUpdated: string;
  analysisStatus: 'analyzing' | 'completed' | 'error';
}

// ========================
// Customer Segments Types
// ========================

export interface DemographicData {
  ageGroup: string;
  gender: 'male' | 'female' | 'other';
  income: string;
  education: string;
  location: string;
  percentage: number;
  count: number;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  size: number;
  percentage: number;
  avgLifetimeValue: number;
  avgOrderValue: number;
  purchaseFrequency: number;
  conversionRate: number;
  demographics: DemographicData[];
  behavior: {
    topChannels: string[];
    preferredDevices: string[];
    averageSessionDuration: number;
    pagesPerSession: number;
  };
  profitability: 'high' | 'medium' | 'low';
  growth: 'growing' | 'stable' | 'declining';
}

export interface BehaviorPattern {
  id: string;
  pattern: string;
  description: string;
  frequency: number;
  segments: string[];
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendation: string;
}

export interface LifetimeValueProjection {
  segmentId: string;
  currentLTV: number;
  projectedLTV: number;
  timeframe: string;
  confidence: number;
  factors: string[];
}

export interface SegmentGrowthTrend {
  segmentId: string;
  historical: ChartDataPoint[];
  projected: ChartDataPoint[];
  growthRate: number;
  trendDirection: 'up' | 'down' | 'stable';
}

export interface CustomerSegmentsData {
  segments: CustomerSegment[];
  behaviorPatterns: BehaviorPattern[];
  lifetimeValueProjections: LifetimeValueProjection[];
  growthTrends: SegmentGrowthTrend[];
  demographics: {
    ageDistribution: ChartDataPoint[];
    genderDistribution: ChartDataPoint[];
    incomeDistribution: ChartDataPoint[];
    locationDistribution: ChartDataPoint[];
  };
  summary: {
    totalCustomers: number;
    totalSegments: number;
    avgLifetimeValue: number;
    highValueSegments: number;
  };
  lastUpdated: string;
  analysisStatus: 'analyzing' | 'completed' | 'error';
}

// ========================
// SERP Monitor Types
// ========================

export interface KeywordData {
  id: string;
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  positionChange: number;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  url: string;
  intent: 'informational' | 'navigational' | 'commercial' | 'transactional';
  category: string;
  lastUpdated: string;
}

export interface VisibilityScore {
  overall: number;
  organic: number;
  paid: number;
  local: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CompetitorPosition {
  competitorId: string;
  competitor: string;
  keyword: string;
  position: number;
  change: number;
  visibility: number;
}

export interface SERPFeature {
  id: string;
  keyword: string;
  feature: 'featured_snippet' | 'local_pack' | 'people_also_ask' | 'image_pack' | 'video' | 'shopping' | 'news';
  present: boolean;
  owned: boolean;
  competitor: string | null;
  opportunity: 'high' | 'medium' | 'low';
}

export interface BidLandscapeData {
  keyword: string;
  position: number;
  estimatedBid: number;
  estimatedCPC: number;
  competitorBids: {
    competitor: string;
    estimatedBid: number;
    position: number;
  }[];
  recommendedBid: number;
  budgetImpact: number;
}

export interface SERPMonitorData {
  keywords: KeywordData[];
  visibilityScore: VisibilityScore;
  competitorPositions: CompetitorPosition[];
  serpFeatures: SERPFeature[];
  bidLandscape: BidLandscapeData[];
  trends: {
    positionTrends: ChartDataPoint[];
    visibilityTrends: ChartDataPoint[];
    volumeTrends: ChartDataPoint[];
  };
  summary: {
    totalKeywords: number;
    averagePosition: number;
    topPositions: number; // Keywords in positions 1-3
    improvedPositions: number;
    declinedPositions: number;
  };
  lastUpdated: string;
  analysisStatus: 'analyzing' | 'completed' | 'error';
}

// ========================
// Component Props Types
// ========================

export interface BaseComponentProps {
  shopName: string;
  dateRange?: DateRange;
  refreshInterval?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export interface DataVisualizationProps extends BaseComponentProps {
  height?: number;
  showExport?: boolean;
  showFilters?: boolean;
  className?: string;
}

// ========================
// Export/Filter Types
// ========================

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'png';
  filename?: string;
  dateRange?: DateRange;
  selectedData?: string[];
}

export interface FilterState {
  dateRange: DateRange;
  categories: FilterOption[];
  metrics: FilterOption[];
  segments: FilterOption[];
  searchQuery: string;
}

// ========================
// API Response Types
// ========================

export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
  cacheHit?: boolean;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}