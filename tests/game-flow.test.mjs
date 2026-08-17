import test from 'node:test';
import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';

class MemoryStorage {
  constructor(){this.data=new Map();}
  getItem(k){return this.data.has(k)?this.data.get(k):null;}
  setItem(k,v){this.data.set(k,String(v));}
  removeItem(k){this.data.delete(k);}
}

globalThis.window=new EventTarget();
setMaxListeners(0,globalThis.window);
globalThis.localStorage=new MemoryStorage();
const {Game}=await import('../src/game.js');
const fakeCanvas={getContext(){return {};}};

function fresh(){
  const game=new Game(fakeCanvas);
  game.audio={muted:true,ui(){},hit(){},parry(){},hook(){},bell(){},defeat(){},win(){}};
  game.seed=31427;
  return game;
}

test('both authored scenarios instantiate with tactically distinct opposition and mechanisms',()=>{
  const game=fresh();
  game.start('pass',0);
  assert.equal(game.enemies.length,4);
  assert.ok(game.world.objects.some(o=>o.type==='alarm'));
  assert.ok(game.world.objects.some(o=>o.type==='wheel'));
  game.start('crest',0);
  assert.ok(game.enemies.some(e=>e.type==='veteran'));
  assert.ok(game.enemies.filter(e=>e.type==='guard').length>=2);
  assert.ok(game.world.objects.some(o=>o.type==='dispatch'));
});

test('Scenario I completion autosaves Scenario II start for Continue',()=>{
  const game=fresh();
  game.start('pass',0);
  game.world.objects.find(o=>o.type==='gate').open=true;
  game.active.x=game.world.exitX;
  game.updateObjective();
  assert.equal(game.scene,'interlude');
  const saved=game.hasSave&&localStorage.getItem('renzo-venzo-save-v1');
  assert.ok(saved);
  const loaded=fresh();
  loaded.continueGame();
  assert.equal(loaded.scene,'game');
  assert.equal(loaded.scenarioId,'crest');
});

test('Scenario II requires evidence, mechanism, and a Veteran defeat before village',()=>{
  const game=fresh();
  game.start('crest',0);
  game.active.x=game.world.exitX;
  game.world.objects.find(o=>o.type==='gate').open=true;
  game.world.objects.find(o=>o.type==='dispatch').collected=true;
  game.updateObjective();
  assert.equal(game.scene,'game','Veteran still blocks completion');
  game.enemies.filter(e=>e.type==='veteran').at(-1).dead=true;
  game.updateObjective();
  assert.equal(game.scene,'village');
});

test('sabotaged alarm visibly fails when a Scout reaches it',()=>{
  const game=fresh();
  game.start('pass',0);
  const scout=game.enemies.find(e=>e.type==='scout');
  const alarm=game.world.objects.find(o=>o.type==='alarm');
  alarm.sabotaged=true;
  scout.state='alarm';scout.alarmTarget=alarm;scout.x=alarm.x-10;
  game.enemyBehavior(scout,null,1/60);
  assert.equal(alarm.rung,true);
  assert.match(game.toastText,/ALARM FAILED/);
});

test('Scout physically runs to a distant alarm before a visible failed attempt',()=>{
  const game=fresh();game.start('pass',0);
  const scout=game.enemies.find(e=>e.type==='scout');const alarm=game.world.objects.find(o=>o.type==='alarm');
  alarm.sabotaged=true;scout.state='alarm';scout.alarmTarget=alarm;scout.x=alarm.x-180;const before=scout.x;
  for(let i=0;i<180&&!alarm.rung;i++)game.enemyBehavior(scout,null,1/60);
  assert.ok(scout.x>before+60,'Scout moved toward the alarm');
  assert.equal(alarm.rung,true);
  assert.match(game.toastText,/ALARM FAILED/);
});

test('crossing the archive checkpoint cannot grant evidence that was not collected',()=>{
  const game=fresh();game.start('crest',0);game.active.x=3250;game.updateCheckpoints();
  assert.ok(game.checkpoint<2);
  game.save('attempted bypass');
  const loaded=fresh();loaded.continueGame();
  assert.equal(loaded.world.objects.find(o=>o.type==='dispatch').collected,undefined);
});

test('player-controlled brother down transfers control; two down causes defeat',()=>{
  const game=fresh();
  game.start('pass',0);
  assert.equal(game.active.name,'Venzo');
  game.damageBrother(game.active,999,{x:game.active.x+20});
  assert.equal(game.active.name,'Renzo');
  assert.equal(game.companion.downed,true);
  game.damageBrother(game.active,999,{x:game.active.x+20});
  assert.equal(game.defeat,true);
});

test('Renzo hook targets expose light, anchored, and wheel mechanism behavior',()=>{
  const game=fresh();
  game.start('pass',0);
  game.switchBrother();
  game.active.mode='chain';
  game.active.x=100;game.active.y=566;game.active.facing=1;
  game.tryHook();
  assert.equal(game.hook.mode,'pull-target');
  const anchor=game.world.objects.find(o=>o.type==='anchor');
  game.world.objects.forEach(o=>{if(o!==anchor)o.destroyed=true;});
  game.active.x=anchor.x-100;game.active.y=anchor.y;game.active.attackCooldown=0;
  game.tryHook();
  assert.equal(game.hook.mode,'anchor');
  const wheel=game.world.objects.find(o=>o.type==='wheel');
  const gate=game.world.objects.find(o=>o.type==='gate');
  wheel.destroyed=false;game.active.x=wheel.x-100;game.active.y=wheel.y;game.active.attackCooldown=0;
  game.tryHook();
  assert.equal(gate.open,true);
});

test('active brother can revive downed companion through sustained interaction',()=>{
  const game=fresh();game.start('pass',0);
  game.companion.downed=true;game.companion.hp=0;game.companion.x=game.active.x+20;
  game.input.down.add('e');
  for(let i=0;i<70;i++)game.handleInteract(game.active,1/60);
  game.input.down.delete('e');
  assert.equal(game.companion.downed,false);
  assert.ok(game.companion.hp>0);
});

test('all major scenes render without throwing against the Canvas API contract',()=>{
  const gradient={addColorStop(){}};
  const ctx=new Proxy({createLinearGradient(){return gradient;}},{get(target,key){if(key in target)return target[key];if(typeof key==='string')return ()=>{};},set(target,key,value){target[key]=value;return true;}});
  const game=new Game({getContext(){return ctx;}});game.audio={muted:true,ui(){},hit(){},parry(){},hook(){},bell(){},defeat(){},win(){}};
  game.render.frame(game);
  game.start('pass',0);game.render.frame(game);
  game.startVillage();game.render.frame(game);
  game.scene='revelation';game.revealPhase=2;game.render.frame(game);
});

test('late block reduces but does not erase damage, while precision parry opens attacker',()=>{
  const game=fresh();game.start('pass',0);const venzo=game.active;const attacker=game.enemies[0];attacker.x=venzo.x+20;venzo.facing=1;venzo.blocking=true;
  venzo.blockStart=game.time-1;const before=venzo.hp;game.damageBrother(venzo,25,attacker);assert.ok(venzo.hp<before&&venzo.hp>before-25);
  venzo.invuln=0;venzo.blockStart=game.time-.1;const guarded=venzo.hp;game.damageBrother(venzo,25,attacker);assert.equal(venzo.hp,guarded);assert.ok(attacker.stagger>=1);
});

test('opposite directional dodge actually moves backward and is recorded by a nearby Veteran',()=>{
  const game=fresh();game.start('crest',0);const veteran=game.enemies.find(e=>e.type==='veteran');game.active.x=veteran.x-100;game.active.facing=1;
  game.input.down.add('a');game.input.pressed.add('shift');game.updatePlayer(1/60);
  assert.equal(game.active.dodgeDir,-1);
  assert.ok(veteran.memory.habits.backwardDodge>=1);
});

test('runtime Veteran wait-and-punish response retreats from a repeated heavy',()=>{
  const game=fresh();game.start('crest',0);const veteran=game.enemies.find(e=>e.type==='veteran');const hero=game.active;
  veteran.state='alert';veteran.action='waitAndPunish';veteran.x=hero.x+65;veteran.facing=-1;hero.attackKind='heavy';hero.attackTimer=.4;
  game.enemyBehavior(veteran,hero,1/60);
  assert.ok(veteran.vx>0,'Veteran retreats opposite its facing');
  assert.ok(veteran.punishReady>0);
});

test('walkable village gates the broken-kamon revelation by position',()=>{
  const game=fresh();game.start('crest',0);game.startVillage();
  game.input.pressed.add('enter');game.updateVillage();assert.equal(game.scene,'village');
  game.input.pressed.clear();game.input.down.add('d');for(let i=0;i<330;i++)game.updateVillage();game.input.down.clear();
  assert.ok(game.villageX>=1080);game.input.pressed.add('enter');game.updateVillage();assert.equal(game.scene,'revelation');
});
