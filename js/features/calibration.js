/**
 * Calibration - Microphone calibration wizard and manual adjustment
 */

class Calibration {
  constructor() {
    this.offset = 0;
    this.isCalibrated = false;
  }

  init() {
    // Manual calibration slider
    const slider = document.getElementById('calibrationSlider');
    const valueDisplay = document.getElementById('calibrationValue');
    const resetBtn = document.getElementById('resetCalibrationBtn');
    const wizardBtn = document.getElementById('startCalibrationBtn');

    if (slider) {
      slider.addEventListener('input', (e) => {
        this.offset = parseFloat(e.target.value);
        valueDisplay.textContent = `${this.offset} dB`;
        audioEngine.setCalibration(this.offset);
        this.saveCalibration();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.offset = 0;
        slider.value = 0;
        valueDisplay.textContent = '0 dB';
        audioEngine.setCalibration(0);
        this.saveCalibration();
      });
    }

    if (wizardBtn) {
      wizardBtn.addEventListener('click', () => this.startWizard());
    }

    this.loadCalibration();
  }

  startWizard() {
    const modal = document.getElementById('calibrationModal');
    const content = document.getElementById('calibrationWizardContent');

    content.innerHTML = `
      <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
        <h2 style="margin-bottom: 20px;">📊 Calibration Wizard</h2>

        <div style="background: rgba(59, 130, 246, 0.1); padding: 20px; border-radius: 12px; margin-bottom: 30px;">
          <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px; font-family: 'SF Mono', monospace;" id="wizardReading">--</div>
          <div style="opacity: 0.7;">Current Reading (dB SPL)</div>
        </div>

        <div style="text-align: left; margin-bottom: 30px;">
          <h3 style="margin-bottom: 15px;">How to Calibrate:</h3>

          <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <strong>Method 1: Use Reference Sound Level Meter</strong>
            <ol style="margin: 10px 0 0 20px; line-height: 1.8;">
              <li>Place both devices in the same location</li>
              <li>Play a steady sound source</li>
              <li>Note the dB reading on reference meter</li>
              <li>Adjust calibration slider below to match</li>
            </ol>
          </div>

          <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <strong>Method 2: Use Online Calibration Tone</strong>
            <ol style="margin: 10px 0 0 20px; line-height: 1.8;">
              <li>Search "1kHz tone 94 dB calibration" on YouTube</li>
              <li>Play tone at comfortable volume (not max!)</li>
              <li>Hold phone/device at arm's length from speaker</li>
              <li>If app shows ~74 dB, add +20 dB calibration</li>
              <li>Fine-tune slider until reading shows ~94 dB</li>
            </ol>
          </div>

          <div style="padding: 15px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; border-left: 4px solid #f59e0b;">
            <strong>⚠️ Important Notes:</strong>
            <ul style="margin: 10px 0 0 20px; line-height: 1.8;">
              <li>Device microphones vary widely in sensitivity</li>
              <li>Calibration makes measurements more accurate</li>
              <li>Re-calibrate if you notice consistently wrong readings</li>
              <li>Pocket mode adds its own correction automatically</li>
            </ul>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 10px; font-weight: 600;">Quick Calibration Adjustment:</label>
          <div style="display: flex; align-items: center; gap: 15px;">
            <button class="btn-secondary" onclick="calibration.quickAdjust(-5)" style="flex: 1;">-5 dB</button>
            <button class="btn-secondary" onclick="calibration.quickAdjust(-1)" style="flex: 1;">-1 dB</button>
            <button class="btn-primary" onclick="calibration.quickAdjust(0)" style="flex: 1;">Reset</button>
            <button class="btn-secondary" onclick="calibration.quickAdjust(+1)" style="flex: 1;">+1 dB</button>
            <button class="btn-secondary" onclick="calibration.quickAdjust(+5)" style="flex: 1;">+5 dB</button>
          </div>
          <div style="text-align: center; margin-top: 10px; opacity: 0.7; font-size: 14px;">
            Current offset: <strong id="wizardOffset">0</strong> dB
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <button class="btn-primary" onclick="calibration.closeWizard()" style="padding: 12px 40px;">
            Done
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    // Update reading and offset in wizard
    this.wizardInterval = setInterval(() => {
      const reading = document.getElementById('wizardReading');
      const offset = document.getElementById('wizardOffset');
      if (reading) reading.textContent = Math.round(audioEngine.currentLevel);
      if (offset) offset.textContent = this.offset > 0 ? `+${this.offset}` : this.offset;
    }, 100);
  }

  quickAdjust(delta) {
    const slider = document.getElementById('calibrationSlider');
    const valueDisplay = document.getElementById('calibrationValue');

    if (delta === 0) {
      this.offset = 0;
    } else {
      this.offset = Math.max(-20, Math.min(20, this.offset + delta));
    }

    if (slider) slider.value = this.offset;
    if (valueDisplay) valueDisplay.textContent = `${this.offset} dB`;

    audioEngine.setCalibration(this.offset);
    this.saveCalibration();
    haptics.vibrate('light');
  }

  closeWizard() {
    const modal = document.getElementById('calibrationModal');
    modal.classList.add('hidden');
    if (this.wizardInterval) clearInterval(this.wizardInterval);
  }

  async saveCalibration() {
    await storageEngine.saveSetting('calibrationOffset', this.offset);
    this.isCalibrated = true;
    const status = document.getElementById('calibrationStatus');
    if (status) status.textContent = `Calibrated (${this.offset > 0 ? '+' : ''}${this.offset} dB)`;
  }

  async loadCalibration() {
    try {
      const savedOffset = await storageEngine.getSetting('calibrationOffset', 0);
      // Ensure it's a valid number
      this.offset = (typeof savedOffset === 'number' && isFinite(savedOffset)) ? savedOffset : 0;

      audioEngine.setCalibration(this.offset);

      const slider = document.getElementById('calibrationSlider');
      const valueDisplay = document.getElementById('calibrationValue');

      if (slider) slider.value = this.offset;
      if (valueDisplay) valueDisplay.textContent = `${this.offset} dB`;

      if (this.offset !== 0) {
        this.isCalibrated = true;
        const status = document.getElementById('calibrationStatus');
        if (status) status.textContent = `Calibrated (${this.offset > 0 ? '+' : ''}${this.offset} dB)`;
      }
    } catch (error) {
      console.error('Error loading calibration:', error);
      this.offset = 0;
      audioEngine.setCalibration(0);
    }
  }
}

const calibration = new Calibration();
