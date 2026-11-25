import { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Command, FileText, GraduationCap, LayoutDashboard, Library, Search, Settings2, Sparkles, Timer, RotateCcw, Filter } from "lucide-react";
import type { AcademicAssignment, AcademicSnapshot, AssignmentStatus } from "./domain/academic";
import { ASSIGNMENT_STATUS_LABELS } from "./domain/academic";
import { loadAcademicSnapshot, resetAcademicSnapshot, saveAcademicSnapshot, updateAssignmentStatus } from "./domain/academic-repository";

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
  "/calendar": { eyebrow: "TIME & MOMENTUM", title: "Calendar", copy: "See deadlines, classes and focused work in one academic timeline." },
  "/study": { eyebrow: "LEARNING", title: "Study Lab", copy: "Turn course content into deliberate practice and lasting understanding." },
  "/resources": { eyebrow: "YOUR LIBRARY", title: "Resources", copy: "A home for the documents and materials that support your work." },
  "/ai": { eyebrow: "INTELLIGENT ASSISTANCE", title: "AI Workspace", copy: "A future-ready workspace. AI providers are not connected." },
  "/settings": { eyebrow: "PERSONALIZE", title: "Settings", copy: "Manage your local demo workspace." },
};
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
const dueLabel = (value: string) => {
  const due = new Date(value); const today = new Date();
  const sameDay = due.toDateString() === today.toDateString();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (sameDay) return "Due today";
  if (due.toDateString() === tomorrow.toDateString()) return "Due tomorrow";
  return dateLabel(value);
};
function Sidebar({ snapshot }: { snapshot: AcademicSnapshot }) {
  const outstanding = snapshot.assignments.filter(a => !["graded", "submitted"].includes(a.status)).length;
  return <aside className="sidebar">
    <NavLink to="/" className="brand"><span className="brand-mark"><i /></span><b>NORTHSTAR</b><small>5.0</small></NavLink>
    <div className="side-label">WORKSPACE</div>
    <nav aria-label="Primary navigation">{links.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}><Icon size={17}/><span>{label}</span>{label === "Assignments" && <small className="count">{outstanding}</small>}</NavLink>)}</nav>
    <div className="side-bottom">
      <div className="semester"><span className="side-label">CURRENT TERM</span><strong>{snapshot.term.name}</strong><div className="progress"><i/></div><small><span>Semester progress</span><b>68%</b></small></div>
      <NavLink to="/settings" className="nav-link"><Settings2 size={17}/><span>Settings</span></NavLink>
      <div className="profile"><span className="avatar">N</span><span><b>Student workspace</b><small>Personal environment</small></span><i/></div>
    </div>
  </aside>;
}
function Topbar({ pathname }: { pathname: string }) {
  const title = pathname === "/" ? "Overview" : pathname.slice(1).replace(/^./, c => c.toUpperCase());
  return <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>{title}</b></div><div className="top-actions"><span className="icon-button" aria-label="Search available on assignments"><Search size={17}/></span><span className="demo-state"><i/> LOCAL DEMO DATA</span><span className="quick"><Command size={14}/> NORTHSTAR 5.0</span></div></header>;
}
function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Timer }) {
  return <article className="stat"><div><span>{label}</span><i><Icon size={16}/></i></div><strong>{value}</strong><small>{note}</small></article>;
}
function Dashboard({ snapshot }: { snapshot: AcademicSnapshot }) {
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const completed = snapshot.assignments.filter(a => ["graded", "submitted"].includes(a.status)).length;
  const open = snapshot.assignments.filter(a => !["graded", "submitted"].includes(a.status));
  const overdue = open.filter(a => new Date(a.dueAt) < new Date()).length;
  const upcoming = open.filter(a => new Date(a.dueAt) >= new Date()).length;
  const priorities = [...open].sort((a,b) => {
    const rank = (a: AcademicAssignment) => a.status === "missing" ? 0 : new Date(a.dueAt) < new Date() ? 1 : a.priority === "urgent" ? 2 : a.priority === "high" ? 3 : 4;
    return rank(a)-rank(b) || new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime();
  }).slice(0,4);
  const courseName = (id: string) => snapshot.courses.find(c => c.id === id)?.code ?? "COURSE";
  return <div className="content">
    <div className="welcome"><div><div className="eyebrow"><i/> YOUR ACADEMIC COMMAND CENTER <span/> {date.toUpperCase()}</div><h1>Make today <em>count.</em></h1><p>Your semester, your priorities, all moving in the right direction.</p></div><div className="focus"><i/><span><b>Focus mode</b><small>Ready when you are</small></span></div></div>
    <section className="hero"><div className="hero-copy"><div className="eyebrow">✦ &nbsp; SEMESTER OVERVIEW</div><h2>Stay close to<br/>what <em>matters.</em></h2><p>Your academic picture, brought into focus. Build momentum one thoughtful step at a time.</p><NavLink to="/assignments">View your priorities <ArrowUpRight size={15}/></NavLink></div><div className="cosmos" aria-hidden="true"><div className="stars"/><div className="halo"/><div className="planet"><i/><b/><span/></div><div className="orbit orbit-a"/><div className="orbit orbit-b"/><small>01 / 02 &nbsp; — &nbsp; SEMESTER IN MOTION</small></div><span className="hero-index">N° 01</span></section>
    <section className="stats"><Stat label="COURSES" value={String(snapshot.courses.length)} note="Active this semester" icon={GraduationCap}/><Stat label="COMPLETED WORK" value={String(completed)} note={`Of ${snapshot.assignments.length} tracked items`} icon={CheckCircle2}/><Stat label="OVERDUE / MISSING" value={String(overdue)} note="Needs your attention" icon={CalendarDays}/><Stat label="UPCOMING WORK" value={String(upcoming)} note="Still on your list" icon={Timer}/></section>
    <section className="columns">
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">YOUR NEXT MOVES</span><h3>Priority queue</h3></div><NavLink to="/assignments">All assignments <ChevronRight size={14}/></NavLink></div>
        {priorities.map(a=><div className="priority" key={a.id}><i className={a.status === "missing" || new Date(a.dueAt)<new Date() ? "urgent" : a.priority === "high" ? "today" : "next"}/><span><b>{a.title}</b><small>{courseName(a.courseId)} · {dueLabel(a.dueAt)}</small></span><em className={a.status === "missing" || new Date(a.dueAt)<new Date() ? "urgent" : "next"}>{a.status === "missing" ? "MISSING" : new Date(a.dueAt)<new Date() ? "OVERDUE" : "UP NEXT"}</em></div>)}
      </article>
      <article className="panel continue"><div className="panel-head"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h3>Continue working</h3></div><span>•••</span></div><div className="document"><FileText size={27}/><b>{priorities[0] ? courseName(priorities[0].courseId) : "NORTHSTAR"}</b><i/><i/><i/></div><strong>{priorities[0]?.title ?? "You're all caught up"}</strong><small>{priorities[0] ? "Your next priority is ready" : "No outstanding assignments"}</small><NavLink to="/assignments">Open coursework <ArrowUpRight size={14}/></NavLink></article>
    </section>
    <section className="columns lower">
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">LEARNING IN MOTION</span><h3>Course pulse</h3></div><NavLink to="/courses">View courses <ChevronRight size={14}/></NavLink></div>{snapshot.courses.map(course=><div className="course" key={course.id}><i>{course.code.slice(0,2)}</i><span><b>{course.name}</b><small>{course.code} · {course.instructor}</small></span><div className="bar"><i style={{width:`${course.progress}%`}}/></div><small>{course.progress}%</small></div>)}</article>
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">ACADEMIC SNAPSHOT</span><h3>At a glance</h3></div><Activity size={17}/></div><div className="activity"><i><CheckCircle2 size={14}/></i><span><b>{completed} items completed or submitted</b><small>Based on your local workspace status</small></span></div><div className="activity"><i><Timer size={14}/></i><span><b>{open.length} items still in progress</b><small>Update status from Assignments</small></span></div></article>
    </section>
    <div className="footnote"><Sparkles size={13}/> Local demo workspace · Changes save in this browser only. No Canvas connection.</div>
  </div>;
}
function Assignments({ snapshot, onStatus }: { snapshot: AcademicSnapshot; onStatus: (id: string, status: AssignmentStatus) => void }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all"); const [course, setCourse] = useState("all");
  const filtered = useMemo(() => snapshot.assignments.filter(a => {
    const matchesQuery = `${a.title} ${a.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || a.status === status) && (course === "all" || a.courseId === course);
  }).sort((a,b) => new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()), [snapshot.assignments, query, status, course]);
  return <div className="content workspace-page">
    <div className="page-intro"><div className="eyebrow"><i/> COURSEWORK MANAGEMENT</div><h1>Assignments<em>.</em></h1><p>One clear queue for every piece of work across your courses.</p></div>
    <div className="assignment-summary"><div><strong>{snapshot.assignments.length}</strong><span>Tracked items</span></div><div><strong>{snapshot.assignments.filter(a=>!["graded","submitted"].includes(a.status)).length}</strong><span>Open</span></div><div><strong>{snapshot.assignments.filter(a=>a.status==="missing" || (new Date(a.dueAt)<new Date() && !["graded","submitted"].includes(a.status))).length}</strong><span>Needs attention</span></div></div>
    <section className="panel assignment-panel"><div className="assignment-toolbar"><label className="assignment-search"><Search size={16}/><input aria-label="Search assignments" placeholder="Search assignments..." value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="filter-control"><Filter size={14}/><select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="filter-control"><select aria-label="Filter by course" value={course} onChange={e=>setCourse(e.target.value)}><option value="all">All courses</option>{snapshot.courses.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}</select></label></div>
      <div className="assignment-list">{filtered.map(a=><article className="assignment-row" key={a.id}><div className="assignment-main"><div className="assignment-meta"><span>{snapshot.courses.find(c=>c.id===a.courseId)?.code}</span><span>·</span><span>{a.pointsPossible} pts</span><span>·</span><span>{a.estimatedMinutes} min</span></div><h3>{a.title}</h3><p>{a.description}</p><small className="assignment-due">{dueLabel(a.dueAt)} · {dateLabel(a.dueAt)}</small></div><div className="assignment-actions"><span className={`status-pill status-${a.status}`}>{ASSIGNMENT_STATUS_LABELS[a.status]}</span><select aria-label={`Update status for ${a.title}`} value={a.status} onChange={e=>onStatus(a.id,e.target.value as AssignmentStatus)}>{Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div></article>)}
      {filtered.length===0 && <div className="empty-state"><Search size={22}/><b>No assignments match those filters.</b><span>Try a different search or status.</span></div>}</div>
      <div className="list-footnote">Status changes are personal workflow overlays. They do not represent official Canvas submission records.</div>
    </section>
  </div>;
}
function Courses({ snapshot }: { snapshot: AcademicSnapshot }) {
  return <div className="content workspace-page"><div className="page-intro"><div className="eyebrow"><i/> YOUR SEMESTER</div><h1>Courses<em>.</em></h1><p>Your courses are the connective tissue for assignments, learning and resources.</p></div><div className="course-grid">{snapshot.courses.map(c=><article className="panel course-card" key={c.id}><div className="course-card-top"><span>{c.code}</span><GraduationCap size={18}/></div><h3>{c.name}</h3><p>{c.instructor}</p><div className="bar"><i style={{width:`${c.progress}%`}}/></div><small>{c.progress}% course progress · {snapshot.assignments.filter(a=>a.courseId===c.id).length} tracked assignments</small></article>)}</div><div className="footnote">Course records are illustrative demo data, not institution-connected records.</div></div>;
}
function Placeholder({ path, onReset }: { path: string; onReset: () => void }) {
  const page = pages[path] ?? { eyebrow: "PERSONALIZE", title: "Workspace", copy: "This workspace will be built on the shared NORTHSTAR academic foundation." };
  return <div className="content placeholder"><div className="eyebrow"><i/> {page.eyebrow}</div><h1>{page.title}<em>.</em></h1><p>{page.copy}</p><section className="panel coming"><Sparkles size={22}/><span><b>This workspace is taking shape.</b><small>The shared academic foundation is now in place. This area will be implemented incrementally using the approved NORTHSTAR architecture.</small></span><em>IN DEVELOPMENT</em></section>{path==="/settings" && <section className="panel settings-panel"><div><b>Reset local demo data</b><small>Restore the original illustrative courses and assignment statuses in this browser.</small></div><button onClick={onReset}><RotateCcw size={14}/> Reset demo workspace</button></section>}</div>;
}
function Routed({ snapshot, onStatus, onReset }: { snapshot: AcademicSnapshot; onStatus: (id:string,status:AssignmentStatus)=>void; onReset:()=>void }) {
  const location = useLocation();
  return <><Topbar pathname={location.pathname}/><AnimatePresence mode="wait"><motion.main key={location.pathname} className="scroll" initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.18}}><Routes><Route path="/" element={<Dashboard snapshot={snapshot}/>}/><Route path="/assignments" element={<Assignments snapshot={snapshot} onStatus={onStatus}/>}/><Route path="/courses" element={<Courses snapshot={snapshot}/>}/><Route path="*" element={<Placeholder path={location.pathname} onReset={onReset}/>}/></Routes></motion.main></AnimatePresence></>;
}
export default function App() {
  const [snapshot, setSnapshot] = useState<AcademicSnapshot>(() => loadAcademicSnapshot());
  useEffect(() => { saveAcademicSnapshot(snapshot); }, [snapshot]);
  const handleStatus = (id: string, status: AssignmentStatus) => setSnapshot(current => updateAssignmentStatus(current,id,status));
  const handleReset = () => setSnapshot(resetAcademicSnapshot());
  return <div className="app"><Sidebar snapshot={snapshot}/><div className="main"><Routed snapshot={snapshot} onStatus={handleStatus} onReset={handleReset}/></div></div>;
}
