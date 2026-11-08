#!/bin/bash

# Snap Scroll Redux - Firefox Extension Packaging Script

echo "📦 Packaging Snap Scroll Redux for Firefox..."

# Check if browser-polyfill.min.js exists
if [ ! -f "browser-polyfill.min.js" ]; then
    echo "❌ Error: browser-polyfill.min.js not found!"
    echo "Please download it from: https://github.com/mozilla/webextension-polyfill/releases/latest"
    exit 1
fi

# Check if icons directory exists
if [ ! -d "icons" ]; then
    echo "❌ Error: icons directory not found!"
    echo "Please create an icons directory with icon16.png, icon48.png, and icon128.png"
    exit 1
fi

# Create a temporary directory
TEMP_DIR="snap-scroll-redux-firefox"
mkdir -p "$TEMP_DIR"

# Copy all necessary files
echo "📄 Copying files..."
cp manifest.json "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp popup.css "$TEMP_DIR/"
cp popup.js "$TEMP_DIR/"
cp content.js "$TEMP_DIR/"
cp browser-polyfill.min.js "$TEMP_DIR/"

# Copy icons directory
cp -r icons "$TEMP_DIR/"

# Create the XPI file
echo "🔨 Creating XPI file..."
cd "$TEMP_DIR"
zip -r ../snap-scroll-redux-firefox.xpi ./*
cd ..

# Clean up
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo "✅ Done! Extension packaged as snap-scroll-redux-firefox.xpi"
echo ""
echo "To install:"
echo "1. For testing: Go to about:debugging in Firefox and load as temporary add-on"
echo "2. For permanent installation: Submit to addons.mozilla.org or self-distribute"