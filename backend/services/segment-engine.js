/**
 * Segment Engine Service
 * SQL-like segment engine for real-time audience building
 * Supports complex queries with 1M+ customer records
 */

import optimizedSheets from './sheets.js';

class SegmentEngineService {
  constructor() {
    this.operatorMap = new Map([
      ['=', (a, b) => a === b],
      ['!=', (a, b) => a !== b],
      ['>', (a, b) => Number(a) > Number(b)],
      ['>=', (a, b) => Number(a) >= Number(b)],
      ['<', (a, b) => Number(a) < Number(b)],
      ['<=', (a, b) => Number(a) <= Number(b)],
      ['LIKE', (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase())],
      ['NOT LIKE', (a, b) => !String(a).toLowerCase().includes(String(b).toLowerCase())],
      ['IN', (a, b) => Array.isArray(b) ? b.includes(a) : String(b).split(',').map(v => v.trim()).includes(String(a))],
      ['NOT IN', (a, b) => Array.isArray(b) ? !b.includes(a) : !String(b).split(',').map(v => v.trim()).includes(String(a))],
      ['IS NULL', (a) => a === null || a === undefined || a === ''],
      ['IS NOT NULL', (a) => a !== null && a !== undefined && a !== '']
    ]);

    this.aggregateFunctions = new Map([
      ['COUNT', (values) => values.length],
      ['SUM', (values) => values.reduce((sum, val) => sum + Number(val || 0), 0)],
      ['AVG', (values) => values.length > 0 ? values.reduce((sum, val) => sum + Number(val || 0), 0) / values.length : 0],
      ['MIN', (values) => Math.min(...values.map(v => Number(v || 0)))],
      ['MAX', (values) => Math.max(...values.map(v => Number(v || 0)))],
      ['DISTINCT', (values) => [...new Set(values)].length]
    ]);

    // Cache for compiled queries
    this.queryCache = new Map();
    this.segmentCache = new Map();
    
    // Performance metrics
    this.metrics = {
      queriesExecuted: 0,
      avgExecutionTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorsCount: 0
    };
  }

  /**
   * Parse SQL-like query into executable structure
   */
  parseQuery(sqlLike) {
    // Check cache first
    const cacheKey = this.hashQuery(sqlLike);
    if (this.queryCache.has(cacheKey)) {
      this.metrics.cacheHits++;
      return this.queryCache.get(cacheKey);
    }

    this.metrics.cacheMisses++;

    try {
      const normalized = sqlLike.trim().replace(/\s+/g, ' ');
      
      // Parse SELECT clause
      const selectMatch = normalized.match(/SELECT\s+(.*?)\s+FROM/i);
      if (!selectMatch) {
        throw new Error('Invalid SELECT clause');
      }

      const selectClause = selectMatch[1].trim();
      const fields = this.parseSelectFields(selectClause);

      // Parse FROM clause
      const fromMatch = normalized.match(/FROM\s+(\w+)/i);
      if (!fromMatch) {
        throw new Error('Invalid FROM clause');
      }
      const table = fromMatch[1];

      // Parse WHERE clause (optional)
      let conditions = [];
      const whereMatch = normalized.match(/WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
      if (whereMatch) {
        conditions = this.parseWhereClause(whereMatch[1]);
      }

      // Parse GROUP BY (optional)
      let groupBy = null;
      const groupMatch = normalized.match(/GROUP\s+BY\s+([\w,\s]+)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
      if (groupMatch) {
        groupBy = groupMatch[1].split(',').map(f => f.trim());
      }

      // Parse ORDER BY (optional)
      let orderBy = null;
      const orderMatch = normalized.match(/ORDER\s+BY\s+([\w\s,]+?)(?:\s+LIMIT|$)/i);
      if (orderMatch) {
        orderBy = this.parseOrderBy(orderMatch[1]);
      }

      // Parse LIMIT (optional)
      let limit = null;
      const limitMatch = normalized.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        limit = Number(limitMatch[1]);
      }

      const parsed = {
        fields,
        table,
        conditions,
        groupBy,
        orderBy,
        limit,
        originalQuery: sqlLike
      };

      // Cache the parsed query
      this.queryCache.set(cacheKey, parsed);
      
      return parsed;

    } catch (error) {
      throw new Error(`Query parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse SELECT fields
   */
  parseSelectFields(selectClause) {
    if (selectClause === '*') {
      return [{ type: 'field', name: '*' }];
    }

    return selectClause.split(',').map(field => {
      const trimmed = field.trim();
      
      // Check for aggregate functions
      const aggMatch = trimmed.match(/^(COUNT|SUM|AVG|MIN|MAX|DISTINCT)\s*\(\s*(.*?)\s*\)(?:\s+AS\s+(\w+))?$/i);
      if (aggMatch) {
        return {
          type: 'aggregate',
          function: aggMatch[1].toUpperCase(),
          field: aggMatch[2] === '*' ? '*' : aggMatch[2],
          alias: aggMatch[3] || `${aggMatch[1].toLowerCase()}_${aggMatch[2].replace(/[^a-zA-Z0-9]/g, '_')}`
        };
      }

      // Check for alias
      const aliasMatch = trimmed.match(/^(\w+)\s+AS\s+(\w+)$/i);
      if (aliasMatch) {
        return {
          type: 'field',
          name: aliasMatch[1],
          alias: aliasMatch[2]
        };
      }

      return {
        type: 'field',
        name: trimmed
      };
    });
  }

  /**
   * Parse WHERE clause conditions
   */
  parseWhereClause(whereClause) {
    const conditions = [];
    
    // Split by AND/OR (simple implementation)
    const parts = this.splitLogicalOperators(whereClause);
    
    for (const part of parts) {
      if (part.type === 'condition') {
        const condition = this.parseCondition(part.text);
        if (condition) {
          conditions.push(condition);
        }
      } else if (part.type === 'operator') {
        conditions.push({ type: 'logical', operator: part.text });
      }
    }

    return conditions;
  }

  /**
   * Split WHERE clause by logical operators
   */
  splitLogicalOperators(text) {
    const parts = [];
    const regex = /\s+(AND|OR)\s+/gi;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'condition',
          text: text.substring(lastIndex, match.index).trim()
        });
      }
      
      parts.push({
        type: 'operator',
        text: match[1].toUpperCase()
      });
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'condition',
        text: text.substring(lastIndex).trim()
      });
    }

    return parts;
  }

  /**
   * Parse individual condition
   */
  parseCondition(conditionText) {
    const trimmed = conditionText.trim();
    
    // Handle IS NULL / IS NOT NULL
    let match = trimmed.match(/^(\w+)\s+(IS\s+(?:NOT\s+)?NULL)$/i);
    if (match) {
      return {
        type: 'condition',
        field: match[1],
        operator: match[2].toUpperCase(),
        value: null
      };
    }

    // Handle other operators
    const operators = ['>=', '<=', '!=', '=', '>', '<', 'NOT LIKE', 'LIKE', 'NOT IN', 'IN'];
    
    for (const op of operators) {
      const regex = new RegExp(`^(\\w+)\\s+${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(.+)$`, 'i');
      match = trimmed.match(regex);
      
      if (match) {
        let value = match[2].trim();
        
        // Remove quotes
        if ((value.startsWith("'") && value.endsWith("'")) || 
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }

        // Handle IN/NOT IN arrays
        if (op.includes('IN')) {
          if (value.startsWith('(') && value.endsWith(')')) {
            value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
          }
        }

        return {
          type: 'condition',
          field: match[1],
          operator: op.toUpperCase(),
          value
        };
      }
    }

    throw new Error(`Invalid condition: ${conditionText}`);
  }

  /**
   * Parse ORDER BY clause
   */
  parseOrderBy(orderClause) {
    return orderClause.split(',').map(part => {
      const trimmed = part.trim();
      const match = trimmed.match(/^(\w+)(?:\s+(ASC|DESC))?$/i);
      
      if (!match) {
        throw new Error(`Invalid ORDER BY clause: ${part}`);
      }

      return {
        field: match[1],
        direction: (match[2] || 'ASC').toUpperCase()
      };
    });
  }

  /**
   * Execute segment query
   */
  async executeSegment(tenantId, segmentKey, sqlLike, options = {}) {
    const { 
      useCache = true, 
      maxRows = 100000,
      timeoutMs = 30000 
    } = options;

    const startTime = Date.now();
    
    try {
      // Check segment cache
      const cacheKey = `${tenantId}:${segmentKey}`;
      if (useCache && this.segmentCache.has(cacheKey)) {
        const cached = this.segmentCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
          this.metrics.cacheHits++;
          return {
            ...cached.result,
            fromCache: true,
            executionTime: Date.now() - startTime
          };
        }
      }

      this.metrics.cacheMisses++;

      // Parse the query
      const parsedQuery = this.parseQuery(sqlLike);
      
      // Load data from the specified table
      const tableData = await this.loadTableData(tenantId, parsedQuery.table, maxRows);
      
      // Apply filters
      const filteredData = this.applyConditions(tableData, parsedQuery.conditions);
      
      // Apply aggregations and grouping
      let result;
      if (parsedQuery.groupBy) {
        result = this.applyGroupBy(filteredData, parsedQuery.fields, parsedQuery.groupBy);
      } else {
        result = this.applySelect(filteredData, parsedQuery.fields);
      }

      // Apply ordering
      if (parsedQuery.orderBy) {
        result = this.applyOrderBy(result, parsedQuery.orderBy);
      }

      // Apply limit
      if (parsedQuery.limit) {
        result = result.slice(0, parsedQuery.limit);
      }

      const executionTime = Date.now() - startTime;
      
      // Update metrics
      this.metrics.queriesExecuted++;
      this.metrics.avgExecutionTime = 
        (this.metrics.avgExecutionTime + executionTime) / this.metrics.queriesExecuted;

      const segmentResult = {
        segmentKey,
        query: sqlLike,
        totalRows: tableData.length,
        filteredRows: filteredData.length,
        resultRows: result.length,
        executionTime,
        data: result,
        fromCache: false
      };

      // Cache the result
      if (useCache) {
        this.segmentCache.set(cacheKey, {
          result: segmentResult,
          timestamp: Date.now()
        });
      }

      return segmentResult;

    } catch (error) {
      this.metrics.errorsCount++;
      console.error(`Segment execution failed for ${tenantId}:${segmentKey}:`, error);
      throw error;
    }
  }

  /**
   * Load table data from Google Sheets
   */
  async loadTableData(tenantId, tableName, maxRows) {
    const sheetTitle = this.mapTableToSheet(tableName);
    
    try {
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { 
        limit: maxRows,
        useCache: true 
      });
      
      return rows.map(row => this.normalizeRowData(row));
    } catch (error) {
      throw new Error(`Failed to load table ${tableName}: ${error.message}`);
    }
  }

  /**
   * Map table names to sheet titles
   */
  mapTableToSheet(tableName) {
    const tableMap = {
      'customers': 'AUDIENCE_SEEDS',
      'audience_seeds': 'AUDIENCE_SEEDS',
      'products': 'SKU_MARGIN',
      'margins': 'SKU_MARGIN', 
      'stock': 'SKU_STOCK',
      'metrics': 'METRICS',
      'search_terms': 'SEARCH_TERMS'
    };

    return tableMap[tableName.toLowerCase()] || tableName.toUpperCase();
  }

  /**
   * Normalize row data for consistent access
   */
  normalizeRowData(row) {
    if (typeof row === 'object' && row !== null) {
      const normalized = {};
      
      // Handle different row formats
      if (row._rawData && Array.isArray(row._rawData)) {
        // Google Sheets row object
        Object.keys(row).forEach(key => {
          if (!key.startsWith('_') && typeof row[key] !== 'function') {
            normalized[key] = row[key];
          }
        });
      } else {
        // Plain object
        Object.assign(normalized, row);
      }

      return normalized;
    }
    
    return row;
  }

  /**
   * Apply WHERE conditions to filter data
   */
  applyConditions(data, conditions) {
    if (!conditions || conditions.length === 0) {
      return data;
    }

    return data.filter(row => this.evaluateConditions(row, conditions));
  }

  /**
   * Evaluate conditions for a single row
   */
  evaluateConditions(row, conditions) {
    if (conditions.length === 0) return true;

    let result = null;
    let currentOperator = 'AND'; // Default starting operator

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];

      if (condition.type === 'logical') {
        currentOperator = condition.operator;
        continue;
      }

      const conditionResult = this.evaluateCondition(row, condition);

      if (result === null) {
        result = conditionResult;
      } else {
        if (currentOperator === 'AND') {
          result = result && conditionResult;
        } else if (currentOperator === 'OR') {
          result = result || conditionResult;
        }
      }
    }

    return result !== null ? result : true;
  }

  /**
   * Evaluate single condition
   */
  evaluateCondition(row, condition) {
    const fieldValue = this.getFieldValue(row, condition.field);
    const operator = this.operatorMap.get(condition.operator);
    
    if (!operator) {
      throw new Error(`Unknown operator: ${condition.operator}`);
    }

    return operator(fieldValue, condition.value);
  }

  /**
   * Get field value from row
   */
  getFieldValue(row, fieldName) {
    // Handle nested field access (e.g., 'order.total')
    const parts = fieldName.split('.');
    let value = row;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * Apply SELECT fields
   */
  applySelect(data, fields) {
    if (fields.length === 1 && fields[0].name === '*') {
      return data;
    }

    return data.map(row => {
      const selected = {};
      
      for (const field of fields) {
        if (field.type === 'field') {
          const value = this.getFieldValue(row, field.name);
          const key = field.alias || field.name;
          selected[key] = value;
        } else if (field.type === 'aggregate') {
          // Single row aggregates (not common in SELECT without GROUP BY)
          const key = field.alias || field.function.toLowerCase();
          selected[key] = this.calculateAggregate(field.function, [row], field.field);
        }
      }
      
      return selected;
    });
  }

  /**
   * Apply GROUP BY with aggregations
   */
  applyGroupBy(data, fields, groupByFields) {
    const groups = new Map();
    
    // Group the data
    for (const row of data) {
      const groupKey = groupByFields
        .map(field => this.getFieldValue(row, field))
        .join('|');
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(row);
    }

    // Calculate aggregates for each group
    const result = [];
    
    for (const [groupKey, groupRows] of groups) {
      const groupResult = {};
      
      // Add group by fields
      groupByFields.forEach((field, index) => {
        groupResult[field] = groupKey.split('|')[index];
      });

      // Calculate aggregates
      for (const field of fields) {
        if (field.type === 'aggregate') {
          const key = field.alias || field.function.toLowerCase();
          groupResult[key] = this.calculateAggregate(field.function, groupRows, field.field);
        } else if (field.type === 'field' && !groupByFields.includes(field.name)) {
          // Non-aggregate fields in GROUP BY should use first value
          const key = field.alias || field.name;
          groupResult[key] = this.getFieldValue(groupRows[0], field.name);
        }
      }
      
      result.push(groupResult);
    }

    return result;
  }

  /**
   * Calculate aggregate functions
   */
  calculateAggregate(functionName, rows, fieldName) {
    const aggregateFunc = this.aggregateFunctions.get(functionName);
    if (!aggregateFunc) {
      throw new Error(`Unknown aggregate function: ${functionName}`);
    }

    if (fieldName === '*') {
      return aggregateFunc(rows);
    }

    const values = rows
      .map(row => this.getFieldValue(row, fieldName))
      .filter(val => val !== null && val !== undefined && val !== '');

    return aggregateFunc(values);
  }

  /**
   * Apply ORDER BY
   */
  applyOrderBy(data, orderBy) {
    return data.sort((a, b) => {
      for (const order of orderBy) {
        const aVal = this.getFieldValue(a, order.field);
        const bVal = this.getFieldValue(b, order.field);
        
        let comparison = 0;
        
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        
        if (comparison !== 0) {
          return order.direction === 'DESC' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Get predefined segments for a tenant
   */
  async getSegments(tenantId) {
    try {
      const segments = await optimizedSheets.getRows(tenantId, 'AUDIENCE_SEGMENTS', {
        limit: 1000,
        useCache: true
      });

      return segments
        .filter(seg => seg.active !== 'FALSE')
        .map(seg => ({
          segmentKey: seg.segment_key,
          logic: seg.logic_sqlish,
          active: seg.active !== 'FALSE',
          description: seg.description || '',
          lastUpdated: seg.updated_at
        }));
    } catch (error) {
      console.error(`Failed to load segments for tenant ${tenantId}:`, error);
      return [];
    }
  }

  /**
   * Save segment definition
   */
  async saveSegment(tenantId, segmentKey, logic, options = {}) {
    try {
      const segmentData = {
        segment_key: segmentKey,
        logic_sqlish: logic,
        active: String(options.active !== false),
        description: options.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await optimizedSheets.addRow(tenantId, 'AUDIENCE_SEGMENTS', segmentData);
      
      // Clear cache for this segment
      const cacheKey = `${tenantId}:${segmentKey}`;
      this.segmentCache.delete(cacheKey);

      return { success: true, segmentKey };
    } catch (error) {
      throw new Error(`Failed to save segment: ${error.message}`);
    }
  }

  /**
   * Hash query for caching
   */
  hashQuery(query) {
    return require('crypto')
      .createHash('sha256')
      .update(query.trim().toLowerCase())
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Clear caches
   */
  clearCache(pattern = null) {
    if (pattern) {
      // Clear specific pattern
      for (const key of this.segmentCache.keys()) {
        if (key.includes(pattern)) {
          this.segmentCache.delete(key);
        }
      }
    } else {
      // Clear all caches
      this.queryCache.clear();
      this.segmentCache.clear();
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cachedQueries: this.queryCache.size,
      cachedSegments: this.segmentCache.size,
      supportedOperators: Array.from(this.operatorMap.keys()),
      supportedAggregates: Array.from(this.aggregateFunctions.keys())
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics()
    };
  }
}

// Singleton instance
const segmentEngine = new SegmentEngineService();

export default segmentEngine;
export { SegmentEngineService };