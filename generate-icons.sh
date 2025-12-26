#!/bin/bash

# Generate App Icons from SVG
# Requires: brew install librsvg (for rsvg-convert)
# Or use online converter: https://cloudconvert.com/svg-to-png

SVG_FILE="AppIcon.svg"
OUTPUT_DIR="GraphQL/Assets.xcassets/AppIcon.appiconset"

# Check if rsvg-convert is installed
if ! command -v rsvg-convert &> /dev/null; then
    echo "rsvg-convert not found. Install with: brew install librsvg"
    echo ""
    echo "Alternatively, convert AppIcon.svg manually using:"
    echo "  - https://cloudconvert.com/svg-to-png"
    echo "  - Figma, Sketch, or Adobe Illustrator"
    echo ""
    echo "Required PNG sizes:"
    echo "  icon-16.png    (16x16)"
    echo "  icon-32.png    (32x32)"
    echo "  icon-64.png    (64x64)"
    echo "  icon-128.png   (128x128)"
    echo "  icon-256.png   (256x256)"
    echo "  icon-512.png   (512x512)"
    echo "  icon-1024.png  (1024x1024)"
    exit 1
fi

echo "Generating icons from $SVG_FILE..."

# Generate all required sizes
rsvg-convert -w 16 -h 16 "$SVG_FILE" -o "$OUTPUT_DIR/icon-16.png"
rsvg-convert -w 32 -h 32 "$SVG_FILE" -o "$OUTPUT_DIR/icon-32.png"
rsvg-convert -w 64 -h 64 "$SVG_FILE" -o "$OUTPUT_DIR/icon-64.png"
rsvg-convert -w 128 -h 128 "$SVG_FILE" -o "$OUTPUT_DIR/icon-128.png"
rsvg-convert -w 256 -h 256 "$SVG_FILE" -o "$OUTPUT_DIR/icon-256.png"
rsvg-convert -w 512 -h 512 "$SVG_FILE" -o "$OUTPUT_DIR/icon-512.png"
rsvg-convert -w 1024 -h 1024 "$SVG_FILE" -o "$OUTPUT_DIR/icon-1024.png"

# Also generate icons for the extension
EXT_OUTPUT_DIR="GraphQL Extension/Resources/images"
rsvg-convert -w 48 -h 48 "$SVG_FILE" -o "$EXT_OUTPUT_DIR/icon-48.png"
rsvg-convert -w 64 -h 64 "$SVG_FILE" -o "$EXT_OUTPUT_DIR/icon-64.png"
rsvg-convert -w 96 -h 96 "$SVG_FILE" -o "$EXT_OUTPUT_DIR/icon-96.png"
rsvg-convert -w 128 -h 128 "$SVG_FILE" -o "$EXT_OUTPUT_DIR/icon-128.png"
rsvg-convert -w 256 -h 256 "$SVG_FILE" -o "$EXT_OUTPUT_DIR/icon-256.png"
rsvg-convert -w 512 -h 512 "$SVG_FILE" -o "$EXT_OUTPUT_DIR/icon-512.png"

echo "✅ Icons generated successfully!"
echo ""
echo "Generated files:"
ls -la "$OUTPUT_DIR"/*.png
echo ""
ls -la "$EXT_OUTPUT_DIR"/*.png

