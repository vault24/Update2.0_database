#!/bin/bash

echo "🔧 Resolving Git Conflicts and Syncing with GitHub"
echo "=================================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Checking current Git status..."
git status

echo ""
echo "[INFO] Step 2: Adding all local changes..."
git add .

echo ""
echo "[INFO] Step 3: Committing local changes..."
git commit -m "Local changes: Update social media meta tags and fix permissions

- Updated meta tags in both HTML files to use local SIPI.jpeg
- Fixed file permissions and rebuild scripts
- Resolved authentication and CORS issues"

if [ $? -ne 0 ]; then
    echo "[WARNING] Commit failed or no changes to commit"
fi

echo ""
echo "[INFO] Step 4: Pulling from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "[ERROR] Git pull failed. Manual conflict resolution may be needed."
    echo ""
    echo "Current Git status:"
    git status
    echo ""
    echo "If there are merge conflicts, resolve them manually and then run:"
    echo "git add ."
    echo "git commit -m 'Resolve merge conflicts'"
    echo "git push origin main"
    exit 1
fi

echo ""
echo "[INFO] Step 5: Pushing merged changes back to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Git conflicts resolved successfully!"
    echo "✅ All changes synced with GitHub"
else
    echo ""
    echo "❌ Push failed. Check your GitHub credentials and network connection."
    exit 1
fi

echo ""
echo "[INFO] Step 6: Fixing Node.js permissions for rebuilding..."

# Fix Node.js and npm permissions
echo "Fixing Node.js permissions..."
sudo chown -R ubuntu:ubuntu /home/ubuntu/.npm
sudo chown -R ubuntu:ubuntu /home/ubuntu/.config
sudo chown -R ubuntu:ubuntu client/

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

echo ""
echo "[INFO] Step 7: Reinstalling dependencies if needed..."

# Check if node_modules exist and reinstall if corrupted
cd client/student-side
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Reinstalling student-side dependencies..."
    rm -rf node_modules package-lock.json
    npm install
fi

cd ../admin-side
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Reinstalling admin-side dependencies..."
    rm -rf node_modules package-lock.json
    npm install
fi

cd "$PROJECT_DIR"

echo ""
echo "🎉 Git conflicts resolved and Node.js permissions fixed!"
echo ""
echo "Next steps:"
echo "1. Run: ./deploy-scripts/fix-permissions-and-rebuild.sh"
echo "2. Test your websites:"
echo "   🎓 Student: http://47.128.236.25"
echo "   👨‍💼 Admin: http://47.128.236.25:8080"