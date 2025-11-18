/**
 * Haptics - Vibration feedback
 */

class Haptics {
  constructor() {
    this.enabled = true;
  }

  init() {
    const toggle = document.getElementById('hapticsToggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        this.enabled = e.target.checked;
        storageEngine.saveSetting('hapticsEnabled', this.enabled);
      });
    }

    this.loadSettings();
  }

  vibrate(pattern) {
    if (!this.enabled || !navigator.vibrate) return;

    const patterns = CONFIG.HAPTICS;
    const vibratePattern = patterns[pattern] || patterns.medium;

    navigator.vibrate(vibratePattern);
  }

  async loadSettings() {
    this.enabled = await storageEngine.getSetting('hapticsEnabled', true);
    const toggle = document.getElementById('hapticsToggle');
    if (toggle) toggle.checked = this.enabled;
  }
}

const haptics = new Haptics();
