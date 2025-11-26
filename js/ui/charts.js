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
    this.updateStatistics(data, period);
  }

  async getData(period) {
    const data = [];

    try {
      if (period === 'day') {
        // Get hourly data for TODAY (daysBack = 0)
        const hourlyData = await storageEngine.getHourlySummaries(0);
        const today = new Date().toISOString().split('T')[0];

        debugLog('Charts', `Loading day chart for ${today}, found ${hourlyData.length} hourly records`);

        let previousCumulativeDose = 0;

        for (let i = 0; i < 24; i++) {
          const hourKey = `${today} ${String(i).padStart(2, '0')}:00`;
          const hourData = hourlyData.find(h => h.hour && h.hour.startsWith(hourKey));

          // Calculate dose contribution for this specific hour
          // by subtracting previous cumulative dose
          const cumulativeDose = hourData ? (hourData.dose || 0) : previousCumulativeDose;
          const hourlyContribution = Math.max(0, cumulativeDose - previousCumulativeDose);

          data.push({
            label: `${i}:00`,
            value: hourlyContribution
          });

          // Update previous cumulative for next iteration
          if (hourData) {
            previousCumulativeDose = cumulativeDose;
          }
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

  updateStatistics(data, period) {
    try {
      // Filter out data with actual values (not zeros)
      const nonZeroData = data.filter(d => d.value > 0);

      if (nonZeroData.length === 0) {
        // No data available
        this.setStatDisplay('avgDose', '--%');
        this.setStatDisplay('daysOverLimit', '--');
        this.setStatDisplay('doseTrend', '--');
        return;
      }

      // Calculate average dose
      const total = nonZeroData.reduce((sum, d) => sum + d.value, 0);
      const average = total / nonZeroData.length;
      this.setStatDisplay('avgDose', `${average.toFixed(1)}%`);

      // Calculate days/hours over 100%
      const overLimit = data.filter(d => d.value >= 100).length;
      const unit = period === 'day' ? 'hours' : 'days';
      this.setStatDisplay('daysOverLimit', `${overLimit} ${unit}`);

      // Calculate trend (compare first half vs second half)
      const midpoint = Math.floor(nonZeroData.length / 2);
      if (midpoint > 0) {
        const firstHalf = nonZeroData.slice(0, midpoint);
        const secondHalf = nonZeroData.slice(midpoint);

        const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

        const difference = secondAvg - firstAvg;
        let trendText = '';

        if (Math.abs(difference) < 5) {
          trendText = '→ Stable';
        } else if (difference > 0) {
          trendText = '↑ Increasing';
        } else {
          trendText = '↓ Decreasing';
        }

        this.setStatDisplay('doseTrend', trendText);
      } else {
        this.setStatDisplay('doseTrend', '--');
      }
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  setStatDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }
}

const historyChart = new HistoryChart('historyChart');
