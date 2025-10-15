#!/bin/bash

# USSH Freshers' Hub - Production Setup Script
# Usage: ./scripts/production/setup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="./logs/setup-$(date +%Y%m%d_%H%M%S).log"

# Create logs directory
mkdir -p ./logs

# Logging functions
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

# Check system requirements
check_system_requirements() {
    log "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        warning "This script is designed for Linux systems"
    fi
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        warning "Running as root. Consider using a non-root user for better security"
    fi
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 10485760 ]; then
        error "Insufficient disk space. At least 10GB required"
    fi
    
    # Check available memory (minimum 2GB)
    local available_memory=$(free | awk 'NR==2{print $2}')
    if [ "$available_memory" -lt 2097152 ]; then
        warning "Low memory detected. At least 2GB recommended for production"
    fi
    
    log "✅ System requirements check completed"
}

# Install required packages
install_dependencies() {
    log "Installing required dependencies..."
    
    # Update package lists
    if command -v apt-get > /dev/null; then
        info "Updating package lists..."
        sudo apt-get update
        
        # Install required packages
        sudo apt-get install -y \
            curl \
            wget \
            git \
            unzip \
            htop \
            nginx \
            certbot \
            python3-certbot-nginx
        
    elif command -v yum > /dev/null; then
        info "Installing packages via yum..."
        sudo yum update -y
        sudo yum install -y \
            curl \
            wget \
            git \
            unzip \
            htop \
            nginx \
            certbot \
            python3-certbot-nginx
            
    else
        warning "Package manager not detected. Please install dependencies manually"
    fi
    
    log "✅ Dependencies installed"
}

# Install Docker if not present
install_docker() {
    if command -v docker > /dev/null; then
        info "Docker is already installed"
        docker --version | tee -a "$LOG_FILE"
    else
        log "Installing Docker..."
        
        # Install Docker
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
        
        # Add current user to docker group
        sudo usermod -aG docker "$USER"
        
        # Start and enable Docker service
        sudo systemctl start docker
        sudo systemctl enable docker
        
        log "✅ Docker installed and configured"
    fi
    
    # Install Docker Compose if not present
    if command -v docker-compose > /dev/null; then
        info "Docker Compose is already installed"
        docker-compose --version | tee -a "$LOG_FILE"
    else
        log "Installing Docker Compose..."
        
        local compose_version="2.20.2"
        sudo curl -L "https://github.com/docker/compose/releases/download/v${compose_version}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        log "✅ Docker Compose installed"
    fi
}

# Setup directory structure
setup_directories() {
    log "Setting up directory structure..."
    
    # Create necessary directories
    local directories=(
        "./backups"
        "./logs"
        "./uploads"
        "./ssl"
        "./redis"
        "./static"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            info "Created directory: $dir"
        fi
    done
    
    # Set proper permissions
    chmod 755 ./backups ./logs ./uploads ./static
    chmod 700 ./ssl
    
    log "✅ Directory structure created"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    read -p "Enter your domain name (e.g., your-domain.com): " domain
    read -p "Enter your email for Let's Encrypt: " email
    
    if [ -z "$domain" ] || [ -z "$email" ]; then
        warning "Domain and email are required for SSL setup. Skipping SSL configuration."
        info "You can run this later: sudo certbot --nginx -d $domain"
        return
    fi
    
    # Generate self-signed certificate for development/testing
    if [ ! -f "./ssl/fullchain.pem" ]; then
        info "Generating self-signed certificate for testing..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ./ssl/privkey.pem \
            -out ./ssl/fullchain.pem \
            -subj "/C=VN/ST=HCM/L=HoChiMinh/O=USSH/CN=$domain"
        
        # Generate dhparam for better security
        openssl dhparam -out ./ssl/dhparam.pem 2048
    fi
    
    info "SSL certificates are ready. For production, use Let's Encrypt:"
    info "sudo certbot --nginx -d $domain --email $email --agree-tos --non-interactive"
    
    log "✅ SSL setup completed"
}

# Setup Redis configuration
setup_redis() {
    log "Setting up Redis configuration..."
    
    cat > ./redis/redis.conf << 'EOF'
# Redis configuration for USSH Freshers' Hub
bind 0.0.0.0
protected-mode yes
port 6379
timeout 0
keepalive 300

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
dir /data

# Security
requirepass CHANGE_THIS_REDIS_PASSWORD

# Logging
loglevel notice
logfile /var/log/redis/redis.log

# Performance
tcp-keepalive 60
tcp-backlog 511
EOF
    
    log "✅ Redis configuration created"
}

# Setup MongoDB initialization script
setup_mongodb() {
    log "Setting up MongoDB initialization..."
    
    mkdir -p ./scripts
    
    cat > ./scripts/mongo-init.js << 'EOF'
// MongoDB initialization script for USSH Freshers' Hub
print('Initializing MongoDB for USSH Freshers Hub...');

// Switch to application database
db = db.getSiblingDB('ussh_freshers_hub');

// Create application user
db.createUser({
  user: 'app_user',
  pwd: 'CHANGE_THIS_APP_PASSWORD',
  roles: [
    {
      role: 'readWrite',
      db: 'ussh_freshers_hub'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        firstName: {
          bsonType: 'string',
          minLength: 1
        },
        lastName: {
          bsonType: 'string',
          minLength: 1
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'createdAt': 1 });
db.forumposts.createIndex({ 'createdAt': -1 });
db.forumposts.createIndex({ 'category': 1 });
db.comments.createIndex({ 'postId': 1, 'createdAt': -1 });

print('MongoDB initialization completed successfully!');
EOF
    
    log "✅ MongoDB initialization script created"
}

# Generate production secrets
generate_secrets() {
    log "Generating production secrets..."
    
    info "Generating secure secrets for production..."
    
    local session_secret=$(openssl rand -base64 32)
    local jwt_secret=$(openssl rand -base64 64)
    local encryption_key=$(openssl rand -base64 32)
    local mongodb_password=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
    local redis_password=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
    
    # Update .env.production with generated secrets
    if [ -f ".env.production" ]; then
        cp .env.production .env.production.backup
        
        sed -i "s/CHANGE_THIS_SESSION_SECRET_PRODUCTION/$session_secret/g" .env.production
        sed -i "s/CHANGE_THIS_JWT_SECRET_PRODUCTION/$jwt_secret/g" .env.production
        sed -i "s/CHANGE_THIS_ENCRYPTION_KEY_PRODUCTION/$encryption_key/g" .env.production
        sed -i "s/CHANGE_THIS_STRONG_PASSWORD/$mongodb_password/g" .env.production
        sed -i "s/CHANGE_THIS_REDIS_PASSWORD/$redis_password/g" .env.production
        
        # Update Redis config
        sed -i "s/CHANGE_THIS_REDIS_PASSWORD/$redis_password/g" ./redis/redis.conf
        
        # Update MongoDB init script
        sed -i "s/CHANGE_THIS_APP_PASSWORD/$mongodb_password/g" ./scripts/mongo-init.js
        
        log "✅ Production secrets generated and applied"
        warning "IMPORTANT: Keep these secrets secure and backup .env.production file!"
    else
        error ".env.production file not found"
    fi
}

# Setup systemd service (optional)
setup_systemd_service() {
    log "Setting up systemd service..."
    
    read -p "Do you want to create a systemd service for auto-start? (y/n): " create_service
    
    if [ "$create_service" = "y" ] || [ "$create_service" = "Y" ]; then
        local service_file="/etc/systemd/system/ussh-freshers-hub.service"
        local current_dir=$(pwd)
        
        sudo tee "$service_file" > /dev/null << EOF
[Unit]
Description=USSH Freshers Hub
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$current_dir
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable ussh-freshers-hub.service
        
        log "✅ Systemd service created and enabled"
        info "Service commands:"
        info "  Start:   sudo systemctl start ussh-freshers-hub"
        info "  Stop:    sudo systemctl stop ussh-freshers-hub"
        info "  Status:  sudo systemctl status ussh-freshers-hub"
    fi
}

# Setup firewall rules
setup_firewall() {
    log "Setting up firewall rules..."
    
    if command -v ufw > /dev/null; then
        info "Configuring UFW firewall..."
        
        # Enable UFW if not enabled
        sudo ufw --force enable
        
        # Allow SSH
        sudo ufw allow ssh
        
        # Allow HTTP and HTTPS
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # Deny direct access to database and cache ports
        sudo ufw deny 27017/tcp
        sudo ufw deny 6379/tcp
        
        sudo ufw reload
        
        log "✅ Firewall configured"
    else
        warning "UFW not available. Please configure firewall manually"
        info "Required ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
        info "Block ports: 27017 (MongoDB), 6379 (Redis)"
    fi
}

# Final setup verification
verify_setup() {
    log "Verifying setup..."
    
    local checks=0
    local total_checks=6
    
    # Check Docker
    if command -v docker > /dev/null && command -v docker-compose > /dev/null; then
        info "✅ Docker and Docker Compose are installed"
        checks=$((checks + 1))
    else
        error "❌ Docker or Docker Compose not found"
    fi
    
    # Check environment file
    if [ -f ".env.production" ]; then
        info "✅ Production environment file exists"
        checks=$((checks + 1))
    else
        error "❌ .env.production file missing"
    fi
    
    # Check SSL certificates
    if [ -f "./ssl/fullchain.pem" ] && [ -f "./ssl/privkey.pem" ]; then
        info "✅ SSL certificates are ready"
        checks=$((checks + 1))
    else
        warning "⚠️  SSL certificates not found"
    fi
    
    # Check configuration files
    if [ -f "docker-compose.prod.yml" ] && [ -f "Dockerfile" ]; then
        info "✅ Docker configuration files exist"
        checks=$((checks + 1))
    else
        error "❌ Docker configuration files missing"
    fi
    
    # Check directories
    if [ -d "./logs" ] && [ -d "./backups" ] && [ -d "./uploads" ]; then
        info "✅ Required directories exist"
        checks=$((checks + 1))
    else
        error "❌ Required directories missing"
    fi
    
    # Check scripts
    if [ -f "./scripts/production/deploy.sh" ] && [ -f "./scripts/production/backup.sh" ]; then
        info "✅ Production scripts are ready"
        checks=$((checks + 1))
    else
        error "❌ Production scripts missing"
    fi
    
    echo "===========================================" | tee -a "$LOG_FILE"
    log "Setup verification: $checks/$total_checks checks passed"
    
    if [ "$checks" -eq "$total_checks" ]; then
        log "🎉 Production setup completed successfully!"
        echo "" | tee -a "$LOG_FILE"
        info "Next steps:"
        info "1. Review and update .env.production with your specific values"
        info "2. Update nginx/conf.d/app.conf with your domain name"
        info "3. Run deployment: ./scripts/production/deploy.sh"
        info "4. Setup SSL with Let's Encrypt: sudo certbot --nginx -d your-domain.com"
        info "5. Setup monitoring and backups"
    else
        warning "⚠️  Setup completed with some issues. Please review the errors above."
    fi
    
    echo "===========================================" | tee -a "$LOG_FILE"
}

# Main setup function
main() {
    log "🚀 Starting USSH Freshers' Hub production setup"
    log "Setup log: $LOG_FILE"
    
    check_system_requirements
    install_dependencies
    install_docker
    setup_directories
    setup_ssl
    setup_redis
    setup_mongodb
    generate_secrets
    setup_systemd_service
    setup_firewall
    verify_setup
    
    log "✅ Production setup process completed!"
    log "📋 Setup log saved to: $LOG_FILE"
}

# Handle script interruption
trap 'error "Setup interrupted by user"' INT TERM

# Check if running with sudo when needed
if [ "$EUID" -ne 0 ] && [ "$1" != "--no-sudo" ]; then
    warning "Some operations may require sudo privileges"
    info "If you encounter permission errors, run with appropriate privileges"
fi

# Run main function
main "$@"
