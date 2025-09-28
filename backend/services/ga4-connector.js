/**
 * Google Analytics 4 (GA4) Connector Service
 * Integrates with GA4 API to pull traffic data, user behavior, and conversion insights
 *
 * Features:
 * - Real-time and historical traffic data extraction
 * - User behavior and engagement metrics
 * - Demographic and geographic insights
 * - Device and browser pattern analysis
 * - Conversion funnel tracking
 * - Attribution analysis
 */

import { google } from 'googleapis';
import logger from './logger.js';
import dataStore from './data-store.js';

class GA4Connector {
  constructor() {
    this.analyticsData = null;
    this.propertyCache = new Map();
    this.cacheTtl = 5 * 60 * 1000; // 5 minutes for real-time data

    console.log('📈 GA4 Connector initialized');
  }

  /**
   * Initialize GA4 API client with credentials
   * @param {object} credentials - Service account credentials or OAuth tokens
   * @returns {Promise<void>}
   */
  async initialize(credentials) {
    try {
      let auth;

      if (credentials.type === 'service_account') {
        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key
          },
          scopes: ['https://www.googleapis.com/auth/analytics.readonly']
        });
      } else if (credentials.access_token) {
        auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: credentials.access_token });
      } else {
        throw new Error('Invalid credentials format. Provide service_account or access_token');
      }

      this.analyticsData = google.analyticsdata({
        version: 'v1beta',
        auth
      });

      logger.info('GA4 API client initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize GA4 API client', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get traffic data by hour of day
   * @param {string} propertyId - GA4 Property ID (format: properties/123456789)
   * @param {number} daysBack - Days of historical data
   * @returns {Promise<object>} Hourly traffic data
   */
  async getHourlyTraffic(propertyId, daysBack = 30) {
    this._ensureInitialized();

    try {
      const startDate = this._formatDate(new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000));
      const endDate = this._formatDate(new Date());

      const response = await this.analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: 'hour' },
            { name: 'date' }
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'engagedSessions' },
            { name: 'conversions' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'screenPageViews' }
          ],
          orderBys: [
            { dimension: { dimensionName: 'date' }, desc: false },
            { dimension: { dimensionName: 'hour' }, desc: false }
          ]
        }
      });

      const hourlyData = this._parseHourlyData(response.data);

      logger.info('Hourly traffic data retrieved from GA4', {
        propertyId,
        daysBack,
        dataPoints: hourlyData.length
      });

      return {
        propertyId,
        dateRange: { startDate, endDate },
        hourlyData,
        summary: this._summarizeHourlyTraffic(hourlyData)
      };

    } catch (error) {
      logger.error('Failed to get hourly traffic from GA4', {
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get traffic data by day of week
   * @param {string} propertyId - GA4 Property ID
   * @param {number} weeksBack - Weeks of historical data
   * @returns {Promise<object>} Daily traffic patterns
   */
  async getDailyTraffic(propertyId, weeksBack = 12) {
    this._ensureInitialized();

    try {
      const startDate = this._formatDate(new Date(Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000));
      const endDate = this._formatDate(new Date());

      const response = await this.analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: 'dayOfWeek' },
            { name: 'date' }
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'conversions' },
            { name: 'engagementRate' },
            { name: 'userEngagementDuration' }
          ],
          orderBys: [
            { dimension: { dimensionName: 'date' }, desc: false }
          ]
        }
      });

      const dailyData = this._parseDailyData(response.data);

      logger.info('Daily traffic data retrieved from GA4', {
        propertyId,
        weeksBack,
        dataPoints: dailyData.length
      });

      return {
        propertyId,
        dateRange: { startDate, endDate },
        dailyData,
        summary: this._summarizeDailyTraffic(dailyData)
      };

    } catch (error) {
      logger.error('Failed to get daily traffic from GA4', {
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get demographic insights
   * @param {string} propertyId - GA4 Property ID
   * @param {number} daysBack - Days of historical data
   * @returns {Promise<object>} Demographic data
   */
  async getDemographics(propertyId, daysBack = 30) {
    this._ensureInitialized();

    try {
      const startDate = this._formatDate(new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000));
      const endDate = this._formatDate(new Date());

      const [ageResponse, genderResponse] = await Promise.all([
        // Age data
        this.analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'userAgeBracket' }],
            metrics: [
              { name: 'totalUsers' },
              { name: 'conversions' },
              { name: 'engagementRate' }
            ]
          }
        }),
        // Gender data
        this.analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'userGender' }],
            metrics: [
              { name: 'totalUsers' },
              { name: 'conversions' },
              { name: 'engagementRate' }
            ]
          }
        })
      ]);

      const demographics = {
        age: this._parseResponse(ageResponse.data),
        gender: this._parseResponse(genderResponse.data),
        summary: this._summarizeDemographics(ageResponse.data, genderResponse.data)
      };

      logger.info('Demographics data retrieved from GA4', {
        propertyId,
        ageGroups: demographics.age.length,
        genderGroups: demographics.gender.length
      });

      return demographics;

    } catch (error) {
      logger.error('Failed to get demographics from GA4', {
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get geographic insights
   * @param {string} propertyId - GA4 Property ID
   * @param {number} daysBack - Days of historical data
   * @returns {Promise<object>} Geographic data
   */
  async getGeographics(propertyId, daysBack = 30) {
    this._ensureInitialized();

    try {
      const startDate = this._formatDate(new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000));
      const endDate = this._formatDate(new Date());

      const [countryResponse, cityResponse] = await Promise.all([
        // Country data
        this.analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'country' }],
            metrics: [
              { name: 'totalUsers' },
              { name: 'sessions' },
              { name: 'conversions' },
              { name: 'engagementRate' }
            ],
            orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
            limit: 50
          }
        }),
        // City data
        this.analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'city' }, { name: 'country' }],
            metrics: [
              { name: 'totalUsers' },
              { name: 'conversions' }
            ],
            orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
            limit: 100
          }
        })
      ]);

      const geographics = {
        countries: this._parseResponse(countryResponse.data),
        cities: this._parseResponse(cityResponse.data),
        topMarkets: this._identifyTopMarkets(countryResponse.data),
        summary: this._summarizeGeographics(countryResponse.data)
      };

      logger.info('Geographic data retrieved from GA4', {
        propertyId,
        countries: geographics.countries.length,
        cities: geographics.cities.length
      });

      return geographics;

    } catch (error) {
      logger.error('Failed to get geographics from GA4', {
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get device and browser patterns
   * @param {string} propertyId - GA4 Property ID
   * @param {number} daysBack - Days of historical data
   * @returns {Promise<object>} Device and browser data
   */
  async getDevicePatterns(propertyId, daysBack = 30) {
    this._ensureInitialized();

    try {
      const startDate = this._formatDate(new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000));
      const endDate = this._formatDate(new Date());

      const [deviceResponse, browserResponse, osResponse] = await Promise.all([
        // Device category
        this.analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'conversions' },
              { name: 'bounceRate' },
              { name: 'averageSessionDuration' }
            ]
          }
        }),
        // Browser
        this.analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'browser' }],
            metrics: [
              { name: 'sessions' },
              { name: 'conversions' },
              { name: 'engagementRate' }
            ],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 20
          }
        }),
        // Operating System
        this.analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'operatingSystem' }],
            metrics: [
              { name: 'sessions' },
              { name: 'conversions' }
            ],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 10
          }
        })
      ]);

      const devicePatterns = {
        devices: this._parseResponse(deviceResponse.data),
        browsers: this._parseResponse(browserResponse.data),
        operatingSystems: this._parseResponse(osResponse.data),
        recommendations: this._generateDeviceRecommendations(deviceResponse.data),
        summary: this._summarizeDevicePatterns(deviceResponse.data)
      };

      logger.info('Device patterns retrieved from GA4', {
        propertyId,
        devices: devicePatterns.devices.length,
        browsers: devicePatterns.browsers.length
      });

      return devicePatterns;

    } catch (error) {
      logger.error('Failed to get device patterns from GA4', {
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get conversion funnel data
   * @param {string} propertyId - GA4 Property ID
   * @param {Array<string>} funnelSteps - Event names representing funnel steps
   * @param {number} daysBack - Days of historical data
   * @returns {Promise<object>} Funnel analysis
   */
  async getConversionFunnel(propertyId, funnelSteps, daysBack = 30) {
    this._ensureInitialized();

    try {
      const startDate = this._formatDate(new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000));
      const endDate = this._formatDate(new Date());

      const funnelData = [];

      for (const step of funnelSteps) {
        const response = await this.analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'eventName' }],
            metrics: [
              { name: 'eventCount' },
              { name: 'totalUsers' }
            ],
            dimensionFilter: {
              filter: {
                fieldName: 'eventName',
                stringFilter: {
                  matchType: 'EXACT',
                  value: step
                }
              }
            }
          }
        });

        const stepData = this._parseResponse(response.data);
        funnelData.push({
          step,
          data: stepData.length > 0 ? stepData[0] : { eventCount: 0, totalUsers: 0 }
        });
      }

      const analysis = this._analyzeFunnel(funnelData);

      logger.info('Conversion funnel data retrieved from GA4', {
        propertyId,
        steps: funnelSteps.length
      });

      return {
        propertyId,
        dateRange: { startDate, endDate },
        funnelSteps: funnelData,
        analysis,
        dropoffPoints: this._identifyDropoffPoints(funnelData)
      };

    } catch (error) {
      logger.error('Failed to get conversion funnel from GA4', {
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get real-time active users
   * @param {string} propertyId - GA4 Property ID
   * @returns {Promise<object>} Real-time data
   */
  async getRealTimeData(propertyId) {
    this._ensureInitialized();

    try {
      const response = await this.analyticsData.properties.runRealtimeReport({
        property: propertyId,
        requestBody: {
          dimensions: [
            { name: 'deviceCategory' },
            { name: 'country' }
          ],
          metrics: [
            { name: 'activeUsers' }
          ]
        }
      });

      const realTimeData = this._parseResponse(response.data);

      logger.info('Real-time data retrieved from GA4', {
        propertyId,
        activeUsers: realTimeData.reduce((sum, d) => sum + (parseInt(d.activeUsers) || 0), 0)
      });

      return {
        propertyId,
        timestamp: new Date().toISOString(),
        data: realTimeData,
        totalActiveUsers: realTimeData.reduce((sum, d) => sum + (parseInt(d.activeUsers) || 0), 0)
      };

    } catch (error) {
      logger.error('Failed to get real-time data from GA4', {
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Store GA4 data to data store for analysis
   * @param {string} tenantId - Tenant identifier
   * @param {string} propertyId - GA4 Property ID
   * @param {number} daysBack - Days of historical data
   * @returns {Promise<object>} Storage results
   */
  async syncToDataStore(tenantId, propertyId, daysBack = 30) {
    try {
      const [hourlyTraffic, dailyTraffic, demographics, geographics, devicePatterns] = await Promise.all([
        this.getHourlyTraffic(propertyId, daysBack),
        this.getDailyTraffic(propertyId, Math.ceil(daysBack / 7)),
        this.getDemographics(propertyId, daysBack),
        this.getGeographics(propertyId, daysBack),
        this.getDevicePatterns(propertyId, daysBack)
      ]);

      // Store in data store
      await Promise.all([
        dataStore.setTenantConfig(tenantId, 'ga4_hourly_traffic', hourlyTraffic),
        dataStore.setTenantConfig(tenantId, 'ga4_daily_traffic', dailyTraffic),
        dataStore.setTenantConfig(tenantId, 'ga4_demographics', demographics),
        dataStore.setTenantConfig(tenantId, 'ga4_geographics', geographics),
        dataStore.setTenantConfig(tenantId, 'ga4_device_patterns', devicePatterns)
      ]);

      logger.info('GA4 data synced to data store', {
        tenantId,
        propertyId,
        daysBack
      });

      return {
        success: true,
        tenantId,
        propertyId,
        syncedAt: new Date().toISOString(),
        dataTypes: ['hourly_traffic', 'daily_traffic', 'demographics', 'geographics', 'device_patterns']
      };

    } catch (error) {
      logger.error('Failed to sync GA4 data to data store', {
        tenantId,
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  _ensureInitialized() {
    if (!this.analyticsData) {
      throw new Error('GA4 Connector not initialized. Call initialize() first with credentials.');
    }
  }

  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _parseResponse(data) {
    if (!data.rows || data.rows.length === 0) return [];

    const dimensionHeaders = (data.dimensionHeaders || []).map(h => h.name);
    const metricHeaders = (data.metricHeaders || []).map(h => h.name);

    return data.rows.map(row => {
      const result = {};

      dimensionHeaders.forEach((header, index) => {
        result[header] = row.dimensionValues[index].value;
      });

      metricHeaders.forEach((header, index) => {
        result[header] = parseFloat(row.metricValues[index].value) || 0;
      });

      return result;
    });
  }

  _parseHourlyData(data) {
    const parsed = this._parseResponse(data);
    return parsed.map(row => ({
      date: row.date,
      hour: parseInt(row.hour),
      sessions: row.sessions,
      users: row.totalUsers,
      engagedSessions: row.engagedSessions,
      conversions: row.conversions,
      bounceRate: row.bounceRate,
      avgSessionDuration: row.averageSessionDuration,
      pageViews: row.screenPageViews,
      engagementRate: row.engagedSessions > 0 ? (row.engagedSessions / row.sessions) * 100 : 0
    }));
  }

  _parseDailyData(data) {
    const parsed = this._parseResponse(data);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return parsed.map(row => ({
      date: row.date,
      dayOfWeek: dayNames[parseInt(row.dayOfWeek)],
      sessions: row.sessions,
      users: row.totalUsers,
      conversions: row.conversions,
      engagementRate: row.engagementRate,
      userEngagementDuration: row.userEngagementDuration
    }));
  }

  _summarizeHourlyTraffic(hourlyData) {
    const hourlyTotals = {};

    hourlyData.forEach(row => {
      if (!hourlyTotals[row.hour]) {
        hourlyTotals[row.hour] = {
          sessions: 0,
          users: 0,
          conversions: 0,
          count: 0
        };
      }

      hourlyTotals[row.hour].sessions += row.sessions;
      hourlyTotals[row.hour].users += row.users;
      hourlyTotals[row.hour].conversions += row.conversions;
      hourlyTotals[row.hour].count++;
    });

    const peakHour = Object.entries(hourlyTotals)
      .sort((a, b) => b[1].sessions - a[1].sessions)[0];

    return {
      totalSessions: Object.values(hourlyTotals).reduce((sum, h) => sum + h.sessions, 0),
      totalUsers: Object.values(hourlyTotals).reduce((sum, h) => sum + h.users, 0),
      totalConversions: Object.values(hourlyTotals).reduce((sum, h) => sum + h.conversions, 0),
      peakHour: peakHour ? { hour: parseInt(peakHour[0]), sessions: peakHour[1].sessions } : null
    };
  }

  _summarizeDailyTraffic(dailyData) {
    const dailyTotals = {};

    dailyData.forEach(row => {
      if (!dailyTotals[row.dayOfWeek]) {
        dailyTotals[row.dayOfWeek] = {
          sessions: 0,
          users: 0,
          conversions: 0,
          count: 0
        };
      }

      dailyTotals[row.dayOfWeek].sessions += row.sessions;
      dailyTotals[row.dayOfWeek].users += row.users;
      dailyTotals[row.dayOfWeek].conversions += row.conversions;
      dailyTotals[row.dayOfWeek].count++;
    });

    const bestDay = Object.entries(dailyTotals)
      .sort((a, b) => b[1].conversions - a[1].conversions)[0];

    return {
      totalSessions: Object.values(dailyTotals).reduce((sum, d) => sum + d.sessions, 0),
      bestDay: bestDay ? { day: bestDay[0], conversions: bestDay[1].conversions } : null
    };
  }

  _summarizeDemographics(ageData, genderData) {
    const age = this._parseResponse(ageData);
    const gender = this._parseResponse(genderData);

    return {
      topAgeGroup: age.sort((a, b) => b.totalUsers - a.totalUsers)[0],
      genderDistribution: gender
    };
  }

  _summarizeGeographics(countryData) {
    const countries = this._parseResponse(countryData);
    return {
      totalCountries: countries.length,
      topCountry: countries[0]
    };
  }

  _summarizeDevicePatterns(deviceData) {
    const devices = this._parseResponse(deviceData);
    return {
      totalSessions: devices.reduce((sum, d) => sum + d.sessions, 0),
      deviceDistribution: devices.map(d => ({
        device: d.deviceCategory,
        sessions: d.sessions,
        percentage: 0 // Will be calculated
      }))
    };
  }

  _identifyTopMarkets(countryData) {
    const countries = this._parseResponse(countryData);
    return countries
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10)
      .map(c => ({
        country: c.country,
        users: c.totalUsers,
        conversions: c.conversions,
        conversionRate: c.sessions > 0 ? (c.conversions / c.sessions) * 100 : 0
      }));
  }

  _generateDeviceRecommendations(deviceData) {
    const devices = this._parseResponse(deviceData);
    const recommendations = [];

    devices.forEach(device => {
      const conversionRate = device.sessions > 0 ? (device.conversions / device.sessions) * 100 : 0;

      if (conversionRate < 1) {
        recommendations.push({
          device: device.deviceCategory,
          issue: 'low_conversion_rate',
          recommendation: `Optimize landing pages for ${device.deviceCategory} devices`,
          priority: 'high'
        });
      }

      if (device.bounceRate > 70) {
        recommendations.push({
          device: device.deviceCategory,
          issue: 'high_bounce_rate',
          recommendation: `Improve ${device.deviceCategory} user experience`,
          priority: 'medium'
        });
      }
    });

    return recommendations;
  }

  _analyzeFunnel(funnelData) {
    const totalUsers = funnelData[0]?.data.totalUsers || 0;
    const conversionRate = funnelData.length > 1
      ? (funnelData[funnelData.length - 1].data.totalUsers / totalUsers) * 100
      : 0;

    return {
      totalUsers,
      finalConversions: funnelData[funnelData.length - 1]?.data.totalUsers || 0,
      overallConversionRate: conversionRate,
      stepConversionRates: this._calculateStepConversionRates(funnelData)
    };
  }

  _calculateStepConversionRates(funnelData) {
    const rates = [];

    for (let i = 1; i < funnelData.length; i++) {
      const previousUsers = funnelData[i - 1].data.totalUsers;
      const currentUsers = funnelData[i].data.totalUsers;

      rates.push({
        from: funnelData[i - 1].step,
        to: funnelData[i].step,
        conversionRate: previousUsers > 0 ? (currentUsers / previousUsers) * 100 : 0,
        dropoff: previousUsers - currentUsers
      });
    }

    return rates;
  }

  _identifyDropoffPoints(funnelData) {
    const rates = this._calculateStepConversionRates(funnelData);
    return rates
      .filter(r => r.conversionRate < 50) // Significant dropoff
      .map(r => ({
        step: r.from,
        nextStep: r.to,
        dropoffRate: 100 - r.conversionRate,
        usersLost: r.dropoff,
        priority: r.conversionRate < 25 ? 'high' : 'medium'
      }));
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      initialized: !!this.analyticsData,
      cachedProperties: this.propertyCache.size
    };
  }
}

// Export singleton instance
const ga4Connector = new GA4Connector();

export default ga4Connector;
export { GA4Connector };