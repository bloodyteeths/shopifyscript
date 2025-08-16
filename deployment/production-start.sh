#!/bin/bash

# ProofKit SaaS Production Startup Script
# Handles environment validation, dependency checks, and graceful startup

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/logs/startup.log"
PID_FILE="${PROJECT_ROOT}/proofkit.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message" >&2
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        INFO)
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        DEBUG)
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
    esac
    
    # Also log to file if directory exists
    if [[ -d "$(dirname "$LOG_FILE")" ]]; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
}

# Error handler
error_exit() {
    log ERROR "$1"
    cleanup
    exit 1
}

# Cleanup function
cleanup() {
    if [[ -f "$PID_FILE" ]]; then
        rm -f "$PID_FILE"
    fi
}

# Trap signals for cleanup
trap cleanup EXIT

# Check if already running
check_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            error_exit "ProofKit is already running (PID: $pid)"
        else
            log WARN "Stale PID file found, removing..."
            rm -f "$PID_FILE"
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    log INFO "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed"
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    
    if ! node -e "process.exit(require('semver').gte('$node_version', '$required_version') ? 0 : 1)" 2>/dev/null; then
        if ! npm list semver >/dev/null 2>&1; then
            log WARN "Cannot verify Node.js version (semver not available), proceeding..."
        else
            error_exit "Node.js version $node_version is below required $required_version"
        fi
    fi
    
    # Check if backend directory exists
    if [[ ! -d "${PROJECT_ROOT}/backend" ]]; then
        error_exit "Backend directory not found: ${PROJECT_ROOT}/backend"
    fi
    
    # Check if package.json exists
    if [[ ! -f "${PROJECT_ROOT}/backend/package.json" ]]; then
        error_exit "Backend package.json not found"
    fi
    
    # Check if node_modules exists
    if [[ ! -d "${PROJECT_ROOT}/backend/node_modules" ]]; then
        log WARN "Node modules not found, running npm install..."
        cd "${PROJECT_ROOT}/backend"
        npm ci --only=production
    fi
    
    log INFO "Prerequisites check passed"
}

# Validate environment
validate_environment() {
    log INFO "Validating environment configuration..."
    
    # Source environment file if it exists
    if [[ -f "${PROJECT_ROOT}/.env" ]]; then
        set -a
        source "${PROJECT_ROOT}/.env"
        set +a
        log INFO "Loaded environment from .env file"
    fi
    
    # Check required environment variables
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "HMAC_SECRET"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error_exit "Missing required environment variables: ${missing_vars[*]}"
    fi
    
    # Validate NODE_ENV
    if [[ "$NODE_ENV" != "production" && "$NODE_ENV" != "staging" && "$NODE_ENV" != "development" ]]; then
        error_exit "Invalid NODE_ENV: $NODE_ENV (must be production, staging, or development)"
    fi
    
    # Validate PORT
    if [[ ! "$PORT" =~ ^[0-9]+$ ]] || [[ "$PORT" -lt 1 ]] || [[ "$PORT" -gt 65535 ]]; then
        error_exit "Invalid PORT: $PORT (must be a number between 1 and 65535)"
    fi
    
    # Check if port is available
    if lsof -Pi ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
        error_exit "Port $PORT is already in use"
    fi
    
    # Validate HMAC_SECRET length
    if [[ ${#HMAC_SECRET} -lt 32 ]]; then
        error_exit "HMAC_SECRET must be at least 32 characters long"
    fi
    
    log INFO "Environment validation passed"
}

# Setup logging directory
setup_logging() {
    local log_dir="${PROJECT_ROOT}/logs"
    if [[ ! -d "$log_dir" ]]; then
        mkdir -p "$log_dir"
        log INFO "Created logs directory: $log_dir"
    fi
}

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    
    log INFO "Performing health check..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost:${PORT}/health" > /dev/null; then
            log INFO "Health check passed"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error_exit "Health check failed after $max_attempts attempts"
        fi
        
        log DEBUG "Health check attempt $attempt failed, retrying in 2 seconds..."
        sleep 2
        ((attempt++))
    done
}

# Start the application
start_application() {
    log INFO "Starting ProofKit SaaS backend..."
    
    cd "${PROJECT_ROOT}/backend"
    
    # Set production optimizations
    export NODE_OPTIONS="--max-old-space-size=1024"
    export UV_THREADPOOL_SIZE=4
    
    # Start the application in the background
    nohup node server.js > "${PROJECT_ROOT}/logs/app.log" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$PID_FILE"
    
    log INFO "ProofKit started with PID: $pid"
    
    # Wait a moment for startup
    sleep 5
    
    # Check if process is still running
    if ! kill -0 "$pid" 2>/dev/null; then
        error_exit "Process died immediately after startup"
    fi
    
    # Perform health check
    health_check
    
    log INFO "ProofKit SaaS is running successfully!"
    echo "🚀 Application started successfully"
    echo "📊 Health checks: http://localhost:${PORT}/health"
    echo "🔍 Metrics: http://localhost:${PORT}/metrics"
    echo "📋 PID: $pid"
    echo "📁 Logs: ${PROJECT_ROOT}/logs/"
}

# Stop function
stop_application() {
    if [[ ! -f "$PID_FILE" ]]; then
        log WARN "PID file not found, application may not be running"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    log INFO "Stopping ProofKit SaaS (PID: $pid)..."
    
    if kill -0 "$pid" 2>/dev/null; then
        # Send SIGTERM for graceful shutdown
        kill -TERM "$pid"
        
        # Wait for graceful shutdown
        local attempts=0
        while kill -0 "$pid" 2>/dev/null && [[ $attempts -lt 30 ]]; do
            sleep 1
            ((attempts++))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            log WARN "Graceful shutdown timed out, forcing termination..."
            kill -KILL "$pid"
        fi
        
        log INFO "ProofKit SaaS stopped"
    else
        log WARN "Process $pid not found, cleaning up PID file"
    fi
    
    rm -f "$PID_FILE"
}

# Status function
status_application() {
    if [[ ! -f "$PID_FILE" ]]; then
        echo "❌ ProofKit SaaS is not running"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
        echo "✅ ProofKit SaaS is running (PID: $pid)"
        
        # Try to get health status
        if curl -f -s "http://localhost:${PORT:-3000}/health" > /dev/null; then
            echo "💚 Health check: HEALTHY"
        else
            echo "💔 Health check: UNHEALTHY"
        fi
        
        return 0
    else
        echo "❌ ProofKit SaaS is not running (stale PID file)"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Restart function
restart_application() {
    log INFO "Restarting ProofKit SaaS..."
    stop_application
    sleep 2
    start_application
}

# Main function
main() {
    case "${1:-start}" in
        start)
            check_running
            check_prerequisites
            validate_environment
            setup_logging
            start_application
            ;;
        stop)
            stop_application
            ;;
        restart)
            restart_application
            ;;
        status)
            status_application
            ;;
        health)
            if [[ -f "$PID_FILE" ]]; then
                local pid=$(cat "$PID_FILE")
                if kill -0 "$pid" 2>/dev/null; then
                    curl -f "http://localhost:${PORT:-3000}/health" | jq . || echo "Health endpoint not responding"
                else
                    echo "Application is not running"
                    exit 1
                fi
            else
                echo "Application is not running"
                exit 1
            fi
            ;;
        logs)
            tail -f "${PROJECT_ROOT}/logs/app.log"
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|health|logs}"
            echo ""
            echo "Commands:"
            echo "  start   - Start the application"
            echo "  stop    - Stop the application"
            echo "  restart - Restart the application"
            echo "  status  - Show application status"
            echo "  health  - Show health check status"
            echo "  logs    - Tail application logs"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"