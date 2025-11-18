#!/bin/bash

# Noise Dosimeter PWA - Quick Start Script
# Compatible with macOS ARM64

echo "🔊 Noise Dosimeter PWA - Starting Server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✓ Python 3 found"
    echo ""
    echo "Starting HTTP server on port 8000..."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📱 Open in your browser:"
    echo "   http://localhost:8000"
    echo ""
    echo "💡 Tips:"
    echo "   - Grant microphone permissions when prompted"
    echo "   - Use headphones for testing audio levels"
    echo "   - Check Settings to configure threshold and calibration"
    echo ""
    echo "⌨️  Press Ctrl+C to stop the server"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Start Python HTTP server
    python3 -m http.server 8000

elif command -v python &> /dev/null; then
    echo "✓ Python 2 found"
    echo ""
    echo "Starting HTTP server on port 8000..."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📱 Open in your browser:"
    echo "   http://localhost:8000"
    echo ""
    echo "💡 Tips:"
    echo "   - Grant microphone permissions when prompted"
    echo "   - Use headphones for testing audio levels"
    echo "   - Check Settings to configure threshold and calibration"
    echo ""
    echo "⌨️  Press Ctrl+C to stop the server"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Start Python 2 HTTP server
    python -m SimpleHTTPServer 8000
else
    echo "❌ Python not found!"
    echo ""
    echo "Please install Python or use another method:"
    echo ""
    echo "Option 1 - Install Python via Homebrew:"
    echo "  brew install python3"
    echo ""
    echo "Option 2 - Use Node.js http-server:"
    echo "  npm install -g http-server"
    echo "  http-server -p 8000"
    echo ""
    echo "Option 3 - Open index.html directly in Safari"
    echo ""
    exit 1
fi
