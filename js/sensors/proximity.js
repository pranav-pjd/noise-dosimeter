/**
 * Proximity Sensor - Detects pocket mode
 */

class ProximitySensor {
  constructor() {
    this.isNear = false;
    this.sensor = null;
    this.onChangeCallback = null;
  }

  async initialize() {
    try {
      if ('ProximitySensor' in window) {
        this.sensor = new ProximitySensor();
        this.sensor.onreading = () => {
          this.isNear = this.sensor.near;
          if (this.onChangeCallback) this.onChangeCallback(this.isNear);
        };
        this.sensor.start();
        debugLog('Sensors', 'Proximity sensor initialized');
        return true;
      }
      return false;
    } catch (error) {
      debugLog('Sensors', 'Proximity sensor not available');
      return false;
    }
  }

  onChange(callback) {
    this.onChangeCallback = callback;
  }

  stop() {
    if (this.sensor) this.sensor.stop();
  }
}

const proximitySensor = new ProximitySensor();
