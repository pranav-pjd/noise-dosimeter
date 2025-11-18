/**
 * Live Meter - Real-time dB display and waveform
 */

class LiveMeter {
  constructor() {
    this.dbValue = document.getElementById('liveDbValue');
    this.levelLabel = document.getElementById('noiseLevelLabel');
    this.canvas = document.getElementById('waveformCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    if (this.canvas) {
      this.canvas.width = this.canvas.offsetWidth * 2;
      this.canvas.height = this.canvas.offsetHeight * 2;
    }
  }

  update(level) {
    // Validate input
    if (level === undefined || level === null || isNaN(level) || !isFinite(level)) {
      console.error('Invalid level received in liveMeter.update:', level);
      this.dbValue.textContent = '--';
      return;
    }

    this.dbValue.textContent = level;

    const category = dosimetryEngine.getNoiseLevelCategory(level);
    this.levelLabel.textContent = `${category.label} - ${category.desc}`;
    this.levelLabel.className = `noise-level-label ${category.level}`;

    // Update body class for background gradient
    document.body.className = '';
    if (level >= CONFIG.NIOSH.dangerLevel) {
      document.body.classList.add('noise-danger');
    } else if (level >= CONFIG.NIOSH.maxSafeLevel) {
      document.body.classList.add('noise-moderate');
    } else if (level >= 70) {
      document.body.classList.add('noise-safe');
    }
  }

  drawWaveform() {
    if (!this.ctx) return;

    const { width, height } = this.canvas;
    const centerY = height / 2;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Get current audio level (0-120 dB typically)
    const currentLevel = audioEngine.currentLevel || 50;
    const isMonitoring = audioEngine.isActive;

    // Calculate wave amplitude based on sound level
    // Map dB range (30-120) to amplitude (0-1)
    const normalizedLevel = Math.max(0, Math.min(1, (currentLevel - 30) / 90));
    const amplitude = normalizedLevel * (height * 0.4);

    // Color based on level
    let color;
    if (currentLevel >= 100) {
      color = 'rgba(239, 68, 68, 0.8)'; // Red
    } else if (currentLevel >= 85) {
      color = 'rgba(245, 158, 11, 0.8)'; // Orange
    } else {
      color = 'rgba(16, 185, 129, 0.8)'; // Green
    }

    // Draw smooth sine wave
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const points = 100;
    const frequency = 3; // Number of wave cycles
    const time = Date.now() * 0.002; // Animation speed

    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const normalizedX = i / points;

      // Create multiple waves for complexity
      let y = centerY;

      if (isMonitoring) {
        // Primary wave
        y += Math.sin(normalizedX * Math.PI * frequency + time) * amplitude;
        // Add harmonics for organic feel
        y += Math.sin(normalizedX * Math.PI * frequency * 2 + time * 1.5) * amplitude * 0.3;
        y += Math.sin(normalizedX * Math.PI * frequency * 3 - time * 0.5) * amplitude * 0.2;
      }

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();

    // Add glow effect when monitoring
    if (isMonitoring && amplitude > 10) {
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = color;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    // Draw center line when not monitoring or very quiet
    if (!isMonitoring || amplitude < 5) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.moveTo(0, centerY);
      this.ctx.lineTo(width, centerY);
      this.ctx.stroke();
    }
  }
}

const liveMeter = new LiveMeter();

// Draw waveform at 30fps
if (liveMeter.ctx) {
  setInterval(() => liveMeter.drawWaveform(), 33);
}
