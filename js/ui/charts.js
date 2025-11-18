/**
 * Charts - Historical data visualization
 */

class HistoryChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.period = 'day';

    if (this.canvas) {
      this.canvas.width = this.canvas.offsetWidth * 2;
      this.canvas.height = this.canvas.offsetHeight * 2;
    }
  }

  async update(period) {
    this.period = period;
    const data = await this.getData(period);
    this.draw(data);
  }

  async getData(period) {
    const data = [];

    try {
      if (period === 'day') {
        // Get hourly data for today
        const hourlyData = await storageEngine.getHourlySummaries(1);
        const today = new Date().toISOString().split('T')[0];

        for (let i = 0; i < 24; i++) {
          const hourKey = `${today} ${String(i).padStart(2, '0')}:00`;
          const hourData = hourlyData.find(h => h.hour.startsWith(hourKey));
          data.push({
            label: `${i}:00`,
            value: hourData ? hourData.dose : 0
          });
        }
      } else if (period === 'week') {
        // Get daily data for past 7 days
        const dailyData = await storageEngine.getDailySummaries(7);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayData = dailyData.find(d => d.date === dateStr);
          const dayName = days[date.getDay()];

          data.push({
            label: dayName,
            value: dayData ? dayData.dose : 0
          });
        }
      } else if (period === 'month') {
        // Get daily data for past 30 days
        const dailyData = await storageEngine.getDailySummaries(30);

        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayData = dailyData.find(d => d.date === dateStr);
          const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;

          data.push({
            label: dayLabel,
            value: dayData ? dayData.dose : 0
          });
        }
      }

      debugLog('Charts', `Loaded ${data.length} data points for ${period}`);
      return data;
    } catch (error) {
      console.error('Failed to load chart data:', error);
      // Return empty data on error
      return this.getEmptyData(period);
    }
  }

  getEmptyData(period) {
    const data = [];
    if (period === 'day') {
      for (let i = 0; i < 24; i++) {
        data.push({ label: `${i}:00`, value: 0 });
      }
    } else if (period === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach(day => data.push({ label: day, value: 0 }));
    } else {
      for (let i = 1; i <= 30; i++) {
        data.push({ label: `${i}`, value: 0 });
      }
    }
    return data;
  }

  draw(data) {
    if (!this.ctx || data.length === 0) return;

    const { width, height } = this.canvas;
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    this.ctx.clearRect(0, 0, width, height);

    const maxValue = Math.max(...data.map(d => d.value), 100);

    // Draw horizontal grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(padding.left + chartWidth, y);
      this.ctx.stroke();

      // Y-axis labels
      const value = Math.round(maxValue * (1 - i / 4));
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.font = '24px -apple-system, system-ui, sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${value}%`, padding.left - 10, y + 8);
    }

    // Draw data points and line
    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 4;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();

    const points = [];
    data.forEach((point, i) => {
      const x = padding.left + (chartWidth / Math.max(data.length - 1, 1)) * i;
      const y = padding.top + chartHeight - (point.value / maxValue) * chartHeight;
      points.push({ x, y });

      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    });

    this.ctx.stroke();

    // Fill gradient under line
    if (points.length > 0) {
      this.ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      this.ctx.lineTo(padding.left, padding.top + chartHeight);
      this.ctx.closePath();

      const gradient = this.ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    // Draw data point circles
    points.forEach(point => {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.fill();
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });

    // Draw X-axis labels (every nth label to avoid crowding)
    const labelInterval = this.period === 'month' ? 5 : (this.period === 'day' ? 3 : 1);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.font = '24px -apple-system, system-ui, sans-serif';
    this.ctx.textAlign = 'center';

    data.forEach((point, i) => {
      if (i % labelInterval === 0 || i === data.length - 1) {
        const x = padding.left + (chartWidth / Math.max(data.length - 1, 1)) * i;
        this.ctx.fillText(point.label, x, padding.top + chartHeight + 40);
      }
    });

    // Draw axes border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(padding.left, padding.top, chartWidth, chartHeight);
  }
}

const historyChart = new HistoryChart('historyChart');
