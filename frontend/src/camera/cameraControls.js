import * as THREE from 'three';

export class CameraControls {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = {};
    this.isPointerLocked = false;

    this.setupKeyboardInput();
  }

  setupKeyboardInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  getKeys() {
    return this.keys;
  }
}
