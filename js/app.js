/**
 * Main App - Noise Dosimeter v2.0
 * Orchestrates all modules and manages application state
 */

class NoiseDosimeterApp {
  constructor() {
    this.isMonitoring = false;
    this.doseCalculationInterval = null;
    this.uiUpdateInterval = null;
    this.pocketDetectionEnabled = true;
    this.pocketCorrection = CONFIG.POCKET.defaultCorrection;
    this.resetTime = '00:00';
  }

  async init() {
    console.log('🔊 Noise Dosimeter v2.0 - Initializing...');

    try {
      // Initialize storage
      try {
        await storageEngine.init();
        debugLog('App', 'Storage initialized');
      } catch (storageError) {
        console.error('Storage initialization failed:', storageError);
        // Continue without storage
      }

      // Initialize all modules
      try {
        calibration.init();
        warnings.init();
        haptics.init();
        privacy.init();
        learnMore.init();
      } catch (moduleError) {
        console.error('Module initialization error:', moduleError);
      }

      // Setup UI event listeners
      this.setupEventListeners();

      // Try to initialize sensors
      try {
        await this.initializeSensors();
      } catch (sensorError) {
        console.warn('Sensor initialization failed:', sensorError);
        // Continue without sensors
      }

      // Load saved settings
      try {
        await this.loadSettings();
      } catch (settingsError) {
        console.error('Settings load error:', settingsError);
        // Use defaults
      }

      // Setup auto-reset
      try {
        this.setupAutoReset();
      } catch (resetError) {
        console.error('Auto-reset setup error:', resetError);
      }

      // Register service worker
      try {
        this.registerServiceWorker();
      } catch (swError) {
        console.warn('Service worker registration failed:', swError);
      }

      // Setup install prompt for PWA
      try {
        this.setupInstallPrompt();
      } catch (installError) {
        console.warn('Install prompt setup failed:', installError);
      }

      // Show initial chart
      try {
        historyChart.update('day');
      } catch (chartError) {
        console.error('Chart initialization error:', chartError);
      }

      console.log('✅ App initialized successfully!');

    } catch (error) {
      console.error('❌ Critical initialization error:', error);
      this.showToast('App loaded with errors. Some features may not work.');
    }
  }

  setupEventListeners() {
    // Permission request
    const permissionBtn = document.getElementById('requestPermissionsBtn');
    if (permissionBtn) {
      permissionBtn.addEventListener('click', () => this.requestPermissions());
    }

    // Monitoring toggle
    const toggleBtn = document.getElementById('toggleMonitoringBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleMonitoring());
      haptics.vibrate('light');
    }

    // Chart period tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        historyChart.update(e.target.dataset.period);
        haptics.vibrate('light');
      });
    });

    // Settings accordions
    document.querySelectorAll('.settings-header').forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        const isOpen = !content.classList.contains('hidden');

        if (isOpen) {
          content.classList.add('hidden');
          header.classList.remove('expanded');
        } else {
          content.classList.remove('hidden');
          header.classList.add('expanded');
        }
        haptics.vibrate('light');
      });
    });

    // Pocket detection
    const pocketToggle = document.getElementById('pocketToggle');
    const pocketSlider = document.getElementById('pocketCorrectionSlider');
    const pocketValue = document.getElementById('pocketCorrectionValue');

    if (pocketToggle) {
      pocketToggle.addEventListener('change', (e) => {
        this.pocketDetectionEnabled = e.target.checked;
        storageEngine.saveSetting('pocketDetectionEnabled', this.pocketDetectionEnabled);
        this.updatePocketMode();
      });
    }

    if (pocketSlider) {
      pocketSlider.addEventListener('input', (e) => {
        this.pocketCorrection = parseInt(e.target.value);
        pocketValue.textContent = `${this.pocketCorrection} dB`;
        storageEngine.saveSetting('pocketCorrection', this.pocketCorrection);
        this.updatePocketMode();
      });
    }

    // Reset time
    const resetTimePicker = document.getElementById('resetTimePicker');
    if (resetTimePicker) {
      resetTimePicker.addEventListener('change', (e) => {
        this.resetTime = e.target.value;
        storageEngine.saveSetting('resetTime', this.resetTime);
        this.setupAutoReset();
      });
    }

    // Preset time buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const time = e.target.dataset.time;
        const customTimePickerContainer = document.getElementById('customTimePickerContainer');

        if (time === 'custom') {
          // Show time picker for custom selection
          if (customTimePickerContainer) {
            customTimePickerContainer.classList.remove('hidden');
          }
        } else {
          // Hide time picker and set preset time
          if (customTimePickerContainer) {
            customTimePickerContainer.classList.add('hidden');
          }
          if (resetTimePicker) {
            resetTimePicker.value = time;
            this.resetTime = time;
            storageEngine.saveSetting('resetTime', this.resetTime);
            this.setupAutoReset();
          }
        }
        haptics.vibrate('light');
      });
    });

    // Manual reset
    const manualResetBtn = document.getElementById('manualResetBtn');
    if (manualResetBtn) {
      manualResetBtn.addEventListener('click', () => this.manualReset());
    }

    // Data management
    const exportBtn = document.getElementById('exportDataBtn');
    const clearBtn = document.getElementById('clearDataBtn');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearData());
    }

    // Modal close buttons
    document.getElementById('closeCalibrationModal')?.addEventListener('click', () => {
      document.getElementById('calibrationModal').classList.add('hidden');
    });
  }

  async initializeSensors() {
    // Try proximity sensor
    try {
      await proximitySensor.initialize();
      proximitySensor.onChange((isNear) => {
        debugLog('Sensors', 'Proximity:', isNear);
        this.updatePocketMode();
      });
    } catch (error) {
      debugLog('Sensors', 'Proximity not available');
    }

    // Try light sensor
    try {
      await ambientLightSensor.initialize();
      ambientLightSensor.onChange((lux) => {
        debugLog('Sensors', 'Light:', lux, 'lux');
        this.updatePocketMode();
      });
    } catch (error) {
      debugLog('Sensors', 'Light sensor not available');
    }
  }

  updatePocketMode() {
    if (!this.pocketDetectionEnabled) {
      audioEngine.setPocketMode(false);
      document.getElementById('pocketModeIndicator')?.classList.add('hidden');
      return;
    }

    const isDark = ambientLightSensor.isDark();
    const isNear = proximitySensor.isNear;
    const inPocket = isDark || isNear;

    audioEngine.setPocketMode(inPocket, this.pocketCorrection);

    const indicator = document.getElementById('pocketModeIndicator');
    const adjustment = document.getElementById('pocketAdjustment');

    if (indicator) {
      if (inPocket) {
        indicator.classList.remove('hidden');
        if (adjustment) adjustment.textContent = this.pocketCorrection;
      } else {
        indicator.classList.add('hidden');
      }
    }
  }

  async requestPermissions() {
    try {
      await audioEngine.initialize();
      document.getElementById('permissionBanner')?.classList.add('hidden');
      this.showToast('✅ Microphone access granted');

      // Update status
      const statusText = document.getElementById('statusText');
      if (statusText) statusText.textContent = 'Ready to monitor';

    } catch (error) {
      console.error('Permission error:', error);
      this.showToast('❌ Microphone access denied. Please allow in browser settings.');
    }
  }

  async toggleMonitoring() {
    if (!this.isMonitoring) {
      await this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
  }

  async startMonitoring() {
    try {
      // Ensure audio is initialized
      if (!audioEngine.audioContext) {
        try {
          await audioEngine.initialize();
        } catch (audioError) {
          throw new Error('Microphone access required. Please grant permission in browser settings.');
        }
      }

      // Validate audioEngine is ready
      if (!audioEngine.analyser) {
        throw new Error('Audio engine not ready. Please try again.');
      }

      // Setup callbacks BEFORE starting
      audioEngine.onLevelUpdate = (data) => {
        try {
          if (!data || data.current === undefined) {
            console.error('Invalid data received in onLevelUpdate:', data);
            return;
          }
          liveMeter.update(data.current);
        } catch (err) {
          console.error('Error in onLevelUpdate callback:', err);
        }
      };

      // Start audio monitoring
      audioEngine.start();
      console.log('✅ Audio monitoring started, callback set');

      // Start dose calculation (1 Hz)
      this.doseCalculationInterval = setInterval(() => {
        try {
          const currentLevel = audioEngine.currentLevel;

          if (isNaN(currentLevel) || currentLevel < 0) {
            debugLog('App', 'Invalid audio level detected');
            return;
          }

          dosimetryEngine.addExposure(currentLevel);
          const summary = dosimetryEngine.getSummary();

          // Update dose circle
          doseCircle.update(summary.dose);

          // Update metrics with null checks (except safe time - updated separately)
          const exposureTimeEl = document.getElementById('exposureTime');
          const peakLevelEl = document.getElementById('peakLevel');

          if (exposureTimeEl) {
            exposureTimeEl.textContent = DosimetryEngine.formatTime(summary.exposureSeconds);
          }
          if (peakLevelEl) {
            peakLevelEl.textContent = `${summary.peakLevel} dB`;
          }

          // Check warnings
          warnings.check(currentLevel, summary.dose);

          // Save periodically (every minute)
          if (summary.exposureSeconds % 60 === 0) {
            this.saveCurrentData().catch(err => {
              debugLog('App', 'Auto-save failed:', err);
            });
          }
        } catch (calcError) {
          console.error('Dose calculation error:', calcError);
        }

      }, CONFIG.SAMPLING.calcInterval);

      // Update safe time remaining less frequently (every 15 seconds)
      // This prevents wild fluctuations from momentary noise changes
      this.safeTimeUpdateInterval = setInterval(() => {
        try {
          const safeTimeEl = document.getElementById('safeTimeRemaining');
          if (safeTimeEl) {
            safeTimeEl.textContent = DosimetryEngine.formatTime(dosimetryEngine.getSafeTimeRemaining());
          }
        } catch (err) {
          console.error('Error updating safe time:', err);
        }
      }, 15000); // 15 seconds

      // Do initial update immediately
      const safeTimeEl = document.getElementById('safeTimeRemaining');
      if (safeTimeEl) {
        safeTimeEl.textContent = DosimetryEngine.formatTime(dosimetryEngine.getSafeTimeRemaining());
      }

      // Update state
      this.isMonitoring = true;
      if (!dosimetryEngine.startTime) {
        dosimetryEngine.startTime = new Date();
      }

      // Update UI with null checks
      const btn = document.getElementById('toggleMonitoringBtn');
      const btnIcon = document.getElementById('monitoringBtnIcon');
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');

      if (btn) btn.classList.add('monitoring');
      if (btnIcon) btnIcon.textContent = '⏸';
      if (statusDot) statusDot.classList.add('monitoring');
      if (statusText) statusText.textContent = 'Monitoring active';

      haptics.vibrate('medium');
      this.showToast('🎤 Monitoring started');

      debugLog('App', 'Monitoring started');

    } catch (error) {
      console.error('Failed to start monitoring:', error);
      this.isMonitoring = false;
      this.showToast('❌ ' + (error.message || 'Failed to start monitoring'));

      // Cleanup on error
      if (this.doseCalculationInterval) {
        clearInterval(this.doseCalculationInterval);
        this.doseCalculationInterval = null;
      }
    }
  }

  stopMonitoring() {
    audioEngine.stop();

    if (this.doseCalculationInterval) {
      clearInterval(this.doseCalculationInterval);
      this.doseCalculationInterval = null;
    }

    if (this.safeTimeUpdateInterval) {
      clearInterval(this.safeTimeUpdateInterval);
      this.safeTimeUpdateInterval = null;
    }

    this.isMonitoring = false;

    // Save final data
    this.saveCurrentData();

    // Update UI
    const btn = document.getElementById('toggleMonitoringBtn');
    const btnIcon = document.getElementById('monitoringBtnIcon');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    if (btn) btn.classList.remove('monitoring');
    if (btnIcon) btnIcon.textContent = '▶';
    if (statusDot) statusDot.classList.remove('monitoring');
    if (statusText) statusText.textContent = 'Ready to monitor';

    haptics.vibrate('medium');
    this.showToast('⏸️ Monitoring stopped');

    debugLog('App', 'Monitoring stopped');
  }

  async saveCurrentData() {
    try {
      const summary = dosimetryEngine.getSummary();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = `${today} ${String(now.getHours()).padStart(2, '0')}:00`;

      // Save daily summary
      await storageEngine.saveDailySummary({
        date: today,
        dose: summary.dose,
        peakLevel: summary.peakLevel,
        exposureSeconds: summary.exposureSeconds,
        timestamp: now.toISOString()
      });

      // Save hourly summary
      await storageEngine.saveHourlySummary({
        id: currentHour, // Use hour as ID
        hour: currentHour,
        datetime: currentHour, // For index
        dose: summary.dose,
        peakLevel: summary.peakLevel,
        exposureSeconds: summary.exposureSeconds,
        timestamp: now.toISOString()
      });

      debugLog('App', 'Data saved (daily + hourly)');
    } catch (error) {
      console.error('Save failed:', error);
    }
  }

  async loadSettings() {
    try {
      // Load pocket detection settings with fallbacks
      this.pocketDetectionEnabled = await storageEngine.getSetting('pocketDetectionEnabled', true) ?? true;
      this.pocketCorrection = await storageEngine.getSetting('pocketCorrection', CONFIG.POCKET.defaultCorrection) ?? CONFIG.POCKET.defaultCorrection;
      this.resetTime = await storageEngine.getSetting('resetTime', '00:00') ?? '00:00';

      // Ensure resetTime is valid
      if (!this.resetTime || typeof this.resetTime !== 'string') {
        this.resetTime = '00:00';
      }

      // Apply to UI
      const pocketToggle = document.getElementById('pocketToggle');
      const pocketSlider = document.getElementById('pocketCorrectionSlider');
      const pocketValue = document.getElementById('pocketCorrectionValue');
      const resetTimePicker = document.getElementById('resetTimePicker');

      if (pocketToggle) pocketToggle.checked = this.pocketDetectionEnabled;
      if (pocketSlider) pocketSlider.value = this.pocketCorrection;
      if (pocketValue) pocketValue.textContent = `${this.pocketCorrection} dB`;
      if (resetTimePicker) resetTimePicker.value = this.resetTime;

      // Load today's data
      const todaySummary = await storageEngine.getTodaySummary();
      if (todaySummary) {
        dosimetryEngine.dailyDose = todaySummary.dose || 0;
        dosimetryEngine.peakLevel = todaySummary.peakLevel || 0;
        dosimetryEngine.exposureSeconds = todaySummary.exposureSeconds || 0;

        doseCircle.update(dosimetryEngine.dailyDose);
        const peakEl = document.getElementById('peakLevel');
        if (peakEl) peakEl.textContent = `${dosimetryEngine.peakLevel} dB`;
      }

      debugLog('App', 'Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use defaults
      this.resetTime = '00:00';
      this.pocketDetectionEnabled = true;
      this.pocketCorrection = CONFIG.POCKET.defaultCorrection;
    }
  }

  setupAutoReset() {
    try {
      // Ensure resetTime is valid
      if (!this.resetTime || typeof this.resetTime !== 'string' || !this.resetTime.includes(':')) {
        console.warn('Invalid resetTime, using default 00:00');
        this.resetTime = '00:00';
      }

      const [hours, minutes] = this.resetTime.split(':').map(Number);

      // Validate hours and minutes
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.warn('Invalid time values, using default 00:00');
        this.resetTime = '00:00';
        return this.setupAutoReset();
      }

      const now = new Date();
      const resetDate = new Date(now);
      resetDate.setHours(hours, minutes, 0, 0);

      if (resetDate <= now) {
        resetDate.setDate(resetDate.getDate() + 1);
      }

      const timeUntilReset = resetDate - now;

      setTimeout(() => {
        this.resetDailyDose();
        this.setupAutoReset(); // Setup next reset
      }, timeUntilReset);

      debugLog('App', `Auto-reset scheduled for ${this.resetTime}`);
    } catch (error) {
      console.error('Error setting up auto-reset:', error);
      this.resetTime = '00:00';
    }
  }

  resetDailyDose() {
    dosimetryEngine.reset();
    doseCircle.update(0);
    document.getElementById('exposureTime').textContent = '0h 0m';
    document.getElementById('safeTimeRemaining').textContent = '8h 0m';
    document.getElementById('peakLevel').textContent = '-- dB';
    this.saveCurrentData();
    this.showToast('🔄 Daily dose reset');
    debugLog('App', 'Daily dose auto-reset');
  }

  manualReset() {
    if (confirm('Reset daily dose to 0%? Historical data will be saved.')) {
      this.saveCurrentData(); // Save before reset
      this.resetDailyDose();
      haptics.vibrate('strong');
    }
  }

  async exportData() {
    try {
      const data = await storageEngine.exportData();
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `noise-dosimeter-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      URL.revokeObjectURL(url);
      this.showToast('📥 Data exported successfully');
      haptics.vibrate('medium');
    } catch (error) {
      console.error('Export failed:', error);
      this.showToast('❌ Export failed');
    }
  }

  async clearData() {
    if (confirm('Clear ALL data? This cannot be undone!')) {
      if (confirm('Are you absolutely sure? All exposure history will be deleted.')) {
        try {
          await storageEngine.clearAllData();
          this.resetDailyDose();
          historyChart.update('day');
          this.showToast('🗑️ All data cleared');
          haptics.vibrate('strong');
        } catch (error) {
          console.error('Clear failed:', error);
          this.showToast('❌ Failed to clear data');
        }
      }
    }
  }

  showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (toast && toastMessage) {
      toastMessage.textContent = message;
      toast.classList.remove('hidden');

      setTimeout(() => {
        toast.classList.add('hidden');
      }, duration);
    }
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./sw.js');
        debugLog('App', 'Service worker registered');
      } catch (error) {
        debugLog('App', 'Service worker registration failed:', error);
      }
    }
  }

  setupInstallPrompt() {
    let deferredPrompt = null;

    // Capture the install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 Install prompt available');
      e.preventDefault();
      deferredPrompt = e;

      // Show install banner
      this.showInstallBanner(deferredPrompt);
    });

    // Track successful installation
    window.addEventListener('appinstalled', () => {
      console.log('✅ App installed successfully');
      deferredPrompt = null;
      this.showToast('✅ App installed! Launch from your home screen');
    });
  }

  showInstallBanner(deferredPrompt) {
    // Create install banner
    const banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 10000;
      animation: slideUp 0.3s ease-out;
    `;

    banner.innerHTML = `
      <div style="flex: 1; padding-right: 16px;">
        <div style="font-weight: 600; margin-bottom: 4px;">📱 Install App</div>
        <div style="font-size: 14px; opacity: 0.9;">Add to home screen for quick access</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="installBtn" style="background: white; color: #059669; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">Install</button>
        <button id="dismissInstallBtn" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">Later</button>
      </div>
    `;

    document.body.appendChild(banner);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Install button click
    document.getElementById('installBtn').addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('✅ User accepted install');
      } else {
        console.log('❌ User dismissed install');
      }

      banner.remove();
      deferredPrompt = null;
    });

    // Dismiss button click
    document.getElementById('dismissInstallBtn').addEventListener('click', () => {
      banner.remove();
    });
  }
}

// Initialize app when DOM is ready
let app = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new NoiseDosimeterApp();
  app.init();
});

// Handle page visibility
document.addEventListener('visibilitychange', () => {
  if (document.hidden && app && app.isMonitoring) {
    app.saveCurrentData();
  }
});

// Handle before unload
window.addEventListener('beforeunload', () => {
  if (app && app.isMonitoring) {
    app.saveCurrentData();
  }
});
