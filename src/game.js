import { Input } from './input.js';
import { AudioSystem } from './audio.js';
import { Renderer } from './render.js';
import { W,H,FLOOR,instantiateScenario } from './scenarios.js';
import {
  SeededRNG, classifyHookMass, stepHookSpring,
  createVeteranMemory, recordVeteranHabit, veteranActionWeights, chooseWeightedAction,
  VETERAN_HABITS, saveToStorage, loadFromStorage
} from './systems.js';

const SAVE_KEY='renzo-venzo-save-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const approach=(v,target,amt)=>v<target?Math.min(target,v+amt):Math.max(target,v-amt);

function makeBrother(name,x){return {name,x,y:FLOOR,vx:0,vy:0,w:28,h:76,mass:name==='Venzo'?1.2:1,maxHp:name==='Venzo'?120:100,hp:name==='Venzo'?120:100,downed:false,facing:1,onGround:true,crouch:false,blocking:false,blockStart:0,dodge:0,invuln:0,attackTimer:0,attackCooldown:0,attackHit:false,attackKind:'',hitFlash:0,mode:'staff',resolve:0,resolveActive:0,revive:0,stuck:0,aiAttack:0};}
function makeEnemy(src){return {...src,vx:0,vy:0,w:32,h:75,maxHp:src.type==='veteran'?150:src.type==='guard'?110:75,hp:src.type==='veteran'?150:src.type==='guard'?110:75,dead:false,onGround:true,state:'patrol',awareness:0,stateTime:0,lastSeen:null,investigate:null,attackTimer:0,attackCooldown:0,attackHit:false,hitFlash:0,stagger:0,shieldOpen:0,guardPressure:0,alarmAttempted:false,memory:createVeteranMemory(),action:'measuredStrike',adaptLabel:'',adaptLabelTimer:0,decision:1};}

export class Game {
  constructor(canvas){
    this.canvas=canvas;this.input=new Input();this.audio=new AudioSystem();this.render=new Renderer(canvas);
    this.time=0;this.scene='title';this.seed=this.generateSeed();this.rng=new SeededRNG(this.seed);this.hasSave=!!loadFromStorage(localStorage,SAVE_KEY);
    this.menuIndex=0;this.pauseIndex=0;this.showHelp=false;this.paused=false;this.defeat=false;this.banner=0;this.toast=0;this.toastText='';this.camera=0;this.fx=[];this.sounds=[];this.hook=null;this.focus=0;this.prompt='';this.objectiveDetail='';this.checkpoint=0;this.completed=[];this.activeIndex=0;this.persistentFlags={passAlarmCut:false,crestAlarmCut:false};this.debugVision=true;this.villageStep=0;this.villageX=100;this.revealPhase=0;
    this.villageLines=[
      {speaker:'VILLAGE CHILDREN',text:'“Venzo blocks the storm! Renzo hooks the moon!”'},
      {speaker:'TAKEKAGE ELDER',text:'“Venzo, you carried the old forms without becoming their prisoner.”'},
      {speaker:'THE BROTHERS’ AUNT',text:'“Both of you came home. That is victory enough for tonight.”'},
      {speaker:'MASTER SEIJUN',text:'“Tradition is a root, not a cage. You bent. You did not break.”'},
      {speaker:'TAKEKAGE MESSENGER',text:'“Brothers—there is blood on the eastern road.”'}
    ];
  }
  generateSeed(){return Math.floor(10000+Math.random()*89999);}
  get active(){return this.brothers?.[this.activeIndex];}
  get companion(){return this.brothers?.[1-this.activeIndex];}
  start(id='pass',checkpoint=0){
    this.scenarioId=id;this.rng=new SeededRNG(this.seed).fork(id);this.world=instantiateScenario(id,()=>this.rng.next());
    const sx=this.world.checkpoints[checkpoint]??this.world.startX;this.brothers=[makeBrother('Venzo',sx),makeBrother('Renzo',sx-55)];this.activeIndex=0;this.enemies=this.world.enemies.map(makeEnemy);this.scene='game';this.paused=false;this.defeat=false;this.banner=3.5;this.camera=clamp(sx-320,0,this.world.width-W);this.checkpoint=checkpoint;this.fx=[];this.sounds=[];this.hook=null;this.focus=0;this.objectiveDetail=id==='crest'?'INFILTRATE THE WATCHPOST':'REACH THE FLOODGATE';
    // A checkpoint reload recreates the authored baseline but keeps completed objectives.
    if(id==='crest'&&checkpoint>=2){const d=this.world.objects.find(o=>o.type==='dispatch');if(d)d.collected=true;this.objectiveDetail='ESCAPE WITH THE DISPATCH';}
    if(this.persistentFlags[id==='pass'?'passAlarmCut':'crestAlarmCut'])this.world.objects.filter(o=>o.type==='alarm').forEach(o=>o.sabotaged=true);
    if(checkpoint>0){this.brothers.forEach(b=>b.hp=Math.round(b.maxHp*.8));}
  }
  newGame(){this.seed=this.generateSeed();this.completed=[];this.persistentFlags={passAlarmCut:false,crestAlarmCut:false};this.activeIndex=0;this.start('pass',0);this.save('Journey begun');}
  continueGame(){const s=loadFromStorage(localStorage,SAVE_KEY);if(!s){this.newGame();return;}this.seed=s.worldSeed;this.completed=s.completedScenarios;this.persistentFlags={...this.persistentFlags,...s.flags};this.audio.muted=s.settings.muted;const id=s.scenario===2?'crest':s.scenario==='village'?'village':s.scenario==='complete'?'complete':'pass';if(id==='village'){this.startVillage();return;}if(id==='complete'){this.scene='revelation';this.revealPhase=2;return;}const cp=Number((s.checkpoint.match(/(\d+)$/)||[])[1]||0);this.start(id,cp);this.say('SAVE LOADED · '+this.world.subtitle,2.8);}
  save(label='Game saved'){
    const scenario=this.scene==='village'?'village':this.scene==='revelation'?(this.revealPhase>=2?'complete':'village'):(this.scenarioId==='crest'?2:1);
    const ok=saveToStorage(localStorage,SAVE_KEY,{scenario,checkpoint:`checkpoint-${this.checkpoint}`,worldSeed:this.seed,completedScenarios:this.completed,flags:this.persistentFlags,settings:{muted:this.audio.muted}});
    this.hasSave=ok;this.say(ok?`GAME SAVED · ${label}`:'SAVE FAILED',2.2);return ok;
  }
  say(text,time=2){this.toastText=text;this.toast=time;}
  emitSound(x,y,intensity,label='NOISE'){this.sounds.push({x,y,intensity,life:.8,label});this.fx.push({x,y,life:.65,color:intensity>.7?'#c74b3f':'#d6af62'});}
  switchBrother(){if(!this.companion||this.companion.downed)return;const old=this.active;this.activeIndex=1-this.activeIndex;this.active.blocking=false;this.active.attackTimer=0;this.audio.ui();this.say(`${this.active.name.toUpperCase()} — PLAYER CONTROL`,1.1);if(old.blocking)this.recordHabit(VETERAN_HABITS.SWITCH_AFTER_BLOCK);}
  recordHabit(habit){this.enemies.filter(e=>e.type==='veteran'&&!e.dead&&dist(e,this.active)<650).forEach(e=>{e.memory=recordVeteranHabit(e.memory,habit);const h=e.memory.habits[habit];if(h===3||h===6){const names={[VETERAN_HABITS.HEAVY_ATTACK]:'HEAVY RHYTHM → BAIT & PUNISH',[VETERAN_HABITS.BACKWARD_DODGE]:'RETREATING STEP → REACHING ADVANCE',[VETERAN_HABITS.PARRY_ATTEMPT]:'PARRY HABIT → FEINT',[VETERAN_HABITS.HOOK_USE]:'CHAIN RELIANCE → CLOSE DISTANCE',[VETERAN_HABITS.SWITCH_AFTER_BLOCK]:'TRANSFER RHYTHM → SWITCH BAIT'};const responses={[VETERAN_HABITS.HEAVY_ATTACK]:'waitAndPunish',[VETERAN_HABITS.BACKWARD_DODGE]:'forwardReach',[VETERAN_HABITS.PARRY_ATTEMPT]:'feint',[VETERAN_HABITS.HOOK_USE]:'closeDistance',[VETERAN_HABITS.SWITCH_AFTER_BLOCK]:'switchBait'};e.action=responses[habit];e.decision=2.5;e.adaptLabel=`VETERAN READS: ${names[habit]}`;e.adaptLabelTimer=3;this.say(e.adaptLabel,2.4);}});}
  update(dt){
    this.time+=dt;if(this.toast>0)this.toast-=dt;
    if(this.scene==='title')this.updateTitle();else if(this.scene==='game')this.updateGame(dt);else if(this.scene==='interlude')this.updateInterlude();else if(this.scene==='village')this.updateVillage();else if(this.scene==='revelation')this.updateRevelation();
    this.input.endFrame();
  }
  updateTitle(){
    if(this.showHelp){if(this.input.tap('escape')||this.input.tap('enter'))this.showHelp=false;return;}
    const n=this.hasSave?3:2;if(this.input.tap('w')||this.input.tap('arrowup')){this.menuIndex=(this.menuIndex-1+n)%n;this.audio.ui();}if(this.input.tap('s')||this.input.tap('arrowdown')){this.menuIndex=(this.menuIndex+1)%n;this.audio.ui();}
    if(this.input.tap('m'))this.audio.muted=!this.audio.muted;
    if(this.input.tap('enter')){const label=(this.hasSave?['continue','new','help']:['new','help'])[this.menuIndex];if(label==='continue')this.continueGame();else if(label==='new')this.newGame();else this.showHelp=true;}
  }
  updateInterlude(){if(this.input.tap('enter'))this.start('crest',0);if(this.input.tap('escape')){this.save('THE BROKEN CREST · START');this.scene='title';this.hasSave=true;this.menuIndex=0;}}
  updateVillage(){const dir=(this.input.is('d')||this.input.is('arrowright')?1:0)-(this.input.is('a')||this.input.is('arrowleft')?1:0);this.villageX=clamp(this.villageX+dir*3.2,80,1120);const next=Math.min(4,Math.floor(Math.max(0,this.villageX-80)/205));if(next!==this.villageStep){this.villageStep=next;this.audio.ui();}if(this.villageX>=1080&&(this.input.tap('enter')||this.input.tap('e')||this.input.tap('j')||this.input.tap('space'))){this.scene='revelation';this.revealPhase=0;this.audio.bell(false);this.save('Village revelation');}}
  updateRevelation(){if(this.input.tap('enter')){if(this.revealPhase<2){this.revealPhase++;if(this.revealPhase===2){this.audio.win();this.save('CHAPTER COMPLETE');}}else{this.scene='title';this.menuIndex=0;}}}
  updatePause(){
    if(this.input.tap('escape')){this.paused=false;return;}if(this.input.tap('w')||this.input.tap('arrowup'))this.pauseIndex=(this.pauseIndex+3)%4;if(this.input.tap('s')||this.input.tap('arrowdown'))this.pauseIndex=(this.pauseIndex+1)%4;
    if(this.input.tap('enter')){if(this.pauseIndex===0)this.paused=false;else if(this.pauseIndex===1){this.save(`${this.world.subtitle} · CHECKPOINT ${this.checkpoint+1}`);this.paused=false;}else if(this.pauseIndex===2)this.showHelp=!this.showHelp;else{this.save(`${this.world.subtitle} · CHECKPOINT ${this.checkpoint+1}`);this.paused=false;this.scene='title';this.hasSave=true;this.menuIndex=0;}}
  }
  updateGame(dt){
    if(this.defeat){if(this.input.tap('enter'))this.start(this.scenarioId,this.checkpoint);else if(this.input.tap('escape')){this.scene='title';this.defeat=false;}return;}
    if(this.input.tap('escape')){this.paused=!this.paused;this.showHelp=false;return;}if(this.paused){this.updatePause();return;}
    this.banner=Math.max(0,this.banner-dt);this.focus=Math.max(0,this.focus-dt);this.prompt='';
    if(this.input.tap('q'))this.switchBrother();
    this.updatePlayer(dt);this.updateCompanion(dt);this.brothers.forEach(b=>this.physics(b,dt));this.updateAttacks(dt);this.updateObjects(dt);this.updateEnemies(dt);this.updateHook(dt);this.updateDowned(dt);this.updateCheckpoints();this.updateObjective();
    this.sounds.forEach(s=>s.life-=dt);this.sounds=this.sounds.filter(s=>s.life>0);this.fx.forEach(f=>f.life-=dt);this.fx=this.fx.filter(f=>f.life>0);
    [...this.brothers,...this.enemies].forEach(e=>{e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);e.invuln=Math.max(0,(e.invuln||0)-dt);e.stagger=Math.max(0,(e.stagger||0)-dt);e.shieldOpen=Math.max(0,(e.shieldOpen||0)-dt);e.guardPressure=Math.max(0,(e.guardPressure||0)-dt*.22);e.adaptLabelTimer=Math.max(0,(e.adaptLabelTimer||0)-dt);});
    if(!this.prompt){const tip=this.world.tips?.find(t=>Math.abs(t.x-this.active.x)<180);if(tip)this.prompt=tip.text;}
    this.camera=approach(this.camera,clamp(this.active.x-W*.42,0,this.world.width-W),dt*500);
  }
  updatePlayer(dt){const b=this.active;if(b.downed)return;const i=this.input;let dir=(i.is('d')||i.is('arrowright')?1:0)-(i.is('a')||i.is('arrowleft')?1:0);const priorFacing=b.facing;const dodgeTapped=i.tap('shift');const backward=Boolean(dir&&dir!==priorFacing);b.crouch=i.is('s')||i.is('arrowdown');b.blocking=i.is('l')&&b.attackTimer<=0;b.blockStart=b.blocking?(b.blockStart||this.time):0;
    const speed=b.crouch?105:220;if(b.dodge>0){b.dodge-=dt;b.vx=(b.dodgeDir||b.facing)*470;}else if(!b.blocking&&b.attackTimer<=.2){b.vx=approach(b.vx,dir*speed,dt*1200);if(dir&&!dodgeTapped)b.facing=dir;}else b.vx*=.8;
    if((i.tap('space')||i.tap('w')||i.tap('arrowup'))&&b.onGround&&!b.crouch){b.vy=-660;b.onGround=false;this.emitSound(b.x,b.y,.22,'LANDING');}
    if(dodgeTapped&&b.dodge<=0){b.dodge=.22;b.dodgeDir=dir||b.facing;b.invuln=.28;if(backward)this.recordHabit(VETERAN_HABITS.BACKWARD_DODGE);this.emitSound(b.x,b.y,.35,'DODGE');}
    if(i.tap('r')){if(b.name==='Renzo'){b.mode=b.mode==='staff'?'chain':'staff';this.audio.hook();this.say(`RENZO — ${b.mode.toUpperCase()} MODE`,1.2);}else if(b.resolve>=60){b.resolveActive=6;b.resolve-=60;this.say('VENZO — RESOLVE',1.5);this.audio.parry();}else this.say('RESOLVE REQUIRES 60%',1);}
    if(i.tap('j')&&b.attackCooldown<=0){if(b.name==='Renzo'&&b.mode==='chain')this.tryHook();else this.startAttack(b,'light');}
    if(i.tap('k')&&b.attackCooldown<=0){this.startAttack(b,'heavy');this.recordHabit(VETERAN_HABITS.HEAVY_ATTACK);}
    if(i.tap('l')&&b.name==='Venzo')this.recordHabit(VETERAN_HABITS.PARRY_ATTEMPT);
    this.handleInteract(b,dt);
    if(Math.abs(b.vx)>170&&b.onGround&&!b.crouch&&Math.floor(this.time*4)!==Math.floor((this.time-dt)*4))this.emitSound(b.x,b.y,.2,'FOOTSTEP');
    b.resolveActive=Math.max(0,b.resolveActive-dt);
  }
  startAttack(b,kind){b.attackKind=kind;b.attackTimer=kind==='heavy'?.48:.28;b.attackCooldown=kind==='heavy'?.68:.36;b.attackHit=false;this.emitSound(b.x,b.y,kind==='heavy'?.55:.3,'COMBAT');}
  handleInteract(b,dt){
    const down=this.companion?.downed&&dist(b,this.companion)<95?this.companion:null;
    const nearObj=this.world.objects.filter(o=>!o.destroyed&&!o.collected&&dist(b,o)<92).sort((a,z)=>dist(b,a)-dist(b,z))[0];
    if(down){this.prompt=`HOLD E · REVIVE ${down.name.toUpperCase()}`;if(this.input.is('e')){down.revive+=dt;if(down.revive>=1.1){down.downed=false;down.hp=Math.round(down.maxHp*.4);down.revive=0;b.resolve=clamp(b.resolve+22,0,100);this.say(`${down.name.toUpperCase()} REVIVED`,2);this.audio.parry();}}else down.revive=0;return;}
    if(nearObj&&['alarm','rope','dispatch','gate'].includes(nearObj.type)){
      if(nearObj.type==='alarm'&&b.name==='Renzo'&&!nearObj.sabotaged){this.prompt='HOLD E · SABOTAGE ALARM';if(this.input.is('e')){nearObj.progress=(nearObj.progress||0)+dt;if(nearObj.progress>=.8){nearObj.sabotaged=true;this.persistentFlags[this.scenarioId==='pass'?'passAlarmCut':'crestAlarmCut']=true;this.say('ALARM LINE SABOTAGED',2.5);this.audio.hook();}}return;}
      if(nearObj.type==='rope'&&b.name==='Renzo'&&!nearObj.cut){this.prompt='HOLD E · RELEASE TENSION';if(this.input.is('e')){nearObj.progress=(nearObj.progress||0)+dt;if(nearObj.progress>=.65)this.releaseRope(nearObj);}return;}
      if(nearObj.type==='dispatch'&&!nearObj.collected){this.prompt='HOLD E · RECOVER DISPATCH';if(this.input.is('e')){nearObj.progress=(nearObj.progress||0)+dt;if(nearObj.progress>=.8){nearObj.collected=true;this.checkpoint=Math.max(this.checkpoint,2);this.objectiveDetail='ESCAPE WITH THE DISPATCH';this.say('ARCHIVE LOCKDOWN · VETERAN INTERCEPTS',2.8);for(const foe of this.enemies.filter(e=>e.type==='veteran'&&!e.dead)){foe.state='alert';foe.stateTime=0;foe.awareness=1;}this.save('Archive secured');}}return;}
      if(nearObj.type==='gate'&&!nearObj.open){this.prompt='THE GATE REQUIRES THE WATERWHEEL';return;}
    }
    if(b.name==='Renzo'&&this.input.is('e')){this.focus=.15;this.prompt='ENGINEER FOCUS · SYSTEM RELATIONSHIPS VISIBLE';}
  }
  updateCompanion(dt){const b=this.companion,a=this.active;if(!b||b.downed)return;b.crouch=a.crouch;const sep=Math.abs(a.x-b.x);if(sep>850&&Math.abs(b.x-this.camera-W/2)>W/2){b.x=a.x-a.facing*70;b.y=a.y;b.vx=0;b.vy=0;this.say(`${b.name.toUpperCase()} REJOINED`,1);return;}const danger=this.enemies.filter(e=>!e.dead&&['alert','alarm'].includes(e.state)&&dist(e,b)<155).sort((x,y)=>dist(x,b)-dist(y,b))[0];if(danger){b.facing=Math.sign(danger.x-b.x)||b.facing;if(danger.attackTimer>0)b.blocking=true;else if(b.attackCooldown<=0&&dist(danger,b)<85&&this.rng.chance(dt*.8))this.startAttack(b,b.name==='Venzo'?'light':'heavy');else b.vx=approach(b.vx,-b.facing*35,dt*500);}else{b.blocking=false;const desired=a.x-a.facing*70;const dir=Math.sign(desired-b.x);b.vx=approach(b.vx,Math.abs(desired-b.x)>45?dir*(b.crouch?95:180):0,dt*800);b.facing=dir||b.facing;if(a.y<b.y-70&&b.onGround){b.vy=-480;b.onGround=false;}}
  }
  physics(e,dt){if(e.dead||e.downed)return;e.vy+=1250*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.x=clamp(e.x,20,this.world.width-20);let landed=null;for(const p of this.world.platforms){if(e.x+e.w/2>p.x&&e.x-e.w/2<p.x+p.w&&e.y<=p.y+20&&e.y+e.vy*dt>=p.y&&e.vy>=0){if(!landed||p.y<landed.y)landed=p;}}if(landed){e.y=landed.y;e.vy=0;e.onGround=true;}else if(e.y>=FLOOR){e.y=FLOOR;e.vy=0;e.onGround=true;}else e.onGround=false;e.vx*=Math.pow(.06,dt);}
  updateAttacks(dt){
    for(const b of this.brothers){if(b.downed)continue;if(b.attackTimer>0){b.attackTimer-=dt;const reach=b.attackKind==='heavy'?80:b.name==='Renzo'?72:62;if(!b.attackHit&&b.attackTimer<.28){for(const e of this.enemies){if(e.dead||Math.abs(e.y-b.y)>95)continue;const dx=(e.x-b.x)*b.facing;if(dx>0&&dx<reach){b.attackHit=true;let dmg=b.attackKind==='heavy'?28:16;let blocked=e.type==='guard'&&e.shieldOpen<=0&&e.facing===-b.facing;if(blocked){e.guardPressure+=(b.attackKind==='heavy'?.72:.12);e.stagger=b.attackKind==='heavy'?.3:.08;if(e.guardPressure>=1.25){e.guardPressure=0;e.shieldOpen=2.2;e.stagger=1.1;this.say('GUARD BROKEN · SWITCH OR STRIKE',1.7);this.audio.parry();}else{this.say('SHIELD DEFLECTS · FLANK, PRESSURE, OR HOOK',1);this.audio.hit();}}else{if(b.resolveActive>0)dmg*=1.35;e.hp-=dmg;e.stagger=b.attackKind==='heavy'?.65:.3;e.hitFlash=.1;this.audio.hit();this.render.shake=b.attackKind==='heavy'?7:3;if(e.hp<=0){e.dead=true;b.resolve=clamp(b.resolve+(e.type==='veteran'?30:15),0,100);this.say(`${e.type.toUpperCase()} DEFEATED`,1.3);}}break;}}}}
    }
  }
  damageBrother(b,amount,attacker){if(b.invuln>0||b.downed)return;if(b.blocking&&attacker&&attacker.x!==undefined){const frontal=Math.sign(attacker.x-b.x)===b.facing; if(frontal){const timing=this.time-b.blockStart;if(timing<.22){attacker.stagger=1.25;attacker.shieldOpen=1.25;attacker.attackTimer=0;attacker.attackHit=true;b.resolve=clamp(b.resolve+22,0,100);this.say('PRECISION PARRY · OPENING',1.5);this.audio.parry();this.render.shake=8;return;}amount*=b.name==='Venzo'?.2:.55;this.audio.hit();}}
    if(b.resolveActive>0)amount*=.65;b.hp-=amount;b.hitFlash=.14;b.invuln=.5;this.audio.hit();this.render.shake=6;if(b.hp<=0){b.hp=0;b.downed=true;b.blocking=false;this.say(`${b.name.toUpperCase()} DOWNED`,2);if(b===this.active&&!this.companion.downed){this.activeIndex=1-this.activeIndex;this.say(`${b.name.toUpperCase()} DOWN · CONTROL TRANSFERRED`,2.5);}if(this.brothers.every(x=>x.downed)){this.defeat=true;this.audio.defeat();}}
  }
  tryHook(){const b=this.active;if(b.name!=='Renzo')return;const candidates=[...this.enemies.filter(e=>!e.dead),...this.world.objects.filter(o=>!o.destroyed&&!o.collected&&o.type!=='dispatch')].filter(t=>{const dx=(t.x-b.x)*b.facing;return dx>5&&dx<270&&Math.abs(t.y-b.y)<190;}).sort((a,z)=>dist(a,b)-dist(z,b));const target=candidates[0];if(!target){this.say('NO CHAIN TARGET',.8);return;}const fixed=target.mass===Infinity||target.props?.includes('ANCHORED');const mode=classifyHookMass(b.mass,target.mass||1,fixed);const braced=target.type==='veteran'&&target.action==='guard';this.hook={from:b,target,time:braced?.18:.62,mode};b.attackCooldown=.55;this.recordHabit(VETERAN_HABITS.HOOK_USE);this.audio.hook();const labels={'pull-target':'LIGHT · TARGET PULLED','pull-actor':'HEAVY · RENZO PULLED','anchor':'ANCHORED · GRAPPLE','meet':'BALANCED · BOTH MOVE'};this.say(braced?'VETERAN BRACES AGAINST CHAIN':labels[mode],1.4);if(target.type==='guard'){target.shieldOpen=2;target.stagger=1;this.say('SHIELD HOOKED · OPENING CREATED',1.8);}if(target.type==='crate')this.emitSound(target.x,target.y,.48,'CRATE SCRAPE');if(target.type==='bell'){this.emitSound(target.x,target.y,1,'BELL');this.audio.bell(false);}if(target.type==='wheel'){target.activated=true;this.openLinkedGate(target);}}
  updateHook(dt){if(!this.hook)return;const h=this.hook;h.time-=dt;if(h.time<=0||h.target.dead||h.target.destroyed){this.hook=null;return;}const a=h.from,t=h.target;const result=stepHookSpring({actor:{...a,mass:a.mass},target:{x:t.x,y:t.y,vx:t.vx||0,vy:t.vy||0,mass:Number.isFinite(t.mass)?t.mass:1000,fixed:t.mass===Infinity||t.props?.includes('ANCHORED')},restLength:65,stiffness:12,damping:5,dt,maxImpulse:10});a.vx+=result.actorDeltaV.x;a.vy+=result.actorDeltaV.y;if(!t.props?.includes('ANCHORED')&&t.mass!==Infinity){t.vx=(t.vx||0)+result.targetDeltaV.x;t.vy=(t.vy||0)+result.targetDeltaV.y;t.x+=(t.vx||0)*dt;t.y+=(t.vy||0)*dt;t.vx*=.92;t.vy*=.92;}}
  releaseRope(rope){rope.cut=true;rope.destroyed=true;const cargo=this.world.objects.find(o=>o.id===rope.links);if(cargo){cargo.suspended=false;cargo.vy=40;cargo.falling=true;}this.emitSound(rope.x,rope.y,.8,'ROPE SNAP');this.say('TENSION RELEASED · CARGO FALLING',1.8);this.audio.hook();}
  openLinkedGate(obj){const gate=this.world.objects.find(o=>o.id===obj.links);if(gate){gate.open=true;obj.rotation=(obj.rotation||0)+.6;this.say('MECHANISM ENGAGED · GATE OPEN',2);this.audio.bell(false);}}
  updateObjects(dt){for(const o of this.world.objects){if(o.falling){o.vy+=900*dt;o.y+=o.vy*dt;if(o.y>=FLOOR-25){o.y=FLOOR-25;o.vy=0;o.falling=false;this.emitSound(o.x,o.y,1,'CARGO IMPACT');this.render.shake=12;for(const e of this.enemies)if(!e.dead&&dist(e,o)<100){e.hp-=65;e.stagger=2;e.hitFlash=.2;if(e.hp<=0)e.dead=true;}}}if(o.type==='wheel'&&o.activated)o.rotation=(o.rotation||0)+dt*4;}}
  canSee(e,b){if(b.downed)return false;const dx=b.x-e.x,range=e.type==='veteran'?360:300;if(Math.abs(dx)>range||Math.abs(b.y-e.y)>130)return false;if(Math.sign(dx)!==e.facing&&Math.abs(dx)>70)return false;const cover=this.world.objects.some(o=>!o.destroyed&&!o.collected&&['crate','cargo'].includes(o.type)&&o.x>Math.min(e.x,b.x)&&o.x<Math.max(e.x,b.x)&&Math.abs(o.y-b.y)<75);if(cover)return false;let factor=b.crouch?.58:1;const lantern=this.world.objects.some(o=>o.type==='lantern'&&!o.extinguished&&Math.abs(o.x-b.x)<160);if(lantern)factor*=1.35;return Math.abs(dx)<range*factor;}
  nearestAlarm(e){return this.world.objects.filter(o=>o.type==='alarm'&&!o.rung).sort((a,b)=>dist(a,e)-dist(b,e))[0];}
  updateEnemies(dt){for(const e of this.enemies){if(e.dead)continue;e.stateTime+=dt;if(e.stagger>0){e.vx*=.7;continue;}const visible=this.brothers.filter(b=>this.canSee(e,b)).sort((a,b)=>dist(a,e)-dist(b,e))[0];const heard=this.sounds.filter(s=>dist(s,e)<s.intensity*430).sort((a,b)=>b.intensity-a.intensity)[0];
      if(visible){e.awareness=clamp(e.awareness+dt*(visible.crouch?.8:1.7),0,1);e.lastSeen={x:visible.x,y:visible.y};if(e.awareness>=1&&e.state!=='alert'&&e.state!=='alarm'){e.state='alert';e.stateTime=0;this.emitSound(e.x,e.y,.75,'SHOUT');this.say(`${e.type.toUpperCase()} ALERT · LOCAL SHOUT`,1.4);for(const ally of this.enemies)if(!ally.dead&&ally!==e&&dist(ally,e)<310){ally.state='investigate';ally.stateTime=0;ally.investigate={x:e.x,y:e.y};ally.awareness=Math.max(ally.awareness,.55);}}}else if(e.state==='alert'&&e.stateTime>1){e.state='search';e.stateTime=0;}else if(heard&&['patrol','return','suspicious'].includes(e.state)){e.state=heard.intensity<.3?'suspicious':'investigate';e.stateTime=0;e.investigate={x:heard.x,y:heard.y};e.awareness=Math.max(e.awareness,heard.intensity*.65);}
      this.enemyBehavior(e,visible,dt);
    }}
  enemyBehavior(e,visible,dt){let target=visible||e.lastSeen;if(e.type==='scout'&&e.state==='alert'&&!e.alarmAttempted&&e.stateTime>.45){const alarm=this.nearestAlarm(e);if(alarm&&dist(alarm,e)<900){e.state='alarm';e.alarmTarget=alarm;}}
    if(e.state==='alarm'){const a=e.alarmTarget,dx=a.x-e.x;e.facing=Math.sign(dx)||e.facing;e.vx=e.facing*175;if(Math.abs(dx)<45){e.vx=0;e.alarmAttempted=true;a.rung=true;if(a.sabotaged){this.say('ALARM FAILED · LINE CUT',3);this.audio.bell(true);this.fx.push({x:a.x,y:a.y,life:1,color:'#c74b3f'});}else{this.say('ALARM RINGS · NEARBY ENEMIES ALERTED',3);this.audio.bell(false);this.emitSound(a.x,a.y,1,'ALARM');for(const ally of this.enemies)if(!ally.dead&&dist(ally,a)<900){ally.state='alert';ally.stateTime=0;ally.awareness=1;}}e.state='alert';e.stateTime=0;}this.physics(e,dt);return;}
    if(e.state==='patrol'||e.state==='return'){const [lo,hi]=e.patrol||[e.x-100,e.x+100];if(e.x<lo)e.facing=1;if(e.x>hi)e.facing=-1;e.vx=e.facing*(e.type==='veteran'?65:50);if(e.state==='return'&&e.stateTime>2){e.state='patrol';e.stateTime=0;e.awareness=0;}}
    else if(e.state==='suspicious'){e.vx=0;if(e.stateTime>.55){e.state='investigate';e.stateTime=0;}}
    else if(e.state==='investigate'){const p=e.investigate||e.lastSeen;if(p){e.facing=Math.sign(p.x-e.x)||e.facing;e.vx=e.facing*90;if(Math.abs(p.x-e.x)<35||e.stateTime>3){e.state='search';e.stateTime=0;}}}
    else if(e.state==='search'){const p=e.lastSeen;if(p&&Math.abs(p.x-e.x)>30){e.facing=Math.sign(p.x-e.x);e.vx=e.facing*75;}else e.vx=Math.sin(this.time*2)>0?45:-45;if(e.stateTime>4.5){e.state='return';e.stateTime=0;e.awareness=.2;}}
    else if(e.state==='alert'){if(!target)return;const dx=target.x-e.x;e.facing=Math.sign(dx)||e.facing;const desired=e.type==='guard'?80:e.type==='veteran'?95:65;if(Math.abs(dx)>desired)e.vx=e.facing*(e.type==='veteran'?150:110);else e.vx=0;if(e.type==='guard'){const ally=this.enemies.find(a=>a!==e&&!a.dead&&a.type==='scout'&&dist(a,e)<190);if(ally){const midpoint=(ally.x+target.x)/2;e.vx=Math.sign(midpoint-e.x)*95;}}
      if(e.type==='veteran'&&e.action==='waitAndPunish'&&visible?.attackKind==='heavy'&&visible.attackTimer>0){e.vx=-e.facing*175;e.punishReady=.9;}
      else if(e.type==='veteran'&&e.punishReady>0&&visible){e.vx=e.facing*245;}
      if(e.type==='veteran'&&['closeDistance','switchBait'].includes(e.action)&&Math.abs(dx)>55)e.vx=e.facing*(e.action==='switchBait'?235:215);
      if(e.punishReady>0)e.punishReady=Math.max(0,e.punishReady-dt);
      if(visible&&e.attackCooldown<=0&&Math.abs(dx)<(e.type==='veteran'&&(e.action==='forwardReach'||e.action==='switchBait'||e.punishReady>0)?125:78)&&Math.abs(visible.y-e.y)<100)this.enemyAttack(e,visible);
    }
    this.physics(e,dt);if(e.attackTimer>0){e.attackTimer-=dt;if(!e.attackHit&&e.attackTimer<.22&&visible&&!visible.downed&&dist(e,visible)<(e.action==='forwardReach'?125:88)){e.attackHit=true;this.damageBrother(visible,e.type==='veteran'?24:e.type==='guard'?18:14,e);}}
    if(e.type==='veteran'){e.decision-=dt;if(e.decision<=0){const weights=veteranActionWeights(e.memory);e.action=chooseWeightedAction(weights,this.rng);e.decision=1.2;if(e.action==='feint')e.attackCooldown=Math.max(e.attackCooldown,.3);}}}
  enemyAttack(e){e.attackTimer=e.type==='veteran'?(e.action==='feint'?.78:.52):.4;e.attackCooldown=e.type==='veteran'?.8:1.1;e.attackHit=false;if(e.type==='veteran'&&['forwardReach','switchBait'].includes(e.action))e.vx=e.facing*260;this.emitSound(e.x,e.y,.45,'ENEMY ATTACK');}
  updateDowned(dt){for(const b of this.brothers)if(b.downed)b.vx=0;}
  updateCheckpoints(){for(let i=this.world.checkpoints.length-1;i>=0;i--){const evidence=this.world.objects.find(o=>o.type==='dispatch');if(this.scenarioId==='crest'&&i>=2&&evidence&&!evidence.collected)continue;if(this.active.x>=this.world.checkpoints[i]&&i>this.checkpoint){this.checkpoint=i;this.save(`${this.world.subtitle} · CHECKPOINT ${i+1}`);break;}}}
  updateObjective(){const gate=this.world.objects.find(o=>o.type==='gate');const dispatch=this.world.objects.find(o=>o.type==='dispatch');if(this.scenarioId==='pass'){this.objectiveDetail=gate?.open?'GATE OPEN · REACH THE EASTERN PATH':'USE RENZO TO TURN THE WATERWHEEL';if(this.active.x>=this.world.exitX&&gate?.open)this.completeScenario();}else{const routeVeteran=this.enemies.filter(e=>e.type==='veteran').at(-1);const veteranDown=routeVeteran?.dead;if(!dispatch?.collected)this.objectiveDetail='RECOVER THE DISPATCH';else if(!veteranDown)this.objectiveDetail='THE VETERAN BLOCKS THE EASTERN ROUTE';else if(!gate?.open)this.objectiveDetail='DISPATCH SECURED · OPEN EASTERN GATE';else this.objectiveDetail='ESCAPE TOWARD TAKEKAGE TERRITORY';if(this.active.x>=this.world.exitX&&dispatch?.collected&&gate?.open&&veteranDown)this.completeScenario();}}
  completeScenario(){if(this.scenarioId==='pass'){if(!this.completed.includes(1))this.completed.push(1);this.scene='interlude';this.checkpoint=0;this.scenarioId='crest';this.save('THE BROKEN CREST · START');}else{if(!this.completed.includes(2))this.completed.push(2);this.startVillage();}}
  startVillage(){this.scene='village';this.villageStep=0;this.villageX=100;if(!this.brothers)this.brothers=[makeBrother('Venzo',0),makeBrother('Renzo',0)];this.brothers.forEach(b=>{b.downed=false;b.hp=b.maxHp;});this.save('Takekage Village');}
}
