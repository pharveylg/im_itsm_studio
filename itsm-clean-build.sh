#!/bin/bash
# ITSM Service Delivery - Analysis Studio
# Run this script to create a clean project directory
# Usage: bash itsm-clean-build.sh

set -euo pipefail
PROJECT_DIR="itsm-service-delivery"

echo "Creating ITSM Service Delivery project..."
rm -rf "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/src/{app/{api/{analyze,guidelines/upload,ai-providers,knowledge,connection,health,setup},knowledge,settings},components,db,lib}"

# Copy all source files from the installed package
SRC="$(dirname "$0")/itsm-clean-src"

# If running from within the sandbox, use the existing project
if [ -d "$SRC" ]; then
  cp -r "$SRC/src" "$PROJECT_DIR/"
  cp "$SRC/.env.example" "$PROJECT_DIR/"
  cp "$SRC/.gitignore" "$PROJECT_DIR/"
  cp "$SRC/README.md" "$PROJECT_DIR/"
  cp "$SRC/next.config.ts" "$PROJECT_DIR/"
  cp "$SRC/drizzle.config.ts" "$PROJECT_DIR/"
  cp "$SRC/postcss.config.mjs" "$PROJECT_DIR/"
  cp "$SRC/eslint.config.mjs" "$PROJECT_DIR/"
  cp "$SRC/tsconfig.json" "$PROJECT_DIR/"
  cp "$SRC/package.json" "$PROJECT_DIR/"
  cp "$SRC/src/app/globals.css" "$PROJECT_DIR/src/app/"
  cp "$SRC/src/app/layout.tsx" "$PROJECT_DIR/src/app/"
else
  echo "Source files not found. Copying from current directory..."
  cp -r src "$PROJECT_DIR/"
  cp package.json "$PROJECT_DIR/"
  cp next.config.ts "$PROJECT_DIR/"
  cp tsconfig.json "$PROJECT_DIR/"
  cp postcss.config.mjs "$PROJECT_DIR/"
  cp eslint.config.mjs "$PROJECT_DIR/"
fi

echo ""
echo "=== Project created: $PROJECT_DIR ==="
echo ""
echo "Next steps:"
echo "1. cd $PROJECT_DIR"
echo "2. npm install"
echo "3. Create .env file (copy from .env.example)"
echo "4. npx drizzle-kit push  (push schema to Supabase)"
echo "5. npm run dev  (local) or git push (Vercel)"
echo ""
echo "For Vercel + Supabase deployment:"
echo "1. git init && git add -A && git commit -m 'Initial deploy'"
echo "2. Push to GitHub"
echo "3. Import repo in Vercel"
echo "4. Set DATABASE_URL in Vercel environment variables"
echo "5. Deploy"
echo "6. Open Settings -> Database Setup -> Create Missing Tables"
echo "7. Open Settings -> AI Providers -> Configure Anthropic or OpenAI"
