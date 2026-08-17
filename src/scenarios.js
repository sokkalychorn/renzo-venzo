export const W = 1280, H = 720, FLOOR = 608;

const platform = (x,y,w,h=24) => ({x,y,w,h,type:'platform'});
const enemy = (type,x,y=560,extra={}) => ({type,x,y, ...extra});
const object = (type,x,y,props={}) => ({type,x,y,...props});

export const SCENARIOS = {
  pass: {
    id:'pass', title:'SCENARIO I', subtitle:'RAIN AT KAGEYAMA PASS', width:3600,
    objective:'Cross the pass and open the floodgate route', startX:120,
    platforms:[
      platform(0,608,3600,112), platform(390,520,240), platform(730,450,260),
      platform(1130,520,340), platform(1560,430,310), platform(1950,520,360),
      platform(2440,450,310), platform(2860,520,360), platform(3290,410,310)
    ],
    enemies:[
      enemy('scout',690,402,{patrol:[620,1020]}),
      enemy('scout',1390,472,{patrol:[1160,1500]}),
      enemy('guard',2200,472,{patrol:[2030,2340]}),
      enemy('scout',2890,472,{patrol:[2800,3150]})
    ],
    objects:[
      object('crate',330,566,{mass:.4,props:['LIGHT','MOVABLE','NOISE_PRODUCING']}),
      object('anchor',850,330,{mass:Infinity,props:['ANCHORED']}),
      object('lantern',1110,380,{mass:.3,props:['LIGHT','SUSPENDED','NOISE_PRODUCING']}),
      object('alarm',1515,480,{mass:Infinity,props:['ANCHORED','NOISE_PRODUCING']}),
      object('rope',1765,350,{mass:.2,props:['TENSIONED','BREAKABLE'],links:'cargo1'}),
      object('cargo',1830,270,{id:'cargo1',mass:8,props:['HEAVY','SUSPENDED','MOVABLE']}),
      object('crate',2380,566,{mass:.55,props:['LIGHT','MOVABLE','NOISE_PRODUCING']}),
      object('wheel',2690,390,{mass:20,props:['HEAVY','ROTATING'],links:'gate1'}),
      object('gate',3230,390,{id:'gate1',mass:Infinity,props:['ANCHORED','MECHANICAL']}),
      object('bell',2820,392,{mass:.5,props:['SUSPENDED','NOISE_PRODUCING']})
    ],
    checkpoints:[120,1900], exitX:3440,
    tips:[
      {x:180,text:'A / D MOVE  ·  SPACE JUMP  ·  S CROUCH'},
      {x:480,text:'Q SWITCHES BROTHERS — BOTH REMAIN IN THE WORLD'},
      {x:820,text:'RENZO: E REVEALS SYSTEMS  ·  R TRANSFORMS STAFF'},
      {x:1320,text:'CROUCH AND MOVE QUIETLY — SCOUTS REMEMBER'},
      {x:1640,text:'IN CHAIN MODE, J HOOKS. E NEAR AN ALARM SABOTAGES.'},
      {x:2080,text:'VENZO: L BLOCKS. LAST-MOMENT BLOCKS PARRY.'},
      {x:2500,text:'HOOK THE WHEEL TO OPEN THE FLOODGATE'}
    ]
  },
  crest: {
    id:'crest', title:'SCENARIO II', subtitle:'THE BROKEN CREST', width:4300,
    objective:'Infiltrate · recover the dispatch · reach the eastern route', startX:100,
    platforms:[
      platform(0,608,4300,112), platform(400,505,260), platform(760,410,290),
      platform(1140,520,350), platform(1590,430,300), platform(2000,520,400),
      platform(2490,390,300), platform(2890,520,340), platform(3320,420,320),
      platform(3730,520,300), platform(4080,390,220)
    ],
    enemies:[
      enemy('scout',520,457,{patrol:[380,720]}),
      enemy('guard',1250,472,{patrol:[1110,1500]}),
      enemy('scout',1700,382,{patrol:[1560,1910]}),
      enemy('guard',2200,472,{patrol:[2050,2440]}),
      enemy('veteran',2700,342,{patrol:[2490,2830]}),
      enemy('scout',3110,472,{patrol:[2880,3280]}),
      enemy('veteran',3540,372,{patrol:[3310,3660]})
    ],
    objects:[
      object('anchor',580,330,{mass:Infinity,props:['ANCHORED']}),
      object('alarm',1010,370,{mass:Infinity,props:['ANCHORED','NOISE_PRODUCING']}),
      object('crate',1090,566,{mass:.5,props:['LIGHT','MOVABLE','NOISE_PRODUCING']}),
      object('rope',1540,340,{mass:.2,props:['TENSIONED','BREAKABLE'],links:'cargo2'}),
      object('cargo',1640,250,{id:'cargo2',mass:9,props:['HEAVY','SUSPENDED','MOVABLE']}),
      object('bell',1920,430,{mass:.5,props:['SUSPENDED','NOISE_PRODUCING']}),
      object('anchor',2350,350,{mass:Infinity,props:['ANCHORED']}),
      object('dispatch',3060,478,{mass:.1,props:['EVIDENCE']}),
      object('alarm',3260,380,{mass:Infinity,props:['ANCHORED','NOISE_PRODUCING']}),
      object('wheel',3820,460,{mass:20,props:['HEAVY','ROTATING'],links:'gate2'}),
      object('gate',4100,350,{id:'gate2',mass:Infinity,props:['ANCHORED','MECHANICAL']})
    ],
    checkpoints:[100,2100,3200], exitX:4190,
    tips:[
      {x:160,text:'THE WATCHPOST COMBINES EVERY SYSTEM'},
      {x:900,text:'SHIELDS BREAK UNDER HOOKS, FLANKS, OR HEAVY PRESSURE'},
      {x:2420,text:'VETERANS READ REPEATED HABITS — CHANGE YOUR RHYTHM'},
      {x:2900,text:'RECOVER THE BORDER DISPATCH'},
      {x:3680,text:'OPEN THE EASTERN GATE AND ESCAPE'}
    ]
  }
};

export function instantiateScenario(id, rng) {
  const src=SCENARIOS[id];
  const data=structuredClone(src);
  data.enemies.forEach((e,i)=>{
    const offset=Math.floor((rng()-0.5)*80);
    e.x+=offset; e.facing=rng()<.5?-1:1; e.id=`${id}-enemy-${i}`;
  });
  data.objects.forEach((o,i)=>{ o.id ||= `${id}-object-${i}`; o.baseY=o.y; });
  return data;
}
