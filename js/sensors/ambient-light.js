/**
 * Ambient Light Sensor - Helps detect pocket mode
 */

class AmbientLightSensor {
  constructor() {
    this.illuminance = 0;
    this.sensor = null;
    this.onChangeCallback = null;
  }

  async initialize() {
    try {
      if ('AmbientLightSensor' in window) {
        this.sensor = new AmbientLightSensor({ frequency: 1 });
        this.sensor.onreading = () => {
          this.illuminance = this.sensor.illuminance;
          if (this.onChangeCallback) this.onChangeCallback(this.illuminance);
        };
        this.sensor.start();
        debugLog('Sensors', 'Light sensor initialized');
        return true;
      }
      return false;
    } catch (error) {
      debugLog('Sensors', 'Light sensor not available');
      return false;
    }
  }

  onChange(callback) {
    this.onChangeCallback = callback;
  }

  isDark() {
    return this.illuminance < CONFIG.POCKET.lightThreshold;
  }

  stop() {
    if (this.sensor) this.sensor.stop();
  }
}

const ambientLightSensor = new AmbientLightSensor();
