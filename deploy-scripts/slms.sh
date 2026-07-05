#!/bin/bash

# --- Load shared deployment configuration (config.env = single source of truth)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "${SCRIPT_DIR}/config.env" ] && source "${SCRIPT_DIR}/config.env"
SERVER_IP="${PUBLIC_IP:-${SERVER_IP:-127.0.0.1}}"
SERVICE_NAME="${SERVICE_NAME:-sipi}"
ADMIN_PORT="${ADMIN_PORT:-8080}"
# Display URLs: prefer the configured domains, fall back to the raw IP.
STUDENT_URL="${STUDENT_DOMAIN:+http(s)://${STUDENT_DOMAIN}}"
STUDENT_URL="${STUDENT_URL:-http://${SERVER_IP}}"
ADMIN_URL="${ADMIN_DOMAIN:+http(s)://${ADMIN_DOMAIN}}"
ADMIN_URL="${ADMIN_URL:-http://${SERVER_IP}:${ADMIN_PORT}}"

# SLMS Master Script
# Single entry point for all SLMS deployment and maintenance tasks

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Show main menu
show_menu() {
    echo ""
    echo "🚀 SLMS Management System"
    echo "========================="
    echo ""
    echo "1. 🏗️  Deploy Application (First time setup)"
    echo "2. 🔧 Maintenance Tasks"
    echo "3. 🩺 Troubleshooting"
    echo "4. 📊 System Status"
    echo "5. 📋 View Logs"
    echo "6. 🔄 Quick Restart"
    echo "7. 💾 Backup Database"
    echo "8. 📈 Monitor System"
    echo "9. ❓ Help"
    echo "0. 🚪 Exit"
    echo ""
}

# Show maintenance submenu
show_maintenance_menu() {
    echo ""
    echo "🔧 Maintenance Tasks"
    echo "==================="
    echo ""
    echo "1. 🔄 Update Application"
    echo "2. 👤 Create Superuser"
    echo "3. 🗄️  Run Migrations"
    echo "4. 📁 Collect Static Files"
    echo "5. 🏗️  Rebuild Frontend"
    echo "6. 🧹 Clean System"
    echo "7. 💾 Backup Database"
    echo "8. 📥 Restore Database"
    echo "0. ⬅️  Back to Main Menu"
    echo ""
}

# Show troubleshooting submenu
show_troubleshooting_menu() {
    echo ""
    echo "🩺 Troubleshooting"
    echo "=================="
    echo ""
    echo "1. 🔍 Full System Diagnosis"
    echo "2. 🚫 Fix 502 Bad Gateway"
    echo "3. 🌐 Fix CORS Issues"
    echo "4. 🔐 Fix Permissions"
    echo "5. 🗄️  Fix Database Issues"
    echo "6. 📁 Fix Static Files"
    echo "7. 🔄 Reset NGINX"
    echo "8. ☢️  Reset All (Nuclear Option)"
    echo "0. ⬅️  Back to Main Menu"
    echo ""
}

# Make scripts executable
ensure_executable() {
    chmod +x deploy-scripts/deploy.sh 2>/dev/null || true
    chmod +x deploy-scripts/maintenance.sh 2>/dev/null || true
    chmod +x deploy-scripts/troubleshoot.sh 2>/dev/null || true
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "deploy-scripts/slms.sh" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Main deployment
deploy_application() {
    print_step "Starting application deployment..."
    ensure_executable
    ./deploy-scripts/deploy.sh
}

# Maintenance tasks
maintenance_tasks() {
    while true; do
        show_maintenance_menu
        read -p "Select option (0-8): " choice
        
        case $choice in
            1) ensure_executable && ./deploy-scripts/maintenance.sh update ;;
            2) ensure_executable && ./deploy-scripts/maintenance.sh superuser ;;
            3) ensure_executable && ./deploy-scripts/maintenance.sh migrate ;;
            4) ensure_executable && ./deploy-scripts/maintenance.sh static ;;
            5) ensure_executable && ./deploy-scripts/maintenance.sh rebuild ;;
            6) ensure_executable && ./deploy-scripts/maintenance.sh clean ;;
            7) ensure_executable && ./deploy-scripts/maintenance.sh backup ;;
            8) ensure_executable && ./deploy-scripts/maintenance.sh restore ;;
            0) break ;;
            *) print_error "Invalid option" ;;
        esac
        
        if [ "$choice" != "0" ]; then
            read -p "Press Enter to continue..."
        fi
    done
}

# Troubleshooting tasks
troubleshooting_tasks() {
    while true; do
        show_troubleshooting_menu
        read -p "Select option (0-8): " choice
        
        case $choice in
            1) ensure_executable && ./deploy-scripts/troubleshoot.sh diagnose ;;
            2) ensure_executable && ./deploy-scripts/troubleshoot.sh fix-502 ;;
            3) ensure_executable && ./deploy-scripts/troubleshoot.sh fix-cors ;;
            4) ensure_executable && ./deploy-scripts/troubleshoot.sh fix-perms ;;
            5) ensure_executable && ./deploy-scripts/troubleshoot.sh fix-db ;;
            6) ensure_executable && ./deploy-scripts/troubleshoot.sh fix-static ;;
            7) ensure_executable && ./deploy-scripts/troubleshoot.sh reset-nginx ;;
            8) ensure_executable && ./deploy-scripts/troubleshoot.sh reset-all ;;
            0) break ;;
            *) print_error "Invalid option" ;;
        esac
        
        if [ "$choice" != "0" ]; then
            read -p "Press Enter to continue..."
        fi
    done
}

# System status
system_status() {
    ensure_executable
    ./deploy-scripts/maintenance.sh status
    read -p "Press Enter to continue..."
}

# View logs
view_logs() {
    ensure_executable
    ./deploy-scripts/maintenance.sh logs
}

# Quick restart
quick_restart() {
    ensure_executable
    ./deploy-scripts/maintenance.sh restart
    read -p "Press Enter to continue..."
}

# Backup database
backup_database() {
    ensure_executable
    ./deploy-scripts/maintenance.sh backup
    read -p "Press Enter to continue..."
}

# Monitor system
monitor_system() {
    ensure_executable
    ./deploy-scripts/maintenance.sh monitor
}

# Show help
show_help() {
    echo ""
    echo "🚀 SLMS Management System Help"
    echo "=============================="
    echo ""
    echo "This script provides a unified interface for managing your SLMS deployment."
    echo ""
    echo "📁 Script Locations:"
    echo "   deploy-scripts/deploy.sh       - Main deployment script"
    echo "   deploy-scripts/maintenance.sh  - Maintenance tasks"
    echo "   deploy-scripts/troubleshoot.sh - Troubleshooting tools"
    echo ""
    echo "🌐 Application URLs (after deployment):"
    echo "   Student Frontend: ${STUDENT_URL}"
    echo "   Admin Frontend:   ${ADMIN_URL}"
    echo "   API Endpoint:     ${STUDENT_URL}/api/"
    echo ""
    echo "🔧 Manual Commands:"
    echo "   sudo systemctl status ${SERVICE_NAME} nginx postgresql"
    echo "   sudo journalctl -u ${SERVICE_NAME} -f"
    echo "   sudo tail -f /var/log/nginx/error.log"
    echo ""
    echo "📞 Support:"
    echo "   Check logs for errors"
    echo "   Use troubleshooting menu for common issues"
    echo "   Ensure AWS Security Group allows ports 80 and 8080"
    echo ""
    read -p "Press Enter to continue..."
}

# Main loop
main() {
    check_directory
    
    while true; do
        clear
        show_menu
        read -p "Select option (0-9): " choice
        
        case $choice in
            1) deploy_application ;;
            2) maintenance_tasks ;;
            3) troubleshooting_tasks ;;
            4) system_status ;;
            5) view_logs ;;
            6) quick_restart ;;
            7) backup_database ;;
            8) monitor_system ;;
            9) show_help ;;
            0) 
                print_status "Goodbye! 👋"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                sleep 1
                ;;
        esac
    done
}

# Run main function
main "$@"