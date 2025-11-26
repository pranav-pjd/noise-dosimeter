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
   * Get safe time remaining based on recent average noise level
   * Uses NIOSH formula: T = 8 × 2^((85-L)/3)
   * Smartly calculates based on current exposure patterns
   */
  getSafeTimeRemaining() {
    // If no exposure yet, use current average to estimate
    if (this.exposureSeconds === 0 || this.recentLevels.length === 0) {
      // No data yet - assume safe for 8 hours at 85dB
      return 8 * 3600; // 8 hours in seconds
    }

    const remainingDose = Math.max(0, 100 - this.dailyDose);

    // If already over 100% dose, no safe time remaining
    if (remainingDose <= 0) {
      return 0;
    }

    // Use rolling average for smart calculation
    // If quiet (below threshold), safe time is essentially unlimited
    if (this.averageLevel < this.threshold) {
      // Very quiet - return a large but reasonable number (24 hours)
      return 24 * 3600; // 24 hours
    }

    // Calculate allowable time at current average noise level
    const allowableTime = this.getAllowableTime(this.averageLevel);

    // Calculate remaining time based on remaining dose percentage
    // If you've used 50% dose, you have 50% of allowable time left
    const remainingTime = (remainingDose / 100) * allowableTime;

    return Math.max(0, remainingTime);
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
   * Format time with hours, minutes, and seconds
   */
  static formatTime(seconds) {
    if (seconds === Infinity) return 'Unlimited';
    if (seconds < 0) return '0h 0m 0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

const dosimetryEngine = new DosimetryEngine();
