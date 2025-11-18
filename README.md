# Noise Dosimeter PWA

A proactive, context-aware progressive web application for personal sensory moderation with a primary focus on auditory health and protection.

## Overview

This application functions as a real-time "Noise Dosimeter" inspired by industrial radiation dosimeters. It constantly monitors your surroundings to determine daily noise exposure and proactively protects your hearing health.

### Key Features

- **Real-time Noise Monitoring**: Uses Web Audio API to measure ambient sound levels
- **Dosimetry Tracking**: Calculates cumulative noise dose using NIOSH time-weighted averaging (3 dB exchange rate)
- **Context Awareness**: Integrates accelerometer and ambient light sensor data to infer environmental context
- **Proactive Warnings**: Alerts when approaching or exceeding safe exposure limits
- **Privacy-First**: All data processed and stored locally on your device
- **Offline Support**: Full PWA capabilities with service worker
- **Cross-Platform**: Works on any device with a modern web browser

## Scientific Foundation

### Noise Exposure Standards

This application is based on established scientific standards:

- **NIOSH REL**: 85 dBA for 8-hour time-weighted average (3 dB exchange rate)
- **WHO Guidelines**: Recommends not exceeding 70 dB over 24 hours
- **Exchange Rate**: 3 dB (NIOSH) - for every 3 dB increase, safe exposure time is halved
  - 85 dB = 8 hours
  - 88 dB = 4 hours
  - 91 dB = 2 hours
  - 94 dB = 1 hour
  - etc.

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Audio Processing**: Web Audio API
- **Sensors**: Generic Sensor API (Accelerometer, Ambient Light)
- **Storage**: IndexedDB for local data persistence
- **PWA**: Service Workers, Web App Manifest
- **No External Dependencies**: Pure web standards implementation

## Installation & Setup

### Prerequisites

- Modern web browser (Chrome, Safari, Edge, Firefox)
- HTTPS connection (required for microphone and sensor access)
- Microphone-enabled device
- (Optional) Accelerometer and ambient light sensor for enhanced context awareness

### Running Locally

#### Option 1: Using Python (Recommended for macOS ARM64)

```bash
# Navigate to the project directory
cd noise-dosimeter

# Python 3 (macOS comes with Python 3)
python3 -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000
```

Then visit: `http://localhost:8000`

**Note**: For full PWA features and sensor access, you need HTTPS. You can:
1. Use a tool like `ngrok` to create an HTTPS tunnel
2. Deploy to a hosting service
3. Use `localhost` (browsers allow sensor access on localhost even without HTTPS)

#### Option 2: Using Node.js

```bash
# Install http-server globally
npm install -g http-server

# Run server
http-server -p 8000
```

#### Option 3: Using Browser-Specific Tools

**Safari/WebKit** (macOS):
- Safari allows localhost access to sensors without HTTPS
- Simply open `index.html` directly or use Python server

### Installing as PWA

1. Open the application in your browser
2. Look for the "Install" or "Add to Home Screen" option
3. Click to install the PWA
4. Launch from your home screen/app launcher

## Usage Guide

### First Time Setup

1. **Grant Permissions**: When prompted, allow microphone access
2. **Optional**: Allow notification permissions for warnings
3. **Configure Settings**: Click the settings icon to customize:
   - Safety threshold (NIOSH 85 dB recommended)
   - Audio warnings on/off
   - Push notifications on/off
   - Microphone calibration offset

### Daily Use

1. **Start Monitoring**: Click the "Start" button to begin tracking
2. **View Real-time Levels**: Monitor current noise level and environmental context
3. **Track Daily Dose**: Watch your cumulative exposure as a percentage of safe daily limit
4. **Respond to Warnings**: Take action when warned about high exposure
5. **Review History**: Check daily, weekly, and monthly exposure patterns

### Understanding the Display

#### Current Noise Level
- **Quiet (<70 dB)**: Safe for extended exposure
- **Moderate (70-85 dB)**: Safe for 8+ hours
- **Loud (85-95 dB)**: Limited safe exposure time
- **Very Loud (95-110 dB)**: Hearing protection recommended
- **Dangerous (>110 dB)**: Immediate hearing damage risk

#### Daily Dose Percentage
- **0-50%**: Low risk (green)
- **50-100%**: Moderate risk (yellow)
- **100-200%**: High risk (red)
- **>200%**: Severe risk (dark red)

#### Environmental Context
The app combines multiple sensors to determine your environment:
- **Outdoor commute**: Moving + bright light
- **Indoor commute**: Moving + indoor lighting
- **Office**: Stationary + indoor lighting
- **Vehicle**: Moving + vibration
- **Quiet space**: Stationary + dim light

## Technical Details

### Architecture

```
noise-dosimeter/
├── index.html              # Main application
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/
│   └── styles.css          # Application styles
└── js/
    ├── app.js              # Main application logic
    ├── audio-processor.js  # Web Audio API integration
    ├── dosimetry.js        # Dose calculation engine
    ├── sensors.js          # Sensor fusion system
    ├── storage.js          # IndexedDB wrapper
    └── charts.js           # Data visualization
```

### Data Storage

All data is stored locally using IndexedDB:
- **exposureRecords**: Individual exposure measurements
- **dailySummary**: Daily aggregated statistics
- **settings**: User preferences

### Privacy

- **No Cloud Storage**: All data remains on your device
- **No Tracking**: No analytics or external services
- **No Third Parties**: Pure client-side application
- **Export Capability**: Download your data anytime
- **Clear Data**: Delete all data with one click

## Calibration

The Web Audio API measures sound in dBFS (decibels full scale), which is relative to the device's maximum volume. The app estimates dB SPL (sound pressure level) using a simplified conversion.

For better accuracy:
1. Use a calibrated sound level meter
2. Compare readings in a stable environment
3. Adjust the calibration offset in settings
4. Typical offset range: -20 to +20 dB

## Browser Compatibility

### Full Support
- Chrome/Edge 89+ (Desktop & Mobile)
- Safari 14.5+ (iOS & macOS)
- Firefox 88+ (Desktop & Mobile)

### Partial Support
- Older browsers may lack sensor APIs
- Core noise monitoring works on all modern browsers
- PWA features require modern browser

### Required APIs
- ✅ Web Audio API (widely supported)
- ✅ IndexedDB (widely supported)
- ✅ Service Workers (widely supported)
- ⚠️ Generic Sensor API (limited support, fallbacks available)
- ⚠️ Ambient Light Sensor (limited support, optional)

## Troubleshooting

### Microphone Not Working
- Check browser permissions
- Ensure HTTPS connection (or localhost)
- Try different browser
- Check system microphone permissions (macOS: System Preferences → Security & Privacy → Microphone)

### Sensors Not Available
- Some sensors require HTTPS
- Not all devices have all sensors
- App works without sensors, but with reduced context awareness

### PWA Not Installing
- Requires HTTPS (except localhost)
- Check browser compatibility
- Ensure manifest.json is accessible

### Data Not Saving
- Check browser storage permissions
- Clear browser cache and try again
- Ensure sufficient storage space

## Development

### Adding Features

The modular architecture makes it easy to extend:

1. **New Sensors**: Add to `sensors.js`
2. **Custom Calculations**: Modify `dosimetry.js`
3. **UI Changes**: Update `index.html` and `styles.css`
4. **New Visualizations**: Extend `charts.js`

### Testing

```bash
# Test on different devices
# Test with various noise levels
# Test offline functionality
# Test data persistence
# Test PWA installation
```

## Project Context

This application was developed as part of the **BITS F364 - Human Computer Interaction** course project. It addresses the problem of noise-induced hearing loss (NIHL), which affects over 1.5 billion people globally according to WHO.

### Research Foundation

The app is based on:
- NIOSH occupational noise exposure criteria
- WHO hearing loss prevention guidelines
- Academic research on sensor fusion for context awareness
- PWA best practices for offline-first applications

## Contributing

This is an academic project, but suggestions and improvements are welcome:

1. Test the application
2. Report issues or bugs
3. Suggest new features
4. Improve documentation

## License

This project is developed for educational purposes as part of the BITS F364 HCI course.

## References

- NIOSH Criteria for Occupational Noise Exposure (1998)
- WHO Guidelines on Noise-Induced Hearing Loss
- MDN Web Docs - Web Audio API
- MDN Web Docs - Generic Sensor API
- W3C PWA Best Practices

## Author

**Pranav J Deshpande**
ID: 2022B3A71204G
BITS F364 - Human Computer Interaction

---

**Protect Your Hearing. Use Technology Wisely.**
