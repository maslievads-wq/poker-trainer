import React, { useState, useEffect, useCallback } from "react";

// Inject Inter font
if(typeof document !== "undefined" && !document.getElementById("inter-font")){
  const link = document.createElement("link");
  link.id = "inter-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
  document.head.appendChild(link);
}

const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const SUITS = ["♠","♥","♦","♣"];

const POS_COORDS = {
  BTN:{ x:72, y:76 }, SB:{ x:50, y:87 }, BB:{ x:28, y:76 },
  UTG:{ x:16, y:42 }, MP:{ x:38, y:16 }, CO:{ x:62, y:16 },
};

// Default GTO open ranges
const DEFAULT_RANGES = {
  UTG: new Set(["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","ATs","A9s","KQs","KJs","QJs","JTs","AKo","AQo","AJo","KQo"]),
  MP:  new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A8s","KQs","KJs","KTs","QJs","QTs","JTs","T9s","AKo","AQo","AJo","ATo","KQo","KJo"]),
  CO:  new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","QJs","QTs","JTs","T9s","98s","87s","76s","65s","AKo","AQo","AJo","ATo","A9o","KQo","KJo","KTo","QJo"]),
  BTN: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","K8s","K7s","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","97s","87s","86s","76s","75s","65s","54s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","A4o","A3o","A2o","KQo","KJo","KTo","K9o","QJo","QTo","Q9o","JTo","J9o"]),
  SB:  new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","QJs","QTs","JTs","T9s","98s","87s","76s","65s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","KQo","KJo","KTo","QJo","QTo","JTo"]),
};

const BB_CALL_RANGE = new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
  "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
  "KQs","KJs","KTs","K9s","K8s","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","87s","76s","65s","54s",
  "AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQo","KJo","KTo","QJo","QTo","JTo"]);

// 3-bet ranges by position (when facing a raise)
const THREEBET_RANGES = {
  BB:  new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs","A5s","A4s","KQs","QJs","JTs","T9s"]),
  SB:  new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs","QJs"]),
  BTN: new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs","A5s","A4s","KQs","T9s","98s"]),
  CO:  new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs","A5s","KQs"]),
  MP:  new Set(["AA","KK","QQ","AKs","AKo"]),
  UTG: new Set(["AA","KK","QQ","AKs","AKo"]),
};

// Call ranges by position (when facing a raise)
const CALL_RANGES = {
  BB: BB_CALL_RANGE, // already defined
  BTN: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","KQs","KJs","KTs","K9s","QJs","QTs","JTs","T9s","98s","87s","76s","65s","AKo","AQo","AJo","ATo","A9o","KQo","KJo","QJo"]),
  CO:  new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A8s","KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s","AKo","AQo","AJo","KQo","KJo"]),
  MP:  new Set(["AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","KQs","KJs","QJs","JTs","AKo","AQo","AJo","KQo"]),
  SB:  new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","KQs","KJs","QJs","JTs","AKo","AQo","KQo"]),
};

// Who can call hero's open from each position
// Returns array of possible callers (positions to hero's left that haven't folded)
const POSSIBLE_CALLERS = {
  UTG: ["MP","CO","BTN","SB","BB"],
  MP:  ["CO","BTN","SB","BB"],
  CO:  ["BTN","SB","BB"],
  BTN: ["SB","BB"],
  SB:  ["BB"],
};

// Board texture analysis
function boardTexture(board) {
  if(board.length<3) return {wet:false,paired:false,monotone:false,label:""};
  const suits=board.map(c=>c.suit);
  const ranks=board.map(c=>RANKS.indexOf(c.rank)).sort((a,b)=>a-b);
  const monotone=suits.every(s=>s===suits[0]);
  const twoTone=new Set(suits).size===2;
  const paired=new Set(ranks).size<ranks.length;
  // Connectedness: how close are ranks
  const spread=ranks[ranks.length-1]-ranks[0];
  const connected=spread<=4;
  const wet=(monotone||twoTone)&&connected;
  const label=monotone?"monotone":twoTone?connected?"wet (2-tone connected)":"2-tone":"rainbow"+(connected?" connected":"");
  return {wet,paired,monotone,twoTone,connected,label};
}

// All 169 hand combos for range editor
function allHands() {
  const hands = [];
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      if (i === j) hands.push(RANKS[i]+RANKS[j]); // pair
      else if (i < j) hands.push(RANKS[i]+RANKS[j]+"s"); // suited
      else hands.push(RANKS[j]+RANKS[i]+"o"); // offsuit
    }
  }
  return hands;
}

function handAt(row, col) {
  if (row === col) return RANKS[row]+RANKS[col];
  if (row < col) return RANKS[row]+RANKS[col]+"s";
  return RANKS[col]+RANKS[row]+"o";
}

// Card utils
function newDeck() {
  const d = [];
  for (const r of RANKS) for (const s of SUITS) d.push({rank:r,suit:s});
  return d;
}
function shuffle(a) {
  const b=[...a];
  for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
  return b;
}
function handNotation(c1,c2) {
  const r1=RANKS.indexOf(c1.rank),r2=RANKS.indexOf(c2.rank);
  const [hi,lo]=r1<r2?[c1,c2]:[c2,c1];
  if(hi.rank===lo.rank) return hi.rank+lo.rank;
  return hi.rank+lo.rank+(hi.suit===lo.suit?"s":"o");
}
function isRed(s){return s==="♥"||s==="♦";}

// Hand evaluator
function evalHand(cards) {
  const cs=cards.map(c=>({r:RANKS.indexOf(c.rank),s:c.suit}));
  const counts={};
  const bySuit={};
  for(const c of cs){
    counts[c.r]=(counts[c.r]||0)+1;
    if(!bySuit[c.s])bySuit[c.s]=[];
    bySuit[c.s].push(c.r);
  }
  const flush=Object.values(bySuit).find(a=>a.length>=5);
  const grouped=Object.entries(counts).map(([r,n])=>({r:+r,n})).sort((a,b)=>b.n-a.n||a.r-b.r);
  const ranks=cs.map(c=>c.r).sort((a,b)=>a-b);
  function hasStraight(rs){
    const u=[...new Set(rs)].sort((a,b)=>a-b);
    for(let i=0;i<=u.length-5;i++) if(u[i+4]-u[i]===4&&new Set(u.slice(i,i+5)).size===5) return u[i+4];
    if(u.includes(0)&&u.includes(9)&&u.includes(10)&&u.includes(11)&&u.includes(12)) return 12;
    return -1;
  }
  const straight=hasStraight(ranks);
  const sf=flush?hasStraight(flush.sort((a,b)=>a-b)):-1;
  if(sf>=0) return {score:8e8+sf,name:"Straight flush"};
  if(grouped[0].n===4) return {score:7e8+grouped[0].r*1e4,name:"Quads"};
  if(grouped[0].n===3&&grouped[1]?.n>=2) return {score:6e8+grouped[0].r*1e4,name:"Full house"};
  if(flush) return {score:5e8+flush.slice(-5).reduce((a,v,i)=>a+v*Math.pow(13,i),0),name:"Flush"};
  if(straight>=0) return {score:4e8+straight,name:"Straight"};
  if(grouped[0].n===3) return {score:3e8+grouped[0].r*1e4,name:"Set"};
  if(grouped[0].n===2&&grouped[1]?.n===2) return {score:2e8+grouped[0].r*1e4+grouped[1].r*100,name:"Two pair"};
  if(grouped[0].n===2) return {score:1e8+grouped[0].r*1e4,name:"Pair "+RANKS[grouped[0].r]};
  return {score:grouped[0].r*1e4,name:"High card "+RANKS[grouped[0].r]};
}

// Check for flush draw (4 cards of same suit)
function hasFlushDraw(heroCards, board) {
  const all=[...heroCards,...board];
  const bySuit={};
  for(const c of all){ if(!bySuit[c.suit]) bySuit[c.suit]=[]; bySuit[c.suit].push(c); }
  for(const [suit,cards] of Object.entries(bySuit)){
    if(cards.length===4){
      // Check hero contributes at least one card
      if(heroCards.some(c=>c.suit===suit)) return true;
    }
  }
  return false;
}

// Check for open-ended or gutshot straight draw
function hasStraightDraw(heroCards, board) {
  const all=[...heroCards,...board];
  const heroRanks=new Set(heroCards.map(c=>RANKS.indexOf(c.rank)));
  const allRanks=[...new Set(all.map(c=>RANKS.indexOf(c.rank)))].sort((a,b)=>a-b);
  // OESD: 4 consecutive ranks where hero contributes
  for(let i=0;i<=allRanks.length-4;i++){
    const window=allRanks.slice(i,i+4);
    if(window[3]-window[0]===3 && new Set(window).size===4){
      if(window.some(r=>heroRanks.has(r))) return "oesd";
    }
  }
  // Gutshot: 4 ranks with one gap
  for(let i=0;i<=allRanks.length-4;i++){
    const window=allRanks.slice(i,i+4);
    if(window[3]-window[0]===4 && new Set(window).size===4){
      if(window.some(r=>heroRanks.has(r))) return "gutshot";
    }
  }
  return null;
}

// Postflop GTO: value + draws + position + board texture
// ip: true = hero acts last (in position), false = hero acts first (OOP)
function postflopAdvice(heroCards, board, betFacing, ip=true) {
  const texture=boardTexture(board);
  const all=[...heroCards,...board];
  if(all.length<5) return {correct:"check", reason:"Board not open"};
  const h=evalHand(all);
  const name=h.name;

  // Check draws before made hand evaluation
  const flushDraw=hasFlushDraw(heroCards,board);
  const straightDraw=hasStraightDraw(heroCards,board);

  // Strength tier: 0=trash, 1=weak/draw, 2=top pair, 3=strong, 4=monster
  let tier=0;
  let reason="";

  if(name.startsWith("Straight flush")||name.startsWith("Quads")){ tier=4; reason=name+" — monster hand, bet to extract maximum value"; }
  else if(name.startsWith("Full house")||name.startsWith("Flush")||name.startsWith("Straight")){ tier=3; reason=name+" — very strong hand, bet: opponent often pays with worse"; }
  else if(name.startsWith("Set")||name.startsWith("Two pair")){ tier=3; reason=name+" — strong hand + full house potential, bet for value and protection"; }
  else if(name.startsWith("Pair")){
    const pairRankName=name.split(" ")[1];
    const pairIdx=RANKS.indexOf(pairRankName);
    if(pairIdx<=4){ tier=2; reason=name+" — top pair good kicker, bet for value: opponent pays with draws and worse pairs"; }
    else if(pairIdx<=7){ tier=1; reason=name+" — middle pair, not strong enough to bet: better hands call, worse fold. Check for pot control"; }
    else { tier=0; reason=name+" — weak pair on board with overcards, high risk of being behind. Check/fold line"; }
  } else {
    // High card — but check for strong draws
    if(flushDraw){
      tier=2;
      const heroRanks=heroCards.map(c=>RANKS.indexOf(c.rank));
      const hasNuts=Math.min(...heroRanks)<=1;
      reason=(hasNuts?"Nut ":"")+"flush draw (~9 outs, ~35% equity) — semi-bluff bet: combining draw equity + pressure on opponent";
    } else if(straightDraw==="oesd"){
      tier=2; reason="OESD (~8 outs, ~32% equity) — enough for semi-bluff: if they fold we take the pot, if they call we have outs";
    } else if(straightDraw==="gutshot"){
      tier=1; reason="Gutshot (~4 outs, ~17% equity) — not enough for semi-bluff: insufficient equity to bet, check and see for free";
    } else {
      const heroRankIdxs=heroCards.map(c=>RANKS.indexOf(c.rank));
      const bestHeroIdx=Math.min(...heroRankIdxs);
      const boardRankIdxs=board.map(c=>RANKS.indexOf(c.rank));
      const boardMax=Math.min(...boardRankIdxs);
      const overcards=heroRankIdxs.filter(r=>r<boardMax).length;
      if(bestHeroIdx===0){
        tier=1;
        reason=overcards>=2
          ? "Ace high no pair — "+overcards+" overcards (potential top pair), but no draw — no reason to bet. Check and see next card for free"
          : "Ace high no pair no draw — bet gets no calls from worse hands. Check for pot control and protection from raise";
      } else {
        tier=0;
        reason=name+" no pair no draw — no value no semi-bluff, any bet loses money. Check/fold line";
      }
    }
  }

  // Adjust tier thresholds based on position and board texture
  // OOP: bet less (needs stronger hand), IP: can bet wider
  // Wet board: need stronger hand to bet for value (more draws out there)
  const betThreshold = ip ? (texture.wet ? 2 : 2) : (texture.wet ? 3 : 2);
  const callThreshold = texture.wet ? 2 : 2;

  const posCtx = ip ? "IP (in position)" : "OOP (out of position)";
  const boardCtx = texture.wet ? ` on ${texture.label} board` : texture.paired ? " on paired board" : "";

  if(betFacing){
    if(tier>=callThreshold){
      const r2=reason.includes("—")?reason:reason+" —";
      return {correct:"call", reason:`${name}${boardCtx} — call for value (${posCtx})`};
    }
    if(tier===1&&ip) return {correct:"call", reason:`${name} — marginal but IP allows defense, call`};
    return {correct:"fold", reason:`${name}${boardCtx} — not enough equity to call (${posCtx}), fold`};
  } else {
    if(tier>=betThreshold){
      const ipBonus=ip?" IP gives positional advantage":"";
      return {correct:"bet", reason:reason+ipBonus};
    }
    if(tier===1&&!ip&&texture.wet){
      return {correct:"check", reason:`${name}${boardCtx} — OOP on wet board, check for pot control`};
    }
    if(tier===1&&ip){
      return {correct:"check", reason:`${name}${boardCtx} — not enough to bet IP, check and see`};
    }
    return {correct:"check", reason:reason+(texture.wet?` (${texture.label} board — be careful)`:"")};
  }
}

// heroBet: true if hero bet/raised, false if hero checked
function oppPostflopAction(oppCards, board, heroBet) {
  const all=[...oppCards,...board];
  if(all.length<5) return heroBet?"call":"check";
  const h=evalHand(all);
  const name=h.name;
  const r=Math.random();

  // Opp tier
  let tier=0;
  if(name.startsWith("Straight flush")||name.startsWith("Quads")) tier=4;
  else if(name.startsWith("Full house")||name.startsWith("Flush")||name.startsWith("Straight")) tier=3;
  else if(name.startsWith("Set")||name.startsWith("Two pair")) tier=3;
  else if(name.startsWith("Pair")){
    const pairRank=name.split(" ")[1];
    const pairIdx=RANKS.indexOf(pairRank);
    if(pairIdx<=4) tier=2;
    else if(pairIdx<=7) tier=1;
    else tier=0;
  } else {
    tier=0;
  }

  if(heroBet){
    // Facing hero's bet
    if(tier>=3) return r<0.35?"raise":"call";
    if(tier===2) return r<0.75?"call":"fold";
    if(tier===1) return r<0.35?"call":"fold";
    return "fold";
  } else {
    // Hero checked — BB acts: bet, check
    // Strong hands bet, medium hands sometimes bet, weak check
    if(tier>=3) return r<0.80?"bet":"check";
    if(tier===2) return r<0.50?"bet":"check";
    if(tier===1) return r<0.20?"bet":"check";
    return "check";
  }
}

// SVG Suits
function Suit({suit,size=16}){
  const col=isRed(suit)?"#dc2626":"#1a2035";
  const p={viewBox:"0 0 100 100",width:size,height:size,style:{display:"block",flexShrink:0}};
  if(suit==="♠") return <svg {...p}><path d="M50 5C50 5 5 42 5 65c0 17 13 27 28 23 7-2 13-8 15-14-3 10-7 19-20 23h44c-13-4-17-13-20-23 2 6 8 12 15 14 15 4 28-6 28-23C95 42 50 5 50 5Z" fill={col}/></svg>;
  if(suit==="♥") return <svg {...p}><path d="M50 88C50 88 4 52 4 30 4 14 14 4 30 4c10 0 18 7 20 16 2-9 10-16 20-16 16 0 26 10 26 26C96 52 50 88 50 88Z" fill={col}/></svg>;
  if(suit==="♦") return <svg {...p}><path d="M50 5 95 50 50 95 5 50Z" fill={col}/></svg>;
  return <svg {...p}><circle cx="50" cy="28" r="22" fill={col}/><circle cx="26" cy="62" r="22" fill={col}/><circle cx="74" cy="62" r="22" fill={col}/><rect x="43" y="56" width="14" height="38" fill={col}/><rect x="28" y="90" width="44" height="8" rx="4" fill={col}/></svg>;
}

function Card({card,delay=0,small=false}){
  const W=small?62:92,H=small?88:134;
  const red=isRed(card.suit);
  const tc=red?"#dc2626":"#1a2035";
  return (
    <div style={{width:W,height:H,background:"linear-gradient(160deg,#fff 0%,#f5f6f8 60%,#eceef2 100%)",borderRadius:9,boxShadow:"0 8px 28px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.15)",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:small?"4px 5px":"7px 8px",position:"relative",animation:`dealCard 0.42s cubic-bezier(0.34,1.4,0.64,1) ${delay}s both`,overflow:"hidden",flexShrink:0,userSelect:"none"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"45%",background:"linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0) 100%)",borderRadius:"9px 9px 0 0",pointerEvents:"none"}}/>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:1}}>
        <span style={{fontSize:small?14:21,fontWeight:900,color:tc,fontFamily:"Inter,system-ui,sans-serif",lineHeight:1}}>{card.rank}</span>
        <Suit suit={card.suit} size={small?10:14}/>
      </div>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",flex:1}}>
        <Suit suit={card.suit} size={small?28:46}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1,transform:"rotate(180deg)"}}>
        <span style={{fontSize:small?14:21,fontWeight:900,color:tc,fontFamily:"Inter,system-ui,sans-serif",lineHeight:1}}>{card.rank}</span>
        <Suit suit={card.suit} size={small?10:14}/>
      </div>
    </div>
  );
}

// Chip stack SVG — shows 1-3 chips with label
// ChipLayer: renders chips via direct DOM so animation always fires
function ChipLayer({chips, chipKey, containerRef}){
  React.useEffect(()=>{
    const container = containerRef?.current;
    if(!container) return;
    // Remove old chips
    container.querySelectorAll('.chip-node').forEach(el=>el.remove());
    if(!chips || Object.keys(chips).length===0) return;

    Object.entries(chips).forEach(([pos, chip], idx)=>{
      const coords = CHIP_OFFSET[pos];
      if(!coords) return;
      const delay = idx===0 ? 0 : 380;

      setTimeout(()=>{
        if(!containerRef.current) return;
        const wrap = document.createElement('div');
        wrap.className = 'chip-node';
        wrap.style.cssText = `position:absolute;left:${coords.x}%;top:${coords.y}%;margin-left:-20px;margin-top:-16px;z-index:10;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:3px;opacity:0;transform:scale(0.15) translateY(14px);transition:opacity 0.15s ease,transform 0.38s cubic-bezier(0.34,1.56,0.64,1);`;

        wrap.innerHTML = `
          <svg width="40" height="30" viewBox="0 0 48 36" style="overflow:visible">
            <ellipse cx="24" cy="30" rx="20" ry="6" fill="rgba(0,0,0,0.35)"/>
            <ellipse cx="24" cy="26" rx="20" ry="7" fill="${chip.color}" opacity="0.4"/>
            <ellipse cx="24" cy="19" rx="20" ry="7" fill="${chip.color}" opacity="0.7"/>
            <ellipse cx="24" cy="12" rx="20" ry="7" fill="${chip.color}"/>
            <ellipse cx="24" cy="12" rx="15" ry="4" fill="rgba(255,255,255,0.18)"/>
          </svg>
          <span style="font-size:10px;font-weight:bold;color:#fff;background:rgba(0,0,0,0.65);padding:1px 5px;border-radius:3px;letter-spacing:0.5px;white-space:nowrap">${chip.label}</span>
        `;

        containerRef.current.appendChild(wrap);
        // Trigger transition on next frame
        requestAnimationFrame(()=>{
          requestAnimationFrame(()=>{
            wrap.style.opacity = "1";
            wrap.style.transform = "scale(1) translateY(0)";
          });
        });
      }, delay);
    });
  }, [chipKey]);

  return null;
}

// Chip position: slightly toward center from each seat
const CHIP_OFFSET = {
  BTN: { x: 62, y: 70 },
  SB:  { x: 50, y: 78 },
  BB:  { x: 36, y: 70 },
  UTG: { x: 26, y: 48 },
  MP:  { x: 41, y: 26 },
  CO:  { x: 58, y: 26 },
};

function Table({pos, oppIn, callerPos, opps=[], chips, chipKey=0}){
  const tableRef = React.useRef(null);
  return (
    <div ref={tableRef} style={{position:"relative",width:"100%",paddingBottom:"60%",marginBottom:4}}>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:"82%",height:"82%",background:"linear-gradient(145deg,#5a3010,#3d1f06,#5a3010)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 30px 90px rgba(0,0,0,0.85),0 0 0 2px #7a4a20"}}>
          <div style={{width:"88%",height:"88%",background:"radial-gradient(ellipse at 38% 32%,#1e7a42 0%,#125c2e 45%,#0b3d1d 100%)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"inset 0 4px 30px rgba(0,0,0,0.5)",position:"relative"}}>
            <div style={{position:"absolute",inset:"14%",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"50%"}}/>
            <span style={{color:"rgba(255,255,255,0.07)",fontSize:10,letterSpacing:4,fontFamily:"Inter,system-ui,sans-serif"}}>HOLD'EM</span>
          </div>
        </div>
      </div>

      <ChipLayer chips={chips} chipKey={chipKey} containerRef={tableRef}/>

      {/* Seats */}
      {Object.entries(POS_COORDS).map(([p,c])=>{
        const isActive=p===pos;
        const isOpp=opps&&opps.some(o=>o.pos===p&&o.active);
        return (
          <div key={p} style={{position:"absolute",left:`${c.x}%`,top:`${c.y}%`,transform:"translate(-50%,-50%)",zIndex:3}}>
            <div style={{width:isActive?52:42,height:isActive?52:42,borderRadius:"50%",
              background:isActive?"radial-gradient(circle at 35% 35%,#fde68a,#d97706)":isOpp&&oppIn?"radial-gradient(circle at 35% 35%,#93c5fd,#1d4ed8)":"radial-gradient(circle at 35% 35%,#4b5563,#1f2937)",
              border:isActive?"2.5px solid #fcd34d":isOpp&&oppIn?"2px solid #60a5fa":"2px solid #374151",
              boxShadow:isActive?"0 0 18px rgba(251,191,36,0.7),0 4px 12px rgba(0,0,0,0.6)":"0 4px 14px rgba(0,0,0,0.6)",
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s"}}>
              <span style={{fontSize:isActive?11:9,fontWeight:"bold",color:isActive?"#1a0a00":isOpp&&oppIn?"#fff":"#6b7280",fontFamily:"Inter,system-ui,sans-serif"}}>{p}</span>
            </div>
            {p==="BTN"&&<div style={{position:"absolute",top:-5,right:-5,width:15,height:15,borderRadius:"50%",background:"linear-gradient(135deg,#f9fafb,#d1d5db)",border:"1px solid #9ca3af",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:"bold",color:"#374151"}}>D</div>}
          </div>
        );
      })}
    </div>
  );
}


// Stats page
function StatsPage({posStats, stats, onBack, onReset}){
  const positions=["UTG","MP","CO","BTN","SB"];
  const total=stats.correct+stats.wrong;
  const globalAcc=total>0?Math.round(stats.correct/total*100):0;

  // Find best and worst
  const withAcc=positions.map(p=>{
    const t=posStats[p].c+posStats[p].w;
    return {p, t, acc:t>0?Math.round(posStats[p].c/t*100):null};
  }).filter(x=>x.t>0);
  const best=withAcc.length>0?withAcc.reduce((a,b)=>a.acc>b.acc?a:b):null;
  const worst=withAcc.length>0?withAcc.reduce((a,b)=>a.acc<b.acc?a:b):null;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#09090f,#0f0f1a)",padding:"14px",fontFamily:"Inter,system-ui,sans-serif"}}>
      <style>{`.sbtn{transition:all .15s;cursor:pointer;border:none;font-family:Georgia,serif;}.sbtn:hover{filter:brightness(1.1);}`}</style>
      <div style={{maxWidth:440,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontFamily:"Inter,system-ui,sans-serif",fontSize:12}}>← Back</button>
          <div>
            <div style={{fontSize:10,color:"#374151",letterSpacing:3}}>ANALYTICS</div>
            <div style={{fontSize:18,color:"#00c853",fontWeight:"bold",letterSpacing:2}}>STATISTICS</div>
          </div>
        </div>

        {/* Global stats */}
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          {[
            {l:"HANDS PLAYED",v:stats.hands,c:"#00c853"},
            {l:"CORRECT",v:stats.correct,c:"#4ade80"},
            {l:"ERRORS",v:stats.wrong,c:"#f87171"},
            {l:"ACCURACY",v:globalAcc+"%",c:globalAcc>=70?"#4ade80":globalAcc>=50?"#fbbf24":"#f87171"},
          ].map(s=>(
            <div key={s.l} style={{flex:1,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:"bold",color:s.c,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:8,color:"#4a5568",letterSpacing:1,marginTop:3}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Best / worst */}
        {best&&worst&&best.p!==worst.p&&(
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <div style={{flex:1,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:10,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#4a5568",letterSpacing:2,marginBottom:4}}>BEST POSITION</div>
              <div style={{fontSize:24,color:"#4ade80",fontWeight:"bold"}}>{best.p}</div>
              <div style={{fontSize:13,color:"#4ade80"}}>{best.acc}% accuracy</div>
              <div style={{fontSize:10,color:"#4a5568"}}>{best.t} decisions</div>
            </div>
            <div style={{flex:1,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:10,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#4a5568",letterSpacing:2,marginBottom:4}}>WEAKEST POSITION</div>
              <div style={{fontSize:24,color:"#f87171",fontWeight:"bold"}}>{worst.p}</div>
              <div style={{fontSize:13,color:"#f87171"}}>{worst.acc}% accuracy</div>
              <div style={{fontSize:10,color:"#4a5568"}}>{worst.t} decisions</div>
            </div>
          </div>
        )}

        {/* Per-position bars */}
        <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"14px",marginBottom:14}}>
          <div style={{fontSize:10,color:"#374151",letterSpacing:3,marginBottom:12}}>BY POSITION</div>
          {positions.map(p=>{
            const t=posStats[p].c+posStats[p].w;
            const acc=t>0?Math.round(posStats[p].c/t*100):null;
            const barColor=acc===null?"#1f2937":acc>=70?"#16a34a":acc>=50?"#d97706":"#dc2626";
            return (
              <div key={p} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,fontWeight:"bold",color:"#00c853",width:30}}>{p}</span>
                    <span style={{fontSize:10,color:"#4a5568"}}>{t>0?`${posStats[p].c}/${t} correct`:"no data"}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:"bold",color:acc===null?"#374151":acc>=70?"#4ade80":acc>=50?"#fbbf24":"#f87171"}}>
                    {acc!==null?acc+"%":"—"}
                  </span>
                </div>
                <div style={{height:6,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{
                    height:"100%",borderRadius:3,
                    width:acc!==null?acc+"%":"0%",
                    background:`linear-gradient(90deg,${barColor},${barColor}cc)`,
                    transition:"width .4s ease",
                  }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Advice based on stats */}
        {withAcc.length>=3&&(
          <div style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontSize:10,color:"#00a844",letterSpacing:2,marginBottom:6}}>RECOMMENDATION</div>
            {worst&&worst.acc<60&&(
              <div style={{fontSize:12,color:"#00c853",lineHeight:1.5}}>
                Most errors at position <strong>{worst.p}</strong> ({worst.acc}%). 
                {worst.p==="UTG"?" UTG — tightest position, play top hands only.":
                 worst.p==="SB"?" SB — tricky spot, many hands go to fold.":
                 " Study this position range in the editor."}
              </div>
            )}
            {globalAcc>=80&&<div style={{fontSize:12,color:"#4ade80"}}>Отличная accuracy! Попробуйте усложнить rangeы в редакторе.</div>}
          </div>
        )}

        <button className="sbtn" onClick={onReset} style={{width:"100%",padding:"12px 0",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",fontSize:12,letterSpacing:2}}>
          RESET STATS
        </button>
      </div>
    </div>
  );
}

// Default 3bet ranges vs each opener position
const DEFAULT_3BET_RANGES = {
  vsUTG: new Set(["AA","KK","QQ","AKs","AKo"]),
  vsMP:  new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs"]),
  vsCO:  new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs"]),
  vsBTN: new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","ATs","A5s","A4s","A3s","KQs","QJs","JTs","T9s"]),
  vsSB:  new Set(["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs","A5s","A4s","KQs","QJs"]),
};

// Defense ranges: call vs open from each position
const DEFAULT_DEFENSE_RANGES = {
  // BB defense vs each opener
  BB_UTG: new Set(["JJ","TT","99","88","77","66","55","44","33","22",
    "AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","QJs","QTs","JTs","T9s","98s","87s","76s","65s","54s",
    "AQo","AJo","ATo","KQo","KJo"]),
  BB_MP: new Set(["JJ","TT","99","88","77","66","55","44","33","22",
    "AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","K8s","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","87s","76s","65s","54s",
    "AQo","AJo","ATo","A9o","KQo","KJo","KTo","QJo"]),
  BB_CO: new Set(["TT","99","88","77","66","55","44","33","22",
    "AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","K8s","K7s","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","97s","87s","86s","76s","65s","54s",
    "AQo","AJo","ATo","A9o","A8o","KQo","KJo","KTo","QJo","QTo"]),
  BB_BTN: new Set(["99","88","77","66","55","44","33","22",
    "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","K8s","K7s","K6s","QJs","QTs","Q9s","Q8s","JTs","J9s","J8s","T9s","T8s","98s","97s","87s","86s","76s","75s","65s","64s","54s",
    "AJo","ATo","A9o","A8o","A7o","KQo","KJo","KTo","K9o","QJo","QTo","JTo"]),
  BB_SB: new Set(["99","88","77","66","55","44","33","22",
    "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","K8s","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","87s","76s","65s",
    "AJo","ATo","A9o","A8o","KQo","KJo","KTo","QJo","QTo","JTo"]),

  // SB defense vs each opener (OOP — tighter ranges)
  SB_UTG: new Set(["QQ","JJ","TT","AKs","AQs","AJs","KQs"]),
  SB_MP:  new Set(["QQ","JJ","TT","99","AKs","AQs","AJs","ATs","KQs","QJs"]),
  SB_CO:  new Set(["JJ","TT","99","88","AQs","AJs","ATs","A9s","A5s","KQs","KJs","QJs","JTs","AQo","KQo"]),
  SB_BTN: new Set(["JJ","TT","99","88","77","AQs","AJs","ATs","A9s","A8s","A5s","A4s","KQs","KJs","KTs","QJs","QTs","JTs","T9s","AQo","AJo","KQo","KJo"]),

  // BTN defense vs each opener
  BTN_UTG: new Set(["QQ","JJ","TT","99","AKs","AQs","AJs","KQs","KJs","QJs","JTs"]),
  BTN_MP:  new Set(["JJ","TT","99","88","77","AQs","AJs","ATs","KQs","KJs","KTs","QJs","QTs","JTs","T9s","AQo","KQo"]),
  BTN_CO:  new Set(["JJ","TT","99","88","77","66","AQs","AJs","ATs","A9s","A8s","KQs","KJs","KTs","K9s","QJs","QTs","JTs","J9s","T9s","T8s","98s","87s","76s","AQo","AJo","KQo","KJo"]),

  // CO defense vs each opener
  CO_UTG: new Set(["QQ","JJ","TT","99","AKs","AQs","AJs","KQs","QJs","JTs"]),
  CO_MP:  new Set(["JJ","TT","99","88","77","AQs","AJs","ATs","A9s","KQs","KJs","QJs","JTs","T9s","AQo","KQo"]),

  // MP defense vs UTG
  MP_UTG: new Set(["QQ","JJ","TT","99","88","AKs","AQs","AJs","ATs","KQs","KJs","QJs","JTs","AQo","KQo"]),
};

function RangeGrid({rangeSet, onToggle, label}){
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(13,1fr)",gap:2,marginBottom:8}}>
        {RANKS.map((r,row)=>RANKS.map((c,col)=>{
          const hand=handAt(row,col);
          const inRange=rangeSet.has(hand);
          const isPair=row===col;
          const isSuited=row<col;
          return (
            <div key={hand} className="cell" onClick={()=>onToggle(hand)}
              style={{
                aspectRatio:"1",
                background:inRange
                  ? isPair?"linear-gradient(135deg,#1d4ed8,#1e40af)"
                    : isSuited?"linear-gradient(135deg,#166534,#14532d)"
                    : "linear-gradient(135deg,#7f1d1d,#991b1b)"
                  : isPair?"rgba(99,179,237,0.06)"
                    : isSuited?"rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                border:inRange
                  ? isPair?"1px solid #3b82f6":isSuited?"1px solid #22c55e":"1px solid #ef4444"
                  : "1px solid rgba(255,255,255,0.05)",
                color:inRange?"#fff":"#374151",
                opacity:inRange?1:0.45,
              }}>
              {hand.length<=3?hand:hand.slice(0,-1)}
            </div>
          );
        }))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#4a5568",marginBottom:4}}>
        <span>
          <span style={{color:"#4ade80",fontWeight:"bold"}}>{rangeSet.size}</span> hands ·{" "}
          <span style={{color:"#00c853",fontWeight:"bold"}}>
            {[...rangeSet].reduce((a,h)=>a+(h.length===2?6:h.endsWith("s")?4:12),0)}
          </span> combos ·{" "}
          <span style={{color:"#94a3b8"}}>
            {([...rangeSet].reduce((a,h)=>a+(h.length===2?6:h.endsWith("s")?4:12),0)/1326*100).toFixed(1)}%
          </span>
        </span>
        <span style={{color:"#374151"}}>BLUE=pairs GREEN=suited RED=offsuit</span>
      </div>
    </div>
  );
}

// Range Editor page
function RangeEditor({ranges, threebetRanges, onSave, onBack}){
  const [tab, setTab] = useState("open"); // "open" | "3bet"
  const [pos, setPos] = useState("BTN");
  const [vsPos, setVsPos] = useState("vsBTN");
  const [current, setCurrent] = useState(()=>({
    UTG:new Set(ranges.UTG), MP:new Set(ranges.MP),
    CO:new Set(ranges.CO), BTN:new Set(ranges.BTN), SB:new Set(ranges.SB),
  }));
  const [current3bet, setCurrent3bet] = useState(()=>({
    vsUTG:new Set(threebetRanges?.vsUTG||DEFAULT_3BET_RANGES.vsUTG),
    vsMP: new Set(threebetRanges?.vsMP ||DEFAULT_3BET_RANGES.vsMP),
    vsCO: new Set(threebetRanges?.vsCO ||DEFAULT_3BET_RANGES.vsCO),
    vsBTN:new Set(threebetRanges?.vsBTN||DEFAULT_3BET_RANGES.vsBTN),
    vsSB: new Set(threebetRanges?.vsSB ||DEFAULT_3BET_RANGES.vsSB),
  }));
  const [vsDefPos, setVsDefPos] = useState("BB_BTN");
  const [currentDef, setCurrentDef] = useState(()=>{
    const d={};
    for(const k of Object.keys(DEFAULT_DEFENSE_RANGES)) d[k]=new Set(DEFAULT_DEFENSE_RANGES[k]);
    return d;
  });
  function toggleDef(hand){
    const s=new Set(currentDef[vsDefPos]||new Set());
    if(s.has(hand)) s.delete(hand); else s.add(hand);
    setCurrentDef(c=>({...c,[vsDefPos]:s}));
  }
  function resetDef(){
    setCurrentDef(c=>({...c,[vsDefPos]:new Set(DEFAULT_DEFENSE_RANGES[vsDefPos]||[])}));
  }

  function toggleOpen(hand){
    const s=new Set(current[pos]);
    if(s.has(hand)) s.delete(hand); else s.add(hand);
    setCurrent(c=>({...c,[pos]:s}));
  }
  function toggle3bet(hand){
    const s=new Set(current3bet[vsPos]);
    if(s.has(hand)) s.delete(hand); else s.add(hand);
    setCurrent3bet(c=>({...c,[vsPos]:s}));
  }
  function resetOpen(){ setCurrent(c=>({...c,[pos]:new Set(DEFAULT_RANGES[pos])})); }
  function reset3bet(){ setCurrent3bet(c=>({...c,[vsPos]:new Set(DEFAULT_3BET_RANGES[vsPos])})); }

  return (
    <div style={{minHeight:"100vh",background:"#0d1117",padding:"14px",fontFamily:"Inter,system-ui,sans-serif"}}>
      <style>{`
        .cell{transition:all .1s ease;cursor:pointer;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;font-family:Inter,system-ui,sans-serif;}
        .cell:active{transform:scale(0.92);}
        .pos-btn{transition:all .15s;cursor:pointer;border:none;font-family:Inter,system-ui,sans-serif;}
      `}</style>
      <div style={{maxWidth:440,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontFamily:"Inter,system-ui,sans-serif",fontSize:12}}>← Back</button>
          <div>
            <div style={{fontSize:10,color:"#4a5568",letterSpacing:3}}>PREFLOP</div>
            <div style={{fontSize:16,color:"#00c853",fontWeight:800,letterSpacing:1}}>RANGE EDITOR</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{display:"flex",gap:4,marginBottom:14,background:"#161b22",borderRadius:10,padding:4}}>
          {[["open","📂 OPEN"],["3bet","🔺 3-BET"],["defense","🛡️ DEFENSE"]].map(([t,label])=>(
            <button key={t} className="pos-btn" onClick={()=>setTab(t)} style={{
              flex:1,padding:"9px 0",borderRadius:7,fontSize:10,fontWeight:700,
              background:tab===t?(t==="defense"?"#1d4ed8":t==="3bet"?"#dc2626":"#00c853"):"transparent",
              border:"none",
              color:tab===t?"#fff":"#4a5568",
              letterSpacing:0.3,
            }}>{label}</button>
          ))}
        </div>

        {tab==="open"&&(
          <>
            {/* Open range position tabs */}
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {["UTG","MP","CO","BTN","SB"].map(p=>(
                <button key={p} className="pos-btn" onClick={()=>setPos(p)} style={{
                  flex:1,padding:"8px 0",borderRadius:8,fontSize:11,fontWeight:700,
                  background:pos===p?"#00c853":"#161b22",
                  border:pos===p?"none":"1px solid #21262d",
                  color:pos===p?"#000":"#4a5568",
                }}>{p}</button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <button onClick={resetOpen} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"Inter,system-ui,sans-serif"}}>reset</button>
            </div>
            <RangeGrid rangeSet={current[pos]} onToggle={toggleOpen}/>
          </>
        )}

        {tab==="3bet"&&(
          <>
            <div style={{fontSize:11,color:"#4a5568",marginBottom:8,letterSpacing:1}}>YOUR 3-BET RANGE VS OPENER:</div>
            {/* vs position tabs */}
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[["vsUTG","vs UTG"],["vsMP","vs MP"],["vsCO","vs CO"],["vsBTN","vs BTN"],["vsSB","vs SB"]].map(([v,label])=>(
                <button key={v} className="pos-btn" onClick={()=>setVsPos(v)} style={{
                  flex:1,padding:"7px 0",borderRadius:8,fontSize:9,fontWeight:700,
                  background:vsPos===v?"#dc2626":"#161b22",
                  border:vsPos===v?"none":"1px solid #21262d",
                  color:vsPos===v?"#fff":"#4a5568",
                }}>{label}</button>
              ))}
            </div>

            {/* Context info */}
            <div style={{background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#f87171"}}>
              Hands you 3-bet when <strong style={{color:"#fff"}}>{vsPos.replace("vs","")}</strong> opens.
              Tight vs UTG/MP, wider vs BTN/SB.
            </div>

            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <button onClick={reset3bet} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"Inter,system-ui,sans-serif"}}>reset</button>
            </div>
            <RangeGrid rangeSet={current3bet[vsPos]} onToggle={toggle3bet}/>
          </>
        )}

        {tab==="defense"&&(()=>{
          // My position → possible openers that act before me
          const MY_POSITIONS = ["BB","SB","BTN","CO","MP"];
          const OPENERS_FOR = {
            BB:  ["UTG","MP","CO","BTN","SB"],
            SB:  ["UTG","MP","CO","BTN"],
            BTN: ["UTG","MP","CO"],
            CO:  ["UTG","MP"],
            MP:  ["UTG"],
          };
          const [myPos, opener] = vsDefPos.includes("_") ? vsDefPos.split("_") : ["BB","BTN"];
          const myPosSel = vsDefPos.split("_")[0] || "BB";
          const openerSel = vsDefPos.split("_")[1] || "BTN";
          const availableOpeners = OPENERS_FOR[myPosSel] || [];

          return (
            <>
              <div style={{fontSize:11,color:"#4a5568",marginBottom:10,letterSpacing:1}}>
                YOUR DEFENSE (CALL) RANGE:
              </div>

              {/* Step 1: My position */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"#4a5568",marginBottom:6,letterSpacing:2}}>MY POSITION</div>
                <div style={{display:"flex",gap:6}}>
                  {MY_POSITIONS.map(p=>(
                    <button key={p} className="pos-btn"
                      onClick={()=>{
                        const newOpeners=OPENERS_FOR[p]||[];
                        const firstOpener=newOpeners[0]||"UTG";
                        setVsDefPos(`${p}_${firstOpener}`);
                      }}
                      style={{
                        flex:1,padding:"9px 0",borderRadius:8,fontSize:11,fontWeight:700,
                        background:myPosSel===p?"#1d4ed8":"#161b22",
                        border:myPosSel===p?"none":"1px solid #21262d",
                        color:myPosSel===p?"#fff":"#4a5568",
                      }}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Step 2: Opener position */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,color:"#4a5568",marginBottom:6,letterSpacing:2}}>OPENER</div>
                <div style={{display:"flex",gap:6}}>
                  {availableOpeners.map(p=>(
                    <button key={p} className="pos-btn"
                      onClick={()=>setVsDefPos(`${myPosSel}_${p}`)}
                      style={{
                        flex:1,padding:"9px 0",borderRadius:8,fontSize:11,fontWeight:700,
                        background:openerSel===p?"#dc2626":"#161b22",
                        border:openerSel===p?"none":"1px solid #21262d",
                        color:openerSel===p?"#fff":"#4a5568",
                      }}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Context hint */}
              <div style={{background:"rgba(29,78,216,0.08)",border:"1px solid rgba(29,78,216,0.2)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#93c5fd"}}>
                You are in <strong style={{color:"#fff"}}>{myPosSel}</strong>, {openerSel} opened.
                Hands you <strong style={{color:"#fff"}}>CALL</strong> with — fold everything else.
              </div>

              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
                <button onClick={resetDef} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"Inter,system-ui,sans-serif"}}>reset</button>
              </div>

              {currentDef[vsDefPos]
                ? <RangeGrid rangeSet={currentDef[vsDefPos]} onToggle={toggleDef}/>
                : <div style={{textAlign:"center",color:"#4a5568",fontSize:12,padding:"20px 0"}}>
                    No data for {myPosSel} vs {openerSel} — select a valid combination
                  </div>
              }
            </>
          );
        })()}

        <div style={{marginTop:14}}>
          <button onClick={()=>onSave(current, current3bet, currentDef)} style={{width:"100%",padding:"14px 0",borderRadius:12,background:"linear-gradient(135deg,#00a844,#00c853)",border:"none",color:"#000",fontSize:14,fontWeight:800,letterSpacing:2,cursor:"pointer",fontFamily:"Inter,system-ui,sans-serif"}}>
            SAVE & PLAY
          </button>
        </div>
      </div>
    </div>
  );
}

// Main trainer
export default function App(){
  const [page, setPage] = useState("train"); // "train" | "ranges" | "stats"
  const [mode, setMode] = useState("preflop"); // "full" | "preflop"
  const [ranges, setRanges] = useState(DEFAULT_RANGES);
  const [threebetRanges, setThreebetRanges] = useState(DEFAULT_3BET_RANGES);
  const [g, setG] = useState(null);
  const [stats, setStats] = useState({correct:0,wrong:0,hands:0});
  // posStats: { UTG: {correct:0,wrong:0}, MP: ... }
  const [posStats, setPosStats] = useState({UTG:{c:0,w:0},MP:{c:0,w:0},CO:{c:0,w:0},BTN:{c:0,w:0},SB:{c:0,w:0}});
  const [animKey, setAnimKey] = useState(0);
  const [hint, setHint] = useState(null);
  const [showBetSizes, setShowBetSizes] = useState(false);
  // chips stored inside g.chips now

  const deal = useCallback((currentRanges=null)=>{
    const r=currentRanges||ranges;
    const deck=shuffle(newDeck());
    let i=0;
    const positions=["UTG","MP","CO","BTN","SB"];
    const pos=positions[Math.floor(Math.random()*positions.length)];

    // Decide number of opponents: 60% = 1, 30% = 2, 10% = 3
    const roll=Math.random();
    const numOpps = roll<0.1 ? 3 : roll<0.4 ? 2 : 1;

    // Pick opponents from available positions (not hero)
    const available=POSSIBLE_CALLERS[pos].filter(p=>p!==pos);
    const shuffled=shuffle(available);
    const oppPositions=shuffled.slice(0, Math.min(numOpps, shuffled.length));

    // Postflop order: SB first, then BB, then UTG→BTN
    const postflopOrder=["SB","BB","UTG","MP","CO","BTN"];
    const heroPostIdx=postflopOrder.indexOf(pos);

    // Hero is IP if all opponents act before him postflop
    const heroIP = oppPositions.every(p=>postflopOrder.indexOf(p)<heroPostIdx);

    // Build opponents array with cards and ranges
    const opps = oppPositions.map(oppPos=>({
      pos: oppPos,
      cards: [deck[i++],deck[i++]],
      rangeKey: oppPos,
      active: true, // still in hand
    }));

    const heroCards=[deck[i++],deck[i++]];
    const flop=[deck[i++],deck[i++],deck[i++]];
    const turn=deck[i++];
    const river=deck[i++];
    const hand=handNotation(heroCards[0],heroCards[1]);

    // Legacy single-opp fields for compatibility
    const callerPos=opps[0]?.pos||"BB";

    // In preflop mode: sometimes generate a scenario where someone opened before hero
    let preflopScenario="open"; // "open" | "vs_open" | "vs_open_and_call"
    let openedBy=null; // who opened before hero
    let callerBeforeHero=null; // who cold-called before hero

    if(modeRef.current==="preflop"){
      const roll2=Math.random();
      const postflopOrder2=["SB","BB","UTG","MP","CO","BTN"];
      const heroIdx2=postflopOrder2.indexOf(pos);
      const earlierPositions=postflopOrder2.slice(2, heroIdx2); // positions that act before hero preflop
      if(roll2<0.25 && earlierPositions.length>0){
        preflopScenario="vs_open";
        openedBy=earlierPositions[Math.floor(Math.random()*earlierPositions.length)];
      } else if(roll2<0.45 && earlierPositions.length>1){
        preflopScenario="vs_open_and_call";
        openedBy=earlierPositions[0];
        callerBeforeHero=earlierPositions[Math.floor(Math.random()*(earlierPositions.length-1))+1];
      }
    }

    // Pre-populate chips for scenario context
    let initialChips={};
    let initialChipKey=1;
    if(preflopScenario==="vs_open" && openedBy){
      initialChips={[openedBy]:{label:"RAISE",color:"#16a34a"}};
    } else if(preflopScenario==="vs_open_and_call" && openedBy && callerBeforeHero){
      initialChips={
        [openedBy]:{label:"RAISE",color:"#16a34a"},
        [callerBeforeHero]:{label:"CALL",color:"#1d4ed8"},
      };
    }

    setG({
      pos, heroCards, flop, turn, river,
      opps,
      oppCards: opps[0]?.cards||[deck[0],deck[1]],
      callerPos, callerRangeKey:callerPos,
      heroIP,
      street:"preflop", board:[], pot:3, oppIn:false,
      hand, inRange:r[pos]?.has(hand)??false,
      decisions:[], log:[], result:null, betFacing:false,
      preflopScenario, openedBy, callerBeforeHero,
      chips:initialChips, chipKey:initialChipKey,
    });
    setHint(null);
    setShowBetSizes(false);
    setAnimKey(k=>k+1);
  },[ranges]);

  useEffect(()=>{ deal(); },[]);

  // Use ref so act() always reads current mode even in stale closure
  const modeRef = React.useRef(mode);
  React.useEffect(()=>{ modeRef.current=mode; },[mode]);

  function act(action, betSize=0.5){
    if(!g||g.result) return;
    const ng={...g,decisions:[...g.decisions],log:[...g.log]};

    // PREFLOP
    if(ng.street==="preflop"){

      // ── Hero responding to a 3-bet ──
      if(ng.facingThreeBet){
        const street="Preflop vs 3-bet";
        // GTO: 4-bet AA/KK/QQ/AKs, call JJ-99/AQs-AJs/KQs, fold rest
        const FOURBET=new Set(["AA","KK","QQ","AKs","AKo"]);
        const CALL3BET=new Set(["JJ","TT","99","AQs","AJs","KQs","QJs","AQo"]);
        let correctAction, note;
        if(FOURBET.has(ng.hand)){
          correctAction="raise";
          note=`${ng.hand} — 4-bet for value vs 3-bet`;
        } else if(CALL3BET.has(ng.hand)){
          correctAction="call";
          note=`${ng.hand} — call vs 3-bet, enough equity`;
        } else {
          correctAction="fold";
          note=`${ng.hand} — fold vs 3-bet, not enough equity`;
        }
        const playerAction=action==="raise"?"raise":action==="call"?"call":"fold";
        const correct=playerAction===correctAction;
        ng.decisions.push({street,action:action.toUpperCase(),correct,note});
        setStats(s=>({...s,correct:s.correct+(correct?1:0),wrong:s.wrong+(correct?0:1)}));
        setPosStats(ps=>({...ps,[ng.pos]:{c:ps[ng.pos].c+(correct?1:0),w:ps[ng.pos].w+(correct?0:1)}}));

        if(action==="fold"){
          ng.result="fold_preflop";
          setG(ng); return;
        }
        // Call or 4-bet
        ng.log.push(action==="raise"?`You 4-bet`:`You call the 3-bet`);
        ng.facingThreeBet=false;
        ng.betFacing=false;
        ng.chips={[ng.pos]:{label:action==="raise"?"4-BET":"CALL",color:action==="raise"?"#dc2626":"#1d4ed8"}};
        ng.chipKey=(ng.chipKey||0)+1;

        if(modeRef.current==="preflop"){
          ng.result="fold_preflop"; // show result in preflop mode
          setG(ng); return;
        }
        ng.oppIn=true;
        ng.street="flop";
        ng.board=ng.flop;
        setG(ng);
        setAnimKey(k=>k+1);
        return;
      }

      // ── Vs open / squeeze scenario ──
      if(ng.preflopScenario==="vs_open"&&!ng.scenarioDone){
        const openPos=ng.openedBy||"UTG";
        // GTO 3-bet range vs open, coldcall range
        const THREEBET_VS={
          BTN:new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs","QJs","JTs","T9s"]),
          CO: new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs","AJs","A5s","KQs","QJs"]),
          MP: new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs","A5s"]),
          SB: new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs"]),
          BB: new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs","QJs","JTs"]),
          UTG:new Set(["AA","KK","QQ","AKs","AKo"]),
        };
        const COLDCALL_VS={
          BTN:new Set(["TT","99","88","77","AQs","AJs","ATs","A9s","KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","AQo","AJo","KQo"]),
          CO: new Set(["TT","99","88","77","AQs","AJs","ATs","KQs","KJs","QJs","JTs","T9s","AQo","KQo"]),
          BB: new Set(["TT","99","88","77","66","55","44","33","22","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","QJs","QTs","JTs","T9s","98s","87s","76s","65s","AQo","AJo","ATo","A9o","KQo","KJo","QJo"]),
          SB: new Set(["TT","99","88","AQs","AJs","ATs","KQs","KJs","QJs","JTs","AQo","KQo"]),
        };
        const myThreebetRange=THREEBET_VS[ng.pos]||THREEBET_VS.CO;
        const myColdcallRange=COLDCALL_VS[ng.pos]||COLDCALL_VS.CO;
        let correctAction, note;
        if(myThreebetRange.has(ng.hand)){
          correctAction="raise"; note=`${ng.hand} — 3-bet vs open from ${openPos}`;
        } else if(myColdcallRange.has(ng.hand)){
          correctAction="call"; note=`${ng.hand} — call vs open from ${openPos}`;
        } else {
          correctAction="fold"; note=`${ng.hand} — fold, not enough vs open from ${openPos}`;
        }
        const playerAction=action==="raise"?"raise":action==="call"?"call":"fold";
        const correct=playerAction===correctAction;
        ng.decisions.push({street:`Preflop vs ${openPos}`,action:action.toUpperCase(),correct,note});
        setStats(s=>({...s,correct:s.correct+(correct?1:0),wrong:s.wrong+(correct?0:1)}));
        setPosStats(ps=>({...ps,[ng.pos]:{c:ps[ng.pos].c+(correct?1:0),w:ps[ng.pos].w+(correct?0:1)}}));
        ng.scenarioDone=true;
        ng.result="fold_preflop";
        ng.chips={[ng.pos]:{label:action==="raise"?"3-BET":action==="call"?"CALL":"FOLD",
          color:action==="raise"?"#dc2626":action==="call"?"#1d4ed8":"#374151"}};
        ng.chipKey=(ng.chipKey||0)+1;
        setG(ng); return;
      }

      if(ng.preflopScenario==="vs_open_and_call"&&!ng.scenarioDone){
        const openPos=ng.openedBy||"UTG";
        const callPos=ng.callerBeforeHero||"MP";
        // Squeeze range: tight value + some bluffs
        const SQUEEZE=new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs"]);
        let correctAction, note;
        if(SQUEEZE.has(ng.hand)){
          correctAction="raise"; note=`${ng.hand} — squeeze vs ${openPos}+${callPos}`;
        } else {
          correctAction="fold"; note=`${ng.hand} — fold, coldcalling multiway is -EV`;
        }
        const playerAction=action==="raise"?"raise":action==="call"?"call":"fold";
        const isCorrect=playerAction===correctAction||(playerAction==="fold"&&correctAction==="fold");
        const correct=playerAction===correctAction;
        ng.decisions.push({street:`Squeeze vs ${openPos}+${callPos}`,action:action.toUpperCase(),correct,note});
        setStats(s=>({...s,correct:s.correct+(correct?1:0),wrong:s.wrong+(correct?0:1)}));
        setPosStats(ps=>({...ps,[ng.pos]:{c:ps[ng.pos].c+(correct?1:0),w:ps[ng.pos].w+(correct?0:1)}}));
        ng.scenarioDone=true;
        ng.result="fold_preflop";
        ng.chips={[ng.pos]:{label:action==="raise"?"SQUEEZE":action==="call"?"CALL":"FOLD",
          color:action==="raise"?"#dc2626":action==="call"?"#1d4ed8":"#374151"}};
        ng.chipKey=(ng.chipKey||0)+1;
        setG(ng); return;
      }

      // ── Normal preflop open decision ──
      const correct=(action==="raise"&&ng.inRange)||(action==="fold"&&!ng.inRange);
      const note=ng.inRange
        ?(correct?"✓ Raise — "+ng.hand+" in range for "+ng.pos:"✗ Should raise — "+ng.hand+" in range for "+ng.pos)
        :(correct?"✓ Fold — "+ng.hand+" outside range for "+ng.pos:"✗ Should fold — "+ng.hand+" not in range for "+ng.pos);
      ng.decisions.push({street:"Preflop",action:action==="raise"?"RAISE":"FOLD",correct,note});
      setStats(s=>({...s,correct:s.correct+(correct?1:0),wrong:s.wrong+(correct?0:1)}));
      setPosStats(ps=>({...ps,[ng.pos]:{c:ps[ng.pos].c+(correct?1:0),w:ps[ng.pos].w+(correct?0:1)}}));

      // Preflop-only mode: after open decision, simulate response then show result
      if(modeRef.current==="preflop"){
        if(action==="fold"){ ng.result="fold_preflop"; setG(ng); return; }
        // Simulate: random opp might 3-bet
        const threebetChance = ng.pos==="UTG"?0.08:ng.pos==="MP"?0.1:ng.pos==="CO"?0.12:ng.pos==="BTN"?0.1:0.15;
        if(Math.random()<threebetChance){
          const threebetPos=["SB","BB","BTN","CO"].find(p=>p!==ng.pos)||"BB";
          ng.log.push(`${threebetPos} 3-bets`);
          ng.chips={[ng.pos]:{label:"RAISE",color:"#16a34a"},[threebetPos]:{label:"3-BET",color:"#dc2626"}};
          ng.chipKey=(ng.chipKey||0)+1;
          ng.facingThreeBet=true;
          ng.threebetPos=threebetPos;
          ng.opps=[{pos:threebetPos,cards:ng.oppCards,rangeKey:threebetPos,active:true,threebet:true}];
          setG(ng); return; // wait for hero 4-bet/call/fold
        }
        ng.result="fold_preflop"; // success — no 3-bet, hand won
        ng.chips={[ng.pos]:{label:"RAISE",color:"#16a34a"}};
        ng.chipKey=(ng.chipKey||0)+1;
        setG(ng); return;
      }

      if(action==="fold"){
        ng.result="fold_preflop";
        setG(ng); return;
      }

      // Each opponent responds based on their range
      const chips={[ng.pos]:{label:"RAISE",color:"#16a34a"}};
      let anyCall=false;
      const newOpps=(ng.opps||[]).map(opp=>{
        const oppHand=handNotation(opp.cards[0],opp.cards[1]);
        const threebetSet=THREEBET_RANGES[opp.pos]||new Set();
        const callSet=CALL_RANGES[opp.rangeKey]||BB_CALL_RANGE;
        const threebet=threebetSet.has(oppHand);
        const calls=!threebet&&callSet.has(oppHand);
        if(threebet){
          anyCall=true;
          chips[opp.pos]={label:"3-BET",color:"#dc2626"};
          ng.log.push(`${opp.pos} 3-bets`);
          ng.betFacing=true; // hero now faces a 3-bet
        } else if(calls){
          anyCall=true;
          chips[opp.pos]={label:"CALL",color:"#1d4ed8"};
          ng.log.push(`${opp.pos} calls`);
        } else {
          ng.log.push(`${opp.pos} folds`);
        }
        return {...opp, active:threebet||calls, threebet};
      });
      // Force at least one caller for learning
      if(!anyCall && newOpps.length>0){
        newOpps[0].active=true;
        chips[newOpps[0].pos]={label:"CALL",color:"#1d4ed8"};
        ng.log.push(`${newOpps[0].pos} calls`);
      }
      ng.opps=newOpps;
      const activeOpps=newOpps.filter(o=>o.active);
      ng.callerPos=activeOpps[0]?.pos||ng.callerPos;
      ng.oppCards=activeOpps[0]?.cards||ng.oppCards;
      ng.chips=chips;
      ng.chipKey=(ng.chipKey||0)+1;

      // Check if anyone 3-bet — hero must respond before going to flop
      const threebettor=newOpps.find(o=>o.active&&o.threebet);
      if(threebettor){
        // Stay on preflop, hero faces 3-bet
        ng.street="preflop";
        ng.oppIn=true;
        ng.betFacing=true;
        ng.facingThreeBet=true;
        ng.threebetPos=threebettor.pos;
        setG(ng);
        return; // wait for hero action: 4-bet, call, fold
      }

      // No 3-bet — go to flop
      ng.oppIn=true;
      ng.street="flop";
      ng.board=ng.flop;
      ng.betFacing=false;
      setG(ng);
      setAnimKey(k=>k+1);
      return;
    }

    // POSTFLOP
    const {correct:correctAction,reason}=postflopAdvice(ng.heroCards,ng.board,ng.betFacing,ng.heroIP??true);
    const playerMapped=action==="bet"||action==="raise"?"bet":action==="call"?"call":action==="check"?"check":"fold";
    const correct=playerMapped===correctAction;
    const streetLabel=ng.street==="flop"?"Flop":ng.street==="turn"?"Turn":"River";
    const betLabel=action==="bet"||action==="raise"?` (${Math.round(betSize*100)}% pot)`:""; ng.decisions.push({street:streetLabel,action:action.toUpperCase()+betLabel,correct,note:reason});
    setStats(s=>({...s,correct:s.correct+(correct?1:0),wrong:s.wrong+(correct?0:1)}));
    setPosStats(ps=>({...ps,[ng.pos]:{c:ps[ng.pos].c+(correct?1:0),w:ps[ng.pos].w+(correct?0:1)}}));

    const heroChipLabel = action==="bet"||action==="raise" ? `${Math.round(betSize*100)}%` : action==="call"?"CALL":"CHECK";
    const heroChipColor = action==="bet"||action==="raise"?"#16a34a":action==="call"?"#1d4ed8":"#6b7280";

    if(action==="fold"){
      ng.result="fold_postflop";
      ng.chips={};
      setG(ng); return;
    }

    // All active opponents respond
    const heroBet=action==="bet"||action==="raise";
    const activeOpps=(ng.opps||[]).filter(o=>o.active);
    const postChips={[ng.pos]:{label:heroChipLabel,color:heroChipColor}};
    let allFolded=activeOpps.length>0;
    const updatedOpps=(ng.opps||[]).map(opp=>{
      if(!opp.active) return opp;
      const act=oppPostflopAction(opp.cards,ng.board,heroBet);
      const lbl=act==="raise"?"RAISE":act==="call"?"CALL":act==="bet"?"BET":"CHECK";
      const col=act==="raise"||act==="bet"?"#dc2626":act==="call"?"#1d4ed8":"#6b7280";
      if(act==="fold"){
        ng.log.push(`${opp.pos} folds`);
        return {...opp,active:false};
      }
      allFolded=false;
      if(act==="raise") ng.log.push(`${opp.pos} raises`);
      else if(act==="call") ng.log.push(`${opp.pos} calls`);
      else if(act==="bet") ng.log.push(`${opp.pos} bets`);
      else ng.log.push(`${opp.pos} checks`);
      if(act!=="check") postChips[opp.pos]={label:lbl,color:col};
      return opp;
    });
    ng.opps=updatedOpps;
    ng.chips=postChips;
    ng.chipKey=(ng.chipKey||0)+1;

    if(allFolded){
      ng.result="win_postflop";
      setG(ng); return;
    }

    // Update primary opp for legacy eval
    const firstActive=updatedOpps.find(o=>o.active);
    if(firstActive){ ng.callerPos=firstActive.pos; ng.oppCards=firstActive.cards; }

    // Next street
    const next=ng.street==="flop"?"turn":ng.street==="turn"?"river":"showdown";
    if(next==="showdown"){
      const fullBoard=[...ng.flop,ng.turn,ng.river];
      const hEval=evalHand([...ng.heroCards,...fullBoard]);
      const oEval=evalHand([...ng.oppCards,...fullBoard]);
      ng.board=fullBoard;
      ng.heroEval=hEval;
      ng.oppEval=oEval;
      ng.result=hEval.score>oEval.score?"win":hEval.score===oEval.score?"tie":"lose";
      setG(ng); return;
    }
    ng.street=next;
    ng.board=next==="turn"?[...ng.flop,ng.turn]:[...ng.flop,ng.turn,ng.river];
    // First active OOP opp may bet on next street
    const firstOop=(ng.opps||[]).find(o=>o.active);
    if(firstOop){
      const bbNextAct=oppPostflopAction(firstOop.cards,ng.board,false);
      ng.betFacing=bbNextAct==="bet";
      if(ng.betFacing) ng.log.push(`${firstOop.pos} bets on ${next}`);
    } else {
      ng.betFacing=false;
    }
    ng.chips={};
    setG(ng);
    setAnimKey(k=>k+1);
  }

  function showHint(){
    if(!g) return;
    if(g.street==="preflop"){
      if(g.facingThreeBet){
        const FOURBET=new Set(["AA","KK","QQ","AKs","AKo"]);
        const CALL3BET=new Set(["JJ","TT","99","AQs","AJs","KQs","QJs","AQo"]);
        const advice=FOURBET.has(g.hand)?"4-BET":CALL3BET.has(g.hand)?"CALL":"FOLD";
        setHint(`GTO vs 3-bet: ${advice} with ${g.hand}`);
      } else if(g.preflopScenario==="vs_open"&&!g.scenarioDone){
        const openPos=g.openedBy||"UTG";
        const THREEBET_VS={BTN:new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs","QJs","JTs","T9s"]),CO:new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs","AJs","A5s","KQs","QJs"]),SB:new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs"]),BB:new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs","QJs","JTs"]),UTG:new Set(["AA","KK","QQ","AKs","AKo"]),MP:new Set(["AA","KK","QQ","AKs","AKo"])};
        const COLDCALL_VS={BTN:new Set(["TT","99","88","77","AQs","AJs","ATs","KQs","KJs","QJs","JTs","T9s","AQo","KQo"]),BB:new Set(["TT","99","88","77","66","55","AQs","AJs","ATs","A9s","KQs","KJs","QJs","JTs","T9s","AQo","AJo","KQo"]),CO:new Set(["TT","99","88","AQs","AJs","KQs","QJs","JTs","AQo"])};
        const t=THREEBET_VS[g.pos]||THREEBET_VS.CO;
        const c=COLDCALL_VS[g.pos]||COLDCALL_VS.CO;
        const advice=t.has(g.hand)?`3-BET`:c.has(g.hand)?`CALL`:`FOLD`;
        setHint(`GTO vs ${openPos}: ${advice} with ${g.hand}`);
      } else if(g.preflopScenario==="vs_open_and_call"&&!g.scenarioDone){
        const SQUEEZE=new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs","A5s","A4s","KQs"]);
        const advice=SQUEEZE.has(g.hand)?"SQUEEZE":"FOLD";
        setHint(`GTO squeeze: ${advice} with ${g.hand}`);
      } else {
        setHint(g.inRange?`GTO: RAISE — ${g.hand} in open range for ${g.pos}`:`GTO: FOLD — ${g.hand} outside rangeа ${g.pos}`);
      }
    } else {
      const {correct,reason}=postflopAdvice(g.heroCards,g.board,g.betFacing,g.heroIP??true);
      setHint(`GTO: ${correct.toUpperCase()} — ${reason}`);
    }
  }

  function saveRanges(newRanges, new3betRanges, newDefRanges){
    const converted={};
    for(const pos of Object.keys(newRanges)) converted[pos]=new Set(newRanges[pos]);
    setRanges(converted);
    if(new3betRanges){
      const converted3bet={};
      for(const pos of Object.keys(new3betRanges)) converted3bet[pos]=new Set(new3betRanges[pos]);
      setThreebetRanges(converted3bet);
    }
    setPage("train");
    deal(converted);
  }

  if(page==="ranges") return <RangeEditor ranges={ranges} threebetRanges={threebetRanges} onSave={saveRanges} onBack={()=>setPage("train")}/>
  if(page==="stats") return <StatsPage posStats={posStats} stats={stats} onBack={()=>setPage("train")} onReset={()=>{setPosStats({UTG:{c:0,w:0},MP:{c:0,w:0},CO:{c:0,w:0},BTN:{c:0,w:0},SB:{c:0,w:0}});setStats({correct:0,wrong:0,hands:0});}}/>;
  if(!g) return <div style={{minHeight:"100vh",background:"#09090f",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>...</div>;

  const done=!!g.result;
  const streetLabel={"preflop":"PREFLOP","flop":"FLOP","turn":"TURN","river":"RIVER"}[g.street]||"SHOWDOWNЫТИЕ";
  const mistakes=g.decisions.filter(d=>!d.correct).length;

  const OUTCOME={
    fold_preflop:{t:g.decisions[0]?.correct?"✓ Correct fold":"✗ Should have raised",c:g.decisions[0]?.correct?"#4ade80":"#f87171"},
    win_postflop:{t:"BB folded",c:"#4ade80"},
    fold_postflop:{t:"You folded",c:"#94a3b8"},
    win:{t:"Won at showdown 🏆",c:"#4ade80"},
    lose:{t:"Lost at showdown",c:"#f87171"},
    tie:{t:"Split pot",c:"#00c853"},
  };

  return (
    <div style={{minHeight:"100vh",background:"#0d1117",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"14px 14px 30px",fontFamily:"Inter,system-ui,sans-serif"}}>
    <style>{`
      @keyframes dealCard{from{opacity:0;transform:translateY(-40px) rotate(-8deg) scale(0.8)}to{opacity:1;transform:none}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
      @keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
      @keyframes chipPop{0%{opacity:0;transform:scale(0.2) translateY(10px)}60%{transform:scale(1.2) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
      .btn{transition:all .15s ease;cursor:pointer;border:none;font-family:Georgia,serif;}
      .btn:hover{filter:brightness(1.15);transform:translateY(-2px)}
      .btn:active{transform:scale(0.96)}
    `}</style>
    <div style={{width:"100%",maxWidth:440}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <div style={{fontSize:10,letterSpacing:3,color:"#4a5568",fontWeight:600}}>6-MAX NO LIMIT HOLD'EM</div>
          <div style={{fontSize:18,color:"#00c853",fontWeight:800,letterSpacing:1}}>♠ RANGE TRAINER</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button className="btn" onClick={()=>setPage("stats")} style={{background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.25)",color:"#60a5fa",borderRadius:8,padding:"8px 10px",fontSize:11,letterSpacing:1}}>
            📈 STATS
          </button>
          <button className="btn" onClick={()=>setPage("ranges")} style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.25)",color:"#00c853",borderRadius:8,padding:"8px 10px",fontSize:11,letterSpacing:1}}>
            📊 RANGES
          </button>
        </div>
      </div>



      {/* Stats */}
      <div style={{display:"flex",justifyContent:"space-around",background:"#161b22",border:"1px solid #21262d",borderRadius:10,padding:"8px",marginBottom:10}}>
        {[{l:"HAND",v:stats.hands+1,c:"#00c853"},{l:"CORRECT",v:stats.correct,c:"#4ade80"},{l:"ERRORS",v:stats.wrong,c:"#f87171"},{l:"STREET",v:streetLabel,c:"#94a3b8"}].map(s=>(
          <div key={s.l} style={{textAlign:"center"}}>
            <div style={{fontSize:s.l==="STREET"?10:18,fontWeight:"bold",color:s.c,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:9,color:"#4a5568",letterSpacing:1.5,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:16,padding:"10px 10px 2px",marginBottom:10}}>
        <Table pos={g.pos} oppIn={g.oppIn} callerPos={g.callerPos} opps={g.opps||[]} chips={g.chips||{}} chipKey={g.chipKey||0}/>
        <div style={{textAlign:"center",paddingBottom:6,fontSize:11,color:"#6b7280",letterSpacing:2}}>
          POSITION: <span style={{color:"#00c853",fontWeight:"bold"}}>{g.pos}</span>
          {g.opps&&g.opps.length>0&&<span style={{color:"#94a3b8",marginLeft:8}}>vs <span style={{color:"#60a5fa",fontWeight:"bold",fontSize:13}}>{g.opps.map(o=>o.pos).join(", ")}</span></span>}
          {g.heroIP!==undefined&&g.oppIn&&<span style={{color:g.heroIP?"#4ade80":"#f87171",marginLeft:8}}>· {g.heroIP?"IP":"OOP"}</span>}
          {g.betFacing&&g.street==="preflop"&&!done&&<span style={{color:"#dc2626",marginLeft:8,fontWeight:"bold"}}>· 3-BET!</span>}{g.betFacing&&g.street!=="preflop"&&!done&&<span style={{color:"#fb923c",marginLeft:8}}>· bets</span>}
        </div>
        {/* Board texture indicator */}
        {g.board.length>=3&&(()=>{
          const tx=boardTexture(g.board);
          return <div style={{textAlign:"center",paddingBottom:6,fontSize:10,color:tx.wet?"#fb923c":tx.paired?"#a78bfa":"#4a5568",letterSpacing:1}}>
            BOARD: {tx.label||"rainbow"}
          </div>;
        })()}
      </div>



      {/* Hero cards */}
      <div key={"h"+animKey} style={{display:"flex",justifyContent:"center",gap:18,marginBottom:12}}>
        <Card card={g.heroCards[0]} delay={0}/>
        <Card card={g.heroCards[1]} delay={0.12}/>
      </div>

      {/* Scenario context */}
      {g.street==="preflop"&&g.preflopScenario&&g.preflopScenario!=="open"&&!g.scenarioDone&&(
        <div style={{textAlign:"center",marginBottom:8,padding:"7px 14px",borderRadius:10,
          background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.3)"}}>
          {g.preflopScenario==="vs_open"&&(
            <span style={{fontSize:12,color:"#fca5a5"}}>
              <span style={{color:"#f87171",fontWeight:"bold"}}>{g.openedBy}</span> opened — your action
            </span>
          )}
          {g.preflopScenario==="vs_open_and_call"&&(
            <span style={{fontSize:12,color:"#fca5a5"}}>
              <span style={{color:"#f87171",fontWeight:"bold"}}>{g.openedBy}</span> opened,{" "}
              <span style={{color:"#f87171",fontWeight:"bold"}}>{g.callerBeforeHero}</span> called — squeeze?
            </span>
          )}
        </div>
      )}

      {/* Hand */}
      <div style={{textAlign:"center",marginBottom:10}}>
        <span style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:20,padding:"3px 18px",fontSize:12,color:"#94a3b8",letterSpacing:3}}>
          {g.hand}{g.heroEval&&<span style={{marginLeft:8,color:"#00c853"}}>— {g.heroEval.name}</span>}
        </span>
      </div>

      {/* Log */}
      {g.log.length>0&&(
        <div style={{marginBottom:10,background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:8,padding:"6px 12px"}}>
          {g.log.slice(-3).map((l,i)=><div key={i} style={{fontSize:11,color:"#60a5fa",marginBottom:1}}>{l}</div>)}
        </div>
      )}

      {/* Hint */}
      {hint&&<div style={{background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.3)",borderRadius:10,padding:"8px 14px",marginBottom:10,fontSize:12,color:"#00c853",textAlign:"center",animation:"fadeIn .2s ease both"}}>{hint}</div>}

      {/* Buttons */}
      {!done&&(
        <div>
          {g.street==="preflop"?(
            <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
              {g.facingThreeBet?(
                <>
                  <button className="btn" onClick={()=>act("raise")} style={{flex:1,padding:"13px 0",borderRadius:10,background:"linear-gradient(135deg,#7f1d1d,#b91c1c)",border:"1px solid #ef4444",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>4-BET</button>
                  <button className="btn" onClick={()=>act("call")} style={{flex:1,padding:"13px 0",borderRadius:10,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"1px solid #60a5fa",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>CALL</button>
                  <button className="btn" onClick={()=>act("fold")} style={{flex:1,padding:"13px 0",borderRadius:10,background:"linear-gradient(135deg,#374151,#1f2937)",border:"1px solid #6b7280",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>FOLD</button>
                </>
              ):g.preflopScenario==="vs_open"&&!g.scenarioDone?(
                <>
                  <button className="btn" onClick={()=>act("raise")} style={{flex:1,padding:"13px 0",borderRadius:10,background:"linear-gradient(135deg,#7f1d1d,#b91c1c)",border:"1px solid #ef4444",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>3-BET</button>
                  <button className="btn" onClick={()=>act("call")} style={{flex:1,padding:"13px 0",borderRadius:10,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"1px solid #60a5fa",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>CALL</button>
                  <button className="btn" onClick={()=>act("fold")} style={{flex:1,padding:"13px 0",borderRadius:10,background:"linear-gradient(135deg,#374151,#1f2937)",border:"1px solid #6b7280",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>FOLD</button>
                </>
              ):g.preflopScenario==="vs_open_and_call"&&!g.scenarioDone?(
                <>
                  <button className="btn" onClick={()=>act("raise")} style={{flex:1,padding:"13px 0",borderRadius:10,background:"linear-gradient(135deg,#7f1d1d,#b91c1c)",border:"1px solid #ef4444",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>SQUEEZE</button>
                  <button className="btn" onClick={()=>act("call")} style={{flex:1,padding:"13px 0",borderRadius:10,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"1px solid #60a5fa",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>CALL</button>
                  <button className="btn" onClick={()=>act("fold")} style={{flex:1,padding:"13px 0",borderRadius:10,background:"linear-gradient(135deg,#374151,#1f2937)",border:"1px solid #6b7280",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>FOLD</button>
                </>
              ):(
                <>
                  <button className="btn" onClick={()=>act("raise")} style={{flex:1,padding:"14px 0",borderRadius:10,background:"linear-gradient(135deg,#00a844,#00c853)",border:"none",color:"#fff",fontSize:14,fontWeight:700,letterSpacing:1,boxShadow:"0 4px 20px rgba(0,200,83,0.3)"}}>↑ RAISE</button>
                  <button className="btn" onClick={()=>act("fold")} style={{flex:1,padding:"14px 0",borderRadius:10,background:"linear-gradient(135deg,#3d0000,#7f1d1d)",border:"1px solid rgba(239,68,68,0.5)",color:"#f87171",fontSize:14,fontWeight:700,letterSpacing:1}}>✕ FOLD</button>
                </>
              )}
            </div>
          ):(
            <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
              {!g.betFacing&&(
                showBetSizes ? (
                  <div style={{display:"flex",gap:6,width:"100%",animation:"fadeIn .15s ease both"}}>
                    {[["30%","0.3"],["50%","0.5"],["75%","0.75"],["All-in","1"]].map(([label,size])=>(
                      <button key={label} className="btn" onClick={()=>{setShowBetSizes(false);act("bet",+size);}} style={{flex:1,padding:"11px 0",borderRadius:10,background:"linear-gradient(135deg,#14532d,#15803d)",border:"1px solid #22c55e",color:"#fff",fontSize:11,fontWeight:"bold",letterSpacing:0}}>
                        {label}
                      </button>
                    ))}
                    <button className="btn" onClick={()=>setShowBetSizes(false)} style={{width:36,padding:"11px 0",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#6b7280",fontSize:13,fontWeight:"bold"}}>✕</button>
                  </div>
                ) : (
                  <>
                    <button className="btn" onClick={()=>setShowBetSizes(true)} style={{flex:1,minWidth:80,padding:"12px 0",borderRadius:10,background:"linear-gradient(135deg,#14532d,#15803d)",border:"1px solid #22c55e",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>RAISE ▾</button>
                    <button className="btn" onClick={()=>act("check")} style={{flex:1,minWidth:80,padding:"12px 0",borderRadius:10,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"1px solid #60a5fa",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>CHECK</button>
                  </>
                )
              )}
              {g.betFacing&&<button className="btn" onClick={()=>act("call")} style={{flex:1,minWidth:80,padding:"12px 0",borderRadius:10,background:"linear-gradient(135deg,#14532d,#15803d)",border:"1px solid #22c55e",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>CALL</button>}
              {g.betFacing&&(
                showBetSizes ? (
                  <div style={{display:"flex",gap:6,flex:2,animation:"fadeIn .15s ease both"}}>
                    {[["30%","0.3"],["50%","0.5"],["75%","0.75"],["All-in","1"]].map(([label,size])=>(
                      <button key={label} className="btn" onClick={()=>{setShowBetSizes(false);act("raise",+size);}} style={{flex:1,padding:"11px 0",borderRadius:10,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"1px solid #60a5fa",color:"#fff",fontSize:11,fontWeight:"bold",letterSpacing:0}}>
                        {label}
                      </button>
                    ))}
                    <button className="btn" onClick={()=>setShowBetSizes(false)} style={{width:36,padding:"11px 0",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#6b7280",fontSize:13,fontWeight:"bold"}}>✕</button>
                  </div>
                ) : (
                  <button className="btn" onClick={()=>setShowBetSizes(true)} style={{flex:1,minWidth:80,padding:"12px 0",borderRadius:10,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"1px solid #60a5fa",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>RAISE ▾</button>
                )
              )}
              <button className="btn" onClick={()=>act("fold")} style={{flex:1,minWidth:80,padding:"12px 0",borderRadius:10,background:"linear-gradient(135deg,#7f1d1d,#b91c1c)",border:"1px solid #ef4444",color:"#fff",fontSize:13,fontWeight:"bold",letterSpacing:1}}>FOLD</button>
            </div>
          )}
          <button className="btn" onClick={showHint} style={{width:"100%",padding:"9px 0",borderRadius:10,background:"rgba(201,168,76,0.07)",border:"1px solid rgba(201,168,76,0.22)",color:"#00c853",fontSize:12,letterSpacing:2}}>
            💡 GTO HINT
          </button>
        </div>
      )}

      {/* Result overlay */}
      {done&&(
        <div style={{
          position:"fixed",inset:0,zIndex:100,
          display:"flex",flexDirection:"column",justifyContent:"flex-end",
          background:"rgba(0,0,0,0.6)",
          animation:"fadeIn 0.25s ease both",
        }} onClick={(e)=>{if(e.target===e.currentTarget){setStats(s=>({...s,hands:s.hands+1}));deal();}}}>
          <div style={{
            background:"#0d1117",
            borderTop:"1px solid rgba(255,255,255,0.1)",
            borderRadius:"20px 20px 0 0",
            padding:"20px 20px 36px",
            animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1) both",
            maxHeight:"80vh",
            overflowY:"auto",
          }}>
            {/* Drag handle */}
            <div style={{width:40,height:4,borderRadius:2,background:"rgba(255,255,255,0.15)",margin:"0 auto 16px"}}/>

            {/* GTO score */}
            <div style={{padding:"14px",borderRadius:12,marginBottom:10,textAlign:"center",
              background:mistakes===0?"rgba(34,197,94,0.12)":mistakes<g.decisions.length?"rgba(251,191,36,0.1)":"rgba(239,68,68,0.12)",
              border:`1px solid ${mistakes===0?"rgba(34,197,94,0.4)":mistakes<g.decisions.length?"rgba(251,191,36,0.35)":"rgba(239,68,68,0.4)"}`}}>
              <div style={{fontSize:11,color:"#4a5568",letterSpacing:3,marginBottom:4}}>GTO SCORE</div>
              <div style={{fontSize:26,fontWeight:"bold",marginBottom:2,
                color:mistakes===0?"#4ade80":mistakes<g.decisions.length?"#fbbf24":"#f87171"}}>
                {mistakes===0?"✓ ALL CORRECT":g.decisions.length===1?"✗ INCORRECT":`${g.decisions.length-mistakes}/${g.decisions.length} correct`}
              </div>
              <div style={{fontSize:11,color:"#6b7280"}}>{mistakes===0?"Great play":`${mistakes} ${mistakes===1?"error":"errors"}`}</div>
            </div>

            {/* Outcome */}
            {g.result&&OUTCOME[g.result]&&(
              <div style={{padding:"10px",borderRadius:10,marginBottom:10,textAlign:"center",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{fontSize:10,color:"#374151",letterSpacing:3,marginBottom:3}}>OUTCOME</div>
                <div style={{fontSize:15,fontWeight:"bold",color:OUTCOME[g.result].c}}>{OUTCOME[g.result].t}</div>
                {g.heroEval&&g.oppEval&&<div style={{fontSize:11,color:"#6b7280",marginTop:3}}>Вы: {g.heroEval.name} · BB: {g.oppEval.name}</div>}
                {(g.result==="win"||g.result==="lose"||g.result==="tie")&&(
                  <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:8}}>
                    <Card card={g.oppCards[0]} small delay={0}/>
                    <Card card={g.oppCards[1]} small delay={0.1}/>
                  </div>
                )}
              </div>
            )}

            {/* Decisions */}
            {g.decisions.length>0&&(
              <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"10px 14px",marginBottom:14}}>
                <div style={{fontSize:10,letterSpacing:3,color:"#374151",marginBottom:8}}>REVIEW</div>
                {g.decisions.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:7,animation:`slideIn .2s ease ${i*0.05}s both`}}>
                    <span style={{fontSize:15,color:d.correct?"#4ade80":"#f87171",flexShrink:0}}>{d.correct?"✓":"✗"}</span>
                    <div>
                      <span style={{fontSize:10,color:"#6b7280"}}>{d.street}: </span>
                      <span style={{fontSize:11,color:"#e2e8f0",fontWeight:"bold"}}>{d.action}</span>
                      <div style={{fontSize:10,color:d.correct?"#6b7280":"#fca5a5",marginTop:1}}>{d.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn" onClick={()=>{setStats(s=>({...s,hands:s.hands+1}));deal();}} style={{width:"100%",padding:"16px 0",borderRadius:12,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"1px solid rgba(99,179,237,0.3)",color:"#fff",fontSize:15,fontWeight:"bold",letterSpacing:3,boxShadow:"0 4px 18px rgba(29,78,216,0.3)"}}>
              NEXT HAND →
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
