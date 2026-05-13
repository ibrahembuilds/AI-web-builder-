/**
 * Starter snippets for the playground. Each starter ships HTML, CSS, and JS
 * so users can instantly try common patterns.
 */
export type Starter = {
  id: string;
  name: string;
  description: string;
  html: string;
  css: string;
  js: string;
};

const baseHead = (title: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="style.css" />
</head>`;

export const STARTERS: Starter[] = [
  {
    id: "hello",
    name: "Hello world",
    description: "Minimal page with a click counter.",
    html: `${baseHead("Hello")}
<body>
  <main>
    <h1>Hello, kanyoai.</h1>
    <p>Edit the HTML, CSS and JS - preview updates live.</p>
    <button id="btn">Click me</button>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
    css: `* { box-sizing: border-box; }
body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0a0a0a; color: #fafafa; }
main { text-align: center; padding: 2rem; }
h1 { font-size: clamp(2rem, 6vw, 3.5rem); letter-spacing: -0.02em; margin: 0 0 1rem; }
p { color: #a1a1a1; margin: 0 0 2rem; }
button { background: #fafafa; color: #0a0a0a; border: 0; padding: 0.75rem 1.25rem; border-radius: 0.375rem; font: inherit; font-weight: 500; cursor: pointer; }
button:hover { opacity: .9; }`,
    js: `const btn = document.getElementById('btn');
let n = 0;
btn?.addEventListener('click', () => { n++; btn.textContent = 'Clicked ' + n + 'x'; });`,
  },
  {
    id: "landing",
    name: "Landing hero",
    description: "Centered hero with gradient and CTA.",
    html: `${baseHead("Landing")}
<body>
  <header><nav><span class="logo">- Nova</span><a href="#">Get started</a></nav></header>
  <main class="hero">
    <span class="pill">New - v1.0</span>
    <h1>Build faster.<br/>Ship calmer.</h1>
    <p>A tiny landing page you can fork in seconds.</p>
    <div class="cta"><button class="primary">Start free</button><button class="ghost">See demo</button></div>
  </main>
  <script src="script.js"></script>
</body></html>`,
    css: `*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:radial-gradient(1200px 600px at 50% -10%,#312e81,#0b0b14 60%);color:#fafafa;min-height:100vh}
nav{display:flex;justify-content:space-between;align-items:center;padding:1.25rem 2rem}
.logo{font-weight:700;letter-spacing:.05em}
nav a{color:#c7c7d1;text-decoration:none;font-size:.9rem}
.hero{max-width:760px;margin:6rem auto;padding:0 1.5rem;text-align:center}
.pill{display:inline-block;padding:.35rem .75rem;border:1px solid #2a2a3d;border-radius:999px;font-size:.75rem;color:#a5a5b8}
h1{font-size:clamp(2.5rem,8vw,5rem);line-height:1.05;letter-spacing:-.03em;margin:1rem 0}
p{color:#a5a5b8;font-size:1.1rem}
.cta{display:flex;gap:.75rem;justify-content:center;margin-top:2rem;flex-wrap:wrap}
button{font:inherit;font-weight:600;padding:.85rem 1.4rem;border-radius:.5rem;border:0;cursor:pointer}
.primary{background:#fafafa;color:#0b0b14}
.ghost{background:transparent;color:#fafafa;border:1px solid #2a2a3d}`,
    js: `document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
  b.style.transform='scale(.96)';setTimeout(()=>b.style.transform='',120);
}));`,
  },
  {
    id: "card",
    name: "Animated card",
    description: "Hover-tilt card with CSS transitions.",
    html: `${baseHead("Card")}
<body>
  <div class="stage"><article class="card"><div class="badge">PRO</div><h2>Aurora</h2><p>A serene workspace for focused makers.</p><button>Try it</button></article></div>
  <script src="script.js"></script>
</body></html>`,
    css: `body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#fdf2f8,#dbeafe);font-family:system-ui,sans-serif}
.card{position:relative;width:300px;padding:1.75rem;border-radius:1rem;background:#fff;box-shadow:0 30px 60px -20px rgba(30,41,59,.25);transition:transform .25s ease}
.card:hover{transform:translateY(-6px) rotate(-1deg)}
.badge{position:absolute;top:1rem;right:1rem;background:#0f172a;color:#fff;padding:.2rem .5rem;border-radius:.35rem;font-size:.7rem;letter-spacing:.1em}
h2{margin:0 0 .5rem;font-size:1.5rem}
p{color:#475569;margin:0 0 1.25rem}
button{font:inherit;background:#0f172a;color:#fff;border:0;padding:.6rem 1rem;border-radius:.5rem;cursor:pointer;width:100%}`,
    js: `const c=document.querySelector('.card');
c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;c.style.transform='perspective(800px) rotateY('+(x*8)+'deg) rotateX('+(-y*8)+'deg) translateY(-6px)';});
c.addEventListener('mouseleave',()=>c.style.transform='');`,
  },
  {
    id: "todo",
    name: "Todo list",
    description: "Add and toggle tasks with vanilla JS.",
    html: `${baseHead("Todo")}
<body>
  <main>
    <h1>Today</h1>
    <form id="f"><input id="i" placeholder="What needs doing?" required /><button>Add</button></form>
    <ul id="list"></ul>
  </main>
  <script src="script.js"></script>
</body></html>`,
    css: `body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;margin:0;min-height:100vh;display:flex;justify-content:center;padding:3rem 1rem}
main{width:100%;max-width:420px}
h1{font-size:2rem;margin:0 0 1.5rem;letter-spacing:-.02em}
form{display:flex;gap:.5rem;margin-bottom:1.25rem}
input{flex:1;padding:.65rem .85rem;border:1px solid #e2e8f0;border-radius:.5rem;font:inherit;background:#fff}
button{font:inherit;background:#0f172a;color:#fff;border:0;border-radius:.5rem;padding:0 1rem;cursor:pointer}
ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.4rem}
li{background:#fff;border:1px solid #e2e8f0;border-radius:.5rem;padding:.65rem .85rem;display:flex;align-items:center;gap:.6rem;cursor:pointer}
li.done{color:#94a3b8;text-decoration:line-through}`,
    js: `const f=document.getElementById('f'),i=document.getElementById('i'),list=document.getElementById('list');
f.addEventListener('submit',e=>{e.preventDefault();if(!i.value.trim())return;const li=document.createElement('li');li.textContent=i.value;li.addEventListener('click',()=>li.classList.toggle('done'));list.prepend(li);i.value='';});`,
  },
  {
    id: "grid",
    name: "Responsive grid",
    description: "Auto-fit gallery that adapts to width.",
    html: `${baseHead("Grid")}
<body>
  <main>
    <h1>Gallery</h1>
    <section class="grid" id="grid"></section>
  </main>
  <script src="script.js"></script>
</body></html>`,
    css: `body{margin:0;font-family:system-ui,sans-serif;background:#0b0b0f;color:#fafafa;padding:2rem}
h1{margin:0 0 1.25rem;letter-spacing:-.02em}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem}
.tile{aspect-ratio:1/1;border-radius:.75rem;display:grid;place-items:center;font-weight:600;color:#0b0b0f}`,
    js: `const colors=['#fbbf24','#f472b6','#34d399','#60a5fa','#c084fc','#f87171','#fb923c','#a3e635'];
const g=document.getElementById('grid');
for(let i=0;i<12;i++){const d=document.createElement('div');d.className='tile';d.style.background=colors[i%colors.length];d.textContent=String(i+1).padStart(2,'0');g.appendChild(d);}`,
  },
];

export const DEFAULT_STARTER = STARTERS[0];
