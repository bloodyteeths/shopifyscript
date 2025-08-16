# Claude Multi-Agent Development Rules

## Agent Coordination Protocol

### Core Principles
1. **Task-Based Work**: Each agent works on specific tasks from the roadmap
2. **TODO-Driven Progress**: All agents use TodoWrite to track progress
3. **Parallel Execution**: Multiple agents work simultaneously on independent tasks
4. **Audit-First Completion**: Each agent audits their work before marking complete
5. **Efficient Token Usage**: Focus on implementation, minimal discussion

### File Management Standards
- **500 lines maximum** per file (preferred, not mandatory)
- **Modular architecture** with clear separation of concerns
- **Consistent naming conventions** across all components
- **Comprehensive documentation** for complex functions

### Multi-Tenancy Requirements
- **Tenant isolation** at database and API level
- **Per-tenant caching** with proper cache keys
- **Rate limiting per tenant**
- **Configuration inheritance** with tenant overrides

### Caching Strategy
- **Redis-compatible** caching layer
- **Smart cache invalidation** on data changes
- **Google Sheets rate limit protection**
- **Configurable TTL** per data type

### Agent Workflow
1. **Claim Task**: Update roadmap with agent assignment
2. **Implement**: Focus on clean, efficient code
3. **Test**: Verify functionality meets requirements
4. **Audit**: Comprehensive review of implementation
5. **Report**: Update roadmap with completion status and notes
6. **Handoff**: Clear documentation for dependent tasks

### Communication Protocol
- **Roadmap updates** are the primary communication method
- **Minimal cross-agent coordination** to avoid token waste
- **Clear task dependencies** documented in roadmap
- **Future Claude notes** for context preservation

### Quality Standards
- **Error handling** for all external dependencies
- **Type safety** where applicable (TypeScript)
- **Security first** approach (HMAC, input validation)
- **Performance optimization** (caching, efficient queries)
- **Observability** (logging, metrics, health checks)