#!/bin/bash

# QuantumTrade Pro Setup Script
# This script automates the setup process for QuantumTrade Pro

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node -v | cut -d'v' -f2)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
        
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_success "Node.js version $NODE_VERSION is compatible"
            return 0
        else
            print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18 or higher."
            return 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        return 1
    fi
}

# Function to check pnpm
check_pnpm() {
    if command_exists pnpm; then
        print_success "pnpm is installed"
        return 0
    else
        print_warning "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
        if command_exists pnpm; then
            print_success "pnpm installed successfully"
            return 0
        else
            print_error "Failed to install pnpm"
            return 1
        fi
    fi
}

# Function to setup environment file
setup_env() {
    if [ ! -f .env.local ]; then
        print_status "Creating .env.local file..."
        cat > .env.local << EOF
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
EOF
        print_success ".env.local file created"
        print_warning "Please update .env.local with your actual API keys and configuration"
    else
        print_status ".env.local file already exists"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    if command_exists pnpm; then
        pnpm install
    else
        npm install
    fi
    print_success "Dependencies installed successfully"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if Supabase URL is configured
    if grep -q "your_supabase_project_url" .env.local; then
        print_warning "Please configure your Supabase URL in .env.local before setting up database"
        return 1
    fi
    
    print_status "Database setup instructions:"
    echo "1. Go to your Supabase dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Run the contents of scripts/create-database-schema.sql"
    echo "4. Verify the tables are created successfully"
}

# Function to build the application
build_app() {
    print_status "Building the application..."
    if command_exists pnpm; then
        pnpm build
    else
        npm run build
    fi
    print_success "Application built successfully"
}

# Function to start development server
start_dev() {
    print_status "Starting development server..."
    if command_exists pnpm; then
        pnpm dev
    else
        npm run dev
    fi
}

# Function to run health checks
health_check() {
    print_status "Running health checks..."
    
    # Check if server is running
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Application is running on http://localhost:3000"
    else
        print_warning "Application is not running. Start it with: pnpm dev"
    fi
    
    # Check database connection
    if curl -s http://localhost:3000/api/database/stats?type=health > /dev/null; then
        print_success "Database connection is working"
    else
        print_warning "Database connection failed. Check your Supabase configuration"
    fi
}

# Function to display setup summary
show_summary() {
    echo ""
    echo "=========================================="
    echo "QuantumTrade Pro Setup Summary"
    echo "=========================================="
    echo ""
    echo "✅ Dependencies installed"
    echo "✅ Environment file created"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Update .env.local with your API keys"
    echo "2. Set up your Supabase database"
    echo "3. Configure your Binance API keys"
    echo "4. Set up Telegram bot (optional)"
    echo "5. Start the development server: pnpm dev"
    echo ""
    echo "📚 Documentation:"
    echo "- Setup Guide: docs/SETUP_AND_STARTUP.md"
    echo "- Trading Logic: docs/TRADING_LOGIC_ANALYSIS.md"
    echo "- Database: docs/DATABASE_INTEGRATION.md"
    echo ""
    echo "🚀 Quick Start:"
    echo "pnpm dev"
    echo ""
}

# Main setup function
main() {
    echo "=========================================="
    echo "QuantumTrade Pro Setup Script"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    
    if ! check_node_version; then
        print_error "Node.js version check failed"
        exit 1
    fi
    
    if ! check_pnpm; then
        print_error "pnpm setup failed"
        exit 1
    fi
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_env
    
    # Setup database
    setup_database
    
    # Build application
    build_app
    
    # Show summary
    show_summary
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --dev          Start development server after setup"
    echo "  --health       Run health checks"
    echo "  --env-only     Only setup environment file"
    echo ""
    echo "Examples:"
    echo "  $0              # Full setup"
    echo "  $0 --dev        # Setup and start dev server"
    echo "  $0 --health     # Run health checks"
    echo "  $0 --env-only   # Only create .env.local"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --dev)
        main
        echo ""
        print_status "Starting development server..."
        start_dev
        ;;
    --health)
        health_check
        ;;
    --env-only)
        setup_env
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