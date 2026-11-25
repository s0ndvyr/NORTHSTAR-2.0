import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Command, FileText, GraduationCap, LayoutDashboard, Library, Search, Settings2, Sparkles, Timer } from "lucide-react";

const links = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Assignments", to: "/assignments", icon: CheckCircle2 },
  { label: "Courses", to: "/courses", icon: GraduationCap },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Study Lab", to: "/study", icon: BookOpen },
  { label: "Resources", to: "/resources", icon: Library },
  { label: "AI Workspace", to: "/ai", icon: Sparkles },
];
const pages: Record<string, { eyebrow: string; title: string; copy: string }> = {
  "/assignments": { eyebrow: "COURSEWORK", title: "Assignments", copy: "A clear view of what needs your attention and what is already moving forward." },
  "/courses": { eyebrow: "YOUR SEMESTER", title: "Courses", copy: "Keep course materials, progress and academic context connected." },
  "/calendar": { eyebrow: "TIME & MOMENTUM", title: "Calendar", copy: "See deadlines, classes and focused work in one academic timeline." },
  "/study": { eyebrow: "LEARNING", title: "Study Lab", copy: "Turn course content into deliberate practice and lasting understanding." },
  "/resources": { eyebrow: "YOUR LIBRARY", title: "Resources", copy: "A home for the documents and materials that support your work." },
  "/ai": { eyebrow: "INTELLIGENT ASSISTANCE", title: "AI Workspace", copy: "A future-ready workspace. AI providers are not connected in this foundation preview." },
};

function Sidebar() {
  return <aside className="sidebar">
    <NavLink to="/" className="brand"><span className="brand-mark"><i /></span><b>NORTHSTAR</b><small>5.0</small></NavLink>
    <div className="side-label">WORKSPACE</div>
    <nav aria-label="Primary navigation">{links.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}><Icon size={17}/><span>{label}</span>{label === "Assignments" && <small className="count">4</small>}</NavLink>)}</nav>
    <div className="side-bottom">
      <div className="semester"><span className="side-label">SEMESTER 01</span><strong>Fall semester</strong><div className="progress"><i/></div><small><span>Semester progress</span><b>68%</b></small></div>
      <NavLink to="/settings" className="nav-link"><Settings2 size={17}/><span>Settings</span></NavLink>
      <div className="profile"><span className="avatar">S</span><span><b>Student profile</b><small>Personal workspace</small></span><i/></div>
    </div>
  </aside>;
}
function Topbar() {
  return <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>Overview</b></div><div className="top-actions"><span className="icon-button" aria-label="Search preview"><Search size={17}/></span><span className="demo-state"><i/> DEMO ENVIRONMENT</span><span className="quick"><Command size={14}/> Quick actions <kbd>⌘ K</kbd></span></div></header>;
}
function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Timer }) {
  return <article className="stat"><div><span>{label}</span><i><Icon size={16}/></i></div><strong>{value}</strong><small>{note}</small></article>;
}
function Dashboard() {
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  return <div className="content">
    <div className="welcome"><div><div className="eyebrow"><i/> YOUR ACADEMIC COMMAND CENTER <span/> {date.toUpperCase()}</div><h1>Make today <em>count.</em></h1><p>Your semester, your priorities, all moving in the right direction.</p></div><div className="focus"><i/><span><b>Focus mode</b><small>Ready when you are</small></span></div></div>
    <section className="hero"><div className="hero-copy"><div className="eyebrow">✦ &nbsp; SEMESTER OVERVIEW</div><h2>Stay close to<br/>what <em>matters.</em></h2><p>Your academic picture, brought into focus. Build momentum one thoughtful step at a time.</p><NavLink to="/assignments">View your priorities <ArrowUpRight size={15}/></NavLink></div><div className="cosmos" aria-hidden="true"><div className="stars"/><div className="halo"/><div className="planet"><i/><b/><span/></div><div className="orbit orbit-a"/><div className="orbit orbit-b"/><small>01 / 02 &nbsp; — &nbsp; SEMESTER IN MOTION</small></div><span className="hero-index">N° 01</span></section>
    <section className="stats"><Stat label="COURSE PROGRESS" value="76%" note="Across 4 active courses" icon={GraduationCap}/><Stat label="COMPLETED WORK" value="28" note="Of 37 tracked items" icon={CheckCircle2}/><Stat label="UPCOMING DEADLINES" value="04" note="Next 7 days" icon={CalendarDays}/><Stat label="FOCUS THIS WEEK" value="12.5h" note="Across 8 sessions" icon={Timer}/></section>
    <section className="columns">
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">YOUR NEXT MOVES</span><h3>Priority queue</h3></div><NavLink to="/assignments">All assignments <ChevronRight size={14}/></NavLink></div>
        {[["Research response — Draft 2","ENG 204 · Overdue by 1 day","OVERDUE","urgent"],["Module 6 knowledge check","BIO 112 · Due today, 11:59 PM","TODAY","today"],["Comparative analysis outline","HIS 210 · Due Thursday","UP NEXT","next"],["Problem set 08","MAT 151 · Due Friday","UP NEXT","next"]].map(([title,meta,tag,tone])=><div className="priority" key={title}><i className={tone}/><span><b>{title}</b><small>{meta}</small></span><em className={tone}>{tag}</em></div>)}
      </article>
      <article className="panel continue"><div className="panel-head"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h3>Continue working</h3></div><span>•••</span></div><div className="document"><FileText size={27}/><b>ENG 204</b><i/><i/><i/></div><strong>Research response</strong><small>Last opened yesterday · Draft saved</small><NavLink to="/assignments">Resume assignment <ArrowUpRight size={14}/></NavLink></article>
    </section>
    <section className="columns lower">
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">LEARNING IN MOTION</span><h3>Course pulse</h3></div><NavLink to="/courses">View courses <ChevronRight size={14}/></NavLink></div>{[["EN","Academic Writing","ENG 204 · 8 of 10 units","82%"],["BI","General Biology","BIO 112 · 6 of 9 units","68%"],["HI","World History","HIS 210 · 5 of 8 units","61%"]].map(([code,name,meta,pct])=><div className="course" key={code}><i>{code}</i><span><b>{name}</b><small>{meta}</small></span><div className="bar"><i style={{width:pct}}/></div><small>{pct}</small></div>)}</article>
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">A LITTLE MOMENTUM</span><h3>Recent activity</h3></div><Activity size={17}/></div>{[["Reading reflection submitted","ENG 204 · Yesterday, 4:32 PM"],["Study session completed","BIO 112 · Yesterday, 2:10 PM"],["New grade received","HIS 210 · Monday, 9:14 AM"]].map(([a,b])=><div className="activity" key={a}><i><CheckCircle2 size={14}/></i><span><b>{a}</b><small>{b}</small></span></div>)}</article>
    </section>
    <div className="footnote"><Sparkles size={13}/> Preview workspace · All academic figures and activity are illustrative demo data.</div>
  </div>;
}
function Placeholder({ path }: { path: string }) {
  const page = pages[path] ?? { eyebrow: "PERSONALIZE", title: "Settings", copy: "Shape your NORTHSTAR workspace and preferences." };
  return <div className="content placeholder"><div className="eyebrow"><i/> {page.eyebrow}</div><h1>{page.title}<em>.</em></h1><p>{page.copy}</p><section className="panel coming"><Sparkles size={22}/><span><b>This workspace is taking shape.</b><small>The shared application foundation is in place. This area will be built incrementally using the NORTHSTAR design system and academic data model.</small></span><em>FOUNDATION</em></section></div>;
}
function Routed() {
  const location = useLocation();
  return <><Topbar/><AnimatePresence mode="wait"><motion.main key={location.pathname} className="scroll" initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.18}}><Routes><Route path="/" element={<Dashboard/>}/><Route path="*" element={<Placeholder path={location.pathname}/>}/></Routes></motion.main></AnimatePresence></>;
}
export default function App() { return <div className="app"><Sidebar/><div className="main"><Routed/></div></div>; }
