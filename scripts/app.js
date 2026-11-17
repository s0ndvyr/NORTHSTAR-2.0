/* ================= DATA ================= */
const NOW = new Date();
function due(daysFromNow, hour=23, min=59){ const d=new Date(NOW); d.setDate(d.getDate()+daysFromNow); d.setHours(hour,min,0,0); return d; }
const COURSES = [
  {id:"chem", code:"CHEM 201", name:"General Chemistry II", prof:"Dr. Elena Vasquez", office:"Tue/Thu 2–4pm · Whitmore 312", color:"#22d3ee", grade:91, credits:4, modules:["Thermodynamics","Chemical Kinetics","Electrochemistry","Equilibrium","Final Review"]},
  {id:"math", code:"MATH 210", name:"Calculus II", prof:"Prof. James Park", office:"Mon/Wed 10–11am · Keller 204", color:"#818cf8", grade:88, credits:4, modules:["Integration Techniques","Applications of Integration","Sequences & Series","Parametric Equations","Final Review"]},
  {id:"eng", code:"ENG 105", name:"English Literature", prof:"Dr. Amara Okafor", office:"Wed 1–3pm · Hartwell 118", color:"#f59e0b", grade:94, credits:3, modules:["Romantic Poetry","The Gothic Novel","Modernist Prose","Shakespeare","Final Essay"]},
  {id:"hist", code:"HIST 180", name:"Modern World History", prof:"Prof. Daniel Reyes", office:"Fri 11am–12pm · Alden 090", color:"#34d399", grade:86, credits:3, modules:["Industrial Revolution","World Wars","Cold War","Decolonization","Final Exam"]},
  {id:"bio", code:"BIO 150", name:"Cell Biology", prof:"Dr. Priya Nair", office:"Thu 3–5pm · BioSci 410", color:"#fb7185", grade:89, credits:4, modules:["Cell Structure","Enzymes","Genetics","Cell Signaling","Final Review"]},
  {id:"cs", code:"CS 201", name:"Data Structures", prof:"Prof. Marcus Chen", office:"Tue 9–10am · Tech 305", color:"#38bdf8", grade:93, credits:3, modules:["Arrays & Lists","Stacks & Queues","Trees","Graphs","Final Project"]},
];
const courseById = id => COURSES.find(c=>c.id===id);

let ASSIGNMENTS = [
  {id:"a1", title:"Thermodynamics Problem Set 6", course:"chem", type:"Homework", due:due(0,23,59), points:100, priority:"High", status:"In Progress", progress:65, desc:"Solve 12 problems covering Gibbs free energy, enthalpy, and entropy calculations. Show all work with units.", rubric:["Correct ΔG calculations (40%)","Work shown with units (30%)","Significant figures (15%)","Conceptual explanations (15%)"]},
  {id:"a2", title:"Quiz 4 — Integration Techniques", course:"math", type:"Quiz", due:due(0,20,0), points:50, priority:"High", status:"Not Started", progress:0, desc:"Timed quiz: u-substitution, integration by parts, and trigonometric integrals. 8 questions, 20 minutes.", rubric:["Accuracy (70%)","Method selection (20%)","Time management (10%)"]},
  {id:"a3", title:"Essay Draft — Gothic Novel Analysis", course:"eng", type:"Writing", due:due(1,23,59), points:200, priority:"High", status:"In Progress", progress:40, desc:"1,500-word analytical essay on symbolism in Frankenstein. Thesis-driven, MLA format, 3 scholarly sources.", rubric:["Thesis & argument (30%)","Textual evidence (30%)","Scholarly sources (20%)","Style & MLA (20%)"]},
  {id:"a4", title:"Reading Response — Romantic Poetry", course:"eng", type:"Reading", due:due(1,18,0), points:30, priority:"Normal", status:"Not Started", progress:0, desc:"Read Wordsworth & Coleridge selections (pp. 112–148). Submit 400-word response with 2 discussion questions.", rubric:["Engagement with text (50%)","Discussion questions (30%)","Length & format (20%)"]},
  {id:"a5", title:"Lab Report — Enzyme Kinetics", course:"bio", type:"Project", due:due(2,23,59), points:150, priority:"High", status:"In Progress", progress:30, desc:"Full lab report: Michaelis-Menten analysis of catalase activity. Include graphs, error analysis, and discussion.", rubric:["Data analysis (35%)","Graphs & tables (25%)","Discussion (25%)","Format (15%)"]},
  {id:"a6", title:"Discussion — Cold War Origins", course:"hist", type:"Discussion", due:due(2,23,59), points:25, priority:"Normal", status:"Not Started", progress:0, desc:"Initial post (250 words) + 2 peer replies. Argue the primary cause of Cold War tensions with primary sources.", rubric:["Argument with sources (50%)","Peer engagement (30%)","Timeliness (20%)"]},
  {id:"a7", title:"Homework 5 — Trees & Traversals", course:"cs", type:"Homework", due:due(3,23,59), points:100, priority:"Normal", status:"In Progress", progress:55, desc:"Implement BST operations and all three traversals in Python. Submit code + complexity analysis.", rubric:["Correctness (50%)","Complexity analysis (30%)","Code quality (20%)"]},
  {id:"a8", title:"Midterm — Cell Signaling", course:"bio", type:"Quiz", due:due(3,14,0), points:100, priority:"High", status:"Not Started", progress:0, desc:"25-question midterm covering pathways, receptors, and second messengers. 45 minutes, proctored.", rubric:["Accuracy (100%)"]},
  {id:"a9", title:"Series Convergence Worksheet", course:"math", type:"Homework", due:due(4,23,59), points:60, priority:"Normal", status:"Not Started", progress:0, desc:"Apply ratio, root, and integral tests to 15 series. Justify each conclusion.", rubric:["Correct test selection (40%)","Justification (40%)","Format (20%)"]},
  {id:"a10", title:"Research Outline — Decolonization", course:"hist", type:"Writing", due:due(5,23,59), points:80, priority:"Normal", status:"In Progress", progress:20, desc:"Detailed outline for final research paper. Include thesis, 5 sources, and section summaries.", rubric:["Thesis (25%)","Sources (35%)","Structure (25%)","Citations (15%)"]},
  {id:"a11", title:"Quiz 5 — Electrochemistry", course:"chem", type:"Quiz", due:due(5,20,0), points:50, priority:"Normal", status:"Not Started", progress:0, desc:"Nernst equation, galvanic cells, and electrolysis. 10 questions, 25 minutes.", rubric:["Accuracy (80%)","Units & sig figs (20%)"]},
  {id:"a12", title:"Reading — Modernist Prose", course:"eng", type:"Reading", due:due(6,18,0), points:30, priority:"Low", status:"Not Started", progress:0, desc:"Read Woolf excerpt (pp. 201–230). Annotate 5 passages in your notebook.", rubric:["Annotations (60%)","Reflection (40%)"]},
  {id:"a13", title:"Project — Graph Algorithms", course:"cs", type:"Project", due:due(7,23,59), points:200, priority:"High", status:"In Progress", progress:15, desc:"Implement Dijkstra + BFS visualizer. Submit repo link + 1-page writeup.", rubric:["Algorithm correctness (40%)","Visualization (30%)","Writeup (20%)","Tests (10%)"]},
  {id:"a14", title:"Problem Set 7 — Equilibrium", course:"chem", type:"Homework", due:due(8,23,59), points:100, priority:"Normal", status:"Not Started", progress:0, desc:"Keq calculations, Le Châtelier's principle, and solubility equilibria.", rubric:["Calculations (60%)","Explanations (25%)","Work shown (15%)"]},
  {id:"a15", title:"Discussion — Shakespeare Sonnets", course:"eng", type:"Discussion", due:due(9,23,59), points:25, priority:"Low", status:"Not Started", progress:0, desc:"Compare Sonnets 18 and 130. Initial post + 2 replies.", rubric:["Analysis (50%)","Replies (30%)","Timeliness (20%)"]},
  {id:"a16", title:"Genetics Problem Set", course:"bio", type:"Homework", due:due(10,23,59), points:80, priority:"Normal", status:"Not Started", progress:0, desc:"Punnett squares, pedigree analysis, and chi-square tests.", rubric:["Accuracy (70%)","Method (30%)"]},
  {id:"a17", title:"Homework 6 — Parametric Curves", course:"math", type:"Homework", due:due(11,23,59), points:60, priority:"Low", status:"Not Started", progress:0, desc:"Arc length, surface area, and polar coordinates.", rubric:["Accuracy (70%)","Work shown (30%)"]},
  {id:"a18", title:"Final Research Paper", course:"hist", type:"Writing", due:due(14,23,59), points:300, priority:"High", status:"Not Started", progress:0, desc:"4,000-word research paper on decolonization in Africa. Chicago style, 8+ sources.", rubric:["Argument (30%)","Sources (30%)","Writing (25%)","Citations (15%)"]},
  {id:"a19", title:"Quiz 3 — Kinetics", course:"chem", type:"Quiz", due:due(-1,20,0), points:50, priority:"Normal", status:"Submitted", progress:100, score:44, desc:"Rate laws and reaction mechanisms.", rubric:["Accuracy (100%)"]},
  {id:"a20", title:"Homework 4 — Stacks & Queues", course:"cs", type:"Homework", due:due(-2,23,59), points:100, priority:"Normal", status:"Completed", progress:100, score:96, desc:"Implement stack/queue ADT with amortized analysis.", rubric:["Correctness (50%)","Analysis (30%)","Quality (20%)"]},
  {id:"a21", title:"Essay — Romanticism Reflection", course:"eng", type:"Writing", due:due(-3,23,59), points:150, priority:"Normal", status:"Completed", progress:100, score:92, desc:"Reflective essay on Romantic ideals.", rubric:["Reflection (50%)","Evidence (30%)","Style (20%)"]},
  {id:"a22", title:"Quiz 2 — Integration Basics", course:"math", type:"Quiz", due:due(-4,20,0), points:50, priority:"Normal", status:"Completed", progress:100, score:47, desc:"Fundamental theorem and basic integrals.", rubric:["Accuracy (100%)"]},
  {id:"a23", title:"Discussion — Industrial Revolution", course:"hist", type:"Discussion", due:due(-5,23,59), points:25, priority:"Low", status:"Completed", progress:100, score:23, desc:"Causes and consequences debate.", rubric:["Argument (50%)","Replies (30%)","Timeliness (20%)"]},
  {id:"a24", title:"Lab Report — Cell Structure", course:"bio", type:"Project", due:due(-6,23,59), points:120, priority:"Normal", status:"Completed", progress:100, score:88, desc:"Microscopy lab report.", rubric:["Data (35%)","Images (25%)","Discussion (25%)","Format (15%)"]},
  {id:"a25", title:"Problem Set 5 — Kinetics", course:"chem", type:"Homework", due:due(-7,23,59), points:100, priority:"Normal", status:"Completed", progress:100, score:90, desc:"Rate law determination.", rubric:["Calculations (60%)","Explanations (25%)","Work (15%)"]},
  {id:"a26", title:"Reading — Gothic Novel Ch. 1–5", course:"eng", type:"Reading", due:due(-8,18,0), points:30, priority:"Low", status:"Completed", progress:100, score:28, desc:"Frankenstein opening chapters.", rubric:["Engagement (60%)","Reflection (40%)"]},
  {id:"a27", title:"Homework 3 — Linked Lists", course:"cs", type:"Homework", due:due(-2,23,59), points:100, priority:"High", status:"Missing", progress:0, desc:"Singly/doubly linked list implementation. ⚠ Overdue — contact instructor.", rubric:["Correctness (50%)","Analysis (30%)","Quality (20%)"]},
  {id:"a28", title:"Worksheet — Series Basics", course:"math", type:"Homework", due:due(-3,23,59), points:40, priority:"Normal", status:"Missing", progress:0, desc:"Geometric series and telescoping sums. ⚠ Overdue.", rubric:["Accuracy (70%)","Work (30%)"]},
];

const QUIZ_BANK = [
  {q:"Which substitution is most appropriate for ∫ x·e^(x²) dx?", opts:["u = x²","u = e^(x²)","u = x·e^(x²)","u = dx"], a:0, exp:"Let u = x², du = 2x dx, so the integral becomes ½∫e^u du = ½e^(x²) + C.", hint:"Look for a function whose derivative is also in the integrand. The derivative of x² is 2x — and you have an x sitting right there."},
  {q:"∫₀^π sin(x) dx equals:", opts:["0","1","2","−1"], a:2, exp:"[−cos x]₀^π = −(−1) + 1 = 2.", hint:"Antiderivative of sin is −cos. Evaluate at π and 0: −cos(π) = 1, −cos(0) = −1. Subtract: 1 − (−1)."},
  {q:"Integration by parts uses which formula?", opts:["∫u dv = uv − ∫v du","∫u dv = uv + ∫v du","∫u dv = u·v","∫u dv = ∫v du − uv"], a:0, exp:"The product rule rearranged: ∫u dv = uv − ∫v du.", hint:"It's the product rule (uv)′ = u′v + uv′ rearranged. The sign on the remaining integral is the key."},
  {q:"∫ x·ln(x) dx = ?", opts:["x²/2·ln(x) − x²/4 + C","x·ln(x) − x + C","ln(x)/x + C","x²·ln(x) + C"], a:0, exp:"With u=ln x, dv=x dx: result is (x²/2)ln x − x²/4 + C.", hint:"Choose u = ln(x) so differentiating simplifies it. Then v = x²/2. Don't forget the −∫v du term."},
  {q:"∫ 1/(1+x²) dx equals:", opts:["arctan(x) + C","ln(1+x²) + C","−1/(1+x²) + C","x/(1+x²) + C"], a:0, exp:"Standard form: ∫ dx/(1+x²) = arctan(x) + C.", hint:"This is a standard form worth memorizing — it appears constantly. Differentiate arctan to verify."},
  {q:"Which integral requires a trig substitution?", opts:["∫√(9−x²) dx","∫x³ dx","∫e^x dx","∫1/x dx"], a:0, exp:"√(a²−x²) form suggests x = a·sin θ.", hint:"Look for a square root of a difference of squares — that's the trig-substitution fingerprint."},
  {q:"∫₀^∞ e^(−x) dx converges to:", opts:["0","1","∞","e"], a:1, exp:"lim_{b→∞} [−e^(−x)]₀^b = 0 − (−1) = 1.", hint:"It's an improper integral. Evaluate [−e^(−x)]₀^b and let b → ∞. e^(−∞) → 0."},
  {q:"The average value of f(x)=x² on [0,2] is:", opts:["4/3","2","8/3","1"], a:0, exp:"(1/2)∫₀²x²dx = (1/2)(8/3) = 4/3.", hint:"Average value = (1/(b−a))∫f. Interval length is 2, so divide the integral by 2."},
];
const FLASHCARDS = [
  {q:"What is ΔG° in terms of K?", a:"ΔG° = −RT ln K. Negative ΔG° means K > 1 (products favored).", mastery:72},
  {q:"State the Nernst equation.", a:"E = E° − (RT/nF) ln Q. At 25°C: E = E° − (0.0592/n) log Q.", mastery:64},
  {q:"What is the rate-determining step?", a:"The slowest elementary step in a mechanism; its molecularity determines the rate law.", mastery:81},
  {q:"Define Michaelis constant Km.", a:"[S] at which v = Vmax/2. Lower Km = higher substrate affinity.", mastery:58},
  {q:"What does the ratio test state?", a:"If lim|aₙ₊₁/aₙ| < 1, series converges absolutely; > 1 diverges.", mastery:77},
  {q:"BFS vs DFS time complexity?", a:"Both O(V + E) with adjacency lists. BFS uses a queue; DFS uses a stack/recursion.", mastery:69},
  {q:"What is Le Châtelier's principle?", a:"A system at equilibrium shifts to counteract an imposed change (stress).", mastery:85},
  {q:"Define entropy (S).", a:"Measure of disorder/microstates. ΔS > 0 favors spontaneity at high T.", mastery:73},
  {q:"What is a galvanic cell?", a:"Spontaneous redox cell converting chemical energy to electrical energy; anode oxidizes.", mastery:66},
  {q:"State the Fundamental Theorem of Calculus (Part 2).", a:"∫ₐᵇ f(x)dx = F(b) − F(a) where F′ = f.", mastery:90},
];
let NOTES = [
  {id:"n1", title:"Thermodynamics — Key Equations", course:"chem", tags:["exam","formulas"], body:"## Core relations\n- **ΔG = ΔH − TΔS** — spontaneity criterion\n- ΔG° = −RT ln K\n- ΔG = ΔG° + RT ln Q\n\n> ⚠ Remember: ΔG < 0 → spontaneous; ΔG = 0 → equilibrium.\n\n- [ ] Practice Nernst equation problems\n- [ ] Review sign conventions for work (w = −PΔV)", link:"a1"},
  {id:"n2", title:"Frankenstein — Symbolism Notes", course:"eng", tags:["essay","gothic"], body:"## Symbols to use in essay\n- **The creature's birth** — abandonment, responsibility\n- **Ice / Arctic** — isolation, sublime nature\n- **Light** — knowledge and its dangers\n\nThesis draft: *Shelley uses the sublime landscape as a mirror for Victor's moral isolation…*", link:"a3"},
  {id:"n3", title:"Integration Techniques Cheat Sheet", course:"math", tags:["exam","formulas"], body:"## Patterns\n- `x·e^(x²)` → u-substitution\n- `x·ln(x)` → by parts (u = ln x)\n- `√(a²−x²)` → trig sub x = a sin θ\n- `1/(1+x²)` → arctan\n\n> Time-saver: always try u-sub first — it's the fastest.", link:"a2"},
  {id:"n4", title:"Enzyme Kinetics — Lab Prep", course:"bio", tags:["lab","exam"], body:"## Michaelis-Menten\n- v = Vmax[S] / (Km + [S])\n- Lineweaver-Burk: 1/v vs 1/[S] gives Km & Vmax\n\n- [ ] Plot Lineweaver-Burk\n- [ ] Calculate Km from intercept", link:"a5"},
  {id:"n5", title:"Cold War — Primary Sources", course:"hist", tags:["essay","sources"], body:"## Key documents\n- Long Telegram (Kennan, 1946)\n- Truman Doctrine address\n- Churchill 'Iron Curtain' speech\n\nArgument angle: ideological incompatibility as primary driver.", link:"a6"},
  {id:"n6", title:"BST Traversals — Visual Guide", course:"cs", tags:["coding","exam"], body:"## Traversals\n- **Inorder**: L → root → R (sorted order)\n- **Preorder**: root → L → R\n- **Postorder**: L → R → root\n\nBST insert: O(h), worst O(n) if unbalanced.", link:"a7"},
];
const ACTIVITY = [
  {icon:"▲", color:"#34d399", title:"Grade synced — Quiz 3 Kinetics", sub:"Chemistry · 44/50 (88%)", time:"2h ago"},
  {icon:"◷", color:"#f59e0b", title:"Deadline shifted — Essay Draft", sub:"English Lit · moved to tomorrow 11:59pm", time:"5h ago"},
  {icon:"✦", color:"#818cf8", title:"Study session logged", sub:"Calculus II · 45 min focus sprint", time:"Yesterday"},
  {icon:"✓", color:"#22d3ee", title:"Submitted — Homework 4", sub:"Data Structures · on time", time:"Yesterday"},
  {icon:"⚠", color:"#fb7185", title:"Missing — Homework 3", sub:"Data Structures · 2 days overdue", time:"2d ago"},
  {icon:"▲", color:"#34d399", title:"Grade synced — Essay Reflection", sub:"English Lit · 92/150", time:"3d ago"},
  {icon:"⬡", color:"#38bdf8", title:"Canvas sync complete", sub:"28 assignments · 6 courses · StudentVUE GPA 3.82", time:"3d ago"},
];
const AUTOPILOT = [
  {id:"p1", title:"Essay scaffold — Gothic Novel Analysis", detail:"Thesis options, 3-section outline, source plan", course:"eng"},
  {id:"p2", title:"Study plan — Midterm Cell Signaling", detail:"4-day spaced plan · 12 flashcards generated", course:"bio"},
];
const RADAR = {labels:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], planned:[3,4,2.5,4.5,3,2,1.5], actual:[2.8,3.6,2.2,4.1,3.4,2.6,1.2]};

/* ================= STATE ================= */
let activeView="dashboard", statusFilter="All", currentNote=null, quizState=null, flashIdx=0, pomo={min:25,left:1500,running:false,timer:null,total:1500};
const $ = s=>document.querySelector(s), $$ = s=>[...document.querySelectorAll(s)];
const fmtDate = d => new Date(d).getFullYear() >= 2999 ? "No due date" : new Date(d).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const fmtTime = d => new Date(d).getFullYear() >= 2999 ? "" : new Date(d).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
function relDue(d){ const diff=Math.round((new Date(d).setHours(0,0,0,0)-new Date(NOW).setHours(0,0,0,0))/86400000); if(diff===0)return"Due today"; if(diff===1)return"Tomorrow"; if(diff>1)return`In ${diff} days`; if(diff===-1)return"Yesterday"; return `${-diff}d overdue`; }
function statusOf(a){ const now=new Date(); if(a.status==="Completed"||a.status==="Submitted")return a.status; if(new Date(a.due)<now && a.status!=="Completed")return "Overdue"; if(new Date(a.due).toDateString()===now.toDateString())return "Due Today"; return a.status; }
function typeIcon(t){ return {Quiz:"?",Writing:"✎",Homework:"▦",Project:"⬡",Reading:"❏",Discussion:"◉"}[t]||"•"; }
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),3400); }
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

/* ================= NAV ================= */
function showView(v){ activeView=v; $$(".view").forEach(x=>x.classList.toggle("active",x.id==="view-"+v)); $$(".nav-item[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===v)); $("#sidebar").classList.remove("open"); window.scrollTo({top:0,behavior:"smooth"}); }
$$(".nav-item[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));
$("#hamburger").onclick=()=>$("#sidebar").classList.toggle("open");
$("#connectBtn").onclick=openConnect; $("#notifBtn").onclick=openDrawer; $("#bellBtn").onclick=openDrawer;
function openConnect(){ $("#connectOverlay").classList.add("open"); }
function closeOverlay(id){ document.getElementById(id).classList.remove("open"); }
function openDrawer(){ $("#drawer").classList.add("open"); $("#scrim").classList.add("open"); }
function closeDrawer(){ $("#drawer").classList.remove("open"); $("#scrim").classList.remove("open"); }
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeOverlay("wsOverlay"); closeOverlay("connectOverlay"); closeDrawer(); } if(e.key==="/" && document.activeElement.tagName!=="INPUT" && document.activeElement.tagName!=="TEXTAREA"){ e.preventDefault(); $("#globalSearch").focus(); } });
$("#globalSearch").addEventListener("input",e=>{ if(e.target.value.trim()){ showView("ledger"); $("#fSearch").value=e.target.value; renderLedger(); } });

/* The Canvas integration is initialized in premium.js. */
async function connectCanvas(){ toast("Canvas integration is loading. Try again in a moment."); }
async function syncCanvas(){ toast("Canvas integration is loading. Try again in a moment."); }

/* ================= DASHBOARD ================= */
function renderDashboard(){
  const h=NOW.getHours(); const greet = h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  $("#dateLine").textContent = NOW.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) + " · NORTHSTAR COMMAND";
  $("#greeting").innerHTML = `${greet}, <em>Christian</em>.`;
  const dueToday = ASSIGNMENTS.filter(a=>statusOf(a)==="Due Today" && a.status!=="Completed" && a.status!=="Submitted");
  const upcoming = ASSIGNMENTS.filter(a=>{const d=(new Date(a.due)-NOW)/86400000; return d>0&&d<=7&&a.status!=="Completed"&&a.status!=="Submitted";});
  const done = ASSIGNMENTS.filter(a=>a.status==="Completed"||a.status==="Submitted");
  const overdue = ASSIGNMENTS.filter(a=>statusOf(a)==="Overdue");
  $("#heroSub").textContent = `${dueToday.length} due today · ${upcoming.length} upcoming this week · ${overdue.length} overdue. Start with Thermodynamics PS6 — it's due tonight.`;
  $("#navDue").textContent = dueToday.length;
  $("#hsDone").textContent = done.length;
  const health = Math.max(40, Math.min(98, 100 - overdue.length*12 - (dueToday.length>2?6:0)));
  $("#statusPct").textContent = health+"%";
  $("#statusRing").style.strokeDashoffset = 263.9*(1-health/100);
  $("#statusRing").style.stroke = health>=80?"#34d399":health>=60?"#f59e0b":"#fb7185";
  const badge=$("#statusBadge");
  if(overdue.length>=2){ badge.className="badge badge-rose"; badge.textContent="● Needs Attention"; $("#statusText").textContent=`${overdue.length} overdue items are dragging your health score. Clear Homework 3 first — it's the oldest.`; }
  else if(overdue.length===1){ badge.className="badge badge-amber"; badge.textContent="● On Track — 1 overdue"; $("#statusText").textContent="Nearly there. One overdue item to clear, then you're fully ahead."; }
  else { badge.className="badge badge-green"; badge.textContent="● Ahead of Schedule"; $("#statusText").textContent="No overdue work. You're ahead — keep the streak alive."; }
  renderFocusCard(); renderFocusBars(); renderGauge(done.length, ASSIGNMENTS.length-done.length);
  renderCalendar(); renderRadar(); renderAutopilot(); renderPriorities(); renderToday(); renderHeatmap(); renderMomentum(); renderActivity();
}
function renderFocusCard(){
  const prioW={High:3,Normal:2,Low:1};
  const top=[...ASSIGNMENTS].filter(a=>a.status!=="Completed"&&a.status!=="Submitted").sort((a,b)=>((new Date(a.due)-NOW)/86400000 - prioW[a.priority]*.4)-((new Date(b.due)-NOW)/86400000 - prioW[b.priority]*.4))[0];
  if(!top){ $("#focusCard").innerHTML=`<p class="small muted">All clear. 🎉</p>`; return; }
  const c=courseById(top.course);
  $("#focusBadge").textContent = relDue(top.due).toUpperCase();
  $("#focusCard").innerHTML=`
    <span class="course-chip" style="background:${c.color}22;color:${c.color}"><span class="dotc" style="background:${c.color}"></span>${c.code} · ${c.name}</span>
    <h3 style="font-family:var(--serif);font-size:22px;font-weight:500;margin:10px 0 4px;line-height:1.25">${esc(top.title)}</h3>
    <p class="small muted" style="line-height:1.55">${esc(top.desc)}</p>
    <div class="flex mt" style="justify-content:space-between"><span class="small"><b class="mono">${fmtDate(top.due)} · ${fmtTime(top.due)}</b></span><span class="small muted">${top.points} pts · ${top.type}</span></div>
    <div class="progress mt"><i style="width:${top.progress}%"></i></div>
    <div class="flex mt" style="justify-content:space-between"><span class="tiny muted">${top.progress}% complete</span><span class="tiny muted">${top.priority} priority</span></div>
    <button class="btn btn-primary mt" style="width:100%" onclick="openWorkspace('${top.id}')">▶ Start working</button>`;
}
function renderFocusBars(){
  const data=[["Mon",2.8],["Tue",3.6],["Wed",2.2],["Thu",4.1],["Fri",3.4],["Sat",2.6],["Sun",1.2]];
  const max=4.5;
  $("#focusBars").innerHTML = data.map(d=>`<div class="bar-row"><span class="lbl">${d[0]}</span><div class="bar-track"><div class="bar-fill" style="width:${d[1]/max*100}%;background:linear-gradient(90deg,#22d3ee,#38bdf8)"></div></div><span class="val">${d[1]}h</span></div>`).join("");
}
function renderGauge(done,pend){
  const total=done+pend||1, pct=Math.round(done/total*100);
  $("#completionPct").textContent=pct+"%";
  $("#compDone").textContent=done; $("#compPend").textContent=pend;
  const segs=28, lit=Math.round(segs*pct/100);
  let html="";
  for(let i=0;i<segs;i++){
    const ang=Math.PI - (i/(segs-1))*Math.PI;
    const x=95+Math.cos(ang)*78, y=100-Math.sin(ang)*78;
    const on=i<lit;
    html+=`<rect x="${x-4}" y="${y-7}" width="8" height="14" rx="4" transform="rotate(${90-(i/(segs-1))*180} ${x} ${y})" fill="${on?"#38bdf8":"rgba(255,255,255,.10)"}"/>`;
  }
  $("#gaugeSvg").innerHTML=html;
}
function renderCalendar(){
  const days=[];
  for(let i=0;i<7;i++){ const d=new Date(NOW); d.setDate(d.getDate()+i); days.push(d); }
  let total=0;
  $("#calStrip").innerHTML = days.map((d,i)=>{
    const items=ASSIGNMENTS.filter(a=>new Date(a.due).toDateString()===d.toDateString()&&a.status!=="Completed"&&a.status!=="Submitted");
    total+=items.length;
    return `<div class="cal-day ${i===0?"today":""}" onclick="filterAndGo('${i===0?"Due Today":"Upcoming"}')">
      <span class="dow">${d.toLocaleDateString("en-US",{weekday:"short"})}</span>
      <span class="dnum">${d.getDate()}</span>
      <span class="dcnt">${items.length?items.length+" due":"Clear"}</span>
      <span class="dots">${items.slice(0,4).map(a=>`<i style="background:${courseById(a.course).color}"></i>`).join("")}</span>
    </div>`;
  }).join("");
  $("#weekTotal").textContent = total+" due this week";
}
function renderRadar(){
  const max=5, W=580,H=200,pad=30;
  const x=i=>pad+i*(W-pad*2)/6, y=v=>H-32-(v/max)*(H-60);
  const grid=[0,1,2,3,4,5].map(v=>`<line x1="${pad}" y1="${y(v)}" x2="${W-pad}" y2="${y(v)}" stroke="rgba(255,255,255,.06)"/><text x="${pad-8}" y="${y(v)+3}" fill="#5b6b84" font-size="9" text-anchor="end" font-family="monospace">${v}h</text>`).join("");
  const line=(data,color)=>`<polyline fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${data.map((v,i)=>x(i)+","+y(v)).join(" ")}"/>`+data.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#0a1120" stroke="${color}" stroke-width="2.5"/>`).join("");
  const area=`<polygon fill="rgba(34,211,238,.08)" points="${RADAR.planned.map((v,i)=>x(i)+","+y(v)).join(" ")} ${x(6)},${H-32} ${x(0)},${H-32}"/>`;
  $("#radarChart").innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${grid}${area}${line(RADAR.planned,"#22d3ee")}${line(RADAR.actual,"#818cf8")}${RADAR.labels.map((l,i)=>`<text x="${x(i)}" y="${H-12}" fill="#64748b" font-size="10" text-anchor="middle" font-family="monospace">${l}</text>`).join("")}</svg>`;
  const tot=RADAR.actual.reduce((a,b)=>a+b,0);
  $("#radarNote").textContent=`${tot.toFixed(1)}h actual · ${(tot/RADAR.planned.reduce((a,b)=>a+b,0)*100).toFixed(0)}% of plan`;
}
function renderAutopilot(){
  const html = AUTOPILOT.map(p=>{const c=courseById(p.course);return `<div class="prio" style="cursor:default">
    <div class="prio-rank" style="color:${c.color}">✧</div>
    <div class="prio-info"><b>${esc(p.title)}</b><span>${esc(p.detail)}</span></div>
    <button class="btn btn-primary btn-sm" onclick="approvePlan('${p.id}')">Approve</button>
    <button class="btn btn-ghost btn-sm" onclick="discardPlan('${p.id}')">✕</button></div>`;}).join("") || `<p class="small muted" style="padding:10px 0">All plans reviewed. Copilot is standing by.</p>`;
  $("#autopilotList").innerHTML = html;
  $("#autopilotCount").textContent = AUTOPILOT.length;
  $("#copilotPlans").innerHTML = html;
}
function approvePlan(id){ const i=AUTOPILOT.findIndex(p=>p.id===id); if(i<0)return; const p=AUTOPILOT.splice(i,1)[0]; renderAutopilot(); toast(`✓ Approved: ${p.title} — added to your plan (still requires your review before any submission)`); }
function discardPlan(id){ const i=AUTOPILOT.findIndex(p=>p.id===id); if(i<0)return; AUTOPILOT.splice(i,1); renderAutopilot(); toast("Plan discarded"); }
function renderPriorities(){
  const prioW={High:3,Normal:2,Low:1};
  const list=[...ASSIGNMENTS].filter(a=>a.status!=="Completed"&&a.status!=="Submitted")
    .sort((a,b)=>{ const da=(new Date(a.due)-NOW)/86400000, db=(new Date(b.due)-NOW)/86400000; return (da - prioW[a.priority]*0.4) - (db - prioW[b.priority]*0.4); }).slice(0,5);
  $("#priorityList").innerHTML = list.map((a,i)=>{const c=courseById(a.course); const st=statusOf(a); const overdue=st==="Overdue";
    return `<div class="prio" style="--pc:${c.color}" onclick="openWorkspace('${a.id}')">
    <div class="prio-rank">${i+1}</div>
    <div class="prio-info"><b>${esc(a.title)}</b><span><span class="course-chip" style="background:${c.color}22;color:${c.color}"><span class="dotc" style="background:${c.color}"></span>${c.code}</span> · ${a.type} · ${a.points} pts</span></div>
    <div class="prio-due"><b style="color:${overdue?"#fda4af":"#e6edf7"}">${relDue(a.due)}</b><span>${fmtDate(a.due)} · ${a.priority}</span></div>
    <button class="btn ${overdue?"btn-danger":"btn-primary"} btn-sm">Launch →</button></div>`;}).join("");
}
function renderToday(){
  const today=ASSIGNMENTS.filter(a=>new Date(a.due).toDateString()===NOW.toDateString()&&a.status!=="Completed"&&a.status!=="Submitted");
  const extra=[{t:"9:00 AM",title:"Chemistry lecture — Thermodynamics",sub:"Whitmore 201",c:"#22d3ee"},{t:"1:00 PM",title:"Calculus recitation",sub:"Keller 204",c:"#818cf8"},{t:"4:00 PM",title:"Focus sprint — PS6",sub:"Library · 60 min",c:"#f59e0b"}];
  const items=[...today.map(a=>({t:fmtTime(a.due),title:a.title,sub:courseById(a.course).code+" · "+a.type,c:courseById(a.course).color,id:a.id})),...extra];
  $("#todaySchedule").innerHTML = items.slice(0,5).map(it=>`<div class="sched" ${it.id?`style="cursor:pointer" onclick="openWorkspace('${it.id}')"`:""}>
    <span class="sched-time">${it.t}</span><span class="sched-dot" style="background:${it.c}"></span>
    <div style="flex:1;min-width:0"><b>${esc(it.title)}</b><span>${esc(it.sub)}</span></div>${it.id?'<span class="tiny muted">→</span>':""}</div>`).join("") || `<p class="small muted" style="padding:12px 0">Clear day — enjoy the calm. 🎉</p>`;
}
function renderHeatmap(){
  let seed=7; const rnd=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
  let total=0;
  $("#heatmap").innerHTML = Array.from({length:98},()=>{ const v=rnd(); total+=v; const op=v<.15?0:v<.35?.25:v<.6?.5:v<.85?.75:1;
    return `<div class="heat-cell" title="${Math.round(v*4)}h focus" style="background:rgba(52,211,153,${op})"></div>`; }).join("");
  $("#heatTotal").textContent = Math.round(total*4)+"h total";
}
function renderMomentum(){
  $("#momentumList").innerHTML = COURSES.map(c=>{const as=ASSIGNMENTS.filter(a=>a.course===c.id); const done=as.filter(a=>a.status==="Completed"||a.status==="Submitted").length; const pct=as.length?Math.round(done/as.length*100):0;
    return `<div class="mom-row" onclick="openCourse('${c.id}')">
    <div class="flex" style="justify-content:space-between"><span class="small"><b>${c.code}</b> <span class="muted">${c.name}</span></span><b class="mono" style="color:${c.color}">${c.grade}%</b></div>
    <div class="progress mt" style="height:6px"><i style="width:${pct}%;background:${c.color}"></i></div>
    <div class="tiny muted" style="margin-top:4px">${done}/${as.length} complete</div></div>`;}).join("");
}
function actHTML(a){ return `<div class="act"><div class="act-ic" style="background:${a.color}1f;color:${a.color}">${a.icon}</div><div><b>${esc(a.title)}</b><span>${esc(a.sub)}</span></div><time>${a.time}</time></div>`; }
function renderActivity(){ $("#activityList").innerHTML=ACTIVITY.slice(0,5).map(actHTML).join(""); $("#drawerList").innerHTML=ACTIVITY.map(actHTML).join(""); }
function filterAndGo(f){ statusFilter=f; showView("ledger"); renderLedger(); }

/* ================= LEDGER ================= */
const STATUSES=["All","Due Today","Upcoming","Overdue","In Progress","Submitted","Awaiting Grading","Completed","Missing","Excused"];
function initLedger(){
  $("#statusTabs").innerHTML = STATUSES.map(s=>`<button class="tab ${s===statusFilter?"active":""}" data-s="${s}">${s}</button>`).join("");
  $$("#statusTabs .tab").forEach(b=>b.onclick=()=>{statusFilter=b.dataset.s; initLedger(); renderLedger();});
  $("#fCourse").innerHTML = `<option value="">All courses</option>`+COURSES.map(c=>`<option value="${c.id}">${c.code} — ${c.name}</option>`).join("");
  ["fCourse","fType","fPriority","fSort"].forEach(id=>$("#"+id).onchange=renderLedger);
  $("#fSearch").oninput=renderLedger;
  renderLedger(); renderWhatIf();
}
function matchesStatus(a){
  if(statusFilter==="All")return true;
  const st=statusOf(a);
  if(statusFilter==="Missing")return a.status==="Missing"||st==="Overdue";
  if(statusFilter==="Completed")return a.status==="Completed"||a.status==="Submitted";
  return st===statusFilter || a.status===statusFilter;
}
function renderLedger(){
  const fc=$("#fCourse").value, ft=$("#fType").value, fp=$("#fPriority").value, fs=$("#fSort").value, q=($("#fSearch").value||"").toLowerCase();
  let list=ASSIGNMENTS.filter(a=>matchesStatus(a)&&(!fc||a.course===fc)&&(!ft||a.type===ft)&&(!fp||a.priority===fp)&&(!q||a.title.toLowerCase().includes(q)));
  if(fs==="due")list.sort((a,b)=>a.due-b.due); else if(fs==="points")list.sort((a,b)=>b.points-a.points); else list.sort((a,b)=>courseById(a.course).code.localeCompare(courseById(b.course).code));
  $("#ledgerCount").textContent=`${list.length} of ${ASSIGNMENTS.length} assignments · Canvas + StudentVUE unified`;
  $("#ledgerList").innerHTML = list.map(a=>{const c=courseById(a.course); const st=statusOf(a);
    const stColor = st==="Overdue"||st==="Missing"?"badge-rose":st==="Due Today"?"badge-amber":st==="Completed"||st==="Submitted"?"badge-green":st==="In Progress"?"badge-cyan":"badge-violet";
    const barCls = st==="Overdue"||st==="Missing"?"rose":st==="Completed"||st==="Submitted"?"green":"";
    return `<div class="ledger-row" style="--lc:${c.color}" onclick="openWorkspace('${a.id}')">
    <div><h4>${esc(a.title)}</h4><div class="meta">${typeIcon(a.type)} ${a.type} · ${a.points} pts · ${a.priority} priority ${a.score?`· <b style="color:#6ee7b7">${a.score}/${a.points}</b>`:""}</div></div>
    <div class="hide-ipad"><span class="course-chip" style="background:${c.color}22;color:${c.color}"><span class="dotc" style="background:${c.color}"></span>${c.code}</span><div class="meta">${c.name}</div></div>
    <div><b class="mono small">${fmtDate(a.due)}</b><div class="meta">${relDue(a.due)}</div></div>
    <div><div class="progress ${barCls}"><i style="width:${a.progress}%"></i></div><div class="meta mono">${a.progress}%</div></div>
    <div><span class="badge ${stColor}">${st}</span></div>
    <button class="btn btn-ghost btn-sm">Open →</button></div>`;}).join("") || `<div class="card" style="text-align:center;padding:36px"><p class="muted">No assignments match these filters. Try clearing a facet.</p></div>`;
}
function renderWhatIf(){
  $("#whatifList").innerHTML = COURSES.map(c=>{
    const as=ASSIGNMENTS.filter(a=>a.course===c.id&&a.status!=="Completed"&&a.status!=="Submitted");
    const pendingPts=as.reduce((s,a)=>s+a.points,0);
    return `<div style="margin-bottom:14px">
    <div class="flex" style="justify-content:space-between"><span class="small"><b style="color:${c.color}">${c.code}</b> ${c.name} <span class="muted">· current ${c.grade}% · ${as.length} pending (${pendingPts} pts)</span></span><b class="mono" id="wi-val-${c.id}">${c.grade}%</b></div>
    <input type="range" min="0" max="100" value="${c.grade}" data-c="${c.id}" class="wi-slider">
    <div class="tiny muted">↳ Projected final grade if remaining work averages this score</div></div>`;}).join("");
  $$(".wi-slider").forEach(s=>s.oninput=updateWhatIf);
  updateWhatIf();
}
function gradeToGpa(p){ return p>=90?4.0:p>=87?3.7:p>=83?3.3:p>=80?3.0:p>=77?2.7:p>=73?2.3:p>=70?2.0:p>=67?1.7:p>=63?1.3:p>=60?1.0:0; }
function updateWhatIf(){
  let pts=0,tot=0;
  COURSES.forEach(c=>{
    const slider=$(`.wi-slider[data-c="${c.id}"]`); const proj=+slider.value;
    $("#wi-val-"+c.id).textContent=proj+"%";
    const as=ASSIGNMENTS.filter(a=>a.course===c.id);
    const donePts=as.filter(a=>a.status==="Completed"||a.status==="Submitted").reduce((s,a)=>s+(a.score||0),0);
    const doneMax=as.filter(a=>a.status==="Completed"||a.status==="Submitted").reduce((s,a)=>s+a.points,0);
    const pendMax=as.filter(a=>a.status!=="Completed"&&a.status!=="Submitted").reduce((s,a)=>s+a.points,0);
    const finalPct = (doneMax+pendMax)>0 ? (donePts + pendMax*proj/100)/(doneMax+pendMax)*100 : proj;
    pts+=gradeToGpa(finalPct)*c.credits; tot+=c.credits;
  });
  const gpa=pts/tot; const delta=gpa-3.82;
  $("#projGpa").textContent=gpa.toFixed(2);
  $("#projDelta").textContent=(delta>=0?"+":"")+delta.toFixed(2);
  $("#projDelta").style.color=delta>=0?"#6ee7b7":"#fda4af";
  $("#hsGpa").textContent=gpa.toFixed(2);
}

/* ================= COURSES ================= */
function renderCourses(){
  $("#courseGrid").innerHTML = COURSES.map(c=>{const as=ASSIGNMENTS.filter(a=>a.course===c.id); const done=as.filter(a=>a.status==="Completed"||a.status==="Submitted").length;
    return `<div class="card course-card" style="--cc:${c.color}" onclick="openCourse('${c.id}')">
    <div class="flex" style="justify-content:space-between;align-items:flex-start"><span class="course-code">${c.code} · ${c.credits} CREDITS</span><span class="course-chip" style="background:${c.color}22;color:${c.color}"><span class="dotc" style="background:${c.color}"></span>ACTIVE</span></div>
    <h3>${c.name}</h3><div class="prof">${c.prof}</div>
    <div class="flex" style="justify-content:space-between;margin-top:16px"><div><div class="tiny muted" style="font-weight:800;letter-spacing:.08em">CURRENT GRADE</div><div class="grade-big" style="color:${c.color}">${c.grade}%</div></div><div style="text-align:right"><div class="tiny muted" style="font-weight:800;letter-spacing:.08em">GPA POINTS</div><div class="grade-big">${gradeToGpa(c.grade).toFixed(1)}</div></div></div>
    <div class="mini-stats"><div><b>${as.length}</b><span>Assignments</span></div><div><b>${done}</b><span>Complete</span></div><div><b>${c.modules.length}</b><span>Modules</span></div></div></div>`;}).join("");
}
function openCourse(id){ toast("Course workspace is loading. Try again in a moment."); }

/* ================= NOTES ================= */
function renderNotes(){
  $("#nCourse").innerHTML=`<option value="">All courses</option>`+COURSES.map(c=>`<option value="${c.id}">${c.code}</option>`).join("");
  $("#nCourse").onchange=renderNotes; $("#nTag").oninput=renderNotes;
  const fc=$("#nCourse").value, tag=($("#nTag").value||"").toLowerCase();
  const list=NOTES.filter(n=>(!fc||n.course===fc)&&(!tag||n.tags.join(" ").toLowerCase().includes(tag)));
  $("#notesGrid").innerHTML=list.map(n=>{const c=courseById(n.course); const linked=n.link?ASSIGNMENTS.find(a=>a.id===n.link):null;
    return `<div class="card note-card" onclick="openNote('${n.id}')">
    <div class="flex" style="justify-content:space-between"><span class="course-chip" style="background:${c.color}22;color:${c.color}">${c.code}</span><span class="tiny muted mono">${n.body.split(/\s+/).length} words</span></div>
    <h4 style="margin-top:10px">${esc(n.title)}</h4><p>${esc(n.body.replace(/[#*`>\-\[\]]/g,"").slice(0,140))}…</p>
    <div class="flex mt">${n.tags.map(t=>`<span class="tag">#${t}</span>`).join("")}</div>
    ${linked?`<div class="tiny mt" style="color:#67e8f9">🔗 Linked: ${esc(linked.title)}</div>`:""}</div>`;}).join("")||`<p class="muted small">No notes match. Create one above.</p>`;
  $("#noteLink").innerHTML=`<option value="">Link to assignment…</option>`+ASSIGNMENTS.map(a=>`<option value="${a.id}">${esc(a.title)}</option>`).join("");
}
function openNote(id){ currentNote=id; const n=NOTES.find(x=>x.id===id); if(!n)return;
  $("#noteEditor").style.display="block"; $("#noteTitle").textContent=n.title; $("#noteMeta").textContent=`${courseById(n.course).code} · tags: ${n.tags.join(", ")}`;
  $("#noteBody").value=n.body; $("#noteLink").value=n.link||""; updateNoteWords();
  $("#noteEditor").scrollIntoView({behavior:"smooth"});
}
function newNote(){ const n={id:"n"+Date.now(),title:"Untitled Note",course:"chem",tags:["draft"],body:"## New note\n\nStart writing…",link:""}; NOTES.unshift(n); renderNotes(); openNote(n.id); toast("✎ New note created"); }
function noteFmt(pre,post=""){ const ta=$("#noteBody"); const s=ta.selectionStart,e=ta.selectionEnd; const sel=ta.value.slice(s,e)||"text"; ta.value=ta.value.slice(0,s)+pre+sel+post+ta.value.slice(e); ta.focus(); updateNoteWords(); }
function updateNoteWords(){ const v=$("#noteBody").value; $("#noteWords").textContent=v.trim()?v.trim().split(/\s+/).length+" words":"0 words"; $("#noteSaved").textContent="● Editing…"; clearTimeout(updateNoteWords._h); updateNoteWords._h=setTimeout(()=>$("#noteSaved").textContent="✓ Autosaved",900); }
$("#noteBody").addEventListener("input",updateNoteWords);
function saveNote(){ if(!currentNote)return; const n=NOTES.find(x=>x.id===currentNote); n.body=$("#noteBody").value; n.link=$("#noteLink").value; renderNotes(); toast("✓ Note saved"); }
function deleteNote(){ if(!currentNote)return; NOTES=NOTES.filter(x=>x.id!==currentNote); currentNote=null; $("#noteEditor").style.display="none"; renderNotes(); toast("Note deleted"); }

/* Workspace rendering is initialized in premium.js. */
function openWorkspace(id){ toast("Workspace is loading. Try again in a moment."); }

/* ================= STUDY LAB ================= */
function barChart(el,data,color){ $(el).innerHTML=data.map(d=>`<div class="bar-row"><span class="lbl">${d[0]}</span><div class="bar-track"><div class="bar-fill" style="width:${d[1]}%;background:${color}"></div></div><span class="val">${d[2]}</span></div>`).join(""); }
function renderLab(){
  $("#pomoAssign").innerHTML=ASSIGNMENTS.filter(a=>a.status!=="Completed"&&a.status!=="Submitted").map(a=>`<option value="${a.id}">${esc(a.title)} (${courseById(a.course).code})</option>`).join("");
  $$("#pomoModes .tab").forEach(b=>b.onclick=()=>{ $$("#pomoModes .tab").forEach(x=>x.classList.remove("active")); b.classList.add("active"); pomo.min=+b.dataset.min; resetPomo(); });
  renderFlash();
  barChart("#chartSubject",[["Chemistry",82,"4.2h"],["Calculus",64,"3.1h"],["English",48,"2.4h"],["Biology",56,"2.8h"],["CS",38,"1.9h"],["History",30,"1.5h"]],"linear-gradient(90deg,#22d3ee,#38bdf8)");
  barChart("#chartQuiz",[["Integration",88,"88%"],["Thermo",76,"76%"],["Kinetics",84,"84%"],["Genetics",71,"71%"],["Series",68,"68%"]],"linear-gradient(90deg,#818cf8,#a78bfa)");
  barChart("#chartTime",[["On-time",92,"92%"],["Late",8,"8%"]],"linear-gradient(90deg,#34d399,#10b981)");
}
function fmtPomo(s){ return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }
function togglePomo(){
  if(pomo.running){ clearInterval(pomo.timer); pomo.running=false; $("#pomoToggle").textContent="▶ Resume"; $("#pomoStatus").textContent="Paused. Take a breath — then resume."; return; }
  pomo.running=true; $("#pomoToggle").textContent="⏸ Pause";
  const a=ASSIGNMENTS.find(x=>x.id===$("#pomoAssign").value);
  $("#pomoStatus").textContent=`Focusing: ${a?a.title:""} — stay in flow.`;
  pomo.timer=setInterval(()=>{ pomo.left--; $("#pomoTime").textContent=fmtPomo(Math.max(0,pomo.left)); $("#pomoBar").style.width=((pomo.total-pomo.left)/pomo.total*100)+"%";
    if(pomo.left<=0){ clearInterval(pomo.timer); pomo.running=false; $("#pomoToggle").textContent="▶ Start focus"; $("#pomoStatus").textContent="🎉 Sprint complete! Log it and take a 5-min break."; toast("🎉 Focus sprint complete — session logged to Activity"); ACTIVITY.unshift({icon:"✦",color:"#818cf8",title:"Focus sprint completed",sub:`${pomo.min} min · ${a?a.title:""}`,time:"Just now"}); renderActivity(); resetPomo(); } },1000);
}
function resetPomo(){ clearInterval(pomo.timer); pomo.running=false; pomo.total=pomo.min*60; pomo.left=pomo.total; $("#pomoTime").textContent=fmtPomo(pomo.left); $("#pomoBar").style.width="0%"; $("#pomoToggle").textContent="▶ Start focus"; $("#pomoStatus").textContent="Ready. Distraction-free mode will dim the dashboard."; }
function renderFlash(){ const f=FLASHCARDS[flashIdx]; $("#flashQ").textContent=f.q; $("#flashA").textContent=f.a; $("#flashCard").classList.remove("flipped"); $("#flashCount").textContent=`Card ${flashIdx+1} / ${FLASHCARDS.length}`; updateMastery(); }
function flipFlash(){ $("#flashCard").classList.toggle("flipped"); }
function updateMastery(){ const avg=Math.round(FLASHCARDS.reduce((s,f)=>s+f.mastery,0)/FLASHCARDS.length); $("#masteryPct").textContent=avg+"%"; $("#masteryBar").style.width=avg+"%"; }
function rateFlash(r){ const f=FLASHCARDS[flashIdx]; f.mastery=Math.max(0,Math.min(100,f.mastery+(r==="Easy"?12:r==="Good"?6:-10))); toast(r==="Hard"?"↻ Card will resurface soon (spaced repetition)":r==="Good"?"✓ Good — next review in 3 days":"✓ Easy — next review in 7 days"); nextFlash(); }
function nextFlash(){ flashIdx=(flashIdx+1)%FLASHCARDS.length; renderFlash(); }

/* ================= COPILOT ================= */
function addMsg(role,html){ const box=$("#chatBox"); box.insertAdjacentHTML("beforeend",`<div class="msg ${role}">${html}</div>`); box.scrollTop=box.scrollHeight; }
function copilotReply(q){
  const s=q.toLowerCase();
  if(s.includes("scaffold")||s.includes("essay")||s.includes("outline")) return `<b>✦ Assignment Scaffold — Gothic Novel Analysis</b><br><br><b>Milestones:</b><br>1. Thesis lock (today, 30m) — choose: <i>“Shelley mirrors Victor's isolation in the sublime landscape.”</i><br>2. Evidence bank (tomorrow) — 6 quotes mapped to claims<br>3. Body drafts (Day 3) — 3 sections × 350 words<br>4. Source integration (Day 4) — 3 scholarly citations<br>5. Polish + MLA check (Day 5)<br><br>I've staged this as an Autopilot plan. <b>Nothing submits without your approval.</b> Want me to insert the outline into your essay draft?`;
  if(s.includes("integration")||s.includes("by parts")||s.includes("explain")) return `<b>✦ Integration by Parts — worked example</b><br><br>Formula: <b>∫u dv = uv − ∫v du</b> (product rule rearranged).<br><br>Example: ∫ x·ln(x) dx<br>• u = ln(x) → du = dx/x<br>• dv = x dx → v = x²/2<br>• Result: (x²/2)ln(x) − ∫(x²/2)(1/x)dx = <b>(x²/2)ln(x) − x²/4 + C</b><br><br>Rule of thumb: pick u to simplify when differentiated (logs, inverse trig). Want a practice problem?`;
  if(s.includes("quiz")||s.includes("thermo")||s.includes("chemistry")||s.includes("practice")) return `<b>✦ Practice Quiz — Thermodynamics</b><br><br>Q1. If ΔH &lt; 0 and ΔS &gt; 0, is the reaction spontaneous? <i>(Yes — ΔG &lt; 0 at all T)</i><br>Q2. ΔG° = −RT ln K. If K = 10, sign of ΔG°? <i>(Negative)</i><br>Q3. Increasing T effect on endothermic equilibrium? <i>(Shifts right)</i><br><br>8 questions + 6 flashcards added to Study Lab. Try a 25m sprint on Q1–Q4.`;
  if(s.includes("plan")||s.includes("week")||s.includes("schedule")) return `<b>✦ Your Week, Planned</b><br><br>• <b>Today:</b> Thermodynamics PS6 (60m) → Quiz 4 prep (25m)<br>• <b>Tomorrow:</b> Essay draft sprint (45m) + Reading response (30m)<br>• <b>Day 3:</b> Enzyme lab report (60m) + Cold War discussion (20m)<br>• <b>Day 4:</b> Cell Signaling midterm review (45m flashcards)<br><br>Total: ~4.5h/day. Staged as an Autopilot plan for your approval.`;
  if(s.includes("gpa")||s.includes("grade")) return `Your projected GPA is <b>3.82</b>. The What-If calculator in the Ledger shows: scoring 85%+ on remaining work keeps you at <b>3.85+</b>. Biggest lever: Chemistry (4 credits, 91%). Want me to model a specific final exam score?`;
  return `Great question. Here's what I'd suggest for <i>“${esc(q)}”</i>:<br><br>1. <b>Break it down</b> — identify the rubric criteria first.<br>2. <b>Timebox it</b> — a 25m focus sprint beats a 2h drift.<br>3. <b>Draft ugly, then polish</b> — get structure before style.<br><br>I can scaffold this into milestones, generate practice questions, or build flashcards from your notes. Which would help most? <span class="tiny muted">(Guardrail: I prepare, you approve — I never auto-submit.)</span>`;
}
function sendChat(){ const inp=$("#chatInput"); const v=inp.value.trim(); if(!v)return; addMsg("user",esc(v)); inp.value=""; setTimeout(()=>addMsg("ai",copilotReply(v)),450); }
function quickChat(q){ addMsg("user",esc(q)); setTimeout(()=>addMsg("ai",copilotReply(q)),450); }
$("#chatInput").addEventListener("keydown",e=>{ if(e.key==="Enter")sendChat(); });

/* ================= INIT ================= */
renderDashboard(); initLedger(); renderCourses(); renderNotes(); renderLab(); renderAutopilot();
addMsg("ai",`✦ <b>Welcome back, Christian.</b> I see <b>2 assignments due today</b> and <b>2 overdue</b>. I've staged an essay scaffold and a midterm study plan in your Autopilot Desk — review them when ready. Remember: I prepare, you approve. What shall we tackle first?`);

/* ===== SETTINGS, THEMES & PERSONALIZATION ===== */
const DEFAULT_SETTINGS = {
  theme: "midnight",
  accent: "#c4e87b",
  density: "comfortable",
  name: "Christian",
  targetGpa: "3.90",
  noAnim: false
};
const THEME_NAMES = new Set(["obsidian","midnight","emerald","nordic","parchment","aurora","nebula","starlight","solar"]);
let SETTINGS = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem("northstar_settings_v1") || "{}");
    const merged = Object.assign({}, DEFAULT_SETTINGS, saved && typeof saved === "object" ? saved : {});
    if (!THEME_NAMES.has(merged.theme) || merged.theme === "obsidian") merged.theme = DEFAULT_SETTINGS.theme;
    if (!/^#[0-9a-f]{6}$/i.test(merged.accent)) merged.accent = DEFAULT_SETTINGS.accent;
    if (!["compact","comfortable","spacious"].includes(merged.density)) merged.density = DEFAULT_SETTINGS.density;
    return merged;
  } catch { return Object.assign({}, DEFAULT_SETTINGS); }
})();

function saveSettings(){
  localStorage.setItem("northstar_settings_v1", JSON.stringify(SETTINGS));
}

function applySettings(){
  const root = document.documentElement;
  if(SETTINGS.theme === "obsidian") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", SETTINGS.theme);

  root.setAttribute("data-density", SETTINGS.density || "comfortable");
  root.style.setProperty("--cyan", SETTINGS.accent || "#c4e87b");

  if(SETTINGS.noAnim) root.setAttribute("data-no-anim", "true");
  else root.removeAttribute("data-no-anim");

  // Update greeting name
  const gr = $("#greeting");
  if(gr){
    const hr = new Date().getHours();
    const part = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    gr.innerHTML = `${part}, <em>${esc(SETTINGS.name || "Christian")}</em>.`;
  }

  // Sync Settings UI if open
  $$("#themeSwatches .swatch-btn").forEach(b => b.classList.toggle("active", b.dataset.themeVal === SETTINGS.theme));
  $$("#accentRow .accent-dot").forEach(b => b.classList.toggle("active", b.dataset.acc === SETTINGS.accent));
  $$("#densitySeg .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.den === SETTINGS.density));
  if($("#setName")) $("#setName").value = SETTINGS.name || "";
  if($("#setGpa")) $("#setGpa").value = SETTINGS.targetGpa || "3.90";
  if($("#togNoAnim")) $("#togNoAnim").classList.toggle("on", !!SETTINGS.noAnim);
}

function openSettings(){
  applySettings();
  showView("settings");
}
function setTheme(t){ if(!THEME_NAMES.has(t)) return; SETTINGS.theme = t; saveSettings(); applySettings(); toast(`Theme: ${t}`); }
function setAccent(c){ SETTINGS.accent = c; saveSettings(); applySettings(); }
function setDensity(d){ SETTINGS.density = d; saveSettings(); applySettings(); }
function toggleSetting(k){ SETTINGS[k] = !SETTINGS[k]; saveSettings(); applySettings(); }
function updateProfileSettings(){
  SETTINGS.name = ($("#setName")?.value || "Christian").trim() || "Christian";
  SETTINGS.targetGpa = $("#setGpa")?.value || "3.90";
  saveSettings();
  applySettings();
}
function resetSettings(){
  SETTINGS = Object.assign({}, DEFAULT_SETTINGS);
  saveSettings();
  applySettings();
  toast("Settings reset to defaults");
}

/* ===== UPGRADED FREE CONTEXT-AWARE AI COPILOT ===== */
function copilotReply(raw){
  const q = raw.toLowerCase();
  const pending = ASSIGNMENTS.filter(a => statusOf(a) !== "Completed" && statusOf(a) !== "Submitted");
  const overdue = pending.filter(a => statusOf(a) === "Overdue");
  const today = pending.filter(a => statusOf(a) === "Due Today");

  if(q.includes("due") || q.includes("overdue") || q.includes("today") || q.includes("deadline")){
    const list = [...overdue, ...today].slice(0, 5);
    if(!list.length) return "🎉 You're all caught up — no overdue or due-today assignments!";
    return `<b>Here's what needs attention right now:</b><br>` +
      list.map(a => `• <b>${esc(a.title)}</b> (${esc(a.course)}) — <span style="color:var(--amber)">${relDue(a.due)}</span>`).join("<br>") +
      `<br><br>Want me to build a <b>study plan</b> to knock these out?`;
  }

  if(q.includes("gpa") || q.includes("grade") || q.includes("average")){
    const avg = (COURSES.reduce((s,c)=>s+c.grade,0)/COURSES.length).toFixed(1);
    const gpa = (COURSES.reduce((s,c)=>s+gradeToGpa(c.grade),0)/COURSES.length).toFixed(2);
    const low = [...COURSES].sort((a,b)=>a.grade-b.grade)[0];
    return `📊 Your current average is <b>${avg}%</b> (<b>${gpa} GPA</b> vs. your <b>${esc(SETTINGS.targetGpa)}</b> target).<br><br>` +
      COURSES.map(c => `• ${esc(c.name)}: <b>${c.grade}%</b>`).join("<br>") +
      `<br><br>💡 <b>Biggest opportunity:</b> Focusing on <b>${esc(low.name)}</b> (${low.grade}%) will lift your GPA fastest.`;
  }

  if(q.includes("plan") || q.includes("schedule") || q.includes("study")){
    const top3 = pending.slice(0, 3);
    if(!top3.length) return "Your queue is clear! Try a 25-minute review sprint in the <b>Study Lab</b>.";
    return `🗓️ <b>2-Hour Smart Study Plan:</b><br>` +
      top3.map((a,i) => `${i+1}. <b>${(i+1)*25 - 25}–${(i+1)*25}m:</b> ${esc(a.title)} (${esc(a.course)})`).join("<br>") +
      `<br><br>Click <b>Start focus sprint</b> on your dashboard whenever you're ready.`;
  }

  if(q.includes("quiz") || q.includes("practice") || q.includes("test")){
    return `🧠 <b>Quick Practice Question:</b><br>Which substitution is most appropriate for <code>∫ x·e^(x²) dx</code>?<br>` +
      `A) u = x² &nbsp; B) u = e^(x²) &nbsp; C) u = x·e^(x²)<br><br>` +
      `<i>Tip:</i> Open the <b>Study Lab</b> tab for full interactive quizzes with instant hints and explanations!`;
  }

  if(q.includes("essay") || q.includes("write") || q.includes("outline") || q.includes("thesis")){
    return `✍️ <b>3-Part Essay Scaffold:</b><br>` +
      `1. <b>Hook &amp; Thesis:</b> State your central claim clearly in 1–2 sentences.<br>` +
      `2. <b>Evidence &amp; Analysis:</b> Pair each body paragraph with a specific primary source or data point.<br>` +
      `3. <b>Counterargument &amp; Synthesis:</b> Address one opposing view and explain why your thesis still holds.<br><br>` +
      `Head to <b>Notes &amp; Essay Studio</b> to draft with live word count.`;
  }

  return `✦ I'm your free <b>NORTHSTAR Copilot</b>. I can inspect your live <b>${pending.length} pending assignments</b>, calculate your <b>GPA</b>, build a <b>study plan</b>, or give you <b>quiz &amp; essay help</b>.<br><br>Try asking: <i>"What's due today?"</i>, <i>"What's my GPA?"</i>, or <i>"Make a study plan"</i>.`;
}

applySettings();
