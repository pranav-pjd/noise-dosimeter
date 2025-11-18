/**
 * Dose Circle UI Component
 * Filled pie chart that sweeps clockwise from top (12 o'clock)
 */

class DoseCircle {
  constructor() {
    this.svg = document.getElementById('doseCircleSvg');
    this.path = document.getElementById('doseFillPath');
    this.percentText = document.getElementById('dosePercentText');
    this.centerX = 150;
    this.centerY = 150;
    this.radius = 120;
    this.currentPercent = 0;
    this.targetPercent = 0;
    this.animationFrame = null;

    // Start animation loop
    this.animate();
  }

  update(percentage) {
    // Clamp to 0-200%
    this.targetPercent = Math.max(0, Math.min(200, percentage));

    // Update text
    this.percentText.textContent = `${Math.round(this.targetPercent)}%`;

    // Change gradient color based on level
    const gradStart = document.getElementById('gradStart');
    if (gradStart) {
      if (this.targetPercent < 50) {
        gradStart.style.stopColor = '#10b981';
      } else if (this.targetPercent < 100) {
        gradStart.style.stopColor = '#f59e0b';
      } else {
        gradStart.style.stopColor = '#ef4444';
      }
    }
  }

  /**
   * Create SVG path for pie slice that sweeps clockwise from top
   */
  createPiePath(percent) {
    if (percent <= 0) return '';
    
    // Clamp to max 200% (2 full circles)
    const clampedPercent = Math.min(200, percent);
    
    // Convert percentage to angle (0% = top, 100% = full circle)
    // Start at -90 degrees (top) and go clockwise
    const angle = (clampedPercent / 100) * 360;
    const radians = (angle * Math.PI) / 180;
    
    // Calculate end point of the arc
    // Start from top (90 degrees in standard coords = -90 in SVG)
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + radians;
    
    const x = this.centerX + this.radius * Math.cos(endAngle);
    const y = this.centerY + this.radius * Math.sin(endAngle);
    
    // Large arc flag: 1 if angle > 180 degrees
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    // Create path:
    // M = move to center
    // L = line to start point (top)
    // A = arc to end point
    // Z = close path back to center
    const path = [
      `M ${this.centerX} ${this.centerY}`,
      `L ${this.centerX} ${this.centerY - this.radius}`,
      `A ${this.radius} ${this.radius} 0 ${largeArcFlag} 1 ${x} ${y}`,
      'Z'
    ].join(' ');
    
    return path;
  }

  animate() {
    // Smooth interpolation towards target
    const delta = this.targetPercent - this.currentPercent;
    const step = delta * 0.1; // Smooth easing

    if (Math.abs(delta) > 0.1) {
      this.currentPercent += step;
    } else {
      this.currentPercent = this.targetPercent;
    }

    // Update the pie path
    if (this.path) {
      this.path.setAttribute('d', this.createPiePath(this.currentPercent));
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
