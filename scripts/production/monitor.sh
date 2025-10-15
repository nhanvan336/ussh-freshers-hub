#!/bin/bash

# USSH Freshers' Hub - Monitoring Script
# Usage: ./scripts/production/monitor.sh [action]
# Actions: status, health, logs, metrics, alerts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ACTION=${1:-"status"}
HEALTH_URL="http://localhost/health"
LOG_FILE="./logs/monitor-$(date +%Y%m%d).log"

# Create logs directory
mkdir -p ./logs

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Check overall system status
check_status() {
    log "📊 System Status Check"
    echo "===========================================" | tee -a "$LOG_FILE"
    
    # Check Docker containers
    info "Docker Containers:"
    if docker-compose -f docker-compose.prod.yml ps | tee -a "$LOG_FILE"; then
        log "✅ Container status retrieved"
    else
        error "❌ Failed to get container status"
    fi
    
    echo "" | tee -a "$LOG_FILE"
    
    # Check container health
    info "Container Health:"
    local containers=("ussh-freshers-hub-prod" "ussh-mongodb-prod" "ussh-redis-prod" "ussh-nginx-prod")
    
    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            local health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
            if [ "$health" = "healthy" ] || [ "$health" = "no-healthcheck" ]; then
                echo "✅ $container: Running ($health)" | tee -a "$LOG_FILE"
            else
                echo "⚠️  $container: Running but unhealthy ($health)" | tee -a "$LOG_FILE"
            fi
        else
            echo "❌ $container: Not running" | tee -a "$LOG_FILE"
        fi
    done
    
    echo "===========================================" | tee -a "$LOG_FILE"
}

# Perform health checks
check_health() {
    log "🔍 Health Check"
    echo "===========================================" | tee -a "$LOG_FILE"
    
    # Application health endpoint
    info "Application Health:"
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        echo "✅ Application: Healthy" | tee -a "$LOG_FILE"
        local response=$(curl -s "$HEALTH_URL")
        echo "Response: $response" | tee -a "$LOG_FILE"
    else
        echo "❌ Application: Unhealthy" | tee -a "$LOG_FILE"
    fi
    
    # Database connectivity
    info "Database Connectivity:"
    if docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo "✅ MongoDB: Connected" | tee -a "$LOG_FILE"
    else
        echo "❌ MongoDB: Connection failed" | tee -a "$LOG_FILE"
    fi
    
    # Redis connectivity
    info "Cache Connectivity:"
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis: Connected" | tee -a "$LOG_FILE"
    else
        echo "❌ Redis: Connection failed" | tee -a "$LOG_FILE"
    fi
    
    # Nginx status
    info "Web Server:"
    if curl -f -s "http://localhost" > /dev/null; then
        echo "✅ Nginx: Responding" | tee -a "$LOG_FILE"
    else
        echo "❌ Nginx: Not responding" | tee -a "$LOG_FILE"
    fi
    
    echo "===========================================" | tee -a "$LOG_FILE"
}

# Show recent logs
show_logs() {
    log "📋 Recent Logs"
    echo "===========================================" | tee -a "$LOG_FILE"
    
    local service=${2:-"app"}
    local lines=${3:-50}
    
    info "Showing last $lines lines for service: $service"
    
    case $service in
        "app"|"application")
            docker-compose -f docker-compose.prod.yml logs --tail="$lines" app
            ;;
        "mongodb"|"mongo"|"db")
            docker-compose -f docker-compose.prod.yml logs --tail="$lines" mongodb
            ;;
        "redis"|"cache")
            docker-compose -f docker-compose.prod.yml logs --tail="$lines" redis
            ;;
        "nginx"|"web")
            docker-compose -f docker-compose.prod.yml logs --tail="$lines" nginx
            ;;
        "all")
            docker-compose -f docker-compose.prod.yml logs --tail="$lines"
            ;;
        *)
            warning "Unknown service: $service. Available: app, mongodb, redis, nginx, all"
            ;;
    esac
    
    echo "===========================================" | tee -a "$LOG_FILE"
}

# Show system metrics
show_metrics() {
    log "📈 System Metrics"
    echo "===========================================" | tee -a "$LOG_FILE"
    
    # System resources
    info "System Resources:"
    echo "CPU Usage:" | tee -a "$LOG_FILE"
    top -bn1 | grep "Cpu(s)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Memory Usage:" | tee -a "$LOG_FILE"
    free -h | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Disk Usage:" | tee -a "$LOG_FILE"
    df -h | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    # Docker stats
    info "Container Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    # Application specific metrics
    info "Application Metrics:"
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        local uptime=$(docker-compose -f docker-compose.prod.yml exec -T app node -e "console.log(process.uptime())" 2>/dev/null || echo "N/A")
        echo "Application Uptime: ${uptime}s" | tee -a "$LOG_FILE"
    fi
    
    # Database stats
    info "Database Metrics:"
    if docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --quiet --eval "db.stats()" 2>/dev/null; then
        echo "Database stats retrieved" | tee -a "$LOG_FILE"
    else
        echo "Unable to retrieve database stats" | tee -a "$LOG_FILE"
    fi
    
    echo "===========================================" | tee -a "$LOG_FILE"
}

# Check for alerts and issues
check_alerts() {
    log "🚨 Alert Check"
    echo "===========================================" | tee -a "$LOG_FILE"
    
    local alerts=0
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        warning "HIGH DISK USAGE: ${disk_usage}% used"
        alerts=$((alerts + 1))
    fi
    
    # Check memory usage
    local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$mem_usage" -gt 85 ]; then
        warning "HIGH MEMORY USAGE: ${mem_usage}% used"
        alerts=$((alerts + 1))
    fi
    
    # Check for container restarts
    local restarts=$(docker-compose -f docker-compose.prod.yml ps | awk 'NR>2 {print $6}' | grep -v "0" | wc -l)
    if [ "$restarts" -gt 0 ]; then
        warning "CONTAINER RESTARTS DETECTED: $restarts containers have restarted"
        alerts=$((alerts + 1))
    fi
    
    # Check application health
    if ! curl -f -s "$HEALTH_URL" > /dev/null; then
        error "APPLICATION HEALTH CHECK FAILED"
        alerts=$((alerts + 1))
    fi
    
    # Summary
    if [ "$alerts" -eq 0 ]; then
        log "✅ No alerts - System is healthy"
    else
        warning "⚠️  $alerts alert(s) detected - Check the issues above"
    fi
    
    echo "===========================================" | tee -a "$LOG_FILE"
}

# Interactive monitoring dashboard
interactive_monitor() {
    while true; do
        clear
        echo "🖥️  USSH Freshers' Hub - Live Monitor"
        echo "============================================"
        echo "Time: $(date)"
        echo "============================================"
        
        # Quick status
        echo "📊 Quick Status:"
        docker-compose -f docker-compose.prod.yml ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}"
        echo ""
        
        # Resource usage
        echo "📈 Resource Usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
        echo ""
        
        echo "Press Ctrl+C to exit, refreshing in 10 seconds..."
        sleep 10
    done
}

# Main function
main() {
    case $ACTION in
        "status")
            check_status
            ;;
        "health")
            check_health
            ;;
        "logs")
            show_logs "$@"
            ;;
        "metrics")
            show_metrics
            ;;
        "alerts")
            check_alerts
            ;;
        "watch"|"live")
            interactive_monitor
            ;;
        "full")
            check_status
            check_health
            show_metrics
            check_alerts
            ;;
        *)
            echo "Usage: $0 [action]"
            echo "Actions: status, health, logs [service] [lines], metrics, alerts, watch, full"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'echo ""; log "Monitoring stopped by user"; exit 0' INT TERM

# Run main function
main "$@"
