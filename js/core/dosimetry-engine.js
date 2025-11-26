/**
 * Dosimetry Engine - NIOSH dose calculation
 * Implements time-weighted averaging with 3 dB exchange rate
 */

class DosimetryEngine {
  constructor() {
    this.criterionLevel = CONFIG.NIOSH.criterionLevel;
    this.criterionDuration = CONFIG.NIOSH.criterionDuration;
    this.exchangeRate = CONFIG.NIOSH.exchangeRate;
    this.threshold = CONFIG.NIOSH.threshold;

    this.dailyDose = 0; // percentage
    this.exposureSeconds = 0;
    this.peakLevel = 0;
    this.startTime = null;
    this.lastSampleTime = null;

    // Rolling average for stable safe time calculation
    this.recentLevels = [];
    this.minRecentSamples = 30; // Start with 30 seconds
    this.maxRecentSamples = 120; // Grow to 2 minutes (120 seconds)
    this.averageLevel = 70; // Start with reasonable default
    this.monitoringStartTime = null; // Track when monitoring started
  }

  /**
   * Calculate allowable time for given noise level
   * NIOSH formula: T = 8 × 2^((85-L)/3)
   */
  getAllowableTime(decibelLevel) {
    if (decibelLevel < this.threshold) return Infinity;
    const exponent = (this.criterionLevel - decibelLevel) / this.exchangeRate;
    return 8 * Math.pow(2, exponent) * 3600; // Convert hours to seconds
  }

  /**
   * Add exposure measurement (called every second)
   */
  addExposure(decibelLevel) {
    // Set monitoring start time on first call
    if (!this.monitoringStartTime) {
      this.monitoringStartTime = Date.now();
    }

    // Calculate dynamic window size: grows from 30s to 120s over first 2 minutes
    const elapsedSeconds = Math.floor((Date.now() - this.monitoringStartTime) / 1000);
    const currentMaxSamples = Math.min(
      this.maxRecentSamples,
      this.minRecentSamples + elapsedSeconds
    );

    // Update rolling average (always, even below threshold)
    this.recentLevels.push(decibelLevel);
    if (this.recentLevels.length > currentMaxSamples) {
      this.recentLevels.shift(); // Remove oldest
    }
    // Calculate average of recent levels
    const sum = this.recentLevels.reduce((a, b) => a + b, 0);
    this.averageLevel = sum / this.recentLevels.length;

    // ALWAYS increment exposure time (regardless of threshold)
    this.exposureSeconds += 1;

    // ALWAYS update peak level (regardless of threshold)
    if (decibelLevel > this.peakLevel) {
      this.peakLevel = decibelLevel;
    }

    // ALWAYS update last sample time
    this.lastSampleTime = Date.now();

    // Only add dose contribution if above threshold
    if (decibelLevel >= this.threshold) {
      const allowableTime = this.getAllowableTime(decibelLevel);
      const doseContribution = (1 / allowableTime) * 100; // 1 second exposure
      this.dailyDose += doseContribution;
    }

    debugLog('Dose', `Level: ${decibelLevel}dB, Avg: ${this.averageLevel.toFixed(1)}dB, Dose: ${this.dailyDose.toFixed(2)}%, Exposure: ${this.exposureSeconds}s`);
  }

  /**
   * Get safe time remaining based on recent average level (not instantaneous)
   * This prevents wild fluctuations from momentary noise spikes
   */
  getSafeTimeRemaining() {
    const remainingDose = Math.max(0, 100 - this.dailyDose);

    // Use the rolling average level for stable calculation
    // If average is below threshold, assume safe ambient level
    const effectiveLevel = this.averageLevel >= this.threshold ?
                          this.averageLevel :
                          this.criterionLevel; // At criterion level = 8 hours remaining

    const allowableTime = this.getAllowableTime(effectiveLevel);
    return (remainingDose / 100) * allowableTime;
  }

  /**
   * Get dose category
   */
  getDoseCategory() {
    if (this.dailyDose < CONFIG.WARNINGS.dose.advisory) {
      return { level: 'safe', color: '#10b981', label: 'Safe' };
    } else if (this.dailyDose < CONFIG.WARNINGS.dose.warning) {
      return { level: 'moderate', color: '#f59e0b', label: 'Moderate' };
    } else if (this.dailyDose < CONFIG.WARNINGS.dose.critical) {
      return { level: 'warning', color: '#fb923c', label: 'Warning' };
    } else {
      return { level: 'danger', color: '#ef4444', label: 'Danger' };
    }
  }

  /**
   * Get noise level category
   */
  getNoiseLevelCategory(db) {
    if (db < 70) return { level: 'safe', label: 'Quiet', desc: 'Safe for extended exposure' };
    if (db < 85) return { level: 'moderate', label: 'Moderate', desc: 'Safe for 8+ hours' };
    if (db < 95) return { level: 'loud', label: 'Loud', desc: 'Limited safe exposure' };
    if (db < 110) return { level: 'warning', label: 'Very Loud', desc: 'Use hearing protection' };
    return { level: 'danger', label: 'Dangerous', desc: 'Immediate risk' };
  }

  /**
   * Reset daily dose
   */
  reset() {
    this.dailyDose = 0;
    this.exposureSeconds = 0;
    this.peakLevel = 0;
    this.startTime = null;
    this.lastSampleTime = null;
    this.recentLevels = [];
    this.averageLevel = 70;
    this.monitoringStartTime = null;
    debugLog('Dose', 'Daily dose reset');
  }

  /**
   * Get summary
   */
  getSummary() {
    return {
      dose: this.dailyDose,
      doseCategory: this.getDoseCategory(),
      exposureSeconds: this.exposureSeconds,
      peakLevel: this.peakLevel,
      startTime: this.startTime
    };
  }

  /**
   * Format time
   */
  static formatTime(seconds) {
    if (seconds === Infinity) return 'Unlimited';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}

const dosimetryEngine = new DosimetryEngine();
