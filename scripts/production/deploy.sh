#!/bin/bash

# USSH Freshers' Hub - Production Deployment Script
# Usage: ./scripts/production/deploy.sh [version]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ussh-freshers-hub"
DOCKER_REGISTRY="your-registry.com"
VERSION=${1:-"latest"}
BACKUP_DIR="./backups"
LOG_FILE="./logs/deploy-$(date +%Y%m%d_%H%M%S).log"

# Create logs directory if it doesn't exist
mkdir -p ./logs

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if required files exist
check_requirements() {
    log "Checking deployment requirements..."
    
    if [ ! -f ".env.production" ]; then
        error ".env.production file is missing"
    fi
    
    if [ ! -f "docker-compose.prod.yml" ]; then
        error "docker-compose.prod.yml file is missing"
    fi
    
    if [ ! -f "Dockerfile" ]; then
        error "Dockerfile is missing"
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
    fi
    
    log "✅ All requirements met"
}

# Create backup before deployment
create_backup() {
    log "Creating backup before deployment..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup MongoDB data
    if docker-compose -f docker-compose.prod.yml ps mongodb | grep -q "Up"; then
        info "Backing up MongoDB data..."
        docker-compose -f docker-compose.prod.yml exec -T mongodb mongodump --out /backups/mongodb-$(date +%Y%m%d_%H%M%S)
    fi
    
    # Backup uploaded files
    if [ -d "./uploads" ]; then
        info "Backing up uploaded files..."
        tar -czf "$BACKUP_DIR/uploads-$(date +%Y%m%d_%H%M%S).tar.gz" ./uploads
    fi
    
    log "✅ Backup completed"
}

# Build and push Docker image
build_and_push() {
    log "Building Docker image..."
    
    # Build the image
    docker build -t "$PROJECT_NAME:$VERSION" .
    
    # Tag for registry (if using external registry)
    if [ "$DOCKER_REGISTRY" != "your-registry.com" ]; then
        docker tag "$PROJECT_NAME:$VERSION" "$DOCKER_REGISTRY/$PROJECT_NAME:$VERSION"
        
        info "Pushing to registry..."
        docker push "$DOCKER_REGISTRY/$PROJECT_NAME:$VERSION"
    fi
    
    log "✅ Docker image built and ready"
}

# Deploy the application
deploy_application() {
    log "Deploying application..."
    
    # Pull latest images
    docker-compose -f docker-compose.prod.yml pull
    
    # Stop and remove old containers
    info "Stopping old containers..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    
    # Start new containers
    info "Starting new containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    info "Waiting for services to be ready..."
    sleep 30
    
    log "✅ Application deployed"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            log "✅ Health check passed"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Cleanup old Docker images
cleanup() {
    log "Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove old containers
    docker container prune -f
    
    log "✅ Cleanup completed"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo "===========================================" | tee -a "$LOG_FILE"
    docker-compose -f docker-compose.prod.yml ps | tee -a "$LOG_FILE"
    echo "===========================================" | tee -a "$LOG_FILE"
    
    info "Application URL: https://your-domain.com"
    info "Health check: https://your-domain.com/health"
    info "Logs: docker-compose -f docker-compose.prod.yml logs -f"
}

# Main deployment process
main() {
    log "🚀 Starting deployment of $PROJECT_NAME version $VERSION"
    log "Deployment log: $LOG_FILE"
    
    check_requirements
    create_backup
    build_and_push
    deploy_application
    health_check
    cleanup
    show_status
    
    log "🎉 Deployment completed successfully!"
    log "📋 Summary logged to: $LOG_FILE"
}

# Handle script interruption
trap 'error "Deployment interrupted by user"' INT TERM

# Run main function
main "$@"
