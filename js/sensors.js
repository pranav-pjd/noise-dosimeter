/**
 * Sensors Module - Multi-sensor fusion for context awareness
 * Integrates accelerometer and ambient light sensor data
 */

class SensorFusion {
  constructor() {
    this.accelerometer = null;
    this.lightSensor = null;
    this.isActive = false;

    // Sensor data
    this.motion = {
      x: 0,
      y: 0,
      z: 0,
      magnitude: 0,
      isMoving: false
    };

    this.light = {
      illuminance: 0,
      level: 'unknown'
    };

    this.context = {
      type: 'unknown',
      confidence: 0,
      description: 'Detecting environment...'
    };

    // Thresholds for motion detection
    this.motionThreshold = 2.0; // m/s²
    this.movingAverageSamples = [];
    this.maxSamples = 10;

    // Callbacks
    this.callbacks = {
      onContextChange: null,
      onSensorUpdate: null
    };
  }

  /**
   * Initialize sensors
   */
  async initialize() {
    const results = {
      accelerometer: false,
      light: false,
      errors: []
    };

    // Try to initialize accelerometer
    try {
      if ('Accelerometer' in window) {
        await this.initializeAccelerometer();
        results.accelerometer = true;
        console.log('Accelerometer initialized');
      } else {
        results.errors.push('Accelerometer API not supported');
        console.warn('Accelerometer API not supported');
      }
    } catch (error) {
      results.errors.push(`Accelerometer: ${error.message}`);
      console.error('Accelerometer initialization failed:', error);
    }

    // Try to initialize ambient light sensor
    try {
      if ('AmbientLightSensor' in window) {
        await this.initializeAmbientLight();
        results.light = true;
        console.log('Ambient light sensor initialized');
      } else {
        results.errors.push('AmbientLightSensor API not supported');
        console.warn('AmbientLightSensor API not supported');
      }
    } catch (error) {
      results.errors.push(`Light sensor: ${error.message}`);
      console.error('Light sensor initialization failed:', error);
    }

    // Fallback to device orientation if accelerometer not available
    if (!results.accelerometer) {
      this.initializeDeviceOrientation();
    }

    return results;
  }

  /**
   * Initialize accelerometer
   */
  async initializeAccelerometer() {
    this.accelerometer = new Accelerometer({ frequency: 10 }); // 10 Hz

    this.accelerometer.addEventListener('reading', () => {
      this.motion.x = this.accelerometer.x || 0;
      this.motion.y = this.accelerometer.y || 0;
      this.motion.z = this.accelerometer.z || 0;

      // Calculate magnitude
      this.motion.magnitude = Math.sqrt(
        this.motion.x ** 2 + this.motion.y ** 2 + this.motion.z ** 2
      );

      // Detect motion
      this.detectMotion();
      this.updateContext();
    });

    this.accelerometer.addEventListener('error', (event) => {
      console.error('Accelerometer error:', event.error);
    });

    this.accelerometer.start();
  }

  /**
   * Initialize ambient light sensor
   */
  async initializeAmbientLight() {
    this.lightSensor = new AmbientLightSensor({ frequency: 1 }); // 1 Hz

    this.lightSensor.addEventListener('reading', () => {
      this.light.illuminance = this.lightSensor.illuminance || 0;
      this.light.level = this.getLightLevel(this.light.illuminance);
      this.updateContext();
    });

    this.lightSensor.addEventListener('error', (event) => {
      console.error('Light sensor error:', event.error);
    });

    this.lightSensor.start();
  }

  /**
   * Fallback to device orientation API
   */
  initializeDeviceOrientation() {
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (event) => {
        const acc = event.accelerationIncludingGravity;
        if (acc) {
          this.motion.x = acc.x || 0;
          this.motion.y = acc.y || 0;
          this.motion.z = acc.z || 0;

          this.motion.magnitude = Math.sqrt(
            this.motion.x ** 2 + this.motion.y ** 2 + this.motion.z ** 2
          );

          this.detectMotion();
          this.updateContext();
        }
      });
      console.log('Using DeviceMotion API as fallback');
    }
  }

  /**
   * Detect if device is moving
   */
  detectMotion() {
    // Add to moving average
    this.movingAverageSamples.push(this.motion.magnitude);

    if (this.movingAverageSamples.length > this.maxSamples) {
      this.movingAverageSamples.shift();
    }

    // Calculate variance to detect motion
    const avg = this.movingAverageSamples.reduce((a, b) => a + b, 0) / this.movingAverageSamples.length;
    const variance = this.movingAverageSamples.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / this.movingAverageSamples.length;

    this.motion.isMoving = variance > this.motionThreshold;
  }

  /**
   * Get light level category
   */
  getLightLevel(lux) {
    if (lux < 10) return 'dark';
    if (lux < 50) return 'dim';
    if (lux < 200) return 'indoor';
    if (lux < 1000) return 'bright-indoor';
    if (lux < 10000) return 'overcast';
    return 'sunlight';
  }

  /**
   * Infer environmental context from sensor fusion
   */
  updateContext() {
    const { isMoving } = this.motion;
    const { level: lightLevel, illuminance } = this.light;

    let contextType = 'unknown';
    let confidence = 0;
    let description = 'Unknown environment';

    // Context inference rules
    if (isMoving && (lightLevel === 'sunlight' || lightLevel === 'overcast')) {
      contextType = 'outdoor-commute';
      confidence = 0.8;
      description = 'Outdoor commute (walking/cycling)';
    } else if (isMoving && lightLevel === 'indoor') {
      contextType = 'indoor-commute';
      confidence = 0.7;
      description = 'Indoor commute (walking)';
    } else if (isMoving) {
      contextType = 'vehicle';
      confidence = 0.6;
      description = 'In vehicle';
    } else if (!isMoving && (lightLevel === 'indoor' || lightLevel === 'bright-indoor')) {
      contextType = 'office';
      confidence = 0.7;
      description = 'Office/indoor workspace';
    } else if (!isMoving && lightLevel === 'dim') {
      contextType = 'quiet-space';
      confidence = 0.6;
      description = 'Quiet indoor space';
    } else if (!isMoving && lightLevel === 'dark') {
      contextType = 'dark-space';
      confidence = 0.5;
      description = 'Dark/sleeping environment';
    } else if (!isMoving && (lightLevel === 'sunlight' || lightLevel === 'overcast')) {
      contextType = 'outdoor-stationary';
      confidence = 0.6;
      description = 'Outdoor stationary';
    } else {
      contextType = 'unknown';
      confidence = 0.3;
      description = 'Detecting environment...';
    }

    const previousContext = this.context.type;
    this.context = { type: contextType, confidence, description };

    // Trigger callback if context changed
    if (previousContext !== contextType && this.callbacks.onContextChange) {
      this.callbacks.onContextChange(this.context);
    }

    // Trigger sensor update callback
    if (this.callbacks.onSensorUpdate) {
      this.callbacks.onSensorUpdate({
        motion: this.motion,
        light: this.light,
        context: this.context
      });
    }
  }

  /**
   * Get enhanced context with noise data
   */
  getEnhancedContext(noiseLevel) {
    const baseContext = { ...this.context };

    // Enhance context with noise information
    if (noiseLevel > 95) {
      baseContext.description += ' (Very loud)';
      baseContext.riskLevel = 'high';
    } else if (noiseLevel > 85) {
      baseContext.description += ' (Loud)';
      baseContext.riskLevel = 'moderate';
    } else {
      baseContext.riskLevel = 'low';
    }

    // Add specific recommendations based on context
    if (baseContext.type === 'outdoor-commute' && noiseLevel > 85) {
      baseContext.recommendation = 'Consider using noise-cancelling headphones';
    } else if (baseContext.type === 'office' && noiseLevel > 85) {
      baseContext.recommendation = 'Consider relocating to quieter space';
    } else if (baseContext.type === 'vehicle' && noiseLevel > 85) {
      baseContext.recommendation = 'Vehicle noise exposure - limit travel time if possible';
    }

    return baseContext;
  }

  /**
   * Start sensor monitoring
   */
  start() {
    this.isActive = true;
    console.log('Sensor fusion started');
  }

  /**
   * Stop sensor monitoring
   */
  stop() {
    this.isActive = false;

    if (this.accelerometer) {
      this.accelerometer.stop();
    }

    if (this.lightSensor) {
      this.lightSensor.stop();
    }

    console.log('Sensor fusion stopped');
  }

  /**
   * Register callback for context changes
   */
  onContextChange(callback) {
    this.callbacks.onContextChange = callback;
  }

  /**
   * Register callback for sensor updates
   */
  onSensorUpdate(callback) {
    this.callbacks.onSensorUpdate = callback;
  }

  /**
   * Get current sensor data
   */
  getData() {
    return {
      motion: { ...this.motion },
      light: { ...this.light },
      context: { ...this.context }
    };
  }

  /**
   * Get motion status as string
   */
  getMotionStatus() {
    if (this.motion.isMoving) {
      return 'Moving';
    }
    return 'Stationary';
  }

  /**
   * Check if sensors are supported
   */
  static isSupported() {
    return {
      accelerometer: 'Accelerometer' in window || 'DeviceMotionEvent' in window,
      light: 'AmbientLightSensor' in window,
      anySupported: ('Accelerometer' in window || 'DeviceMotionEvent' in window) ||
                    'AmbientLightSensor' in window
    };
  }
}

// Create global instance
const sensorFusion = new SensorFusion();
