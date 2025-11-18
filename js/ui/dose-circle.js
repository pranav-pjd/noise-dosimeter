/**
 * Dose Circle UI Component
 * Radial fill animation from center
 */

class DoseCircle {
  constructor() {
    this.circle = document.getElementById('doseFillCircle');
    this.percentText = document.getElementById('dosePercentText');
    this.maxRadius = 120;
    this.currentRadius = 0;
    this.targetRadius = 0;
    this.animationFrame = null;

    // Start animation loop
    this.animate();
  }

  update(percentage) {
    // Clamp to 0-200%
    const percent = Math.max(0, Math.min(200, percentage));

    // Calculate target radius
    this.targetRadius = (percent / 100) * this.maxRadius;

    // Update text with smooth counting
    this.percentText.textContent = `${Math.round(percent)}%`;

    // Change color based on level
    const gradStart = document.getElementById('gradStart');
    if (gradStart) {
      if (percent < 50) {
        gradStart.style.stopColor = '#10b981';
      } else if (percent < 100) {
        gradStart.style.stopColor = '#f59e0b';
      } else {
        gradStart.style.stopColor = '#ef4444';
      }
    }

    // Add monitoring class for breathing animation
    if (app && app.isMonitoring) {
      this.circle.classList.add('monitoring');
    } else {
      this.circle.classList.remove('monitoring');
    }
  }

  animate() {
    // Smooth interpolation towards target
    const delta = this.targetRadius - this.currentRadius;
    const step = delta * 0.1; // Smooth easing

    if (Math.abs(delta) > 0.1) {
      this.currentRadius += step;
      this.circle.setAttribute('r', this.currentRadius);
    } else {
      this.currentRadius = this.targetRadius;
      this.circle.setAttribute('r', this.currentRadius);
    }

    // Continue animation loop
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}

const doseCircle = new DoseCircle();
