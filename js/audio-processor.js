/**
 * Audio Processor Module - Real-time noise monitoring using Web Audio API
 * Measures sound levels in dBFS and estimates dB SPL
 */

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.bufferLength = null;
    this.isActive = false;
    this.calibrationOffset = 0; // dB offset for calibration
    this.currentLevel = 0;
    this.peakLevel = 0;
    this.updateInterval = null;
    this.sampleInterval = 1000; // ms - how often to sample
    this.callbacks = {
      onLevelUpdate: null,
      onError: null
    };

    // Smoothing for visual display
    this.smoothingFactor = 0.8;
    this.smoothedLevel = 0;
  }

  /**
   * Initialize audio context and request microphone access
   */
  async initialize() {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);

      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      console.log('Audio processor initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      throw error;
    }
  }

  /**
   * Start monitoring audio levels
   */
  start() {
    if (!this.analyser) {
      throw new Error('Audio processor not initialized');
    }

    this.isActive = true;
    this.peakLevel = 0;

    // Start periodic sampling
    this.updateInterval = setInterval(() => {
      this.measureLevel();
    }, this.sampleInterval);

    console.log('Audio monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isActive = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('Audio monitoring stopped');
  }

  /**
   * Measure current audio level
   */
  measureLevel() {
    if (!this.analyser || !this.isActive) {
      return;
    }

    // Get time domain data
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate RMS (Root Mean Square)
    let sum = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.bufferLength);

    // Convert RMS to dBFS (decibels full scale)
    // dBFS range is -Infinity to 0
    let dbfs = 20 * Math.log10(rms);

    // Clamp to reasonable range
    dbfs = Math.max(-60, Math.min(0, dbfs));

    // Estimate dB SPL
    // This is an approximation and should be calibrated for accuracy
    // Typical range mapping: -60 dBFS to 0 dBFS → 30 dB SPL to 120 dB SPL
    const dbSPL = this.convertToSPL(dbfs) + this.calibrationOffset;

    // Apply smoothing for display
    this.smoothedLevel = this.smoothingFactor * this.smoothedLevel +
                         (1 - this.smoothingFactor) * dbSPL;

    this.currentLevel = Math.round(this.smoothedLevel);

    // Track peak
    if (this.currentLevel > this.peakLevel) {
      this.peakLevel = this.currentLevel;
    }

    // Call update callback
    if (this.callbacks.onLevelUpdate) {
      this.callbacks.onLevelUpdate({
        current: this.currentLevel,
        peak: this.peakLevel,
        dbfs: dbfs,
        rms: rms
      });
    }
  }

  /**
   * Convert dBFS to estimated dB SPL
   * This is a simplified conversion and should be calibrated
   */
  convertToSPL(dbfs) {
    // Map dBFS (-60 to 0) to SPL (30 to 120)
    // This is a linear mapping and should be refined with calibration
    const minDBFS = -60;
    const maxDBFS = 0;
    const minSPL = 30;
    const maxSPL = 120;

    const normalized = (dbfs - minDBFS) / (maxDBFS - minDBFS);
    const spl = minSPL + normalized * (maxSPL - minSPL);

    return Math.max(minSPL, Math.min(maxSPL, spl));
  }

  /**
   * Get frequency spectrum data (for visualization)
   */
  getFrequencyData() {
    if (!this.analyser) {
      return null;
    }

    const frequencyData = new Uint8Array(this.bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    return frequencyData;
  }

  /**
   * Set calibration offset
   */
  setCalibration(offset) {
    this.calibrationOffset = offset;
    console.log('Calibration offset set to:', offset, 'dB');
  }

  /**
   * Register callback for level updates
   */
  onLevelUpdate(callback) {
    this.callbacks.onLevelUpdate = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback) {
    this.callbacks.onError = callback;
  }

  /**
   * Set sample interval
   */
  setSampleInterval(intervalMs) {
    this.sampleInterval = intervalMs;

    if (this.isActive) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      currentLevel: this.currentLevel,
      peakLevel: this.peakLevel,
      calibrationOffset: this.calibrationOffset,
      sampleInterval: this.sampleInterval
    };
  }

  /**
   * Cleanup and release resources
   */
  destroy() {
    this.stop();

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('Audio processor destroyed');
  }

  /**
   * Check if browser supports required APIs
   */
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      (window.AudioContext || window.webkitAudioContext)
    );
  }

  /**
   * Get A-weighted filter coefficients (for future enhancement)
   * A-weighting approximates human ear sensitivity
   */
  getAWeightingFilter(frequency) {
    // A-weighting formula
    const f2 = frequency * frequency;
    const c1 = 12194 * 12194;
    const c2 = 20.6 * 20.6;
    const c3 = 107.7 * 107.7;
    const c4 = 737.9 * 737.9;

    const numerator = c1 * f2 * f2;
    const denominator = (f2 + c2) * Math.sqrt((f2 + c3) * (f2 + c4)) * (f2 + c1);

    const weight = numerator / denominator;
    return 20 * Math.log10(weight) + 2.0; // Add 2.0 dB for normalization
  }
}

// Create global instance
const audioProcessor = new AudioProcessor();
