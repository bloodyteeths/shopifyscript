#!/bin/bash

# PROOFKIT CANARY TEST AUTOMATION SCRIPT
# P0-7 CRITICAL: Comprehensive automation for safe canary deployments
# Usage: ./run-canary-test.sh <tenant> [options]

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/canary"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DRY_RUN=false
STRICT_MODE=false
AUTO_ROLLBACK=true
SKIP_VALIDATION=false
WINDOW_DURATION=3600  # 1 hour in seconds
START_DELAY=120       # 2 minutes in seconds

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message" >&2
            echo "[$timestamp] [ERROR] $message" >> "$LOG_FILE"
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} $message"
            echo "[$timestamp] [WARN] $message" >> "$LOG_FILE"
            ;;
        INFO)
            echo -e "${GREEN}[INFO]${NC} $message"
            echo "[$timestamp] [INFO] $message" >> "$LOG_FILE"
            ;;
        DEBUG)
            if [[ "${DEBUG:-false}" == "true" ]]; then
                echo -e "${BLUE}[DEBUG]${NC} $message"
                echo "[$timestamp] [DEBUG] $message" >> "$LOG_FILE"
            fi
            ;;
    esac
}

# Error handler
error_exit() {
    log ERROR "$1"
    cleanup_on_error
    exit 1
}

# Show usage
usage() {
    cat << EOF
Usage: $0 <tenant> [OPTIONS]

Required:
    tenant              Tenant identifier for the canary test

Options:
    --dry-run          Run in simulation mode (no actual changes)
    --strict           Enable strict validation mode
    --no-rollback      Disable automatic rollback (NOT RECOMMENDED)
    --skip-validation  Skip pre-flight validation (DANGEROUS)
    --window <minutes> Set test window duration (default: 60)
    --delay <minutes>  Set start delay (default: 2)
    --config <file>    Use custom configuration file
    --help             Show this help message

Safety Options:
    --budget <amount>  Override default budget cap (\$5.00)
    --cpc <amount>     Override default CPC ceiling (\$0.25)
    --campaign <name>  Specify canary campaign name

Examples:
    $0 tenant1 --dry-run
    $0 tenant1 --window 30 --budget 3.00
    $0 tenant1 --config custom-config.json --strict

IMPORTANT: This script will execute real changes to Google Ads campaigns.
Always run with --dry-run first to verify configuration.
EOF
}

# Parse command line arguments
parse_arguments() {
    if [[ $# -eq 0 ]]; then
        usage
        exit 1
    fi
    
    TENANT="$1"
    shift
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --strict)
                STRICT_MODE=true
                shift
                ;;
            --no-rollback)
                AUTO_ROLLBACK=false
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --window)
                WINDOW_DURATION="$2"
                shift 2
                ;;
            --delay)
                START_DELAY="$2"
                shift 2
                ;;
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --budget)
                BUDGET_CAP="$2"
                shift 2
                ;;
            --cpc)
                CPC_CEILING="$2"
                shift 2
                ;;
            --campaign)
                CAMPAIGN_NAME="$2"
                shift 2
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                error_exit "Unknown option: $1"
                ;;
        esac
    done
    
    if [[ -z "${TENANT:-}" ]]; then
        error_exit "Tenant is required"
    fi
}

# Setup logging
setup_logging() {
    mkdir -p "$LOG_DIR"
    LOG_FILE="${LOG_DIR}/canary_${TENANT}_${TIMESTAMP}.log"
    touch "$LOG_FILE"
    
    log INFO "Canary test started for tenant: $TENANT"
    log INFO "Log file: $LOG_FILE"
    
    # Log configuration
    log INFO "Configuration:"
    log INFO "  - Dry Run: $DRY_RUN"
    log INFO "  - Strict Mode: $STRICT_MODE"
    log INFO "  - Auto Rollback: $AUTO_ROLLBACK"
    log INFO "  - Window Duration: ${WINDOW_DURATION} minutes"
    log INFO "  - Start Delay: ${START_DELAY} minutes"
}

# Check prerequisites
check_prerequisites() {
    log INFO "Checking prerequisites..."
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed or not in PATH"
    fi
    
    # Check if backend is running
    if ! curl -f -s http://localhost:3001/api/diagnostics > /dev/null; then
        error_exit "Backend is not running or not accessible at localhost:3001"
    fi
    
    # Check if validation scripts exist
    local required_scripts=(
        "${SCRIPT_DIR}/canary-validation.js"
        "${SCRIPT_DIR}/canary-rollback.js"
        "${SCRIPT_DIR}/audience-validation.js"
        "${SCRIPT_DIR}/canary-execution.js"
    )
    
    for script in "${required_scripts[@]}"; do
        if [[ ! -f "$script" ]]; then
            error_exit "Required script not found: $script"
        fi
    done
    
    log INFO "Prerequisites check passed"
}

# Generate configuration file
generate_config() {
    local config_file="${LOG_DIR}/config_${TENANT}_${TIMESTAMP}.json"
    
    cat > "$config_file" << EOF
{
    "tenant": "$TENANT",
    "campaignName": "${CAMPAIGN_NAME:-}",
    "budgetCaps": ["${BUDGET_CAP:-5.00}"],
    "cpcCeilings": ["${CPC_CEILING:-0.25}"],
    "schedules": ["today ${WINDOW_DURATION} minutes"],
    "exclusions": [],
    "config": {
        "ENABLE_SCRIPT": true,
        "FEATURE_AI_DRAFTS": true,
        "FEATURE_INTENT_BLOCKS": true,
        "FEATURE_AUDIENCE_EXPORT": true,
        "FEATURE_AUDIENCE_ATTACH": true,
        "FEATURE_CM_API": false,
        "FEATURE_INVENTORY_GUARD": true,
        "PROMOTE": false
    },
    "promoteWindow": {
        "start_at": "now+${START_DELAY}m",
        "duration_minutes": $WINDOW_DURATION
    }
}
EOF
    
    echo "$config_file"
}

# Run validation phase
run_validation() {
    log INFO "Running pre-flight validation..."
    
    if [[ "$SKIP_VALIDATION" == "true" ]]; then
        log WARN "Skipping validation (DANGEROUS - not recommended for production)"
        return 0
    fi
    
    local config_file="$1"
    local validation_args=""
    
    if [[ "$STRICT_MODE" == "true" ]]; then
        validation_args="$validation_args --strict"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        validation_args="$validation_args --dry-run"
    fi
    
    # Run configuration validation
    log INFO "Validating canary configuration..."
    if ! node "${SCRIPT_DIR}/canary-validation.js" "$TENANT" "$config_file" $validation_args; then
        error_exit "Configuration validation failed"
    fi
    
    # Run audience validation if configured
    local audience_config=$(jq -r '.audienceConfig // empty' "$config_file" 2>/dev/null || echo "")
    if [[ -n "$audience_config" ]]; then
        log INFO "Validating audience configuration..."
        if ! node "${SCRIPT_DIR}/audience-validation.js" "$TENANT" "$config_file" $validation_args; then
            error_exit "Audience validation failed"
        fi
    fi
    
    log INFO "Validation phase completed successfully"
}

# Execute canary test
execute_canary() {
    log INFO "Executing canary test..."
    
    local config_file="$1"
    local execution_args=""
    
    if [[ "$DRY_RUN" == "true" ]]; then
        execution_args="$execution_args --dry-run"
    fi
    
    if [[ "$STRICT_MODE" == "true" ]]; then
        execution_args="$execution_args --strict"
    fi
    
    if [[ "$AUTO_ROLLBACK" == "false" ]]; then
        execution_args="$execution_args --no-rollback"
    fi
    
    # Execute the canary test
    if ! node "${SCRIPT_DIR}/canary-execution.js" "$TENANT" "$config_file" $execution_args; then
        error_exit "Canary execution failed"
    fi
    
    log INFO "Canary execution completed successfully"
}

# Monitor execution
monitor_execution() {
    log INFO "Starting execution monitoring..."
    
    local monitor_args=""
    if [[ "$DRY_RUN" == "true" ]]; then
        monitor_args="$monitor_args --dry-run"
    fi
    
    if [[ "$AUTO_ROLLBACK" == "false" ]]; then
        monitor_args="$monitor_args --no-auto"
    fi
    
    # Start rollback manager
    node "${SCRIPT_DIR}/canary-rollback.js" start "$TENANT" "${BUDGET_CAP:-5.00}" "${CPC_CEILING:-0.25}" $monitor_args &
    ROLLBACK_PID=$!
    
    # Monitor for the duration of the test
    local total_duration=$((WINDOW_DURATION * 60 + START_DELAY * 60 + 600)) # Add 10 minutes buffer
    sleep $total_duration
    
    # Stop monitoring
    if kill -0 $ROLLBACK_PID 2>/dev/null; then
        node "${SCRIPT_DIR}/canary-rollback.js" stop "$TENANT"
        kill $ROLLBACK_PID 2>/dev/null || true
    fi
}

# Generate final report
generate_report() {
    log INFO "Generating final report..."
    
    local report_file="${LOG_DIR}/report_${TENANT}_${TIMESTAMP}.json"
    
    # Collect rollback status
    local rollback_status=$(node "${SCRIPT_DIR}/canary-rollback.js" status "$TENANT" 2>/dev/null || echo '{}')
    
    cat > "$report_file" << EOF
{
    "tenant": "$TENANT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "configuration": {
        "dryRun": $DRY_RUN,
        "strictMode": $STRICT_MODE,
        "autoRollback": $AUTO_ROLLBACK,
        "windowDuration": $WINDOW_DURATION,
        "startDelay": $START_DELAY,
        "budgetCap": "${BUDGET_CAP:-5.00}",
        "cpcCeiling": "${CPC_CEILING:-0.25}"
    },
    "execution": {
        "logFile": "$LOG_FILE",
        "configFile": "$CONFIG_FILE",
        "reportFile": "$report_file"
    },
    "rollbackStatus": $rollback_status,
    "summary": {
        "completed": true,
        "errors": $(grep -c '\[ERROR\]' "$LOG_FILE" || echo 0),
        "warnings": $(grep -c '\[WARN\]' "$LOG_FILE" || echo 0)
    }
}
EOF
    
    log INFO "Final report saved: $report_file"
    
    # Display summary
    echo
    echo "=== CANARY TEST SUMMARY ==="
    echo "Tenant: $TENANT"
    echo "Start Time: $(head -1 "$LOG_FILE" | cut -d']' -f1 | cut -d'[' -f2)"
    echo "End Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Log File: $LOG_FILE"
    echo "Report: $report_file"
    echo "Errors: $(grep -c '\[ERROR\]' "$LOG_FILE" || echo 0)"
    echo "Warnings: $(grep -c '\[WARN\]' "$LOG_FILE" || echo 0)"
    echo
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${BLUE}This was a DRY RUN - no actual changes were made${NC}"
    fi
}

# Cleanup on error
cleanup_on_error() {
    log ERROR "Cleaning up after error..."
    
    # Stop any running monitoring processes
    if [[ -n "${ROLLBACK_PID:-}" ]] && kill -0 $ROLLBACK_PID 2>/dev/null; then
        log INFO "Stopping rollback monitor..."
        kill $ROLLBACK_PID 2>/dev/null || true
    fi
    
    # Trigger emergency rollback if not in dry run mode
    if [[ "$DRY_RUN" != "true" && "$AUTO_ROLLBACK" == "true" ]]; then
        log WARN "Triggering emergency rollback..."
        node "${SCRIPT_DIR}/canary-rollback.js" manual-rollback "$TENANT" "script_error" || true
    fi
}

# Main execution function
main() {
    parse_arguments "$@"
    setup_logging
    
    log INFO "Starting canary test automation for tenant: $TENANT"
    
    # Safety warning for production runs
    if [[ "$DRY_RUN" != "true" ]]; then
        echo -e "${RED}WARNING: This will make real changes to Google Ads campaigns!${NC}"
        echo -e "${YELLOW}Press Ctrl+C within 10 seconds to abort...${NC}"
        sleep 10
    fi
    
    check_prerequisites
    
    # Generate or use provided configuration
    if [[ -n "${CONFIG_FILE:-}" ]]; then
        if [[ ! -f "$CONFIG_FILE" ]]; then
            error_exit "Configuration file not found: $CONFIG_FILE"
        fi
        log INFO "Using provided configuration: $CONFIG_FILE"
    else
        CONFIG_FILE=$(generate_config)
        log INFO "Generated configuration: $CONFIG_FILE"
    fi
    
    # Run validation
    run_validation "$CONFIG_FILE"
    
    # Execute canary test
    execute_canary "$CONFIG_FILE"
    
    # Generate final report
    generate_report
    
    log INFO "Canary test automation completed successfully"
}

# Trap errors and provide cleanup
trap 'cleanup_on_error' ERR
trap 'cleanup_on_error' INT

# Run main function
main "$@"