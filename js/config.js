/**
 * Configuration - All app constants in one place
 * Easy to modify for future changes
 */

const CONFIG = {
  // App Info
  APP: {
    name: 'Noise Dosimeter',
    version: '2.0.0',
    author: 'Pranav J Deshpande'
  },

  // Sampling Rates (optimized for performance and battery)
  SAMPLING: {
    displayHz: 10,      // 10 Hz for smooth visual updates
    calculationHz: 1,   // 1 Hz for dose calculation (NIOSH standard)
    displayInterval: 100, // ms (1000 / 10)
    calcInterval: 1000    // ms (1000 / 1)
  },

  // NIOSH Dosimetry Standards
  NIOSH: {
    criterionLevel: 85,        // dB - NIOSH recommended exposure limit
    criterionDuration: 28800,  // seconds (8 hours)
    exchangeRate: 3,           // dB - NIOSH uses 3 dB exchange rate
    threshold: 80,             // dB - minimum level to count
    maxSafeLevel: 85,          // dB for 8 hours
    dangerLevel: 100           // dB - immediate warning threshold
  },

  // Alternative: OSHA Standards (not default)
  OSHA: {
    criterionLevel: 90,
    criterionDuration: 28800,
    exchangeRate: 5,
    threshold: 80
  },

  // Pocket Detection
  POCKET: {
    defaultCorrection: -10,    // dB - typical fabric attenuation
    minCorrection: -20,        // dB
    maxCorrection: -5,         // dB
    lightThreshold: 5,         // lux - below this = likely in pocket
    proximityThreshold: 1      // cm - below this = near object
  },

  // Calibration
  CALIBRATION: {
    minOffset: -20,      // dB
    maxOffset: 20,       // dB
    defaultOffset: 0,    // dB
    step: 0.5            // dB
  },

  // Audio Processing
  AUDIO: {
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    // dBFS to dB SPL mapping (adjusted for more accurate readings)
    // Phone microphones typically max out around -30 dBFS for normal sound
    // More conservative mapping to prevent over-reporting
    minDBFS: -100,
    maxDBFS: -30,  // Even more conservative for phone microphones
    minSPL: 30,
    maxSPL: 95     // Adjusted upper limit for typical environments
  },

  // Warning Thresholds
  WARNINGS: {
    dose: {
      advisory: 50,     // % - yellow warning
      warning: 100,     // % - red warning
      critical: 150     // % - severe warning
    },
    level: {
      moderate: 70,     // dB
      loud: 85,         // dB
      veryLoud: 95,     // dB
      dangerous: 110    // dB
    },
    // Warning fatigue prevention
    cooldownPeriod: 300000  // ms (5 minutes between same warnings)
  },

  // Haptic Patterns
  HAPTICS: {
    light: [10],
    medium: [20],
    strong: [50],
    warning: [200, 100, 200],
    critical: [100, 50, 100, 50, 100]
  },

  // Storage
  STORAGE: {
    dbName: 'NoiseDosimeterDB',
    dbVersion: 2,
    dataRetentionDays: 365,    // Keep data for 1 year
    hourlyDataDays: 30         // Keep hourly breakdown for 30 days
  },

  // Reset Time
  RESET: {
    defaultTime: '00:00',      // Midnight
    presets: ['00:00', '06:00', '12:00']
  },

  // UI Animation Durations (ms)
  ANIMATION: {
    fast: 150,
    normal: 300,
    slow: 500
  },

  // Debug Mode
  DEBUG: {
    enabled: true,              // Set to true for console logging
    verboseAudio: false,        // Detailed audio processing logs
    verboseSensors: false,      // Detailed sensor logs
    verboseDose: false          // Detailed dosimetry logs
  }
};

// Helper function for logging
function debugLog(category, ...args) {
  if (CONFIG.DEBUG.enabled) {
    console.log(`[${category}]`, ...args);
  }
}

// Make config read-only
Object.freeze(CONFIG);
