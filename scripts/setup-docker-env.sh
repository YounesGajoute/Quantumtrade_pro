#!/bin/bash

# QuantumTrade Pro Docker Environment Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to setup Docker environment file
setup_docker_env() {
    if [ ! -f .env ]; then
        print_status "Creating .env file for Docker Compose..."
        cat > .env << EOF
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Binance API Configuration
BINANCE_API_KEY=dk3QTT4Pvp0KcxTFtfWUlyG4lxWMqJBZ7amwSxqBkE8RcGK3VteI5J2v3mbKRgrQ
BINANCE_API_SECRET=oBG87XADV14fZV9dZn6zyccscRZMDc95pzUaNREkzclr90vAjyaj4D4dZPIpVH7P

# Telegram Bot Configuration (Optional)
TELEGRAM_BOT_TOKEN=8159453795:AAE9bbijfsVmByfdgBLrvkJyUABge8PbQG0
TELEGRAM_CHAT_ID=1751294791

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Enhanced Processing Engine - Cache/DB
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
TIMESCALE_HOST=timescaledb
TIMESCALE_PORT=5432
TIMESCALE_DB=quantumtrade
TIMESCALE_USER=postgres
TIMESCALE_PASSWORD=timescale_password

# Monitoring Configuration
GRAFANA_PASSWORD=admin
EOF
        print_success ".env file created for Docker Compose"
        print_warning "Please update .env with your actual API keys and configuration"
    else
        print_status ".env file already exists"
    fi
}

# Function to check Docker and Docker Compose
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are available"
}

# Function to start services
start_services() {
    print_status "Starting QuantumTrade Pro services..."
    docker-compose up -d
    
    print_success "Services started successfully!"
    echo ""
    echo "🌐 Services URLs:"
    echo "  - Main App: http://localhost:3000"
    echo "  - Grafana: http://localhost:3001 (admin/admin)"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - Alertmanager: http://localhost:9093"
    echo ""
    echo "📊 Monitoring:"
    echo "  - Redis: localhost:6379"
    echo "  - TimescaleDB: localhost:5432"
    echo ""
    echo "🔧 Management:"
    echo "  - View logs: docker-compose logs -f [service-name]"
    echo "  - Stop services: docker-compose down"
    echo "  - Restart services: docker-compose restart"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --env-only     Only create .env file"
    echo "  --start        Create .env and start services"
    echo ""
    echo "Examples:"
    echo "  $0 --env-only  # Only create .env file"
    echo "  $0 --start     # Setup and start all services"
}

# Main function
main() {
    echo "=========================================="
    echo "QuantumTrade Pro Docker Environment Setup"
    echo "=========================================="
    echo ""
    
    check_docker
    setup_docker_env
    
    if [ "$1" = "--start" ]; then
        start_services
    fi
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --env-only)
        check_docker
        setup_docker_env
        ;;
    --start)
        main --start
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac 