/**
 * Charts Module - Data visualization for exposure history
 * Lightweight canvas-based charting without external dependencies
 */

class ExposureChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas element ${canvasId} not found`);
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.data = [];
    this.period = 'day'; // day, week, month
    this.colors = {
      safe: '#10b981',
      moderate: '#f59e0b',
      danger: '#ef4444',
      grid: '#e5e7eb',
      text: '#6b7280',
      line: '#3b82f6'
    };

    this.setupCanvas();
    window.addEventListener('resize', () => this.setupCanvas());
  }

  /**
   * Setup canvas with proper dimensions
   */
  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);

    this.width = rect.width;
    this.height = rect.height;

    if (this.data.length > 0) {
      this.draw();
    }
  }

  /**
   * Set chart data
   */
  setData(data, period = 'day') {
    this.data = data;
    this.period = period;
    this.draw();
  }

  /**
   * Draw the chart
   */
  draw() {
    if (!this.ctx || this.data.length === 0) {
      this.drawEmptyState();
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Define chart area
    const padding = { top: 30, right: 20, bottom: 50, left: 50 };
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;

    // Draw grid and axes
    this.drawGrid(padding, chartWidth, chartHeight);

    // Draw bars or line based on period
    if (this.period === 'day') {
      this.drawBars(padding, chartWidth, chartHeight);
    } else {
      this.drawLine(padding, chartWidth, chartHeight);
    }

    // Draw threshold line at 100%
    this.drawThresholdLine(padding, chartWidth, chartHeight);

    // Draw labels
    this.drawLabels(padding, chartWidth, chartHeight);
  }

  /**
   * Draw empty state
   */
  drawEmptyState() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '16px -apple-system, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('No data available', this.width / 2, this.height / 2);
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '14px -apple-system, sans-serif';
    this.ctx.fillText('Start monitoring to see your exposure history', this.width / 2, this.height / 2 + 25);
  }

  /**
   * Draw grid lines
   */
  drawGrid(padding, chartWidth, chartHeight) {
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;

    // Horizontal grid lines
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + (chartHeight / steps) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(padding.left + chartWidth, y);
      this.ctx.stroke();
    }

    // Vertical axis
    this.ctx.beginPath();
    this.ctx.moveTo(padding.left, padding.top);
    this.ctx.lineTo(padding.left, padding.top + chartHeight);
    this.ctx.stroke();

    // Horizontal axis
    this.ctx.beginPath();
    this.ctx.moveTo(padding.left, padding.top + chartHeight);
    this.ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    this.ctx.stroke();
  }

  /**
   * Draw bar chart (for daily hourly data)
   */
  drawBars(padding, chartWidth, chartHeight) {
    const barWidth = chartWidth / this.data.length - 4;
    const maxDose = Math.max(...this.data.map(d => d.value), 100);

    this.data.forEach((item, index) => {
      const x = padding.left + (chartWidth / this.data.length) * index + 2;
      const barHeight = (item.value / maxDose) * chartHeight;
      const y = padding.top + chartHeight - barHeight;

      // Determine color based on value
      let color = this.colors.safe;
      if (item.value >= 100) {
        color = this.colors.danger;
      } else if (item.value >= 50) {
        color = this.colors.moderate;
      }

      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, barWidth, barHeight);
    });
  }

  /**
   * Draw line chart (for weekly/monthly data)
   */
  drawLine(padding, chartWidth, chartHeight) {
    if (this.data.length < 2) {
      return;
    }

    const maxDose = Math.max(...this.data.map(d => d.value), 100);

    this.ctx.strokeStyle = this.colors.line;
    this.ctx.lineWidth = 3;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';

    // Draw line
    this.ctx.beginPath();
    this.data.forEach((item, index) => {
      const x = padding.left + (chartWidth / (this.data.length - 1)) * index;
      const y = padding.top + chartHeight - (item.value / maxDose) * chartHeight;

      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();

    // Draw points
    this.ctx.fillStyle = this.colors.line;
    this.data.forEach((item, index) => {
      const x = padding.left + (chartWidth / (this.data.length - 1)) * index;
      const y = padding.top + chartHeight - (item.value / maxDose) * chartHeight;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Fill area under line
    this.ctx.globalAlpha = 0.1;
    this.ctx.fillStyle = this.colors.line;
    this.ctx.beginPath();
    this.data.forEach((item, index) => {
      const x = padding.left + (chartWidth / (this.data.length - 1)) * index;
      const y = padding.top + chartHeight - (item.value / maxDose) * chartHeight;

      if (index === 0) {
        this.ctx.moveTo(x, padding.top + chartHeight);
        this.ctx.lineTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  /**
   * Draw threshold line at 100%
   */
  drawThresholdLine(padding, chartWidth, chartHeight) {
    const maxDose = Math.max(...this.data.map(d => d.value), 100);
    const y = padding.top + chartHeight - (100 / maxDose) * chartHeight;

    this.ctx.strokeStyle = this.colors.danger;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(padding.left, y);
    this.ctx.lineTo(padding.left + chartWidth, y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);

    // Label
    this.ctx.fillStyle = this.colors.danger;
    this.ctx.font = '12px -apple-system, sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Safe limit', padding.left - 5, y + 4);
  }

  /**
   * Draw axis labels
   */
  drawLabels(padding, chartWidth, chartHeight) {
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '12px -apple-system, sans-serif';
    this.ctx.textAlign = 'center';

    // Y-axis labels (dose percentage)
    const maxDose = Math.max(...this.data.map(d => d.value), 100);
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const value = Math.round((maxDose / steps) * i);
      const y = padding.top + chartHeight - (chartHeight / steps) * i;

      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${value}%`, padding.left - 10, y + 4);
    }

    // X-axis labels
    const labelInterval = Math.ceil(this.data.length / 8);
    this.data.forEach((item, index) => {
      if (index % labelInterval === 0) {
        const x = padding.left + (chartWidth / (this.data.length - 1 || 1)) * index;
        const y = padding.top + chartHeight + 20;

        this.ctx.textAlign = 'center';
        this.ctx.fillText(item.label, x, y);
      }
    });

    // Y-axis title
    this.ctx.save();
    this.ctx.translate(15, padding.top + chartHeight / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Noise Dose (%)', 0, 0);
    this.ctx.restore();
  }

  /**
   * Generate sample data for testing
   */
  static generateSampleData(period = 'day') {
    const data = [];

    if (period === 'day') {
      // Hourly data for today
      for (let hour = 0; hour < 24; hour++) {
        data.push({
          label: `${hour}:00`,
          value: Math.random() * 120
        });
      }
    } else if (period === 'week') {
      // Daily data for past week
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach(day => {
        data.push({
          label: day,
          value: Math.random() * 150
        });
      });
    } else if (period === 'month') {
      // Weekly data for past month
      for (let week = 1; week <= 4; week++) {
        data.push({
          label: `Week ${week}`,
          value: Math.random() * 100
        });
      }
    }

    return data;
  }
}

// Initialize chart when DOM is ready
let exposureChart = null;

function initializeChart() {
  const canvas = document.getElementById('exposureChart');
  if (canvas) {
    exposureChart = new ExposureChart('exposureChart');
  }
}
