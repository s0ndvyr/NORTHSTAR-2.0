import { useEffect, useMemo, useState, type FormEvent } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, BookOpenCheck, CalendarDays, CheckCircle2, ChevronRight, Clock3, Command, FileText, Filter, GraduationCap, LayoutDashboard, Library, Pencil, Plus, RotateCcw, Save, Search, Settings2, Sparkles, Target, Timer, Trash2, X } from "lucide-react";
import type { AcademicAssignment, AcademicSnapshot, AssignmentPriority, AssignmentStatus } from "./domain/academic";
import { ASSIGNMENT_STATUS_LABELS } from "./domain/academic";
import { createAssignment, deleteAssignment, loadAcademicSnapshot, resetAcademicSnapshot, saveAcademicSnapshot, updateAssignment, updateAssignmentStatus, type AssignmentInput } from "./domain/academic-repository";

const links = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Assignments", to: "/assignments", icon: CheckCircle2 },
  { label: "Courses", to: "/courses", icon: GraduationCap },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Study Lab", to: "/study", icon: BookOpen },
  { label: "Gradebook", to: "/gradebook", icon: Target },
  { label: "Resources", to: "/resources", icon: Library },
  { label: "AI Workspace", to: "/ai", icon: Sparkles },
];
const pages: Record<string, { eyebrow: string; title: string; copy: string }> = {
  "/resources": { eyebrow: "YOUR LIBRARY", title: "Resources", copy: "A home for the documents and materials that support your work." },
  "/ai": { eyebrow: "INTELLIGENT ASSISTANCE", title: "AI Workspace", copy: "A future-ready workspace. AI providers are not connected." },
  "/settings": { eyebrow: "PERSONALIZE", title: "Settings", copy: "Manage your local demo workspace." },
};
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
const localDateTime = (value?: string) => {
  const date = value ? new Date(value) : new Date(Date.now() + 86400000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const dueLabel = (value: string) => {
  const due = new Date(value); const today = new Date();
  if (due.toDateString() === today.toDateString()) return "Due today";
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
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
  return <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>{title}</b></div><div className="top-actions"><span className="demo-state"><i/> LOCAL DEMO DATA</span><span className="quick"><Command size={14}/> NORTHSTAR 5.0</span></div></header>;
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

function AssignmentEditor({ courses, initial, onSave, onCancel }: { courses: AcademicSnapshot["courses"]; initial?: AcademicAssignment; onSave: (input: AssignmentInput) => void; onCancel: () => void }) {
  const [courseId, setCourseId] = useState(initial?.courseId ?? courses[0]?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueAt, setDueAt] = useState(localDateTime(initial?.dueAt));
  const [pointsPossible, setPointsPossible] = useState(String(initial?.pointsPossible ?? 10));
  const [priority, setPriority] = useState<AssignmentPriority>(initial?.priority ?? "normal");
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(initial?.estimatedMinutes ?? 30));
  const [personalNotes, setPersonalNotes] = useState(initial?.personalNotes ?? "");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ courseId, title, description, dueAt: new Date(dueAt).toISOString(), pointsPossible: Math.max(0, Number(pointsPossible)), priority, estimatedMinutes: Math.max(0, Number(estimatedMinutes)), personalNotes });
  };
  return <form className="panel editor-panel" onSubmit={submit}>
    <div className="panel-head"><div><span className="eyebrow">{initial ? "EDIT COURSEWORK" : "NEW COURSEWORK"}</span><h3>{initial ? "Update assignment" : "Create assignment"}</h3></div><button type="button" className="icon-action" aria-label="Close editor" onClick={onCancel}><X size={17}/></button></div>
    <div className="editor-grid">
      <label>Assignment title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Research response"/></label>
      <label>Course<select required value={courseId} onChange={e=>setCourseId(e.target.value)}>{courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></label>
      <label className="wide">Description<textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What needs to be completed?"/></label>
      <label>Due date and time<input required type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)}/></label>
      <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as AssignmentPriority)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
      <label>Points possible<input type="number" min="0" step="0.5" value={pointsPossible} onChange={e=>setPointsPossible(e.target.value)}/></label>
      <label>Estimated minutes<input type="number" min="0" step="5" value={estimatedMinutes} onChange={e=>setEstimatedMinutes(e.target.value)}/></label>
      <label className="wide">Personal notes<textarea rows={2} value={personalNotes} onChange={e=>setPersonalNotes(e.target.value)} placeholder="Private notes, reminders, or next steps"/></label>
    </div>
    <div className="editor-actions"><button type="button" className="quiet-action" onClick={onCancel}>Cancel</button><button type="submit" className="primary-action"><Save size={14}/>{initial ? "Save changes" : "Create assignment"}</button></div>
  </form>;
}

function Assignments({ snapshot, onStatus, onCreate, onUpdate, onDelete }: { snapshot: AcademicSnapshot; onStatus: (id: string, status: AssignmentStatus) => void; onCreate: (input: AssignmentInput) => void; onUpdate: (id: string, input: AssignmentInput) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all"); const [course, setCourse] = useState("all");
  const [editor, setEditor] = useState<"new" | string | null>(null);
  const filtered = useMemo(() => snapshot.assignments.filter(a => {
    const matchesQuery = `${a.title} ${a.description} ${a.personalNotes}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || a.status === status) && (course === "all" || a.courseId === course);
  }).sort((a,b) => new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()), [snapshot.assignments, query, status, course]);
  const editing = typeof editor === "string" ? snapshot.assignments.find(a=>a.id===editor) : undefined;
  const handleSave = (input: AssignmentInput) => {
    if (editor === "new") onCreate(input);
    else if (typeof editor === "string") onUpdate(editor, input);
    setEditor(null);
  };
  return <div className="content workspace-page">
    <div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> COURSEWORK MANAGEMENT</div><h1>Assignments<em>.</em></h1><p>One clear queue for every piece of work across your courses.</p></div><button className="primary-action" onClick={()=>setEditor("new")}><Plus size={15}/> New assignment</button></div>
    <div className="assignment-summary"><div><strong>{snapshot.assignments.length}</strong><span>Tracked items</span></div><div><strong>{snapshot.assignments.filter(a=>!["graded","submitted"].includes(a.status)).length}</strong><span>Open</span></div><div><strong>{snapshot.assignments.filter(a=>a.status==="missing" || (new Date(a.dueAt)<new Date() && !["graded","submitted"].includes(a.status))).length}</strong><span>Needs attention</span></div></div>
    {editor && <AssignmentEditor key={editor} courses={snapshot.courses} initial={editing} onSave={handleSave} onCancel={()=>setEditor(null)}/>}
    <section className="panel assignment-panel"><div className="assignment-toolbar"><label className="assignment-search"><Search size={16}/><input aria-label="Search assignments" placeholder="Search assignments and notes..." value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="filter-control"><Filter size={14}/><select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="filter-control"><select aria-label="Filter by course" value={course} onChange={e=>setCourse(e.target.value)}><option value="all">All courses</option>{snapshot.courses.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}</select></label></div>
      <div className="assignment-list">{filtered.map(a=><article className="assignment-row" key={a.id}><div className="assignment-main"><div className="assignment-meta"><span>{snapshot.courses.find(c=>c.id===a.courseId)?.code}</span><span>·</span><span>{a.pointsPossible} pts</span><span>·</span><span>{a.estimatedMinutes} min</span><span>·</span><span>{a.priority.toUpperCase()}</span></div><h3>{a.title}</h3><p>{a.description || "No description added."}</p><small className="assignment-due">{dueLabel(a.dueAt)} · {dateLabel(a.dueAt)}</small>{a.personalNotes && <p className="personal-note">Note: {a.personalNotes}</p>}</div><div className="assignment-actions"><span className={`status-pill status-${a.status}`}>{ASSIGNMENT_STATUS_LABELS[a.status]}</span><select aria-label={`Update status for ${a.title}`} value={a.status} onChange={e=>onStatus(a.id,e.target.value as AssignmentStatus)}>{Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><div className="row-actions"><button aria-label={`Edit ${a.title}`} className="icon-action" onClick={()=>setEditor(a.id)}><Pencil size={14}/></button><button aria-label={`Delete ${a.title}`} className="icon-action danger-action" onClick={()=>{if(window.confirm(`Delete “${a.title}” from this local demo?`))onDelete(a.id)}}><Trash2 size={14}/></button></div></div></article>)}
      {filtered.length===0 && <div className="empty-state"><Search size={22}/><b>No assignments match those filters.</b><span>Try a different search or status.</span></div>}</div>
      <div className="list-footnote">Status changes and personal notes are local workflow overlays. They do not represent official Canvas submission records.</div>
    </section>
  </div>;
}
function Courses({ snapshot }: { snapshot: AcademicSnapshot }) {
  return <div className="content workspace-page"><div className="page-intro"><div className="eyebrow"><i/> YOUR SEMESTER</div><h1>Courses<em>.</em></h1><p>Your courses are the connective tissue for assignments, learning and resources.</p></div><div className="course-grid">{snapshot.courses.map(c=><article className="panel course-card" key={c.id}><div className="course-card-top"><span>{c.code}</span><GraduationCap size={18}/></div><h3>{c.name}</h3><p>{c.instructor}</p><div className="bar"><i style={{width:`${c.progress}%`}}/></div><small>{c.progress}% course progress · {snapshot.assignments.filter(a=>a.courseId===c.id).length} tracked assignments</small></article>)}</div><div className="footnote">Course records are illustrative demo data, not institution-connected records.</div></div>;
}
function Calendar({ snapshot }: { snapshot: AcademicSnapshot }) {
  const sorted = [...snapshot.assignments].sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
  const grouped = sorted.reduce<Record<string,AcademicAssignment[]>>((groups,item)=>{const key=new Date(item.dueAt).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});(groups[key]??=[]).push(item);return groups;},{});
  return <div className="content workspace-page"><div className="page-intro"><div className="eyebrow"><i/> TIME & MOMENTUM</div><h1>Calendar<em>.</em></h1><p>Your academic deadlines, drawn from the same assignment records used across NORTHSTAR.</p></div><div className="calendar-layout"><section className="panel calendar-list">{Object.entries(grouped).map(([day,items])=><div className="calendar-day" key={day}><div className="calendar-date">{day}</div>{items.map(a=><div className="calendar-item" key={a.id}><i className={a.status==="graded"?"complete":a.status==="missing"?"overdue":""}/><span><b>{a.title}</b><small>{snapshot.courses.find(c=>c.id===a.courseId)?.code} · {a.estimatedMinutes} min · {ASSIGNMENT_STATUS_LABELS[a.status]}</small></span><span className="calendar-time">{new Date(a.dueAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span></div>)}</div>)}{!sorted.length&&<div className="empty-state">No deadlines yet.</div>}</section><aside className="panel calendar-aside"><span className="eyebrow">DEADLINE OVERVIEW</span><h3>{sorted.length} tracked dates</h3><p>Calendar entries update automatically when you create, edit, or remove an assignment.</p><NavLink to="/assignments" className="text-link">Manage assignments <ArrowUpRight size={14}/></NavLink></aside></div></div>;
}
function StudyLab({ snapshot }: { snapshot: AcademicSnapshot }) {
  const cards = snapshot.assignments.filter(a=>a.status!=="graded").map(a=>({front:a.title,back:a.description||"Add a description to turn this item into a study prompt.",course:snapshot.courses.find(c=>c.id===a.courseId)?.code??"COURSE"}));
  const [index,setIndex]=useState(0); const [revealed,setRevealed]=useState(false);
  useEffect(()=>{setIndex(0);setRevealed(false)},[cards.length]);
  const card=cards[index];
  return <div className="content workspace-page"><div className="page-intro"><div className="eyebrow"><i/> LEARNING & RETENTION</div><h1>Study Lab<em>.</em></h1><p>A focused review space built from your current coursework. These are demo prompts, not AI-generated study materials.</p></div><div className="study-layout"><section className="panel study-card-panel"><div className="study-card-top"><span className="eyebrow">QUICK REVIEW · {cards.length} CARDS</span><span>{cards.length?index+1:0} / {cards.length}</span></div>{card?<><div className="flashcard" onClick={()=>setRevealed(value=>!value)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setRevealed(value=>!value)}}}><span>{revealed?"REVIEW NOTE":"PROMPT"} · {card.course}</span><h2>{revealed?card.back:card.front}</h2><small>{revealed?"Tap to return to prompt":"Tap to reveal the linked assignment description"}</small></div><div className="study-controls"><button className="quiet-action" onClick={()=>{setIndex(Math.max(0,index-1));setRevealed(false)}} disabled={index===0}><ArrowLeft size={14}/> Previous</button><button className="primary-action" onClick={()=>{setIndex((index+1)%cards.length);setRevealed(false)}}>Next card <ArrowRight size={14}/></button></div></>:<div className="empty-state">No review cards available. Add coursework to begin.</div>}</section><aside className="panel study-aside"><BookOpenCheck size={22}/><h3>Small sessions add up.</h3><p>Use these prompts to revisit the ideas connected to your active coursework. Dedicated flashcard authoring, spaced repetition and learning analytics are part of the next study-engine increment.</p><div><Clock3 size={14}/> Suggested session · 10 minutes</div></aside></div></div>;
}
function Gradebook({ snapshot }: { snapshot: AcademicSnapshot }) {
  return <div className="content workspace-page"><div className="page-intro"><div className="eyebrow"><i/> PERFORMANCE OVERVIEW</div><h1>Gradebook<em>.</em></h1><p>A transparent view of what has been graded so far. No official grades are connected.</p></div><div className="gradebook-grid">{snapshot.courses.map(course=>{const assignments=snapshot.assignments.filter(a=>a.courseId===course.id);const graded=assignments.filter(a=>a.status==="graded");const possible=graded.reduce((sum,a)=>sum+a.pointsPossible,0);return <article className="panel grade-card" key={course.id}><span className="eyebrow">{course.code}</span><h3>{course.name}</h3><strong>{graded.length}<small> / {assignments.length} graded items</small></strong><div className="bar"><i style={{width:assignments.length?`${graded.length/assignments.length*100}%`:"0%"}}/></div><p>{possible? `${possible} possible points represented in graded demo work`:"No graded demo items yet"}</p></article>})}</div><div className="footnote">This is a progress view of illustrative records, not a calculated institutional course grade.</div></div>;
}
function Placeholder({ path, onReset }: { path: string; onReset: () => void }) {
  const page = pages[path] ?? { eyebrow: "PERSONALIZE", title: "Workspace", copy: "This workspace will be built on the shared NORTHSTAR academic foundation." };
  return <div className="content placeholder"><div className="eyebrow"><i/> {page.eyebrow}</div><h1>{page.title}<em>.</em></h1><p>{page.copy}</p><section className="panel coming"><Sparkles size={22}/><span><b>{path==="/ai"?"Provider connection is intentionally disabled.":"This workspace is taking shape."}</b><small>{path==="/ai"?"The UI is a safe placeholder. No AI provider, API key, or external service is connected.":"This area will be implemented incrementally using the approved NORTHSTAR architecture."}</small></span><em>IN DEVELOPMENT</em></section>{path==="/settings" && <section className="panel settings-panel"><div><b>Reset local demo data</b><small>Restore the original illustrative courses and assignment statuses in this browser.</small></div><button onClick={onReset}><RotateCcw size={14}/> Reset demo workspace</button></section>}</div>;
}
function Routed({ snapshot, onStatus, onCreate, onUpdate, onDelete, onReset }: { snapshot: AcademicSnapshot; onStatus: (id:string,status:AssignmentStatus)=>void; onCreate:(input:AssignmentInput)=>void; onUpdate:(id:string,input:AssignmentInput)=>void; onDelete:(id:string)=>void; onReset:()=>void }) {
  const location = useLocation();
  return <><Topbar pathname={location.pathname}/><AnimatePresence mode="wait"><motion.main key={location.pathname} className="scroll" initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.18}}><Routes><Route path="/" element={<Dashboard snapshot={snapshot}/>}/><Route path="/assignments" element={<Assignments snapshot={snapshot} onStatus={onStatus} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete}/>}/><Route path="/courses" element={<Courses snapshot={snapshot}/>}/><Route path="/calendar" element={<Calendar snapshot={snapshot}/>}/><Route path="/study" element={<StudyLab snapshot={snapshot}/>}/><Route path="/gradebook" element={<Gradebook snapshot={snapshot}/>}/><Route path="*" element={<Placeholder path={location.pathname} onReset={onReset}/>}/></Routes></motion.main></AnimatePresence></>;
}
export default function App() {
  const [snapshot, setSnapshot] = useState<AcademicSnapshot>(() => loadAcademicSnapshot());
  const [storageAvailable,setStorageAvailable] = useState(true);
  useEffect(() => { setStorageAvailable(saveAcademicSnapshot(snapshot)); }, [snapshot]);
  const handleStatus = (id: string, status: AssignmentStatus) => setSnapshot(current => updateAssignmentStatus(current,id,status));
  const handleCreate = (input: AssignmentInput) => setSnapshot(current => createAssignment(current,input));
  const handleUpdate = (id: string, input: AssignmentInput) => setSnapshot(current => updateAssignment(current,id,input));
  const handleDelete = (id: string) => setSnapshot(current => deleteAssignment(current,id));
  const handleReset = () => setSnapshot(resetAcademicSnapshot());
  return <div className="app"><Sidebar snapshot={snapshot}/><div className="main"><Routed snapshot={snapshot} onStatus={handleStatus} onCreate={handleCreate} onUpdate={handleUpdate} onDelete={handleDelete} onReset={handleReset}/>{!storageAvailable&&<div className="storage-warning" role="status">Browser storage is unavailable. Changes are kept for this session only.</div>}</div></div>;
}
