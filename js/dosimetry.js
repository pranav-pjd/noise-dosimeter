/**
 * Dosimetry Module - Noise dose calculation based on NIOSH standards
 * Implements time-weighted averaging with 3 dB exchange rate
 */

class DosimetryCalculator {
  constructor() {
    // NIOSH recommended exposure limits
    this.criterionLevel = 85; // dB
    this.criterionDuration = 8 * 3600; // 8 hours in seconds
    this.exchangeRate = 3; // dB (NIOSH uses 3 dB, OSHA uses 5 dB)
    this.threshold = 80; // dB - minimum level to start counting

    // Tracking variables
    this.exposureHistory = [];
    this.dailyDose = 0; // percentage of daily safe dose
    this.startTime = null;
    this.isMonitoring = false;
  }

  /**
   * Calculate allowable exposure time for a given noise level
   * Uses NIOSH formula: T = 8 × 2^((85-L)/3)
   * where T is time in hours and L is noise level in dB
   */
  getAllowableTime(decibelLevel) {
    if (decibelLevel < this.threshold) {
      return Infinity; // Below threshold, no limit
    }

    // NIOSH formula
    const exponent = (this.criterionLevel - decibelLevel) / this.exchangeRate;
    const hours = 8 * Math.pow(2, exponent);

    return hours * 3600; // Convert to seconds
  }

  /**
   * Calculate dose contribution for a given exposure
   * Dose = (ActualTime / AllowableTime) × 100
   */
  calculateDoseContribution(decibelLevel, durationSeconds) {
    if (decibelLevel < this.threshold) {
      return 0;
    }

    const allowableTime = this.getAllowableTime(decibelLevel);
    const dose = (durationSeconds / allowableTime) * 100;

    return dose;
  }

  /**
   * Add an exposure measurement
   */
  addExposure(decibelLevel, durationSeconds) {
    const exposure = {
      level: decibelLevel,
      duration: durationSeconds,
      dose: this.calculateDoseContribution(decibelLevel, durationSeconds),
      timestamp: new Date()
    };

    this.exposureHistory.push(exposure);
    this.dailyDose += exposure.dose;

    return exposure;
  }

  /**
   * Calculate time-weighted average (TWA) for current exposures
   */
  calculateTWA() {
    if (this.exposureHistory.length === 0) {
      return 0;
    }

    let totalDose = 0;
    let totalTime = 0;

    for (const exposure of this.exposureHistory) {
      totalDose += exposure.dose;
      totalTime += exposure.duration;
    }

    // Calculate equivalent continuous level
    // L_eq = 85 + 3 × log2(Dose/100)
    if (totalDose === 0) {
      return 0;
    }

    const twa = this.criterionLevel + this.exchangeRate * Math.log2(totalDose / 100);
    return Math.max(0, twa);
  }

  /**
   * Get remaining safe exposure time at a given noise level
   */
  getRemainingTime(currentLevel) {
    const remainingDosePercent = Math.max(0, 100 - this.dailyDose);
    const allowableTimeForLevel = this.getAllowableTime(currentLevel);

    // Calculate how much time remains at current level
    const remainingSeconds = (remainingDosePercent / 100) * allowableTimeForLevel;

    return remainingSeconds;
  }

  /**
   * Get dose category and risk level
   */
  getDoseCategory() {
    if (this.dailyDose < 50) {
      return {
        category: 'safe',
        level: 'Low Risk',
        color: '#10b981',
        recommendation: 'Your noise exposure is within safe limits'
      };
    } else if (this.dailyDose < 100) {
      return {
        category: 'moderate',
        level: 'Moderate Risk',
        color: '#f59e0b',
        recommendation: 'Approaching daily safe limit. Consider reducing exposure'
      };
    } else if (this.dailyDose < 200) {
      return {
        category: 'warning',
        level: 'High Risk',
        color: '#ef4444',
        recommendation: 'Daily safe limit exceeded. Seek quiet environment immediately'
      };
    } else {
      return {
        category: 'danger',
        level: 'Severe Risk',
        color: '#dc2626',
        recommendation: 'CRITICAL: Immediate hearing damage risk. Remove from noise now!'
      };
    }
  }

  /**
   * Get noise level category
   */
  getNoiseLevelCategory(decibelLevel) {
    if (decibelLevel < 70) {
      return {
        category: 'quiet',
        label: 'Quiet',
        description: 'Safe for extended exposure',
        color: '#10b981'
      };
    } else if (decibelLevel < 85) {
      return {
        category: 'moderate',
        label: 'Moderate',
        description: 'Safe for 8+ hours',
        color: '#3b82f6'
      };
    } else if (decibelLevel < 95) {
      return {
        category: 'loud',
        label: 'Loud',
        description: 'Limited safe exposure time',
        color: '#f59e0b'
      };
    } else if (decibelLevel < 110) {
      return {
        category: 'very-loud',
        label: 'Very Loud',
        description: 'Hearing protection recommended',
        color: '#ef4444'
      };
    } else {
      return {
        category: 'dangerous',
        label: 'Dangerous',
        description: 'Immediate hearing damage risk',
        color: '#dc2626'
      };
    }
  }

  /**
   * Reset daily dose (call at midnight or on user request)
   */
  resetDailyDose() {
    this.exposureHistory = [];
    this.dailyDose = 0;
    this.startTime = null;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const totalDuration = this.exposureHistory.reduce((sum, exp) => sum + exp.duration, 0);
    const peakLevel = Math.max(...this.exposureHistory.map(exp => exp.level), 0);
    const avgLevel = this.calculateTWA();

    return {
      dose: this.dailyDose,
      doseCategory: this.getDoseCategory(),
      totalDuration,
      peakLevel,
      avgLevel,
      exposureCount: this.exposureHistory.length,
      startTime: this.startTime,
      remainingTime: this.getRemainingTime(this.criterionLevel)
    };
  }

  /**
   * Load from saved data
   */
  loadFromData(data) {
    this.exposureHistory = data.exposureHistory || [];
    this.dailyDose = data.dailyDose || 0;
    this.startTime = data.startTime ? new Date(data.startTime) : null;
  }

  /**
   * Export current state
   */
  exportState() {
    return {
      exposureHistory: this.exposureHistory,
      dailyDose: this.dailyDose,
      startTime: this.startTime,
      settings: {
        criterionLevel: this.criterionLevel,
        criterionDuration: this.criterionDuration,
        exchangeRate: this.exchangeRate,
        threshold: this.threshold
      }
    };
  }

  /**
   * Update settings
   */
  updateSettings(settings) {
    if (settings.criterionLevel) this.criterionLevel = settings.criterionLevel;
    if (settings.exchangeRate) this.exchangeRate = settings.exchangeRate;
    if (settings.threshold) this.threshold = settings.threshold;
  }

  /**
   * Format time in human-readable format
   */
  static formatTime(seconds) {
    if (seconds === Infinity) {
      return 'Unlimited';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Format dose percentage
   */
  static formatDose(dose) {
    return `${Math.round(dose)}%`;
  }
}

// Create global instance
const dosimetry = new DosimetryCalculator();
