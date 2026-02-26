(function () {

if (window.__LIMBO_ACTIVE__) return "LIMBO ALREADY RUNNING";
window.__LIMBO_ACTIVE__ = true;

// =====================
// CONFIG
// =====================
const BPM = 200;
const BEAT = 60000 / BPM; // 300ms
const TEXT_RING_DURATION = 3000;
const STRUGGLE_DURATION = 6000;
const SMASH_FREEZE = 800;

let conveyorSpeedMultiplier = 1;

// =====================
// OVERLAY
// =====================
const overlay = document.createElement("div");
overlay.style.position = "fixed";
overlay.style.inset = "0";
overlay.style.pointerEvents = "none";
overlay.style.zIndex = "999999";
overlay.style.overflow = "hidden";
overlay.style.background = "transparent";
document.body.appendChild(overlay);

// =====================
// CAPTURE TEXT
// =====================
const textNodes = [];
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

while (walker.nextNode()) {
  const node = walker.currentNode;
  if (!node.nodeValue.trim()) continue;
  const p = node.parentElement;
  if (!p || p.offsetWidth === 0 || p.offsetHeight === 0) continue;
  textNodes.push(node);
}

const savedText = textNodes.slice(0, 120).map(n => ({
  parent: n.parentElement,
  visibility: n.parentElement.style.visibility,
  text: n.nodeValue.trim()
}));

savedText.forEach(d => d.parent.style.visibility = "hidden");

// =====================
// TRUE CIRCULAR TEXT RING
// =====================
const ringWrap = document.createElement("div");
ringWrap.style.position = "fixed";
ringWrap.style.inset = "0";
ringWrap.style.display = "flex";
ringWrap.style.justifyContent = "center";
ringWrap.style.alignItems = "center";
ringWrap.style.pointerEvents = "none";
overlay.appendChild(ringWrap);

const ringContainer = document.createElement("div");
ringContainer.style.position = "relative";
ringWrap.appendChild(ringContainer);

const radius = Math.min(innerWidth, innerHeight) * 0.35;

const bgRGB = getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255,255,255];
const brightness = (Number(bgRGB[0]) + Number(bgRGB[1]) + Number(bgRGB[2])) / 3;
const ringColor = brightness < 128 ? "white" : "black";

let characters = [];
savedText.forEach(d => {
  for (let ch of d.text) {
    if (ch.trim()) characters.push(ch);
  }
});

const circumference = 2 * Math.PI * radius;
let fontSize = Math.min(22, circumference / characters.length * 0.6);
fontSize = Math.max(fontSize, 10);

characters.forEach((ch, i) => {
  const span = document.createElement("span");
  span.textContent = ch;
  span.style.position = "absolute";
  span.style.fontSize = fontSize + "px";
  span.style.color = ringColor;
  span.style.left = "50%";
  span.style.top = "50%";
  span.style.transformOrigin = `0 ${-radius}px`;
  const angle = (i / characters.length) * 360;
  span.style.transform =
    `rotate(${angle}deg) translateY(${radius}px) rotate(90deg)`;
  ringContainer.appendChild(span);
});

let startTime = performance.now();

function rotateRing(now) {
  const progress = (now - startTime) / TEXT_RING_DURATION;
  ringContainer.style.transform = `rotate(${progress * 360}deg)`;
  if (progress < 1) requestAnimationFrame(rotateRing);
}
requestAnimationFrame(rotateRing);

setTimeout(() => {
  ringWrap.remove();
  savedText.forEach(d => d.parent.style.visibility = d.visibility || "");
  struggle();
}, TEXT_RING_DURATION);

// =====================
// STRUGGLE PHASE
// =====================
const pulseLayer = document.createElement("div");
pulseLayer.style.position = "absolute";
pulseLayer.style.inset = "0";
pulseLayer.style.background = "black";
pulseLayer.style.opacity = "0";
overlay.appendChild(pulseLayer);

function struggle() {
  const start = performance.now();

  function frame(now) {
    const t = now - start;

    document.documentElement.style.transform =
      `translate(${Math.random()*6-3}px,${Math.random()*6-3}px)`;

    pulseLayer.style.opacity = (Math.sin(now/80)*0.5+0.5)*0.4;

    if (t < STRUGGLE_DURATION) requestAnimationFrame(frame);
    else {
      document.documentElement.style.transform = "";
      pulseLayer.style.opacity = "0";
      beam();
    }
  }

  requestAnimationFrame(frame);
}

// =====================
// BEAM
// =====================
function beam() {
  const b = document.createElement("div");
  b.style.position = "fixed";
  b.style.left = "50%";
  b.style.top = "50%";
  b.style.width = "0px";
  b.style.height = "0px";
  b.style.borderRadius = "50%";
  b.style.transform = "translate(-50%,-50%)";
  b.style.background =
    "radial-gradient(circle, white 0%, rgba(255,255,255,0.9) 40%, transparent 70%)";
  overlay.appendChild(b);

  let size = 0;

  function grow() {
    size += 140;
    b.style.width = size + "px";
    b.style.height = size + "px";
    if (size < Math.max(innerWidth, innerHeight)*2) requestAnimationFrame(grow);
    else {
      b.remove();
      startLimbo();
    }
  }

  grow();
}

// =====================
// CONVEYOR
// =====================
function startLimbo() {

  overlay.style.background =
    "radial-gradient(circle at center, rgba(40,0,70,0.5) 0%, rgba(10,0,25,0.95) 80%)";

  const imgs = [...document.querySelectorAll("img")]
    .filter(i=>i.width>100 && i.height>100)
    .slice(0,20);

  const saved = imgs.map(i=>{
    const r=i.getBoundingClientRect();
    return {src:i.src,w:r.width,h:r.height};
  });

  imgs.forEach(i=>i.style.visibility="hidden");

  saved.forEach(d=>{
    const c=document.createElement("img");
    c.src=d.src;
    c.style.position="fixed";
    c.style.width=d.w+"px";
    c.style.height=d.h+"px";
    c.style.opacity="0.35";
    c.style.filter="hue-rotate(260deg) saturate(1.4) brightness(0.6)";
    overlay.appendChild(c);

    let dir=Math.random()<0.5?1:-1;
    let x=dir===1?-d.w:innerWidth+d.w;
    let y=Math.random()*(innerHeight-d.h);
    let baseSpeed=2+Math.random()*2;

    function move(){
      x += baseSpeed * conveyorSpeedMultiplier * dir;
      c.style.transform=`translate(${x}px,${y}px)`;
      if(dir===1 && x>innerWidth+d.w) dir=-1;
      if(dir===-1 && x<-d.w) dir=1;
      requestAnimationFrame(move);
    }
    move();
  });

  spawnMonsters();
}

// =====================
// MONSTERS
// =====================
function spawnMonsters() {

  const size = Math.min(innerWidth, innerHeight) * 0.28;
  const margin = 20;

  function makeMonster(side){
    const m=document.createElement("div");
    m.style.position="fixed";
    m.style.width=size+"px";
    m.style.height=size+"px";
    m.style.background="rgba(20,0,40,0.8)";
    m.style.border="6px solid white";
    m.style.boxShadow="0 0 40px rgba(200,0,255,0.5)";
    if(side==="left") m.style.left="0";
    else m.style.right="0";
    overlay.appendChild(m);
    return m;
  }

  const left = makeMonster("left");
  const right = makeMonster("right");

  let yL = margin;
  let yR = innerHeight - size - margin;
  let dirL = 1;
  let dirR = -1;

  let beatCount = 0;
  let smashed = false;

  const interval = setInterval(() => {

    beatCount++;
    if (beatCount > 4) beatCount = 1;

    if (beatCount === 2 || beatCount === 4) {

      yL += dirL * size;
      yR += dirR * size;

      if (yL > innerHeight-size-margin || yL < margin) dirL *= -1;
      if (yR > innerHeight-size-margin || yR < margin) dirR *= -1;

      left.style.transition="transform 0.18s cubic-bezier(.3,1.3,.5,1)";
      right.style.transition="transform 0.18s cubic-bezier(.3,1.3,.5,1)";

      left.style.transform=`translateY(${yL}px)`;
      right.style.transform=`translateY(${yR}px)`;

      if(Math.abs(yL-yR)<5 && !smashed){
        smashed=true;
        clearInterval(interval);
        smash(left,right,yL,size);
      }
    }

  }, BEAT);
}

function smash(left,right,y,size){

  const center = innerWidth/2 - size/2;

  left.style.transition="transform 0.15s ease-in";
  right.style.transition="transform 0.15s ease-in";

  left.style.transform=`translate(${center}px,${y}px) scaleX(0.8)`;
  right.style.transform=`translate(${center}px,${y}px) scaleX(0.8)`;

  setTimeout(()=>{

    left.style.opacity="0";
    right.style.opacity="0";

    conveyorSpeedMultiplier = 2;

  }, SMASH_FREEZE);
}

return "LIMBO INITIALIZED";

})();
