#!/bin/bash

# ProofKit SaaS Production Deployment Script
# Comprehensive deployment automation with health checks and rollback

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
ENV_FILE="${PROJECT_ROOT}/.env"
BACKUP_DIR="${PROJECT_ROOT}/backups"
LOG_FILE="${PROJECT_ROOT}/deployment.log"

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
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log INFO "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed or not in PATH"
    fi
    
    if ! docker info &> /dev/null; then
        error_exit "Docker daemon is not running"
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error_exit "Docker Compose is not installed"
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error_exit "Environment file not found: $ENV_FILE"
    fi
    
    # Check if docker-compose.yml exists
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        error_exit "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
    fi
    
    log INFO "Prerequisites check passed"
}

# Validate environment configuration
validate_environment() {
    log INFO "Validating environment configuration..."
    
    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a
    
    # Check required variables
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "GOOGLE_SHEETS_PRIVATE_KEY"
        "GOOGLE_SHEETS_CLIENT_EMAIL"
        "GOOGLE_SHEETS_PROJECT_ID"
        "GEMINI_API_KEY"
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
    
    # Validate HMAC secret length
    if [[ ${#HMAC_SECRET} -lt 32 ]]; then
        error_exit "HMAC_SECRET must be at least 32 characters long"
    fi
    
    # Validate Gemini API key format
    if [[ ! "$GEMINI_API_KEY" =~ ^AIza.* ]]; then
        error_exit "Invalid GEMINI_API_KEY format"
    fi
    
    log INFO "Environment validation passed"
}

# Create backup
create_backup() {
    log INFO "Creating backup..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_name="proofkit_backup_${timestamp}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup volumes if they exist
    if docker volume ls | grep -q proofkit; then
        log INFO "Backing up Docker volumes..."
        docker run --rm \
            -v proofkit-saas_app-logs:/source/logs \
            -v proofkit-saas_redis-data:/source/redis \
            -v "${BACKUP_DIR}:/backup" \
            alpine:latest \
            tar czf "/backup/${backup_name}_volumes.tar.gz" -C /source .
    fi
    
    # Backup configuration files
    log INFO "Backing up configuration files..."
    tar czf "${BACKUP_DIR}/${backup_name}_config.tar.gz" \
        -C "$PROJECT_ROOT" \
        .env \
        docker-compose.yml \
        deployment/
    
    log INFO "Backup created: ${backup_name}"
    echo "$backup_name" > "${BACKUP_DIR}/latest_backup.txt"
}

# Build Docker images
build_images() {
    log INFO "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build with build cache and multi-stage optimization
    docker build \
        --target runtime \
        --tag proofkit-saas:latest \
        --tag "proofkit-saas:$(date '+%Y%m%d_%H%M%S')" \
        .
    
    log INFO "Docker images built successfully"
}

# Deploy services
deploy_services() {
    log INFO "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images for dependencies
    docker-compose pull redis nginx
    
    # Start services with restart policy
    docker-compose up -d --remove-orphans
    
    log INFO "Services deployed"
}

# Wait for services to be healthy
wait_for_health() {
    log INFO "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log INFO "Health check attempt $attempt/$max_attempts"
        
        # Check if main app is responding
        if curl -f -s http://localhost:${PORT:-3000}/health > /dev/null; then
            log INFO "Application is healthy"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error_exit "Services failed to become healthy within timeout"
        fi
        
        sleep 10
        ((attempt++))
    done
}

# Verify deployment
verify_deployment() {
    log INFO "Verifying deployment..."
    
    # Check if all containers are running
    local failed_containers=$(docker-compose ps --services --filter "status=exited")
    if [[ -n "$failed_containers" ]]; then
        error_exit "Some containers failed to start: $failed_containers"
    fi
    
    # Test API endpoints
    local base_url="http://localhost:${PORT:-3000}"
    
    # Test health endpoint
    if ! curl -f -s "$base_url/health" > /dev/null; then
        error_exit "Health endpoint is not responding"
    fi
    
    # Test readiness endpoint
    if ! curl -f -s "$base_url/ready" > /dev/null; then
        error_exit "Readiness endpoint is not responding"
    fi
    
    # Test metrics endpoint
    if ! curl -f -s "$base_url/metrics" > /dev/null; then
        log WARN "Metrics endpoint is not responding (this might be normal if disabled)"
    fi
    
    log INFO "Deployment verification passed"
}

# Rollback function
rollback() {
    log WARN "Rolling back deployment..."
    
    if [[ -f "${BACKUP_DIR}/latest_backup.txt" ]]; then
        local backup_name=$(cat "${BACKUP_DIR}/latest_backup.txt")
        log INFO "Rolling back to backup: $backup_name"
        
        # Stop current services
        docker-compose down
        
        # Restore configuration
        if [[ -f "${BACKUP_DIR}/${backup_name}_config.tar.gz" ]]; then
            tar xzf "${BACKUP_DIR}/${backup_name}_config.tar.gz" -C "$PROJECT_ROOT"
        fi
        
        # Restore volumes
        if [[ -f "${BACKUP_DIR}/${backup_name}_volumes.tar.gz" ]]; then
            docker run --rm \
                -v proofkit-saas_app-logs:/target/logs \
                -v proofkit-saas_redis-data:/target/redis \
                -v "${BACKUP_DIR}:/backup" \
                alpine:latest \
                tar xzf "/backup/${backup_name}_volumes.tar.gz" -C /target
        fi
        
        # Restart services
        docker-compose up -d
        
        log INFO "Rollback completed"
    else
        log ERROR "No backup found for rollback"
        return 1
    fi
}

# Cleanup old backups
cleanup_backups() {
    log INFO "Cleaning up old backups..."
    
    # Keep only the last 5 backups
    cd "$BACKUP_DIR"
    ls -t proofkit_backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
    
    log INFO "Backup cleanup completed"
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] COMMAND

Commands:
    deploy      Full deployment (default)
    build       Build Docker images only
    rollback    Rollback to previous backup
    health      Check application health
    logs        Show application logs
    stop        Stop all services
    start       Start all services
    restart     Restart all services

Options:
    -h, --help              Show this help message
    -v, --verbose           Enable verbose output
    --skip-backup          Skip backup creation
    --skip-health-check    Skip health verification
    --monitoring           Deploy with monitoring stack

Examples:
    $0 deploy
    $0 deploy --monitoring
    $0 rollback
    $0 health
EOF
}

# Parse command line arguments
COMMAND="deploy"
SKIP_BACKUP=false
SKIP_HEALTH_CHECK=false
ENABLE_MONITORING=false

while [[ $# -gt 0 ]]; do
    case $1 in
        deploy|build|rollback|health|logs|stop|start|restart)
            COMMAND="$1"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -v|--verbose)
            DEBUG=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        --monitoring)
            ENABLE_MONITORING=true
            shift
            ;;
        *)
            error_exit "Unknown option: $1"
            ;;
    esac
done

# Main execution
main() {
    log INFO "Starting ProofKit SaaS deployment - Command: $COMMAND"
    
    # Setup log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    case $COMMAND in
        deploy)
            check_prerequisites
            validate_environment
            
            if [[ "$SKIP_BACKUP" != "true" ]]; then
                create_backup
            fi
            
            build_images
            
            if [[ "$ENABLE_MONITORING" == "true" ]]; then
                export COMPOSE_PROFILES=monitoring
            fi
            
            deploy_services
            
            if [[ "$SKIP_HEALTH_CHECK" != "true" ]]; then
                wait_for_health
                verify_deployment
            fi
            
            cleanup_backups
            
            log INFO "Deployment completed successfully!"
            ;;
            
        build)
            check_prerequisites
            build_images
            log INFO "Build completed successfully!"
            ;;
            
        rollback)
            if rollback; then
                log INFO "Rollback completed successfully!"
            else
                error_exit "Rollback failed"
            fi
            ;;
            
        health)
            if curl -f -s "http://localhost:${PORT:-3000}/health" | jq .; then
                log INFO "Application is healthy"
            else
                error_exit "Application health check failed"
            fi
            ;;
            
        logs)
            docker-compose logs -f
            ;;
            
        stop)
            docker-compose down
            log INFO "Services stopped"
            ;;
            
        start)
            docker-compose up -d
            log INFO "Services started"
            ;;
            
        restart)
            docker-compose restart
            log INFO "Services restarted"
            ;;
            
        *)
            error_exit "Unknown command: $COMMAND"
            ;;
    esac
}

# Trap errors and provide rollback option
trap 'if [[ $? -ne 0 ]]; then
    log ERROR "Deployment failed. Would you like to rollback? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rollback
    fi
fi' EXIT

# Run main function
main "$@"