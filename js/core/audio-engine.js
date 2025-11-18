/**
 * Audio Engine - Microphone access and dB measurement
 * Optimized with dual sampling rates (10Hz display, 1Hz calculation)
 */

class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.isActive = false;

    // Calibration
    this.calibrationOffset = 0;
    this.pocketCorrection = 0;
    this.inPocketMode = false;

    // Current readings
    this.currentLevel = 0;
    this.smoothedLevel = 70;
    this.peakLevel = 0;

    // Callbacks
    this.onLevelUpdate = null;
    this.onError = null;

    // Smoothing
    this.smoothingFactor = 0.8;
  }

  async initialize() {
    try {
      console.log('🎤 Requesting microphone access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      console.log('✅ Microphone permission granted');

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('AudioContext created, state:', this.audioContext.state);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = CONFIG.AUDIO.fftSize;
      this.analyser.smoothingTimeConstant = CONFIG.AUDIO.smoothingTimeConstant;

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      console.log('Data array created, length:', this.dataArray.length);

      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      console.log('✅ Audio engine initialized successfully');
      console.log('  - FFT Size:', this.analyser.fftSize);
      console.log('  - Frequency Bin Count:', this.analyser.frequencyBinCount);
      console.log('  - Data Array Length:', this.dataArray.length);

      debugLog('Audio', 'Audio engine initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Audio initialization failed:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  start() {
    if (!this.analyser) {
      console.error('Cannot start: Audio engine not initialized');
      throw new Error('Audio engine not initialized');
    }

    console.log('Starting audio monitoring...');
    this.isActive = true;
    this.peakLevel = 0;
    this.currentLevel = 50; // Start with a valid value

    // Display update loop (10 Hz)
    this.displayInterval = setInterval(() => {
      this.measureLevel();
    }, CONFIG.SAMPLING.displayInterval);

    console.log('✅ Audio monitoring started at', CONFIG.SAMPLING.displayHz, 'Hz');
    debugLog('Audio', 'Started monitoring at', CONFIG.SAMPLING.displayHz, 'Hz');
  }

  stop() {
    this.isActive = false;
    if (this.displayInterval) {
      clearInterval(this.displayInterval);
      this.displayInterval = null;
    }
    debugLog('Audio', 'Stopped monitoring');
  }

  measureLevel() {
    if (!this.analyser || !this.isActive) {
      console.warn('measureLevel() called but analyser or isActive is false');
      return;
    }

    try {
      // Get time domain data
      this.analyser.getByteTimeDomainData(this.dataArray);

      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const normalized = (this.dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / this.dataArray.length);

      // Convert to dBFS (avoid log of zero)
      let dbfs = rms > 0 ? 20 * Math.log10(rms) : -100;

      // Clamp to reasonable range
      dbfs = Math.max(-100, Math.min(0, dbfs));

      // Convert to dB SPL (simplified linear mapping)
      // This maps dBFS (-100 to 0) to dB SPL (30 to 120)
      let dbSPL = this.convertToSPL(dbfs);

      // Apply corrections
      dbSPL += this.calibrationOffset;
      if (this.inPocketMode) {
        dbSPL += this.pocketCorrection;
      }

      // CRITICAL: Clamp dbSPL to valid range BEFORE smoothing
      dbSPL = Math.max(30, Math.min(120, dbSPL));

      // Validate dbSPL before using it
      if (!isFinite(dbSPL) || isNaN(dbSPL)) {
        console.error('Invalid dbSPL after corrections:', dbSPL);
        dbSPL = 50; // Fallback to reasonable ambient level
      }

      // Validate smoothedLevel before using it
      if (!isFinite(this.smoothedLevel) || isNaN(this.smoothedLevel)) {
        console.warn('smoothedLevel was NaN, resetting to 50');
        this.smoothedLevel = 50;
      }

      // Smooth for display with reduced smoothing factor for faster response
      this.smoothedLevel = 0.7 * this.smoothedLevel + 0.3 * dbSPL;

      // CRITICAL: Clamp smoothed level to prevent accumulation
      this.smoothedLevel = Math.max(30, Math.min(120, this.smoothedLevel));

      this.currentLevel = Math.round(this.smoothedLevel);

      // Final validation and clamping
      if (!isFinite(this.currentLevel) || isNaN(this.currentLevel)) {
        console.error('Invalid currentLevel calculated:', this.currentLevel, 'rms:', rms, 'dbfs:', dbfs, 'dbSPL:', dbSPL);
        this.currentLevel = 50; // Fallback
        this.smoothedLevel = 50; // Reset smoothed level too
      }

      // Extra safety clamp
      this.currentLevel = Math.max(30, Math.min(120, this.currentLevel));

      // Track peak
      if (this.currentLevel > this.peakLevel) {
        this.peakLevel = this.currentLevel;
      }

      // Callback
      if (this.onLevelUpdate) {
        this.onLevelUpdate({
          current: this.currentLevel,
          peak: this.peakLevel,
          raw: dbSPL,
          dbfs: dbfs,
          rms: rms
        });
      }

      // Log first few measurements to verify it's working
      if (!this._logCount) this._logCount = 0;
      if (this._logCount < 5) {
        console.log(`📊 Measurement ${this._logCount + 1}: ${this.currentLevel} dB (RMS: ${rms.toFixed(4)}, dBFS: ${dbfs.toFixed(1)}, SPL: ${dbSPL.toFixed(1)})`);
        this._logCount++;
      }

    } catch (error) {
      console.error('❌ Error in measureLevel():', error);
      this.currentLevel = 50; // Fallback to valid value
    }
  }

  convertToSPL(dbfs) {
    // Hardcoded fallback values in case CONFIG is not available
    // Very conservative mapping to prevent over-reporting ambient noise
    const FALLBACK_VALUES = {
      minDBFS: -100,
      maxDBFS: -50,  // Very conservative - only very loud sounds hit upper range
      minSPL: 30,
      maxSPL: 120    // Full range up to 120dB for very loud sounds
    };

    // Try to get values from CONFIG, fallback to hardcoded if not available
    let minDBFS, maxDBFS, minSPL, maxSPL;

    if (typeof CONFIG !== 'undefined' && CONFIG.AUDIO) {
      minDBFS = CONFIG.AUDIO.minDBFS;
      maxDBFS = CONFIG.AUDIO.maxDBFS;
      minSPL = CONFIG.AUDIO.minSPL;
      maxSPL = CONFIG.AUDIO.maxSPL;
    } else {
      console.error('⚠️ CONFIG.AUDIO not available, using fallback values');
      minDBFS = FALLBACK_VALUES.minDBFS;
      maxDBFS = FALLBACK_VALUES.maxDBFS;
      minSPL = FALLBACK_VALUES.minSPL;
      maxSPL = FALLBACK_VALUES.maxSPL;
    }

    // Validate that we have numbers
    if (typeof minDBFS !== 'number' || typeof maxDBFS !== 'number' ||
        typeof minSPL !== 'number' || typeof maxSPL !== 'number') {
      console.error('❌ CONFIG.AUDIO values are not numbers:', { minDBFS, maxDBFS, minSPL, maxSPL });
      // Use fallback
      minDBFS = FALLBACK_VALUES.minDBFS;
      maxDBFS = FALLBACK_VALUES.maxDBFS;
      minSPL = FALLBACK_VALUES.minSPL;
      maxSPL = FALLBACK_VALUES.maxSPL;
    }

    // Debug: Log config values on first call
    if (!this._configLogged) {
      console.log('🔧 CONFIG.AUDIO values:', { minDBFS, maxDBFS, minSPL, maxSPL });
      this._configLogged = true;
    }

    const normalized = (dbfs - minDBFS) / (maxDBFS - minDBFS);
    const spl = minSPL + normalized * (maxSPL - minSPL);

    const result = Math.max(minSPL, Math.min(maxSPL, spl));

    // Validate
    if (!isFinite(result) || isNaN(result)) {
      console.error('❌ convertToSPL returned NaN:', {
        dbfs, minDBFS, maxDBFS, minSPL, maxSPL, normalized, spl, result
      });
      return 70; // Reasonable fallback for ambient sound
    }

    return result;
  }

  setCalibration(offset) {
    // Ensure offset is a valid number
    if (typeof offset !== 'number' || !isFinite(offset) || isNaN(offset)) {
      console.warn('Invalid calibration offset:', offset, 'using 0');
      this.calibrationOffset = 0;
    } else {
      this.calibrationOffset = offset;
    }
    debugLog('Audio', 'Calibration set to', this.calibrationOffset, 'dB');
  }

  setPocketMode(enabled, correction = CONFIG.POCKET.defaultCorrection) {
    this.inPocketMode = enabled;
    this.pocketCorrection = correction;
    debugLog('Audio', 'Pocket mode:', enabled, 'correction:', correction);
  }

  getFrequencyData() {
    if (!this.analyser) return null;
    const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(frequencyData);
    return frequencyData;
  }

  destroy() {
    this.stop();
    if (this.microphone) this.microphone.disconnect();
    if (this.analyser) this.analyser.disconnect();
    if (this.audioContext) this.audioContext.close();
    debugLog('Audio', 'Engine destroyed');
  }

  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}

const audioEngine = new AudioEngine();
