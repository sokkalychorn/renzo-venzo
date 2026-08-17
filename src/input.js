export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.pointer = { x: 0, y: 0, clicked: false };
    target.addEventListener('keydown', e => {
      const k = this.key(e);
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
      if (['space','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
    });
    target.addEventListener('keyup', e => {
      const k = this.key(e); this.down.delete(k); this.released.add(k);
    });
    target.addEventListener('blur', () => this.down.clear());
  }
  key(e) { return e.key === ' ' ? 'space' : e.key.toLowerCase(); }
  is(k) { return this.down.has(k); }
  tap(k) { return this.pressed.has(k); }
  endFrame() { this.pressed.clear(); this.released.clear(); this.pointer.clicked = false; }
}
