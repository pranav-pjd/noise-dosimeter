/**
 * Warnings - Alert system for dangerous noise levels and dose
 */

class Warnings {
  constructor() {
    this.lastWarnings = {};
    this.enabled = true;
  }

  init() {
    const toggle = document.getElementById('warningsToggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        this.enabled = e.target.checked;
        storageEngine.saveSetting('warningsEnabled', this.enabled);
      });
    }

    this.loadSettings();
  }

  check(level, dose) {
    if (!this.enabled) return;

    const now = Date.now();

    // Dangerous noise level
    if (level >= CONFIG.NIOSH.dangerLevel && !this.recentWarning('danger-level', now)) {
      this.showWarning('⚠️ Dangerous noise level! Protect your ears immediately.', 'danger');
      this.playWarningSound('critical');
      this.lastWarnings['danger-level'] = now;
    }

    // Dose warnings
    if (dose >= CONFIG.WARNINGS.dose.critical && !this.recentWarning('dose-critical', now)) {
      this.showWarning('🚨 CRITICAL: 150% dose exceeded! Seek quiet immediately.', 'danger');
      this.playWarningSound('critical');
      haptics.vibrate('critical');
      this.lastWarnings['dose-critical'] = now;
    } else if (dose >= CONFIG.WARNINGS.dose.warning && !this.recentWarning('dose-warning', now)) {
      this.showWarning('⚠️ Daily safe limit (100%) reached. Avoid further exposure.', 'warning');
      this.playWarningSound('warning');
      haptics.vibrate('strong');
      this.lastWarnings['dose-warning'] = now;
    } else if (dose >= CONFIG.WARNINGS.dose.advisory && !this.recentWarning('dose-advisory', now)) {
      this.showWarning('⚡ Approaching 50% of daily safe dose. Monitor exposure.', 'info');
      this.playWarningSound('advisory');
      this.lastWarnings['dose-advisory'] = now;
    }
  }

  recentWarning(key, now) {
    return this.lastWarnings[key] && (now - this.lastWarnings[key]) < CONFIG.WARNINGS.cooldownPeriod;
  }

  showWarning(message, type = 'warning') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (toast && toastMessage) {
      toastMessage.textContent = message;
      toast.classList.remove('hidden');

      setTimeout(() => {
        toast.classList.add('hidden');
      }, type === 'danger' ? 5000 : 3000);
    }
  }

  playWarningSound(type) {
    if (!this.enabled) return;

    try {
      const ctx = new AudioContext();
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);

      const patterns = {
        advisory: [
          { freq: 800, start: 0, duration: 0.15 }
        ],
        warning: [
          { freq: 1000, start: 0, duration: 0.15 },
          { freq: 1200, start: 0.2, duration: 0.15 }
        ],
        critical: [
          { freq: 1200, start: 0, duration: 0.15 },
          { freq: 1000, start: 0.2, duration: 0.15 },
          { freq: 1200, start: 0.4, duration: 0.15 }
        ]
      };

      const pattern = patterns[type] || patterns.advisory;

      pattern.forEach(note => {
        const oscillator = ctx.createOscillator();
        const noteGain = ctx.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(gainNode);

        oscillator.frequency.value = note.freq;
        oscillator.type = 'sine';

        // Envelope for smoother sound
        noteGain.gain.setValueAtTime(0, ctx.currentTime + note.start);
        noteGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + note.start + 0.01);
        noteGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + note.start + note.duration - 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.start + note.duration);

        oscillator.start(ctx.currentTime + note.start);
        oscillator.stop(ctx.currentTime + note.start + note.duration);
      });

      // Auto-cleanup
      setTimeout(() => ctx.close(), 1000);
    } catch (error) {
      debugLog('Warnings', 'Failed to play sound:', error);
    }
  }

  async loadSettings() {
    this.enabled = await storageEngine.getSetting('warningsEnabled', true);
    const toggle = document.getElementById('warningsToggle');
    if (toggle) toggle.checked = this.enabled;
  }
}

const warnings = new Warnings();
