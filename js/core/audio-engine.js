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
    this.frequencyData = null;
    this.isActive = false;

    // Calibration
    this.calibrationOffset = 0;
    this.pocketCorrection = 0;
    this.inPocketMode = false;

    // Current readings
    this.currentLevel = 0;
    this.smoothedLevel = 50;
    this.peakLevel = 0;

    // Callbacks
    this.onLevelUpdate = null;
    this.onError = null;

    // NIOSH SLOW mode time-weighting (1 second averaging)
    this.sampleBuffer = [];
    this.maxBufferSize = 10; // 10 samples at 10Hz = 1 second

    // Exponential moving average for display smoothing
    this.displaySmoothing = 0.3; // Lower = smoother, Higher = more responsive
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
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      console.log('Data arrays created, length:', this.dataArray.length);

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
    this.currentLevel = 50;
    this.smoothedLevel = 50;
    this.sampleBuffer = []; // Clear sample buffer for fresh start

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
      // Get both time domain and frequency domain data
      this.analyser.getByteTimeDomainData(this.dataArray);
      this.analyser.getByteFrequencyData(this.frequencyData);

      // Calculate RMS from time domain
      let sumSquares = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const normalized = (this.dataArray[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      let rms = Math.sqrt(sumSquares / this.dataArray.length);

      // Apply A-weighting approximation using frequency data
      if (CONFIG.AUDIO.aWeightingEnabled) {
        rms = this.applyAWeighting(rms, this.frequencyData);
      }

      // Convert to dBFS (reference = 1.0)
      let dbfs = rms > 0.0001 ? 20 * Math.log10(rms) : -100;
      dbfs = Math.max(-100, Math.min(0, dbfs));

      // Convert to dB SPL using calibrated mapping
      let rawSPL = this.convertToSPL(dbfs);

      // Add sample to buffer for SLOW time-weighting
      this.sampleBuffer.push(rawSPL);
      if (this.sampleBuffer.length > this.maxBufferSize) {
        this.sampleBuffer.shift(); // Remove oldest sample
      }

      // Calculate time-weighted average (SLOW mode = 1 second)
      let timeWeightedSPL = this.calculateTimeWeightedAverage();

      // Apply calibration corrections
      timeWeightedSPL += this.calibrationOffset;
      if (this.inPocketMode) {
        timeWeightedSPL += this.pocketCorrection;
      }

      // Clamp to valid range
      timeWeightedSPL = Math.max(30, Math.min(120, timeWeightedSPL));

      // Validate
      if (!isFinite(timeWeightedSPL) || isNaN(timeWeightedSPL)) {
        console.error('Invalid timeWeightedSPL:', timeWeightedSPL);
        timeWeightedSPL = 50;
      }

      // Apply exponential smoothing for display (reduces visual jitter)
      if (!isFinite(this.smoothedLevel) || isNaN(this.smoothedLevel)) {
        this.smoothedLevel = timeWeightedSPL;
      } else {
        this.smoothedLevel = (1 - this.displaySmoothing) * this.smoothedLevel +
                            this.displaySmoothing * timeWeightedSPL;
      }

      // Clamp smoothed level
      this.smoothedLevel = Math.max(30, Math.min(120, this.smoothedLevel));

      // Round for display
      this.currentLevel = Math.round(this.smoothedLevel);

      // Track peak (use time-weighted, not instantaneous)
      if (timeWeightedSPL > this.peakLevel) {
        this.peakLevel = Math.round(timeWeightedSPL);
      }

      // Callback
      if (this.onLevelUpdate) {
        this.onLevelUpdate({
          current: this.currentLevel,
          peak: this.peakLevel,
          raw: rawSPL,
          timeWeighted: timeWeightedSPL,
          dbfs: dbfs,
          rms: rms
        });
      }

      // Log first few measurements
      if (!this._logCount) this._logCount = 0;
      if (this._logCount < 5) {
        console.log(`📊 Measurement ${this._logCount + 1}: ${this.currentLevel} dB (Time-weighted: ${timeWeightedSPL.toFixed(1)}, Raw: ${rawSPL.toFixed(1)}, dBFS: ${dbfs.toFixed(1)})`);
        this._logCount++;
      }

    } catch (error) {
      console.error('❌ Error in measureLevel():', error);
      this.currentLevel = 50;
    }
  }

  /**
   * Calculate time-weighted average (SLOW mode per NIOSH standards)
   * Uses exponential averaging over 1 second window
   */
  calculateTimeWeightedAverage() {
    if (this.sampleBuffer.length === 0) return 50;

    // Reject outliers if enabled
    let samples = this.sampleBuffer;
    if (CONFIG.AUDIO.outlierRejection && samples.length >= 3) {
      samples = this.rejectOutliers(samples);
    }

    // Calculate linear average of dB values (energy averaging)
    // Convert dB to linear, average, convert back to dB
    const linearSum = samples.reduce((sum, db) => sum + Math.pow(10, db / 10), 0);
    const linearAvg = linearSum / samples.length;
    const dbAvg = 10 * Math.log10(linearAvg);

    return dbAvg;
  }

  /**
   * Reject statistical outliers (spikes) from sample buffer
   */
  rejectOutliers(samples) {
    if (samples.length < 3) return samples;

    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    const threshold = CONFIG.AUDIO.outlierThreshold || 2.0;

    // Keep values within threshold standard deviations
    const filtered = samples.filter(val => Math.abs(val - mean) <= threshold * stdDev);

    // If we rejected too many, just use original (might be legitimate loud noise)
    return filtered.length >= samples.length * 0.5 ? filtered : samples;
  }

  /**
   * Apply A-weighting approximation
   * A-weighting emphasizes frequencies humans hear best (1-4kHz)
   * and de-emphasizes low and very high frequencies
   */
  applyAWeighting(rms, frequencyData) {
    if (!frequencyData || frequencyData.length === 0) return rms;

    // Simple A-weighting approximation
    // Emphasize mid-frequencies (1-4 kHz) where human hearing is most sensitive
    // De-emphasize bass (<500 Hz) and treble (>8 kHz)

    const sampleRate = this.audioContext.sampleRate;
    const binCount = frequencyData.length;
    const nyquist = sampleRate / 2;

    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < binCount; i++) {
      const frequency = (i / binCount) * nyquist;
      const magnitude = frequencyData[i] / 255.0;

      // A-weighting approximation (simplified)
      let weight = 1.0;
      if (frequency < 500) {
        // Attenuate bass
        weight = 0.3 + 0.7 * (frequency / 500);
      } else if (frequency >= 500 && frequency <= 4000) {
        // Emphasize mid-range (human hearing peak)
        weight = 1.0;
      } else if (frequency > 4000 && frequency <= 8000) {
        // Slight de-emphasis of upper mids
        weight = 1.0 - 0.3 * ((frequency - 4000) / 4000);
      } else {
        // Attenuate high frequencies
        weight = 0.4;
      }

      weightedSum += magnitude * weight;
      totalWeight += weight;
    }

    const weightedMagnitude = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Blend weighted result with original RMS (70% weighted, 30% original)
    return 0.7 * (rms * weightedMagnitude * 2) + 0.3 * rms;
  }

  convertToSPL(dbfs) {
    // Use NIOSH-calibrated conservative mapping
    const minDBFS = CONFIG.AUDIO.minDBFS;
    const maxDBFS = CONFIG.AUDIO.maxDBFS;
    const minSPL = CONFIG.AUDIO.minSPL;
    const maxSPL = CONFIG.AUDIO.maxSPL;

    // Debug log on first call
    if (!this._configLogged) {
      console.log('🔧 dBFS→SPL Mapping:', { minDBFS, maxDBFS, minSPL, maxSPL });
      this._configLogged = true;
    }

    // Linear interpolation with clamping
    const normalized = (dbfs - minDBFS) / (maxDBFS - minDBFS);
    const clamped = Math.max(0, Math.min(1, normalized));
    const spl = minSPL + clamped * (maxSPL - minSPL);

    // Validate result
    if (!isFinite(spl) || isNaN(spl)) {
      console.error('❌ Invalid SPL conversion:', { dbfs, spl });
      return 50; // Safe fallback
    }

    return spl;
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
