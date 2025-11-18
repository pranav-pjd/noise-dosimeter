/**
 * Animations - Smooth UI transitions
 */

class Animations {
  static fadeIn(element) {
    element.style.animation = 'fadeIn 0.3s ease-out';
  }

  static fadeOut(element) {
    element.style.animation = 'fadeOut 0.3s ease-out';
  }

  static slideDown(element) {
    element.style.animation = 'slideDown 0.3s ease-out';
  }

  static pulse(element) {
    element.style.animation = 'pulse 2s ease-in-out infinite';
  }

  static stopAnimation(element) {
    element.style.animation = 'none';
  }
}
