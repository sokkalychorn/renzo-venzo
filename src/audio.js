export class AudioSystem {
  constructor() { this.ctx = null; this.master = null; this.rain = null; this.muted = false; }
  ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain(); this.master.gain.value = .16; this.master.connect(this.ctx.destination);
  }
  tone(freq=220, duration=.08, type='sine', volume=.2, slide=0) {
    if (this.muted) return; this.ensure();
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t); o.frequency.linearRampToValueAtTime(freq+slide,t+duration);
    g.gain.setValueAtTime(volume,t); g.gain.exponentialRampToValueAtTime(.001,t+duration);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+duration);
  }
  hit() { this.tone(95,.09,'square',.25,-35); }
  parry() { this.tone(720,.14,'triangle',.3,500); }
  hook() { this.tone(180,.18,'sawtooth',.18,-90); }
  bell(failed=false) { if(failed){this.tone(80,.3,'square',.16,-30);} else { this.tone(380,.7,'sine',.3,-120); setTimeout(()=>this.tone(510,.55,'sine',.25,-140),110); } }
  ui() { this.tone(420,.08,'triangle',.15,80); }
  defeat() { this.tone(160,.8,'sawtooth',.2,-120); }
  win() { [330,440,550,660].forEach((f,i)=>setTimeout(()=>this.tone(f,.5,'triangle',.18,80),i*130)); }
}
