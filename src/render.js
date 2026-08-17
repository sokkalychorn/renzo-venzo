import { W,H,FLOOR } from './scenarios.js';

const C={ink:'#071017',paper:'#e8ddb8',red:'#c74b3f',gold:'#d6af62',teal:'#5aa7a0',mist:'#9fb9bd',venzo:'#56778a',renzo:'#b56a45'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class Renderer {
  constructor(canvas){ this.c=canvas; this.x=canvas.getContext('2d'); this.shake=0; }
  clear(){ const x=this.x; x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,W,H); }
  text(str,x,y,size=20,align='left',color=C.paper,font='Georgia'){
    const c=this.x;c.save();c.font=`${size}px ${font}`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(str,x,y);c.restore();
  }
  panel(x,y,w,h,a=.8){const c=this.x;c.fillStyle=`rgba(5,10,14,${a})`;c.fillRect(x,y,w,h);c.strokeStyle='rgba(214,175,98,.45)';c.lineWidth=2;c.strokeRect(x+.5,y+.5,w-1,h-1);}
  kamon(x,y,s=1,broken=false){
    const c=this.x;c.save();c.translate(x,y);c.rotate(-.15);c.fillStyle=C.paper;c.strokeStyle=C.gold;c.lineWidth=3*s;
    const leaf=(flip=1)=>{c.save();c.rotate(flip*.72);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(22*s,-40*s,60*s,-34*s,72*s,-6*s);c.bezierCurveTo(40*s,7*s,19*s,9*s,0,0);c.fill();c.stroke();c.restore();};
    leaf(1);if(!broken){c.rotate(Math.PI);leaf(1);}else{c.rotate(Math.PI+.1);c.translate(12*s,9*s);leaf(1);}
    c.restore();
  }
  title(g){
    const c=this.x, t=g.time;c.fillStyle='#071119';c.fillRect(0,0,W,H);
    const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#132b35');grad.addColorStop(.65,'#0a1820');grad.addColorStop(1,'#05090d');c.fillStyle=grad;c.fillRect(0,0,W,H);
    for(let i=0;i<7;i++){const y=300+i*42;c.fillStyle=`rgba(54,82,86,${.1+i*.025})`;c.beginPath();c.moveTo(0,y);for(let x=0;x<=W;x+=80)c.lineTo(x,y-Math.sin(x*.008+i)*35-i*7);c.lineTo(W,H);c.lineTo(0,H);c.fill();}
    for(let i=0;i<75;i++){let x=(i*83+t*110)%1400-60,y=(i*47)%600;c.strokeStyle='rgba(155,194,201,.18)';c.beginPath();c.moveTo(x,y);c.lineTo(x-16,y+38);c.stroke();}
    this.kamon(640,148,1.15);
    this.text('RENZO & VENZO',640,260,58,'center',C.paper);
    this.text('BEND BEFORE BREAKING',640,314,25,'center',C.gold);
    this.text('TWO BROTHERS  ·  ONE OBJECTIVE  ·  TWO WAYS FORWARD',640,356,14,'center','#93aeb0');
    const items=g.hasSave?['CONTINUE','NEW GAME','HOW TO PLAY']:['NEW GAME','HOW TO PLAY'];
    items.forEach((it,i)=>{const y=440+i*48;if(i===g.menuIndex){c.fillStyle='rgba(199,75,63,.2)';c.fillRect(490,y-20,300,40);this.text('◆',515,y,15,'center',C.red);}this.text(it,640,y,21,'center',i===g.menuIndex?C.paper:'#768f93');});
    this.text('W/S SELECT  ·  ENTER CONFIRM  ·  M MUTE',640,650,13,'center','#637a7d');
    this.text(`WORLD SEED: ${String(g.seed).padStart(5,'0')}`,1215,690,13,'right','#70898c','monospace');
    if(g.showHelp)this.help(g);
  }
  help(g){
    this.panel(210,100,860,530,.96);this.text('FIELD MANUAL',640,139,32,'center',C.gold);
    const rows=[['MOVE','A / D'],['JUMP / CROUCH','SPACE / S'],['LIGHT / HEAVY','J / K'],['DEFEND / PARRY','L (time it near impact)'],['DODGE','SHIFT'],['SWITCH BROTHER','Q'],['INTERACT / ENGINEER FOCUS','E'],['CHARACTER MECHANIC','R'],['PAUSE / SAVE','ESC']];
    rows.forEach((r,i)=>{this.text(r[0],330,195+i*35,16,'left','#8aa4a8');this.text(r[1],650,195+i*35,17,'left',C.paper,'monospace');});
    this.text('VENZO',350,530,18,'center',C.venzo);this.text('precision · parry · Resolve',350,560,15,'center','#aab9be');
    this.text('RENZO',640,530,18,'center',C.renzo);this.text('reach · chain · engineering',640,560,15,'center','#c5aaa0');
    this.text('E',930,530,18,'center',C.gold);this.text('revive · sabotage · collect',930,560,15,'center','#bdb18c');
    this.text('ESC / ENTER TO CLOSE',640,607,14,'center','#84999c');
  }
  world(g){
    const c=this.x, cam=g.camera, night=g.scenarioId==='pass';
    c.save();if(this.shake>0){c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);this.shake*=.85;}
    const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,night?'#0d222c':'#293a3c');sky.addColorStop(1,night?'#192c31':'#665644');c.fillStyle=sky;c.fillRect(0,0,W,H);
    this.mountains(cam,g.time,night);
    c.save();c.translate(-cam,0);this.structures(g);g.world.platforms.forEach(p=>this.platform(p,night));this.relationships(g);g.world.objects.forEach(o=>this.object(o,g));g.enemies.forEach(e=>this.enemy(e,g));g.brothers.forEach(b=>this.brother(b,g));this.effects(g);c.restore();
    if(night)this.rain(g.time);
    c.fillStyle='rgba(180,208,206,.055)';for(let i=0;i<5;i++)c.fillRect(0,505+i*26,W,12);
    c.restore();this.hud(g);if(g.banner>0)this.banner(g);if(g.paused)this.pause(g);if(g.showHelp)this.help(g);if(g.defeat)this.defeat(g);
  }
  mountains(cam,t,night){const c=this.x;for(let layer=0;layer<3;layer++){c.fillStyle=night?`rgba(${20+layer*12},${42+layer*13},${48+layer*12},${.9-layer*.18})`:`rgba(${49+layer*18},${60+layer*16},${58+layer*12},${.86-layer*.18})`;c.beginPath();c.moveTo(0,530);for(let x=-100;x<W+150;x+=110){const wx=x+cam*(.06+layer*.05);c.lineTo(x,380-layer*42-Math.sin(wx*.004+layer)*70-Math.sin(wx*.011)*28);}c.lineTo(W,610);c.lineTo(0,610);c.fill();}
    c.fillStyle='rgba(150,190,188,.08)';c.fillRect(0,430+Math.sin(t*.3)*12,W,110);
  }
  structures(g){const c=this.x;for(let x=250;x<g.world.width;x+=540){c.fillStyle='rgba(20,27,27,.8)';c.fillRect(x,490,12,118);c.fillRect(x+150,470,12,138);c.fillRect(x-20,488,205,10);c.strokeStyle='#263b38';c.beginPath();c.moveTo(x+6,490);c.lineTo(x+80,410);c.lineTo(x+156,470);c.stroke();}for(let x=100;x<g.world.width;x+=180){c.strokeStyle='rgba(34,62,51,.65)';c.lineWidth=8;c.beginPath();c.moveTo(x,610);c.lineTo(x+14,390);c.stroke();c.fillStyle='rgba(50,92,67,.45)';for(let y=410;y<580;y+=50)c.fillRect(x+5,y,35,5);}}
  relationships(g){if(!(g.focus>0&&g.active.name==='Renzo'))return;const c=this.x;c.strokeStyle='rgba(214,175,98,.42)';c.lineWidth=2;c.setLineDash([8,7]);for(const o of g.world.objects){if(!o.links)continue;const linked=g.world.objects.find(t=>t.id===o.links);if(!linked)continue;c.beginPath();c.moveTo(o.x,o.y);c.lineTo(linked.x,linked.y);c.stroke();}c.setLineDash([]);}
  platform(p,night){const c=this.x;c.fillStyle=night?'#18201f':'#2d2b25';c.fillRect(p.x,p.y,p.w,p.h);c.fillStyle='#413b2d';c.fillRect(p.x,p.y,p.w,6);c.strokeStyle='rgba(118,99,65,.32)';for(let x=p.x+30;x<p.x+p.w;x+=55){c.beginPath();c.moveTo(x,p.y+7);c.lineTo(x-15,p.y+p.h);c.stroke();}}
  object(o,g){if(o.destroyed||o.collected)return;const c=this.x,focus=g.focus>0&&g.active.name==='Renzo',hi=focus&&Math.abs(o.x-g.active.x)<440;if(hi){c.strokeStyle='rgba(214,175,98,.75)';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.arc(o.x,o.y,42+Math.sin(g.time*5)*4,0,Math.PI*2);c.stroke();c.setLineDash([]);this.text(o.props?.slice(0,2).join(' + ')||o.type.toUpperCase(),o.x,o.y-58,11,'center',C.gold,'monospace');}
    c.save();c.translate(o.x,o.y);if(o.type==='crate'){c.fillStyle='#6b5335';c.fillRect(-25,-25,50,50);c.strokeStyle='#ad8955';c.strokeRect(-22,-22,44,44);c.beginPath();c.moveTo(-20,-20);c.lineTo(20,20);c.moveTo(20,-20);c.lineTo(-20,20);c.stroke();}
    else if(o.type==='anchor'){c.strokeStyle='#b18c55';c.lineWidth=6;c.beginPath();c.moveTo(0,-8);c.lineTo(0,16);c.arc(0,16,16,0,Math.PI);c.stroke();}
    else if(o.type==='lantern'){c.fillStyle=o.extinguished?'#3d4542':'#e6a850';c.fillRect(-10,-15,20,28);if(!o.extinguished){c.fillStyle='rgba(235,164,69,.18)';c.beginPath();c.arc(0,0,55,0,Math.PI*2);c.fill();}}
    else if(o.type==='alarm'){c.fillStyle='#34291f';c.fillRect(-22,-40,44,48);c.strokeStyle=o.sabotaged?C.red:C.gold;c.lineWidth=5;c.beginPath();c.arc(0,-10,18,0,Math.PI*2);c.stroke();if(o.sabotaged){c.beginPath();c.moveTo(-15,-25);c.lineTo(16,7);c.moveTo(16,-25);c.lineTo(-15,7);c.stroke();}}
    else if(o.type==='rope'){c.strokeStyle=o.cut?'#8c7653':'#c7a96b';c.lineWidth=3;c.beginPath();c.moveTo(0,-100);c.lineTo(o.cut?7:-10,o.cut?5:80);c.stroke();}
    else if(o.type==='cargo'){c.fillStyle='#594735';c.fillRect(-38,-22,76,44);c.strokeStyle='#a6804e';c.strokeRect(-35,-19,70,38);}
    else if(o.type==='bell'){c.fillStyle=C.gold;c.beginPath();c.moveTo(-18,15);c.quadraticCurveTo(-12,-22,0,-25);c.quadraticCurveTo(12,-22,18,15);c.closePath();c.fill();}
    else if(o.type==='wheel'){c.strokeStyle='#7e6543';c.lineWidth=9;c.rotate(o.rotation||0);c.beginPath();c.arc(0,0,32,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){c.rotate(Math.PI/4);c.beginPath();c.moveTo(0,0);c.lineTo(38,0);c.stroke();}}
    else if(o.type==='gate'){c.fillStyle='#3f382d';c.fillRect(-18,o.open?-70:-15,36,130);c.strokeStyle='#776548';for(let y=-55;y<55;y+=24){c.beginPath();c.moveTo(-18,y+(o.open?-55:0));c.lineTo(18,y+(o.open?-55:0));c.stroke();}}
    else if(o.type==='dispatch'){c.fillStyle='#d8c793';c.rotate(-.12);c.fillRect(-15,-10,30,20);c.fillStyle=C.red;c.beginPath();c.arc(7,4,5,0,Math.PI*2);c.fill();}
    c.restore();}
  brother(b,g){const c=this.x;if(b.downed){c.save();c.translate(b.x,b.y);c.rotate(Math.PI/2);c.globalAlpha=.7;this.monkeyShape(b,b===g.active);c.restore();this.text('DOWNED · HOLD E',b.x,b.y-46,12,'center',C.red,'monospace');return;}c.save();c.translate(b.x,b.y);if(b.hitFlash>0)c.globalCompositeOperation='screen';this.monkeyShape(b,b===g.active);if(b.attackTimer>0){c.strokeStyle=b.name==='Venzo'?C.paper:C.gold;c.lineWidth=5;c.beginPath();const reach=b.name==='Renzo'&&b.mode==='chain'?105:b.attackKind==='heavy'?70:54;c.arc(18*b.facing,-24,reach,-.8*b.facing,.8*b.facing,b.facing<0);c.stroke();}if(b.blocking){c.strokeStyle='rgba(215,225,214,.8)';c.lineWidth=4;c.beginPath();c.arc(10*b.facing,-30,30,-1.2,1.2);c.stroke();}c.restore();if(b===g.active){c.fillStyle=C.gold;c.beginPath();c.moveTo(b.x-8,b.y-78);c.lineTo(b.x+8,b.y-78);c.lineTo(b.x,b.y-66);c.fill();}}
  monkeyShape(b,active){const c=this.x,col=b.name==='Venzo'?C.venzo:C.renzo;c.fillStyle=col;c.fillRect(-14,-48,28,42);c.fillStyle='#7f614d';c.beginPath();c.arc(0,-58,16,0,Math.PI*2);c.fill();c.beginPath();c.arc(-14,-59,6,0,Math.PI*2);c.arc(14,-59,6,0,Math.PI*2);c.fill();c.fillStyle='#b28b6c';c.beginPath();c.ellipse(4*b.facing,-55,9,7,0,0,Math.PI*2);c.fill();c.fillStyle='#0b1114';c.fillRect(7*b.facing-2,-62,3,3);c.strokeStyle=b.name==='Venzo'?'#cfd5c4':'#bd9858';c.lineWidth=b.name==='Venzo'?4:5;c.beginPath();if(b.name==='Renzo'&&b.mode==='chain'){c.moveTo(-4,-38);c.lineTo(25*b.facing,-15);c.setLineDash([3,3]);c.lineTo(55*b.facing,-30);c.setLineDash([]);}else{c.moveTo(-12*b.facing,-48);c.lineTo(24*b.facing,-8);}c.stroke();c.fillStyle='#1b2326';c.fillRect(-14,-8,10,25);c.fillRect(4,-8,10,25);if(active){c.strokeStyle='rgba(214,175,98,.5)';c.lineWidth=2;c.strokeRect(-18,-78,36,98);}}
  enemy(e,g){if(e.dead)return;const c=this.x;c.save();c.translate(e.x,e.y);if(e.hitFlash>0)c.globalCompositeOperation='screen';let col=e.type==='veteran'?'#8d4d44':e.type==='guard'?'#5f675f':'#7a705c';c.fillStyle=col;c.fillRect(-16,-48,32,44);c.fillStyle=e.type==='veteran'?'#665047':'#6e5545';c.beginPath();c.arc(0,-58,e.type==='veteran'?19:15,0,Math.PI*2);c.fill();c.fillStyle='#d6b081';c.fillRect(8*e.facing-2,-62,5,4);if(e.type==='guard'){c.fillStyle='#5b5144';c.fillRect(e.facing*12-7,-48,20,55);c.strokeStyle='#b09261';c.strokeRect(e.facing*12-7,-48,20,55);}if(e.type==='veteran'){c.strokeStyle='#d7b76e';c.lineWidth=5;c.beginPath();c.moveTo(-20*e.facing,-42);c.lineTo(28*e.facing,8);c.stroke();}
    if(e.type==='veteran'&&e.action==='guard'){c.strokeStyle='rgba(214,175,98,.75)';c.lineWidth=3;c.beginPath();c.arc(6*e.facing,-32,30,-1.2,1.2);c.stroke();}if(e.attackTimer>0){c.strokeStyle=C.red;c.lineWidth=4;c.beginPath();c.arc(20*e.facing,-25,e.type==='veteran'&&(['forwardReach','switchBait'].includes(e.action)||e.punishReady>0)?85:52,-.8*e.facing,.8*e.facing,e.facing<0);c.stroke();}
    c.restore();this.enemyAwareness(e,g);if(e.type==='veteran'&&e.adaptLabelTimer>0)this.text(e.adaptLabel,e.x,e.y-112,12,'center',C.red,'monospace');}
  enemyAwareness(e,g){const c=this.x, y=e.y-90;if(e.state==='patrol'||e.state==='return')return;const colors={suspicious:C.gold,investigate:C.gold,alert:C.red,search:'#d47a50',alarm:C.red};const label={suspicious:'SUSPICIOUS',investigate:'INVESTIGATE',alert:'ALERT',search:'SEARCH',alarm:'TO ALARM'}[e.state]||'ALERT';this.text(label,e.x,y,10,'center',colors[e.state]||C.red,'monospace');if(e.awareness>0){c.fillStyle='rgba(0,0,0,.6)';c.fillRect(e.x-28,y+13,56,4);c.fillStyle=colors[e.state]||C.red;c.fillRect(e.x-28,y+13,56*clamp(e.awareness,0,1),4);}if(g.debugVision&&e.state!=='alert'){c.fillStyle='rgba(214,175,98,.055)';c.beginPath();c.moveTo(e.x,e.y-45);c.lineTo(e.x+e.facing*260,e.y-155);c.lineTo(e.x+e.facing*260,e.y+20);c.closePath();c.fill();}}
  effects(g){const c=this.x;g.fx.forEach(f=>{c.globalAlpha=clamp(f.life*3,0,1);c.strokeStyle=f.color||C.paper;c.lineWidth=3;c.beginPath();c.arc(f.x,f.y,(1-f.life)*45,0,Math.PI*2);c.stroke();});c.globalAlpha=1;if(g.hook){c.strokeStyle=C.gold;c.lineWidth=2;c.setLineDash([7,4]);c.beginPath();c.moveTo(g.hook.from.x,g.hook.from.y-30);c.lineTo(g.hook.target.x,g.hook.target.y);c.stroke();c.setLineDash([]);}}
  rain(t){const c=this.x;c.strokeStyle='rgba(166,200,205,.22)';c.lineWidth=1;for(let i=0;i<100;i++){let x=(i*127+t*390)%1400-60,y=(i*61+t*720)%760-40;c.beginPath();c.moveTo(x,y);c.lineTo(x-13,y+29);c.stroke();}}
  hud(g){const c=this.x;this.panel(18,18,360,102,.7);g.brothers.forEach((b,i)=>{const y=45+i*42;this.text(b.name.toUpperCase(),34,y,15,'left',b.name==='Venzo'?C.venzo:C.renzo);c.fillStyle='#302a29';c.fillRect(112,y-7,180,13);c.fillStyle=b.downed?C.red:(b.name==='Venzo'?C.venzo:C.renzo);c.fillRect(112,y-7,180*clamp(b.hp/b.maxHp,0,1),13);this.text(b.downed?'DOWN':`${Math.ceil(b.hp)}`,300,y,13,'left',b.downed?C.red:C.paper,'monospace');if(b===g.active)this.text('ACTIVE',348,y,11,'right',C.gold,'monospace');});
    this.panel(418,18,444,58,.64);this.text(g.world.objective,640,41,16,'center',C.paper);this.text(g.objectiveDetail,640,64,12,'center',C.gold,'monospace');
    this.panel(1030,18,232,102,.65);this.text(`SEED ${String(g.seed).padStart(5,'0')}`,1246,37,12,'right','#91a5a5','monospace');this.text(g.active.name==='Venzo'?`RESOLVE ${Math.floor(g.active.resolve)}%`:`${g.active.mode==='chain'?'CHAIN':'STAFF'} MODE`,1246,59,14,'right',g.active.name==='Venzo'?C.venzo:C.renzo,'monospace');this.text(`ENEMIES ${g.enemies.filter(e=>!e.dead).length}`,1246,80,11,'right','#9aaaa8','monospace');const alarms=g.world.objects.filter(o=>o.type==='alarm');const alarmState=alarms.some(a=>a.rung&&!a.sabotaged)?'RINGING':alarms.some(a=>a.sabotaged)?'LINE CUT':'READY';this.text(`ALARM ${alarmState}`,1246,101,11,'right',alarmState==='RINGING'?C.red:alarmState==='LINE CUT'?C.gold:'#9aaaa8','monospace');
    if(g.prompt){this.panel(420,638,440,48,.82);this.text(g.prompt,640,662,15,'center',C.paper,'monospace');}
    if(g.toast>0){this.panel(470,112,340,42,.78);this.text(g.toastText,640,133,14,'center',C.gold,'monospace');}
  }
  banner(g){const a=clamp(g.banner,0,1);this.x.fillStyle=`rgba(4,9,12,${.72*a})`;this.x.fillRect(0,245,W,170);this.text(g.world.title,640,293,19,'center',C.red);this.text(g.world.subtitle,640,342,39,'center',C.paper);this.text(g.world.objective,640,389,15,'center',C.gold);}
  pause(g){this.x.fillStyle='rgba(2,5,7,.86)';this.x.fillRect(0,0,W,H);this.text('PAUSED',640,190,46,'center',C.paper);['RESUME','SAVE GAME','FIELD MANUAL','QUIT TO TITLE'].forEach((s,i)=>{if(g.pauseIndex===i){this.x.fillStyle='rgba(199,75,63,.2)';this.x.fillRect(470,260+i*55,340,42);}this.text(s,640,281+i*55,20,'center',g.pauseIndex===i?C.gold:'#899b9a');});this.text('W/S SELECT  ·  ENTER CONFIRM  ·  ESC RESUME',640,535,13,'center','#768987');}
  defeat(g){this.x.fillStyle='rgba(20,3,4,.82)';this.x.fillRect(0,0,W,H);this.text('BOTH BROTHERS HAVE FALLEN',640,265,35,'center','#df7267');this.text('BEND. ENDURE. CONTINUE.',640,327,18,'center',C.paper);this.text('ENTER — RETRY CHECKPOINT',640,405,18,'center',C.gold);this.text('ESC — TITLE',640,446,14,'center','#97a5a3');}
  interlude(g){this.clear();const c=this.x;c.fillStyle='#0a1115';c.fillRect(0,0,W,H);this.kamon(640,145,.85);this.text('THE PASS YIELDS',640,250,36,'center',C.paper);this.text('The floodgate groans open. Beyond it, the watchpost holds the stolen dispatch.',640,306,17,'center','#9baca9');this.text('AUTOSAVE COMPLETE',640,360,14,'center',C.gold,'monospace');this.text('ENTER — CONTINUE TO THE BROKEN CREST',640,453,18,'center',C.paper);this.text('ESC — SAVE / TITLE',640,495,13,'center','#778a88');}
  village(g){this.clear();const c=this.x;c.fillStyle='#172221';c.fillRect(0,0,W,H);for(let i=0;i<5;i++){c.fillStyle=`rgba(79,98,75,${.16+i*.03})`;c.beginPath();c.moveTo(0,440-i*44);for(let x=0;x<W;x+=130)c.lineTo(x,400-i*44-Math.sin(x*.008+i)*40);c.lineTo(W,650);c.lineTo(0,650);c.fill();}c.fillStyle='#272820';c.fillRect(0,590,W,130);for(let x=80;x<1200;x+=230){c.fillStyle='#3b3025';c.fillRect(x,475,150,115);c.fillStyle='#4d4332';c.beginPath();c.moveTo(x-20,480);c.lineTo(x+75,420);c.lineTo(x+170,480);c.fill();}
    this.kamon(185,445,.45);const walkX=190+Math.min(720,(g.villageX||100)*.65);this.brother({...g.brothers[0],x:walkX,y:590},g);this.brother({...g.brothers[1],x:walkX-62,y:590},g);
    this.panel(160,68,960,150,.83);this.text('TAKEKAGE VILLAGE',640,99,17,'center',C.gold);this.text(g.villageLines[g.villageStep]?.speaker||'',640,140,17,'center','#8eaaa8');this.text(g.villageLines[g.villageStep]?.text||'',640,179,20,'center',C.paper);this.text((g.villageX||0)<1080?'A / D — WALK THROUGH HOME':'ENTER — RECEIVE THE MESSENGER',640,665,13,'center','#99aaa7');}
  revelation(g){this.clear();const c=this.x;c.fillStyle='#070b0e';c.fillRect(0,0,W,H);if(g.revealPhase<2){this.text(g.revealPhase===0?'A GORILLA SAMURAI COMMANDER IS DEAD.':'SOMEONE WANTS THE CLANS AT WAR.',640,205,25,'center',C.paper);this.text(g.revealPhase===0?'At the scene: a broken crest from Takekage bamboo.':'The fracture bears our two-leaf kamon—but not our hand.',640,260,18,'center','#9baba9');this.kamon(640,420,g.revealPhase===0?1.25:1.65,true);this.text('ENTER — CONTINUE',640,635,13,'center','#829493');}else{this.kamon(640,245,1.15,true);this.text('BEND.',640,405,24,'center',C.paper);this.text('ENDURE.',640,444,24,'center',C.paper);this.text('CONTINUE.',640,483,24,'center',C.paper);this.text('CHAPTER COMPLETE',640,582,42,'center',C.gold);this.text('ENTER — RETURN TO TITLE',640,650,13,'center','#829493');}}
  frame(g){this.clear();if(g.scene==='title')this.title(g);else if(g.scene==='game')this.world(g);else if(g.scene==='interlude')this.interlude(g);else if(g.scene==='village')this.village(g);else if(g.scene==='revelation')this.revelation(g);}
}
