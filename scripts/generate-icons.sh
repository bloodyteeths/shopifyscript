#!/bin/bash

# Ads Autopilot AI - Icon Generation Script
# This script generates all required icon sizes from a source 1024x1024 image

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
ICON_DIR="docs/shopify-review/assets/icons"
PUBLIC_DIR="shopify-ui/public"
SOURCE_ICON="$ICON_DIR/app-icon-1024.png"

echo -e "${YELLOW}Ads Autopilot AI - Icon Generation Script${NC}"
echo "==========================================="
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo -e "${RED}ERROR: ImageMagick is not installed${NC}"
    echo "Install it with: brew install imagemagick"
    exit 1
fi

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo -e "${RED}ERROR: Source icon not found at $SOURCE_ICON${NC}"
    echo "Please save your 1024x1024 logo as: $SOURCE_ICON"
    exit 1
fi

echo -e "${GREEN}✓ Found source icon: $SOURCE_ICON${NC}"
echo ""

# Create directories if they don't exist
mkdir -p "$ICON_DIR"
mkdir -p "$PUBLIC_DIR"

echo "Generating Shopify App Store icons..."
echo "--------------------------------------"

# Generate Shopify App Store icons
convert "$SOURCE_ICON" -resize 512x512 "$ICON_DIR/app-icon-512.png"
echo -e "${GREEN}✓ Created app-icon-512.png${NC}"

convert "$SOURCE_ICON" -resize 256x256 "$ICON_DIR/app-icon-256.png"
echo -e "${GREEN}✓ Created app-icon-256.png${NC}"

convert "$SOURCE_ICON" -resize 32x32 "$ICON_DIR/favicon-32.png"
echo -e "${GREEN}✓ Created favicon-32.png${NC}"

convert "$SOURCE_ICON" -resize 16x16 "$ICON_DIR/favicon-16.png"
echo -e "${GREEN}✓ Created favicon-16.png${NC}"

echo ""
echo "Generating Shopify UI public icons..."
echo "--------------------------------------"

# Generate Shopify UI icons
cp "$SOURCE_ICON" "$PUBLIC_DIR/icon-1024.png"
echo -e "${GREEN}✓ Copied icon-1024.png${NC}"

convert "$SOURCE_ICON" -resize 512x512 "$PUBLIC_DIR/icon-512.png"
echo -e "${GREEN}✓ Created icon-512.png${NC}"

convert "$SOURCE_ICON" -resize 192x192 "$PUBLIC_DIR/icon-192.png"
echo -e "${GREEN}✓ Created icon-192.png${NC}"

convert "$SOURCE_ICON" -resize 32x32 "$PUBLIC_DIR/favicon.ico"
echo -e "${GREEN}✓ Created favicon.ico${NC}"

echo ""
echo "Verifying generated icons..."
echo "--------------------------------------"

# Verify all icons were created
ICONS=(
    "$ICON_DIR/app-icon-1024.png"
    "$ICON_DIR/app-icon-512.png"
    "$ICON_DIR/app-icon-256.png"
    "$ICON_DIR/favicon-32.png"
    "$ICON_DIR/favicon-16.png"
    "$PUBLIC_DIR/icon-1024.png"
    "$PUBLIC_DIR/icon-512.png"
    "$PUBLIC_DIR/icon-192.png"
    "$PUBLIC_DIR/favicon.ico"
)

ALL_EXIST=true
for icon in "${ICONS[@]}"; do
    if [ -f "$icon" ]; then
        SIZE=$(ls -lh "$icon" | awk '{print $5}')
        echo -e "${GREEN}✓ $icon ($SIZE)${NC}"
    else
        echo -e "${RED}✗ $icon (missing)${NC}"
        ALL_EXIST=false
    fi
done

echo ""
if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}SUCCESS! All icons generated successfully.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review generated icons in: $ICON_DIR"
    echo "2. Test favicon in browser: $PUBLIC_DIR/favicon.ico"
    echo "3. Update Shopify app settings with new icons"
else
    echo -e "${RED}WARNING: Some icons failed to generate.${NC}"
    echo "Please check the errors above and try again."
    exit 1
fi
