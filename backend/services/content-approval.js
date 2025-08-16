/**
 * Content Approval Workflow Service for ProofKit SaaS
 * Manages approval pipeline with review states and workflow automation
 */

import { getAIProviderService } from './ai-provider.js';

/**
 * Content approval states
 */
export const APPROVAL_STATES = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_REVISION: 'needs_revision',
  ARCHIVED: 'archived'
};

/**
 * Content types supported by the approval system
 */
export const CONTENT_TYPES = {
  RSA_HEADLINES: 'rsa_headlines',
  RSA_DESCRIPTIONS: 'rsa_descriptions',
  SITELINKS: 'sitelinks',
  CALLOUTS: 'callouts',
  SNIPPETS: 'snippets',
  NEGATIVE_KEYWORDS: 'negative_keywords'
};

/**
 * Content Approval Workflow Manager
 */
export class ContentApprovalWorkflow {
  constructor() {
    this.aiService = getAIProviderService();
    this.approvalQueue = new Map();
    this.reviewHistory = new Map();
    this.automationRules = new Map();
    this.workflows = new Map();
    
    // Initialize default automation rules
    this.initializeDefaultRules();
  }

  /**
   * Submit content for approval
   */
  async submitForApproval(content, options = {}) {
    const {
      contentType = CONTENT_TYPES.RSA_HEADLINES,
      tenant = 'default',
      submittedBy = 'system',
      priority = 'normal',
      autoApprove = false,
      metadata = {}
    } = options;

    try {
      const submissionId = this.generateSubmissionId();
      const timestamp = new Date().toISOString();

      const submission = {
        id: submissionId,
        contentType,
        content,
        tenant,
        submittedBy,
        priority,
        timestamp,
        status: APPROVAL_STATES.DRAFT,
        metadata,
        history: [{
          action: 'submitted',
          timestamp,
          user: submittedBy,
          details: 'Content submitted for approval'
        }],
        autoQualityCheck: await this.performAutoQualityCheck(content, contentType),
        assignedReviewer: null,
        reviewDeadline: this.calculateReviewDeadline(priority)
      };

      // Store in approval queue
      this.approvalQueue.set(submissionId, submission);

      // Apply automation rules
      if (autoApprove) {
        return await this.processAutomation(submissionId);
      } else {
        return await this.moveToReview(submissionId);
      }
    } catch (error) {
      console.error('Approval submission failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Perform automatic quality check on content
   */
  async performAutoQualityCheck(content, contentType) {
    const checks = {
      validFormat: false,
      lengthCompliance: false,
      languageQuality: false,
      brandGuidelines: false,
      overallScore: 0,
      issues: [],
      suggestions: []
    };

    try {
      // Format validation
      checks.validFormat = this.validateContentFormat(content, contentType);
      
      // Length compliance check
      checks.lengthCompliance = this.validateContentLength(content, contentType);
      
      // Language quality assessment using AI
      if (typeof content === 'string' || Array.isArray(content)) {
        checks.languageQuality = await this.assessLanguageQuality(content);
      }
      
      // Brand guidelines check
      checks.brandGuidelines = this.checkBrandGuidelines(content);
      
      // Calculate overall score
      const scores = [
        checks.validFormat ? 25 : 0,
        checks.lengthCompliance ? 25 : 0,
        checks.languageQuality ? 25 : 0,
        checks.brandGuidelines ? 25 : 0
      ];
      checks.overallScore = scores.reduce((sum, score) => sum + score, 0);
      
      // Generate issues and suggestions
      if (!checks.validFormat) {
        checks.issues.push('Invalid content format');
      }
      if (!checks.lengthCompliance) {
        checks.issues.push('Content length does not meet requirements');
      }
      if (!checks.languageQuality) {
        checks.issues.push('Language quality needs improvement');
      }
      if (!checks.brandGuidelines) {
        checks.issues.push('Content may not align with brand guidelines');
      }

    } catch (error) {
      checks.issues.push(`Quality check error: ${error.message}`);
    }

    return checks;
  }

  /**
   * Validate content format based on type
   */
  validateContentFormat(content, contentType) {
    switch (contentType) {
      case CONTENT_TYPES.RSA_HEADLINES:
        return Array.isArray(content) && content.every(h => typeof h === 'string');
      case CONTENT_TYPES.RSA_DESCRIPTIONS:
        return Array.isArray(content) && content.every(d => typeof d === 'string');
      case CONTENT_TYPES.SITELINKS:
        return Array.isArray(content) && content.every(s => 
          s.text && s.final_url && typeof s.text === 'string'
        );
      case CONTENT_TYPES.CALLOUTS:
        return Array.isArray(content) && content.every(c => typeof c === 'string');
      case CONTENT_TYPES.NEGATIVE_KEYWORDS:
        return Array.isArray(content) && content.every(k => 
          k.keyword && typeof k.keyword === 'string'
        );
      default:
        return true; // Unknown types pass by default
    }
  }

  /**
   * Validate content length compliance
   */
  validateContentLength(content, contentType) {
    switch (contentType) {
      case CONTENT_TYPES.RSA_HEADLINES:
        return Array.isArray(content) && content.every(h => h.length <= 30);
      case CONTENT_TYPES.RSA_DESCRIPTIONS:
        return Array.isArray(content) && content.every(d => d.length <= 90);
      case CONTENT_TYPES.SITELINKS:
        return Array.isArray(content) && content.every(s => 
          s.text.length <= 25 && (s.line1 || '').length <= 35 && (s.line2 || '').length <= 35
        );
      case CONTENT_TYPES.CALLOUTS:
        return Array.isArray(content) && content.every(c => c.length <= 25);
      default:
        return true;
    }
  }

  /**
   * Assess language quality using AI
   */
  async assessLanguageQuality(content) {
    try {
      const textToAnalyze = Array.isArray(content) ? content.join(' ') : String(content);
      
      if (textToAnalyze.trim().length === 0) return false;
      
      const prompt = `Analyze this advertising content for language quality. Check for:
- Grammar and spelling errors
- Clarity and readability
- Professional tone
- Call-to-action effectiveness

Content: "${textToAnalyze}"

Return only "PASS" or "FAIL" based on whether the content meets professional advertising standards.`;

      const result = await this.aiService.generateText(prompt);
      return result.trim().toUpperCase() === 'PASS';
    } catch (error) {
      console.warn('Language quality assessment failed:', error);
      return true; // Default to pass on error
    }
  }

  /**
   * Check brand guidelines compliance
   */
  checkBrandGuidelines(content) {
    // Placeholder for brand guidelines check
    // In a real implementation, this would check against configured brand rules
    const forbiddenWords = ['spam', 'scam', 'guaranteed', 'miracle'];
    const textToCheck = Array.isArray(content) 
      ? content.join(' ').toLowerCase() 
      : String(content).toLowerCase();
    
    return !forbiddenWords.some(word => textToCheck.includes(word));
  }

  /**
   * Move content to review state
   */
  async moveToReview(submissionId) {
    const submission = this.approvalQueue.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    submission.status = APPROVAL_STATES.PENDING_REVIEW;
    submission.history.push({
      action: 'moved_to_review',
      timestamp: new Date().toISOString(),
      user: 'system',
      details: 'Content moved to review queue'
    });

    // Auto-assign reviewer if rules exist
    const reviewer = this.findBestReviewer(submission);
    if (reviewer) {
      submission.assignedReviewer = reviewer;
      submission.history.push({
        action: 'assigned_reviewer',
        timestamp: new Date().toISOString(),
        user: 'system',
        details: `Assigned to reviewer: ${reviewer}`
      });
    }

    return {
      success: true,
      submissionId,
      status: submission.status,
      assignedReviewer: submission.assignedReviewer,
      qualityCheck: submission.autoQualityCheck
    };
  }

  /**
   * Process automation rules for auto-approval
   */
  async processAutomation(submissionId) {
    const submission = this.approvalQueue.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const qualityCheck = submission.autoQualityCheck;
    
    // Auto-approve if quality score is high enough
    if (qualityCheck.overallScore >= 80 && qualityCheck.issues.length === 0) {
      return await this.approveContent(submissionId, 'auto-approval-system', {
        reason: 'Auto-approved based on quality checks',
        autoApproval: true
      });
    }

    // Auto-reject if quality score is too low
    if (qualityCheck.overallScore < 40) {
      return await this.rejectContent(submissionId, 'auto-approval-system', {
        reason: 'Auto-rejected due to quality issues',
        issues: qualityCheck.issues
      });
    }

    // Move to manual review for borderline cases
    return await this.moveToReview(submissionId);
  }

  /**
   * Approve content
   */
  async approveContent(submissionId, reviewerId, options = {}) {
    const submission = this.approvalQueue.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const { reason = '', autoApproval = false } = options;

    submission.status = APPROVAL_STATES.APPROVED;
    submission.history.push({
      action: 'approved',
      timestamp: new Date().toISOString(),
      user: reviewerId,
      details: reason || 'Content approved',
      autoApproval
    });

    // Move to history
    this.reviewHistory.set(submissionId, submission);
    this.approvalQueue.delete(submissionId);

    return {
      success: true,
      submissionId,
      status: submission.status,
      approvedBy: reviewerId,
      approvedAt: submission.history[submission.history.length - 1].timestamp
    };
  }

  /**
   * Reject content
   */
  async rejectContent(submissionId, reviewerId, options = {}) {
    const submission = this.approvalQueue.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const { reason = '', issues = [] } = options;

    submission.status = APPROVAL_STATES.REJECTED;
    submission.rejectionReason = reason;
    submission.rejectionIssues = issues;
    submission.history.push({
      action: 'rejected',
      timestamp: new Date().toISOString(),
      user: reviewerId,
      details: reason || 'Content rejected',
      issues
    });

    return {
      success: true,
      submissionId,
      status: submission.status,
      rejectedBy: reviewerId,
      rejectionReason: reason,
      issues
    };
  }

  /**
   * Request revisions for content
   */
  async requestRevisions(submissionId, reviewerId, revisionRequests) {
    const submission = this.approvalQueue.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    submission.status = APPROVAL_STATES.NEEDS_REVISION;
    submission.revisionRequests = revisionRequests;
    submission.history.push({
      action: 'revision_requested',
      timestamp: new Date().toISOString(),
      user: reviewerId,
      details: 'Revisions requested',
      revisionRequests
    });

    return {
      success: true,
      submissionId,
      status: submission.status,
      revisionRequests
    };
  }

  /**
   * Get pending approvals for a reviewer or tenant
   */
  getPendingApprovals(filter = {}) {
    const { reviewer, tenant, contentType, priority } = filter;
    const pending = [];

    for (const [id, submission] of this.approvalQueue) {
      if (submission.status !== APPROVAL_STATES.PENDING_REVIEW) continue;
      
      if (reviewer && submission.assignedReviewer !== reviewer) continue;
      if (tenant && submission.tenant !== tenant) continue;
      if (contentType && submission.contentType !== contentType) continue;
      if (priority && submission.priority !== priority) continue;
      
      pending.push({
        id,
        contentType: submission.contentType,
        tenant: submission.tenant,
        submittedBy: submission.submittedBy,
        timestamp: submission.timestamp,
        priority: submission.priority,
        assignedReviewer: submission.assignedReviewer,
        reviewDeadline: submission.reviewDeadline,
        qualityScore: submission.autoQualityCheck.overallScore
      });
    }

    return pending.sort((a, b) => {
      // Sort by priority then by deadline
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(a.reviewDeadline) - new Date(b.reviewDeadline);
    });
  }

  /**
   * Get submission details
   */
  getSubmission(submissionId) {
    return this.approvalQueue.get(submissionId) || this.reviewHistory.get(submissionId);
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats(tenant = null) {
    const stats = {
      totalSubmissions: 0,
      pendingReview: 0,
      approved: 0,
      rejected: 0,
      needsRevision: 0,
      avgProcessingTime: 0,
      autoApprovalRate: 0
    };

    // Count current queue
    for (const submission of this.approvalQueue.values()) {
      if (tenant && submission.tenant !== tenant) continue;
      stats.totalSubmissions++;
      if (submission.status === APPROVAL_STATES.PENDING_REVIEW) stats.pendingReview++;
      if (submission.status === APPROVAL_STATES.NEEDS_REVISION) stats.needsRevision++;
    }

    // Count history
    let autoApprovals = 0;
    const processingTimes = [];

    for (const submission of this.reviewHistory.values()) {
      if (tenant && submission.tenant !== tenant) continue;
      stats.totalSubmissions++;
      
      if (submission.status === APPROVAL_STATES.APPROVED) {
        stats.approved++;
        
        // Check if auto-approved
        const approvalAction = submission.history.find(h => h.action === 'approved');
        if (approvalAction?.autoApproval) autoApprovals++;
        
        // Calculate processing time
        const submitted = new Date(submission.timestamp);
        const approved = new Date(approvalAction.timestamp);
        processingTimes.push(approved - submitted);
      } else if (submission.status === APPROVAL_STATES.REJECTED) {
        stats.rejected++;
      }
    }

    // Calculate averages
    if (processingTimes.length > 0) {
      stats.avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    }

    if (stats.approved > 0) {
      stats.autoApprovalRate = (autoApprovals / stats.approved) * 100;
    }

    return stats;
  }

  /**
   * Initialize default automation rules
   */
  initializeDefaultRules() {
    // High quality auto-approval rule
    this.automationRules.set('high_quality_auto_approve', {
      condition: (submission) => submission.autoQualityCheck.overallScore >= 90,
      action: 'approve',
      reason: 'High quality content auto-approved'
    });

    // Low quality auto-rejection rule
    this.automationRules.set('low_quality_auto_reject', {
      condition: (submission) => submission.autoQualityCheck.overallScore < 30,
      action: 'reject',
      reason: 'Low quality content auto-rejected'
    });
  }

  /**
   * Find best reviewer for a submission
   */
  findBestReviewer(submission) {
    // Placeholder for reviewer assignment logic
    // In a real implementation, this would consider reviewer workload, expertise, etc.
    const reviewers = ['reviewer1', 'reviewer2', 'reviewer3'];
    return reviewers[Math.floor(Math.random() * reviewers.length)];
  }

  /**
   * Calculate review deadline based on priority
   */
  calculateReviewDeadline(priority) {
    const now = new Date();
    const hours = priority === 'high' ? 4 : priority === 'normal' ? 24 : 72;
    return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  }

  /**
   * Generate unique submission ID
   */
  generateSubmissionId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
let approvalWorkflowInstance = null;

/**
 * Get singleton approval workflow instance
 */
export function getApprovalWorkflow() {
  if (!approvalWorkflowInstance) {
    approvalWorkflowInstance = new ContentApprovalWorkflow();
  }
  return approvalWorkflowInstance;
}

/**
 * Quick submission function for simple use cases
 */
export async function submitContentForApproval(content, contentType, options = {}) {
  const workflow = getApprovalWorkflow();
  return await workflow.submitForApproval(content, { contentType, ...options });
}

/**
 * Batch submit multiple content items
 */
export async function batchSubmitForApproval(submissions) {
  const workflow = getApprovalWorkflow();
  const results = [];

  for (const submission of submissions) {
    try {
      const result = await workflow.submitForApproval(
        submission.content, 
        submission.options || {}
      );
      results.push({ ...submission, result });
    } catch (error) {
      results.push({ 
        ...submission, 
        result: { success: false, error: error.message }
      });
    }
  }

  return results;
}