#!/bin/bash

# Script to help debug the empty page issue

echo "======================================"
echo "HA Advisor - Debugging Script"
echo "======================================"
echo ""

# Check if dev server is running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✓ Dev server is running on http://localhost:5173"
else
    echo "✗ Dev server is NOT running"
    echo "  Run: npm run dev"
    exit 1
fi

echo ""
echo "Checking page content..."
CONTENT=$(curl -s http://localhost:5173)
if echo "$CONTENT" | grep -q "root"; then
    echo "✓ HTML contains root div"
else
    echo "✗ HTML doesn't contain root div"
fi

echo ""
echo "Checking if JavaScript loads..."
if echo "$CONTENT" | grep -q "main.tsx"; then
    echo "✓ main.tsx script tag found"
else
    echo "✗ main.tsx script tag NOT found"
fi

echo ""
echo "======================================"
echo "To debug further, open your browser to:"
echo "  http://localhost:5173"
echo ""
echo "Then open Developer Tools (F12) and check:"
echo "  1. Console tab for any errors (red messages)"
echo "  2. Network tab to see if all files load (200 status)"
echo "  3. Elements tab to see if #root div has children"
echo "======================================"
