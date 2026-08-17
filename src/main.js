import { Game } from './game.js';

const canvas=document.querySelector('#game');
const loading=document.querySelector('#loading');
const game=new Game(canvas);
let last=performance.now(),acc=0;
const STEP=1/60;

function frame(now){
  const elapsed=Math.min(.1,(now-last)/1000);last=now;acc+=elapsed;
  while(acc>=STEP){game.update(STEP);acc-=STEP;}
  game.render.frame(game);
  requestAnimationFrame(frame);
}

canvas.tabIndex=0;
canvas.addEventListener('click',()=>{canvas.focus();game.audio.ensure();});
window.addEventListener('keydown',()=>game.audio.ensure(),{once:true});
loading.classList.add('hidden');
setTimeout(()=>loading.remove(),700);
requestAnimationFrame(frame);

// Exposed deliberately for automated smoke tests and competition judges.
window.__RENZO_VENZO__=game;
