# Multi-Agent Development Protocols

## Agent Specializations

### 1. Backend-Architect

**Expertise**: Server architecture, API design, modular systems
**Primary Tasks**: Server refactoring, route organization, middleware design
**Files**: `backend/server.js`, `backend/routes/`, `backend/middleware/`
**Success Criteria**: <500 lines per file, clean separation of concerns

### 2. Multi-Tenant-Specialist

**Expertise**: Multi-tenancy patterns, tenant isolation, configuration management
**Primary Tasks**: Tenant registry, per-tenant caching, configuration inheritance
**Files**: `backend/services/tenant-*`, tenant-aware middleware
**Success Criteria**: Complete tenant isolation, scalable architecture

### 3. Sheets-Optimizer

**Expertise**: Google Sheets API, caching strategies, rate limit management
**Primary Tasks**: Connection pooling, batch operations, cache optimization
**Files**: `backend/services/sheets-*`, `backend/services/cache-*`
**Success Criteria**: Zero 429 errors, <200ms API response times

### 4. Shopify-Frontend-Developer

**Expertise**: Remix/React, Shopify Polaris, authentication flows
**Primary Tasks**: UI components, authentication, backend integration
**Files**: `shopify-ui/app/`, authentication and API services
**Success Criteria**: Complete functional UI, seamless user experience

### 5. Audience-Systems-Developer

**Expertise**: Data processing, segmentation, privacy compliance
**Primary Tasks**: Shopify sync, segment engine, CSV exports
**Files**: `backend/services/shopify-sync.js`, segment-related services
**Success Criteria**: Real-time segmentation, GDPR compliance

### 6. AI-Content-Developer

**Expertise**: AI integration, content generation, quality validation
**Primary Tasks**: AI provider abstraction, RSA generation, content workflows
**Files**: `backend/services/ai-*`, content generation systems
**Success Criteria**: High-quality AI-generated content, approval workflows

### 7. QA-Test-Engineer

**Expertise**: Testing strategies, quality assurance, automation
**Primary Tasks**: Unit tests, integration tests, performance validation
**Files**: `backend/tests/`, `shopify-ui/app/tests/`, performance tests
**Success Criteria**: >90% test coverage, comprehensive test suite

### 8. Security-Specialist

**Expertise**: Security audit, compliance, threat mitigation
**Primary Tasks**: Security review, GDPR compliance, rate limiting
**Files**: Security middleware, privacy services, audit documentation
**Success Criteria**: Zero critical vulnerabilities, compliance certification

### 9. DevOps-Engineer

**Expertise**: Deployment, infrastructure, monitoring
**Primary Tasks**: Docker setup, environment management, observability
**Files**: `Dockerfile`, deployment configs, monitoring setup
**Success Criteria**: Production-ready deployment, comprehensive monitoring

### 10. Performance-Engineer

**Expertise**: Optimization, scalability, performance tuning
**Primary Tasks**: Caching optimization, connection pooling, response optimization
**Files**: Performance-related services, optimization middleware
**Success Criteria**: Meet all performance benchmarks

### 11. Documentation-Specialist

**Expertise**: Technical writing, API documentation, user guides
**Primary Tasks**: API docs, deployment guides, troubleshooting
**Files**: `docs/` directory, README files, operational guides
**Success Criteria**: Complete, accurate documentation

## Task Assignment Protocol

### Phase-Based Assignment

```
Phase 1 (Weeks 1-3): Foundation
- Backend-Architect → Epic 1.1
- Multi-Tenant-Specialist → Epic 1.2
- Sheets-Optimizer → Epic 1.3

Phase 2 (Weeks 4-7): Features
- Shopify-Frontend-Developer → Epic 2.1
- Audience-Systems-Developer → Epic 2.2
- AI-Content-Developer → Epic 2.3

Phase 3 (Weeks 8-9): Quality
- QA-Test-Engineer → Epic 3.1
- Security-Specialist → Epic 3.2

Phase 4 (Weeks 10-12): Production
- DevOps-Engineer → Epic 4.1
- Performance-Engineer → Epic 4.2
- Documentation-Specialist → Epic 4.3
```

### Parallel Work Rules

1. **Independent Modules**: Agents work on separate files/directories
2. **Shared Dependencies**: Clear handoff protocols for dependent tasks
3. **Integration Points**: Defined interfaces between modules
4. **Conflict Resolution**: Last-commit-wins with manual merge for conflicts

## Communication Standards

### Roadmap Updates

Each agent MUST update the roadmap for every task:

```markdown
#### Task X.X.X: Task Name

- **Agent Notes**: [What was implemented, decisions made, challenges]
- **Completion Status**: ✅ Complete / ⚠️ Partial / ❌ Not Started
- **Audit Report**: [Self-audit findings, test results, recommendations]
```

### Todo Integration

Use TodoWrite for all task tracking:

```javascript
// Example agent workflow
1. TodoWrite: Mark task as in_progress
2. Implement solution
3. Self-test and validate
4. TodoWrite: Mark task as completed
5. Update roadmap with detailed notes
```

### Handoff Protocol

When completing tasks with dependencies:

1. **Document Interfaces**: Clear API contracts
2. **Provide Examples**: Working code examples
3. **Test Integration**: Verify dependent systems work
4. **Update Dependencies**: Notify dependent agents in roadmap

## Quality Gates

### Before Marking Complete

1. **Self-Audit**: Review own code for quality, security, performance
2. **Test Coverage**: Ensure adequate testing
3. **Documentation**: Update relevant docs and comments
4. **Performance**: Verify meets performance requirements
5. **Security**: Check for vulnerabilities and compliance

### Code Standards

- **TypeScript**: Use strict typing where applicable
- **Error Handling**: Comprehensive error handling and logging
- **Caching**: Consider caching implications for all data operations
- **Security**: Validate all inputs, secure all endpoints
- **Performance**: Optimize for expected load

### File Organization

```
backend/
├── routes/           # <200 lines each
├── services/         # <300 lines each
├── middleware/       # <150 lines each
├── tests/           # Comprehensive coverage
└── utils/           # <100 lines each

shopify-ui/
├── app/
│   ├── components/  # <250 lines each
│   ├── services/    # <200 lines each
│   └── routes/      # <150 lines each
└── tests/           # Component tests
```

## Emergency Protocols

### Task Blocking

If an agent encounters blocking issues:

1. **Document Blocker**: Update roadmap with specific issue
2. **Suggest Workaround**: Propose alternative approaches
3. **Request Assistance**: Mark task for review by specialist
4. **Continue Parallel Work**: Move to non-dependent tasks

### Integration Failures

When modules don't integrate properly:

1. **Isolate Issue**: Identify specific integration point
2. **Review Interfaces**: Validate API contracts
3. **Test Independently**: Verify each module works in isolation
4. **Coordinate Fix**: Update interfaces and test integration

### Performance Issues

If performance targets aren't met:

1. **Profile Code**: Identify bottlenecks
2. **Optimize Critical Path**: Focus on high-impact optimizations
3. **Review Architecture**: Consider architectural changes
4. **Request Performance Review**: Escalate to Performance-Engineer

## Success Metrics

### Individual Agent Success

- **Task Completion**: All assigned tasks completed on time
- **Quality**: Zero critical issues in code review
- **Documentation**: Complete and accurate task documentation
- **Integration**: Smooth handoff to dependent agents

### Team Success

- **Timeline**: All phases completed within planned timeframe
- **Quality**: System meets all technical and business KPIs
- **Maintainability**: Code is well-organized and documented
- **Scalability**: Architecture supports growth requirements
