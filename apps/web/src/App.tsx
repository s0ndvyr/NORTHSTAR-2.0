import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { NavLink, Route, Routes, useLocation, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, BookOpenCheck, CalendarDays, ClipboardCheck, CheckCircle2, ChevronRight, Clock3, Command, Download, FileText, Filter, GraduationCap, LayoutDashboard, Library, Pencil, Plus, RotateCcw, Save, Search, Settings2, Sparkles, Target, Timer, Trash2, Upload, X } from "lucide-react";
import type { AcademicAssignment, AcademicEventKind, AcademicResource, AcademicResourceKind, AcademicSnapshot, AssignmentPriority, AssignmentStatus, GradeItem, GradeItemStatus, StudyRating } from "./domain/academic";
import { ASSIGNMENT_STATUS_LABELS } from "./domain/academic";
import { createAcademicBackup, parseAcademicBackup, createAcademicEvent, createGradeItem, createAssignment, createResource, createStudyCard, deleteAcademicEvent, deleteGradeItem, deleteAssignment, deleteResource, deleteStudyCard, loadAcademicSnapshot, resetAcademicSnapshot, saveAcademicSnapshot, updateAssignment, updateAssignmentStatus, updateResource, updateGradeItem, rateStudyCard, saveWritingDraft, selectGradeSummary, deleteWritingDraft, type AcademicEventInput, type AssignmentInput, type GradeItemInput, type ResourceInput, type StudyCardInput, type WritingDraftInput } from "./domain/academic-repository";

const links = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Assignments", to: "/assignments", icon: CheckCircle2 },
  { label: "Courses", to: "/courses", icon: GraduationCap },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Study Lab", to: "/study", icon: BookOpen },
  { label: "Gradebook", to: "/gradebook", icon: Target },
  { label: "Review Center", to: "/review", icon: ClipboardCheck },
  { label: "Resources", to: "/resources", icon: Library },
  { label: "AI Workspace", to: "/ai", icon: Sparkles },
  { label: "Settings", to: "/settings", icon: Settings2 },
];
const pages: Record<string, { eyebrow: string; title: string; copy: string }> = {
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
      <div className="assignment-list">{filtered.map(a=><article className="assignment-row" key={a.id}><div className="assignment-main"><div className="assignment-meta"><span>{snapshot.courses.find(c=>c.id===a.courseId)?.code}</span><span>·</span><span>{a.pointsPossible} pts</span><span>·</span><span>{a.estimatedMinutes} min</span><span>·</span><span>{a.priority.toUpperCase()}</span></div><h3>{a.title}</h3><p>{a.description || "No description added."}</p><small className="assignment-due">{dueLabel(a.dueAt)} · {dateLabel(a.dueAt)}</small><NavLink className="text-link assignment-draft-link" to={`/review?assignmentId=${encodeURIComponent(a.id)}`}>Open draft workspace <ArrowUpRight size={12}/></NavLink>{a.personalNotes && <p className="personal-note">Note: {a.personalNotes}</p>}</div><div className="assignment-actions"><span className={`status-pill status-${a.status}`}>{ASSIGNMENT_STATUS_LABELS[a.status]}</span><select aria-label={`Update status for ${a.title}`} value={a.status} onChange={e=>onStatus(a.id,e.target.value as AssignmentStatus)}>{Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><div className="row-actions"><button aria-label={`Edit ${a.title}`} className="icon-action" onClick={()=>setEditor(a.id)}><Pencil size={14}/></button><button aria-label={`Delete ${a.title}`} className="icon-action danger-action" onClick={()=>{if(window.confirm(`Delete “${a.title}” from this local demo?`))onDelete(a.id)}}><Trash2 size={14}/></button></div></div></article>)}
      {filtered.length===0 && <div className="empty-state"><Search size={22}/><b>No assignments match those filters.</b><span>Try a different search or status.</span></div>}</div>
      <div className="list-footnote">Status changes and personal notes are local workflow overlays. They do not represent official Canvas submission records.</div>
    </section>
  </div>;
}
function Courses({ snapshot }: { snapshot: AcademicSnapshot }) {
  return <div className="content workspace-page"><div className="page-intro"><div className="eyebrow"><i/> YOUR SEMESTER</div><h1>Courses<em>.</em></h1><p>Each course brings its assignments, study cards and resources into one connected hub.</p></div><div className="course-grid">{snapshot.courses.map(c=><NavLink to={`/courses/${c.id}`} className="panel course-card" key={c.id}><div className="course-card-top"><span>{c.code}</span><GraduationCap size={18}/></div><h3>{c.name}</h3><p>{c.instructor}</p><div className="bar"><i style={{width:`${c.progress}%`}}/></div><small>{c.progress}% course progress · {snapshot.assignments.filter(a=>a.courseId===c.id).length} assignments</small><span className="course-open">Open course hub <ArrowUpRight size={13}/></span></NavLink>)}</div><div className="footnote">Course records are illustrative demo data, not institution-connected records.</div></div>;
}
function CourseDetail({ snapshot }: { snapshot: AcademicSnapshot }) {
  const { courseId } = useParams();
  const course=snapshot.courses.find(item=>item.id===courseId);
  if(!course)return <div className="content workspace-page"><div className="empty-state"><b>Course not found.</b><NavLink to="/courses">Return to courses</NavLink></div></div>;
  const assignments=snapshot.assignments.filter(item=>item.courseId===course.id).sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
  const resources=(snapshot.resources??[]).filter(item=>item.courseId===course.id);
  const cards=(snapshot.studyCards??[]).filter(item=>item.courseId===course.id);
  return <div className="content workspace-page"><div className="page-intro"><NavLink className="text-link" to="/courses"><ArrowLeft size={13}/> All courses</NavLink><div className="eyebrow"><i/> COURSE HUB · {course.code}</div><h1>{course.name}<em>.</em></h1><p>{course.instructor} · {snapshot.term.name}</p></div><div className="assignment-summary"><div><strong>{assignments.length}</strong><span>Assignments</span></div><div><strong>{resources.length}</strong><span>Resources</span></div><div><strong>{cards.length}</strong><span>Study cards</span></div></div><section className="course-detail-progress panel"><div><span className="eyebrow">COURSE PROGRESS</span><strong>{course.progress}%</strong></div><div className="bar"><i style={{width:`${course.progress}%`}}/></div></section><div className="course-detail-grid"><section className="panel"><div className="panel-head"><div><span className="eyebrow">COURSEWORK</span><h3>Assignments</h3></div><NavLink to="/assignments">Manage <ArrowUpRight size={13}/></NavLink></div>{assignments.map(item=><div className="priority" key={item.id}><i className={item.status==="missing"?"urgent":"next"}/><span><b>{item.title}</b><small>{dueLabel(item.dueAt)} · {ASSIGNMENT_STATUS_LABELS[item.status]}</small></span></div>)}{!assignments.length&&<p className="empty-inline">No assignments linked to this course.</p>}</section><section className="panel"><div className="panel-head"><div><span className="eyebrow">REFERENCE MATERIAL</span><h3>Resources</h3></div><NavLink to="/resources">Library <ArrowUpRight size={13}/></NavLink></div>{resources.map(item=><div className="priority" key={item.id}><i className="next"/><span><b>{item.title}</b><small>{item.kind.toUpperCase()} · {item.description}</small></span></div>)}{!resources.length&&<p className="empty-inline">No resources linked to this course.</p>}</section><section className="panel"><div className="panel-head"><div><span className="eyebrow">LEARNING & RETENTION</span><h3>Study cards</h3></div><NavLink to="/study">Study Lab <ArrowUpRight size={13}/></NavLink></div>{cards.map(item=><div className="priority" key={item.id}><i className="next"/><span><b>{item.prompt}</b><small>Next review {dateLabel(item.nextReviewAt)}</small></span></div>)}{!cards.length&&<p className="empty-inline">No study cards linked to this course.</p>}</section></div></div>;
}
function Calendar({ snapshot, onCreateEvent, onDeleteEvent }: { snapshot:AcademicSnapshot; onCreateEvent:(input:AcademicEventInput)=>void; onDeleteEvent:(id:string)=>void }) {
  const [showEditor,setShowEditor]=useState(false);
  const [title,setTitle]=useState("");
  const [kind,setKind]=useState<AcademicEventKind>("class");
  const [courseId,setCourseId]=useState("");
  const [assignmentId,setAssignmentId]=useState("");
  const [startsAt,setStartsAt]=useState(localDateTime());
  const [endsAt,setEndsAt]=useState(localDateTime());
  const [notes,setNotes]=useState("");
  const assignments=snapshot.assignments.map(item=>({id:item.id,title:item.title,courseId:item.courseId,startsAt:item.dueAt,endsAt:item.dueAt,kind:"deadline" as const,notes:item.personalNotes,source:"northstar" as const,status:item.status}));
  const events=(snapshot.events??[]).map(item=>({...item,kind:item.kind as string,status:"event"}));
  const timeline=[...assignments,...events].sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  const grouped=timeline.reduce<Record<string,typeof timeline>>((groups,item)=>{const key=new Date(item.startsAt).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});(groups[key]??=[]).push(item);return groups;},{});
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();onCreateEvent({title,kind,courseId:courseId||undefined,assignmentId:assignmentId||undefined,startsAt:new Date(startsAt).toISOString(),endsAt:new Date(endsAt).toISOString(),notes});setTitle("");setNotes("");setShowEditor(false);};
  return <div className="content workspace-page">
    <div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> TIME & MOMENTUM</div><h1>Calendar<em>.</em></h1><p>Assignment deadlines, class sessions, study blocks and personal reminders in one agenda.</p></div><button className="primary-action" onClick={()=>setShowEditor(value=>!value)}><Plus size={15}/> Add event</button></div>
    {showEditor&&<form className="panel editor-panel" onSubmit={submit}><div className="panel-head"><div><span className="eyebrow">NEW CALENDAR EVENT</span><h3>Add to your agenda</h3></div><button type="button" className="icon-action" aria-label="Close event editor" onClick={()=>setShowEditor(false)}><X size={17}/></button></div><div className="editor-grid"><label className="wide">Event title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Biology lecture"/></label><label>Event type<select value={kind} onChange={e=>setKind(e.target.value as AcademicEventKind)}><option value="class">Class</option><option value="study">Study block</option><option value="reminder">Reminder</option><option value="personal">Personal</option></select></label><label>Course<select value={courseId} onChange={e=>setCourseId(e.target.value)}><option value="">No course</option>{snapshot.courses.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}</select></label><label>Starts<input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label><label>Ends<input required type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)}/></label><label className="wide">Related assignment<select value={assignmentId} onChange={e=>{setAssignmentId(e.target.value);const linked=snapshot.assignments.find(a=>a.id===e.target.value);if(linked)setCourseId(linked.courseId);}}><option value="">No linked assignment</option>{snapshot.assignments.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label className="wide">Notes<textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Bring materials, topics to review, etc."/></label></div><div className="editor-actions"><button type="button" className="quiet-action" onClick={()=>setShowEditor(false)}>Cancel</button><button type="submit" className="primary-action"><Save size={14}/> Save event</button></div></form>}
    <div className="calendar-layout"><section className="panel calendar-list">{Object.entries(grouped).map(([day,items])=><div className="calendar-day" key={day}><div className="calendar-date">{day}</div>{items.map(item=><div className="calendar-item" key={item.id}><i className={item.kind==="deadline"?(item.status==="graded"?"complete":item.status==="missing"?"overdue":""):"event-dot"}/><span><b>{item.title}</b><small>{item.kind==="deadline"?"ASSIGNMENT DEADLINE":item.kind.toUpperCase()} · {snapshot.courses.find(c=>c.id===item.courseId)?.code??"PERSONAL"}{item.status==="event"?"":` · ${ASSIGNMENT_STATUS_LABELS[item.status as AssignmentStatus]}`}</small>{item.notes&&<small>{item.notes}</small>}</span><span className="calendar-time">{new Date(item.startsAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span>{item.kind!=="deadline"&&item.source==="northstar"&&<button className="icon-action" aria-label={`Delete ${item.title}`} onClick={()=>{if(window.confirm("Delete this calendar event?"))onDeleteEvent(item.id)}}><Trash2 size={13}/></button>}</div>)}</div>)}{!timeline.length&&<div className="empty-state">No calendar items yet.</div>}</section><aside className="panel calendar-aside"><span className="eyebrow">AGENDA OVERVIEW</span><h3>{timeline.length} tracked items</h3><p>{assignments.length} assignment deadlines · {(snapshot.events??[]).length} class, study and personal events.</p><NavLink to="/assignments" className="text-link">Manage assignments <ArrowUpRight size={14}/></NavLink></aside></div>
  </div>;
}
function StudyLab({ snapshot, onCreate, onRate, onDelete }: { snapshot: AcademicSnapshot; onCreate:(input:StudyCardInput)=>void; onRate:(id:string,rating:StudyRating)=>void; onDelete:(id:string)=>void }) {
  const cards=snapshot.studyCards??[];
  const [index,setIndex]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [showEditor,setShowEditor]=useState(false);
  const [courseId,setCourseId]=useState(snapshot.courses[0]?.id??"");
  const [prompt,setPrompt]=useState("");
  const [answer,setAnswer]=useState("");
  const card=cards[index];
  const dueCount=cards.filter(item=>Date.parse(item.nextReviewAt)<=Date.now()).length;
  useEffect(()=>{if(index>=cards.length)setIndex(Math.max(0,cards.length-1));setRevealed(false)},[cards.length,index]);
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();onCreate({courseId,prompt,answer});setPrompt("");setAnswer("");setShowEditor(false)};
  const rate=(rating:StudyRating)=>{if(!card)return;onRate(card.id,rating);setRevealed(false);setIndex(current=>cards.length?((current+1)%cards.length):0)};
  return <div className="content workspace-page">
    <div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> LEARNING & RETENTION</div><h1>Study Lab<em>.</em></h1><p>Build your own review deck and space repetitions over time. Cards are stored in your local academic workspace.</p></div><button className="primary-action" onClick={()=>setShowEditor(value=>!value)}><Plus size={15}/> Create flashcard</button></div>
    <div className="assignment-summary"><div><strong>{cards.length}</strong><span>Total flashcards</span></div><div><strong>{dueCount}</strong><span>Due for review</span></div><div><strong>{cards.reduce((sum,item)=>sum+item.repetitions,0)}</strong><span>Successful reviews</span></div></div>
    {showEditor&&<form className="panel editor-panel" onSubmit={submit}><div className="panel-head"><div><span className="eyebrow">NEW STUDY CARD</span><h3>Create a flashcard</h3></div><button type="button" className="icon-action" aria-label="Close flashcard editor" onClick={()=>setShowEditor(false)}><X size={17}/></button></div><div className="editor-grid"><label>Course<select value={courseId} onChange={event=>setCourseId(event.target.value)}>{snapshot.courses.map(course=><option key={course.id} value={course.id}>{course.code} — {course.name}</option>)}</select></label><label className="wide">Prompt<input required maxLength={240} value={prompt} onChange={event=>setPrompt(event.target.value)} placeholder="What do you want to remember?"/></label><label className="wide">Answer<textarea required rows={3} value={answer} onChange={event=>setAnswer(event.target.value)} placeholder="Write a clear answer or explanation…"/></label></div><div className="editor-actions"><button type="button" className="quiet-action" onClick={()=>setShowEditor(false)}>Cancel</button><button type="submit" className="primary-action"><Save size={14}/> Save flashcard</button></div></form>}
    <div className="study-layout"><section className="panel study-card-panel"><div className="study-card-top"><span className="eyebrow">SPACED REVIEW · {dueCount} DUE</span><span>{cards.length?index+1:0} / {cards.length}</span></div>{card?<><div className="flashcard" onClick={()=>setRevealed(value=>!value)} role="button" tabIndex={0} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setRevealed(value=>!value)}}}><span>{revealed?"ANSWER":"PROMPT"} · {snapshot.courses.find(course=>course.id===card.courseId)?.code}</span><h2>{revealed?card.answer:card.prompt}</h2><small>{revealed?"Tap to return to prompt":"Tap to reveal answer"}</small></div><div className="study-rating"><span>How well did you recall it?</span><div><button onClick={()=>rate("again")} className="rating-again">Again</button><button onClick={()=>rate("hard")} className="rating-hard">Hard</button><button onClick={()=>rate("good")} className="rating-good">Good</button><button onClick={()=>rate("easy")} className="rating-easy">Easy</button></div></div><div className="study-controls"><button className="quiet-action" onClick={()=>{setIndex(Math.max(0,index-1));setRevealed(false)}} disabled={index===0}><ArrowLeft size={14}/> Previous</button><button className="quiet-action" onClick={()=>{if(window.confirm("Delete this flashcard from your local study deck?"))onDelete(card.id)}}><Trash2 size={13}/> Delete card</button><button className="quiet-action" onClick={()=>{setIndex((index+1)%cards.length);setRevealed(false)}}><ArrowRight size={14}/> Next</button></div><div className="study-schedule">Next review: {dateLabel(card.nextReviewAt)} · Interval: {card.intervalDays<1?"Less than a day":`${card.intervalDays} days`} · Ease: {card.easeFactor.toFixed(2)}</div></>:<div className="empty-state"><BookOpenCheck size={22}/><b>Your study deck is ready to grow.</b><span>Create a flashcard to begin spaced review.</span></div>}</section><aside className="panel study-aside"><BookOpenCheck size={22}/><h3>Remember more, deliberately.</h3><p>Each rating schedules the next review interval. “Again” brings a card back sooner; stronger recall increases the interval. Your progress stays local to this browser.</p><div><Clock3 size={14}/> Suggested session · 10 minutes</div></aside></div>
  </div>;
}
function Gradebook({ snapshot, onCreate, onUpdate, onDelete }: { snapshot:AcademicSnapshot; onCreate:(input:GradeItemInput)=>void; onUpdate:(id:string,input:GradeItemInput)=>void; onDelete:(id:string)=>void }) {
  const [showEditor,setShowEditor]=useState(false);
  const [editing,setEditing]=useState<GradeItem|undefined>();
  const [courseId,setCourseId]=useState(snapshot.courses[0]?.id??"");
  const [assignmentId,setAssignmentId]=useState("");
  const [title,setTitle]=useState("");
  const [score,setScore]=useState("");
  const [pointsPossible,setPointsPossible]=useState("10");
  const [status,setStatus]=useState<GradeItemStatus>("pending");
  const [feedback,setFeedback]=useState("");
  const gradeItems=snapshot.gradeItems??[];
  const openNew=()=>{setEditing(undefined);setCourseId(snapshot.courses[0]?.id??"");setAssignmentId("");setTitle("");setScore("");setPointsPossible("10");setStatus("pending");setFeedback("");setShowEditor(true)};
  const openEdit=(item:GradeItem)=>{setEditing(item);setCourseId(item.courseId);setAssignmentId(item.assignmentId??"");setTitle(item.title);setScore(item.score===null?"":String(item.score));setPointsPossible(String(item.pointsPossible));setStatus(item.status);setFeedback(item.feedback??"");setShowEditor(true)};
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const input:GradeItemInput={courseId,assignmentId:assignmentId||undefined,title,score:status==="graded"?Number(score):null,pointsPossible:Number(pointsPossible),status,feedback:feedback||undefined,gradedAt:status==="graded"?(editing?.gradedAt??new Date().toISOString()):undefined};if(editing)onUpdate(editing.id,input);else onCreate(input);setShowEditor(false);};
  const fmt=(value:number|null)=>value===null?"—":value.toFixed(value%1?1:0);
  return <div className="content workspace-page">
    <div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> PERFORMANCE OVERVIEW</div><h1>Gradebook<em>.</em></h1><p>Explicit score records only. Assignment status never implies a grade.</p></div><button className="primary-action" onClick={openNew}><Plus size={15}/> Add grade record</button></div>
    <div className="gradebook-grid">{snapshot.courses.map(course=>{const summary=selectGradeSummary(snapshot,course.id);return <article className="panel grade-card" key={course.id}><span className="eyebrow">{course.code}</span><h3>{course.name}</h3><strong>{summary.percentage===null?"—":`${summary.percentage}%`}<small> · {summary.items} graded items</small></strong><div className="bar"><i style={{width:summary.percentage===null?"0%":`${summary.percentage}%`}}/></div><p>{summary.earned} / {summary.possible} points · pending and missing items excluded</p></article>})}</div>
    {showEditor&&<form className="panel editor-panel" onSubmit={submit}><div className="panel-head"><div><span className="eyebrow">{editing?"EDIT GRADE RECORD":"NEW GRADE RECORD"}</span><h3>{editing?"Update score record":"Record a result"}</h3></div><button type="button" className="icon-action" aria-label="Close grade editor" onClick={()=>setShowEditor(false)}><X size={17}/></button></div><div className="editor-grid"><label>Course<select value={courseId} onChange={e=>{setCourseId(e.target.value);setAssignmentId("");}}>{snapshot.courses.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}</select></label><label>Related assignment<select value={assignmentId} onChange={e=>setAssignmentId(e.target.value)}><option value="">Independent grade item</option>{snapshot.assignments.filter(a=>a.courseId===courseId).map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label className="wide">Grade item title<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Midterm exam"/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as GradeItemStatus)}><option value="pending">Pending</option><option value="graded">Graded</option><option value="missing">Missing</option><option value="excused">Excused</option></select></label><label>Points possible<input required type="number" min="0.1" step="0.1" value={pointsPossible} onChange={e=>setPointsPossible(e.target.value)}/></label>{status==="graded"&&<label>Score earned<input required type="number" min="0" step="0.1" value={score} onChange={e=>setScore(e.target.value)}/></label>}<label className="wide">Feedback<textarea rows={2} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Instructor feedback or personal notes"/></label></div><div className="editor-actions"><button type="button" className="quiet-action" onClick={()=>setShowEditor(false)}>Cancel</button><button type="submit" className="primary-action"><Save size={14}/> Save grade</button></div></form>}
    <section className="panel assignment-panel"><div className="panel-head"><div><span className="eyebrow">GRADE RECORDS</span><h3>Course results</h3></div><span>{gradeItems.length} records</span></div><div className="grade-record-list">{gradeItems.map(item=><div className="grade-record" key={item.id}><span><b>{item.title}</b><small>{snapshot.courses.find(c=>c.id===item.courseId)?.code} · {item.status.toUpperCase()}{item.feedback?` · ${item.feedback}`:""}</small></span><strong>{item.status==="graded"?fmt(item.score)+" / "+fmt(item.pointsPossible):item.status}</strong>{item.source==="northstar"&&<div className="row-actions"><button className="icon-action" aria-label={`Edit ${item.title}`} onClick={()=>openEdit(item)}><Pencil size={13}/></button><button className="icon-action danger-action" aria-label={`Delete ${item.title}`} onClick={()=>{if(window.confirm("Delete this personal grade record?"))onDelete(item.id)}}><Trash2 size={13}/></button></div>}</div>)}{!gradeItems.length&&<div className="empty-state">No grade records have been added.</div>}</div><div className="list-footnote">Demo and personal grade records only. No institution gradebook is connected; percentages are points-based summaries, not weighted course grades.</div></section>
  </div>;
}

function ResourceEditor({ courses, initial, onSave, onCancel }: { courses: AcademicSnapshot["courses"]; initial?: AcademicResource; onSave: (input: ResourceInput) => void; onCancel: () => void }) {
  const [courseId,setCourseId]=useState(initial?.courseId??courses[0]?.id??"");
  const [title,setTitle]=useState(initial?.title??"");
  const [kind,setKind]=useState<AcademicResourceKind>(initial?.kind??"note");
  const [description,setDescription]=useState(initial?.description??"");
  const [url,setUrl]=useState(initial?.url??"");
  const [content,setContent]=useState(initial?.content??"");
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();onSave({courseId,title,kind,description,url,content})};
  return <form className="panel editor-panel" onSubmit={submit}>
    <div className="panel-head"><div><span className="eyebrow">{initial?"EDIT RESOURCE":"NEW RESOURCE"}</span><h3>{initial?"Update resource":"Add to your library"}</h3></div><button type="button" className="icon-action" aria-label="Close editor" onClick={onCancel}><X size={17}/></button></div>
    <div className="editor-grid">
      <label>Resource title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Chapter notes"/></label>
      <label>Course<select value={courseId} onChange={e=>setCourseId(e.target.value)}>{courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></label>
      <label>Resource type<select value={kind} onChange={e=>setKind(e.target.value as AcademicResourceKind)}><option value="note">Personal note</option><option value="reference">Reference</option><option value="link">External link</option></select></label>
      <label>HTTPS URL<input type="url" required={kind==="link"} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…"/></label>
      <label className="wide">Description<textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What is this resource useful for?"/></label>
      <label className="wide">Notes / content<textarea rows={5} value={content} onChange={e=>setContent(e.target.value)} placeholder="Add your notes or a short summary…"/></label>
    </div>
    <p className="editor-hint">External resources must use HTTPS. Resources are stored locally in this browser.</p>
    <div className="editor-actions"><button type="button" className="quiet-action" onClick={onCancel}>Cancel</button><button type="submit" className="primary-action"><Save size={14}/>{initial?"Save resource":"Add resource"}</button></div>
  </form>;
}
function Resources({ snapshot, onCreate, onUpdate, onDelete }: { snapshot: AcademicSnapshot; onCreate:(input:ResourceInput)=>void; onUpdate:(id:string,input:ResourceInput)=>void; onDelete:(id:string)=>void }) {
  const [query,setQuery]=useState("");
  const [course,setCourse]=useState("all");
  const [editor,setEditor]=useState<"new"|string|null>(null);
  const resources=snapshot.resources??[];
  const filtered=useMemo(()=>resources.filter(resource=>(course==="all"||resource.courseId===course)&&`${resource.title} ${resource.description} ${resource.content}`.toLowerCase().includes(query.toLowerCase())),[resources,course,query]);
  const editing=typeof editor==="string"?resources.find(resource=>resource.id===editor):undefined;
  const save=(input:ResourceInput)=>{if(editor==="new")onCreate(input);else if(typeof editor==="string")onUpdate(editor,input);setEditor(null)};
  return <div className="content workspace-page">
    <div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> YOUR PERSONAL LIBRARY</div><h1>Resources<em>.</em></h1><p>Keep course notes, references and useful links connected to the work they support.</p></div><button className="primary-action" onClick={()=>setEditor("new")}><Plus size={15}/> Add resource</button></div>
    <div className="assignment-summary"><div><strong>{resources.length}</strong><span>Library items</span></div><div><strong>{resources.filter(r=>r.kind==="note").length}</strong><span>Personal notes</span></div><div><strong>{resources.filter(r=>r.kind==="link").length}</strong><span>External links</span></div></div>
    {editor&&<ResourceEditor key={editor} courses={snapshot.courses} initial={editing} onSave={save} onCancel={()=>setEditor(null)}/>}
    <section className="panel assignment-panel"><div className="assignment-toolbar"><label className="assignment-search"><Search size={16}/><input aria-label="Search resources" placeholder="Search your library…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="filter-control"><select aria-label="Filter resources by course" value={course} onChange={e=>setCourse(e.target.value)}><option value="all">All courses</option>{snapshot.courses.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}</select></label></div>
      <div className="resource-grid">{filtered.map(resource=><article className="panel resource-card" key={resource.id}><div className="resource-top"><span className="eyebrow">{snapshot.courses.find(c=>c.id===resource.courseId)?.code} · {resource.kind.toUpperCase()}</span><span className="resource-origin">{resource.source==="demo"?"DEMO":"PERSONAL"}</span></div><h3>{resource.title}</h3><p>{resource.description}</p>{resource.content&&<div className="resource-content">{resource.content}</div>}{resource.url&&<a className="text-link" href={resource.url} target="_blank" rel="noreferrer noopener">Open external resource <ArrowUpRight size={13}/></a>}<div className="resource-actions"><button className="icon-action" aria-label={`Edit ${resource.title}`} onClick={()=>setEditor(resource.id)}><Pencil size={14}/></button><button className="icon-action danger-action" aria-label={`Delete ${resource.title}`} onClick={()=>{if(window.confirm(`Delete “${resource.title}” from your local library?`))onDelete(resource.id)}}><Trash2 size={14}/></button></div></article>)}{!filtered.length&&<div className="empty-state"><Library size={22}/><b>Your library is clear.</b><span>Add a note, reference or HTTPS link to get started.</span></div>}</div>
      <div className="list-footnote">Local library only. Files and cloud synchronization are not connected yet.</div>
    </section>
  </div>;
}


function ReviewCenter({ snapshot, onSaveDraft, onDeleteDraft }: { snapshot: AcademicSnapshot; onSaveDraft: (input: WritingDraftInput) => void; onDeleteDraft: (id: string) => void }) {
  const drafts = snapshot.writingDrafts ?? [];
  const [searchParams] = useSearchParams();
  const requestedAssignmentId = searchParams.get("assignmentId") ?? "";
  const [activeDraftId,setActiveDraftId] = useState<string | undefined>(drafts[0]?.id);
  const activeDraft = drafts.find(item => item.id === activeDraftId);
  const [draftTitle,setDraftTitle] = useState(activeDraft?.title ?? "Untitled draft");
  const [draft,setDraft] = useState(activeDraft?.body ?? "");
  const [assignmentId,setAssignmentId] = useState(activeDraft?.assignmentId ?? "");
  const [reviewed,setReviewed] = useState(false);
  const [saveMessage,setSaveMessage] = useState("");
  useEffect(()=>{if(requestedAssignmentId&&snapshot.assignments.some(item=>item.id===requestedAssignmentId)){setActiveDraftId(undefined);setDraftTitle("Assignment draft");setDraft("");setAssignmentId(requestedAssignmentId);setReviewed(false);setSaveMessage("New coursework draft · not saved yet");}},[requestedAssignmentId]);
  const analysis=useMemo(()=>{
    const words=draft.trim().split(/\s+/).filter(Boolean);
    const sentences=draft.split(/[.!?]+/).map(sentence=>sentence.trim()).filter(Boolean);
    const longSentences=sentences.filter(sentence=>sentence.split(/\s+/).length>32);
    const ignored=new Set(["about","after","again","also","been","being","could","does","each","from","have","into","just","more","most","other","over","same","should","some","such","than","that","their","there","these","they","this","those","through","under","very","what","when","where","which","while","with","would","your"]);
    const counts=new Map<string,number>();
    for(const word of words){const normalized=word.toLowerCase().replace(/[^a-z']/g,"");if(normalized.length>4&&!ignored.has(normalized))counts.set(normalized,(counts.get(normalized)??0)+1)}
    const repeated=[...counts.entries()].filter(([,count])=>count>=4).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const citations=(draft.match(/\([A-Z][^)]*,\s*\d{4}\)|\[\d+\]/g)??[]).length;
    const flags:string[]=[];
    if(words.length<250)flags.push("Short draft: expand the reasoning and evidence where the assignment requires it.");
    if(longSentences.length)flags.push(longSentences.length+" sentence(s) exceed 32 words. Consider splitting complex ideas.");
    if(repeated.length)flags.push("Repeated terms: "+repeated.map(([word])=>word).join(", ")+". Check for unnecessary repetition.");
    if(citations===0)flags.push("No common author-date or numbered citation markers detected. Verify the required citation style manually.");
    return {wordCount:words.length,sentenceCount:sentences.length,averageSentence:sentences.length?Math.round(words.length/sentences.length):0,longSentences:longSentences.length,repeated,citations,flags};
  },[draft]);
  const signal=analysis.flags.length>=3?"Review recommended":analysis.flags.length?"A few checks":"Clear initial pass";
  const newId=()=>"draft-"+(typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2));
  const beginNew=()=>{setActiveDraftId(newId());setDraftTitle("Untitled draft");setDraft("");setAssignmentId("");setReviewed(false);setSaveMessage("New draft · not saved yet");};
  const openDraft=(id:string)=>{const selected=drafts.find(item=>item.id===id);if(!selected)return;setActiveDraftId(selected.id);setDraftTitle(selected.title);setDraft(selected.body);setAssignmentId(selected.assignmentId??"");setReviewed(false);setSaveMessage("Saved "+dateLabel(selected.savedAt));};
  const save=()=>{const id=activeDraftId??newId();onSaveDraft({id,title:draftTitle,body:draft,assignmentId:assignmentId||undefined});setActiveDraftId(id);setSaveMessage("Saved to this browser");};
  const remove=()=>{if(!activeDraftId||!activeDraft)return;if(!window.confirm("Delete this saved writing draft from this browser?"))return;onDeleteDraft(activeDraftId);const next=drafts.find(item=>item.id!==activeDraftId);if(next)openDraft(next.id);else beginNew();setSaveMessage("Draft deleted");};
  return <div className="content workspace-page">
    <div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> WRITING & QUALITY</div><h1>Review Center<em>.</em></h1><p>Keep working drafts in one place and run a private first-pass writing check before you submit or share.</p></div><button className="primary-action" onClick={beginNew}><Plus size={15}/> New draft</button></div>
    <div className="review-disclaimer">LOCAL ONLY · Drafts are saved in this browser’s storage. They are not encrypted, uploaded, AI-reviewed, plagiarism-checked, or source-verified.</div>
    <div className="review-layout">
      <section className="panel review-editor">
        <div className="panel-head"><div><span className="eyebrow">DRAFT WORKSPACE</span><h3>{draftTitle || "Untitled draft"}</h3></div><span className="draft-count">{analysis.wordCount} words</span></div>
        <div className="draft-metadata"><label>Draft title<input value={draftTitle} maxLength={120} onChange={event=>{setDraftTitle(event.target.value);setSaveMessage("Unsaved changes");}} placeholder="Give this draft a name"/></label><label>Related assignment<select value={assignmentId} onChange={event=>{setAssignmentId(event.target.value);setSaveMessage("Unsaved changes");}}><option value="">Independent writing</option>{snapshot.assignments.map(item=><option key={item.id} value={item.id}>{snapshot.courses.find(course=>course.id===item.courseId)?.code} · {item.title}</option>)}</select></label></div>
        <label className="review-label" htmlFor="northstar-draft">Your writing</label><textarea id="northstar-draft" rows={14} value={draft} onChange={event=>{setDraft(event.target.value);setReviewed(false);setSaveMessage("Unsaved changes");}} placeholder="Write or paste your draft here. Save it to keep working across sessions."/>
        <div className="review-actions"><span>{saveMessage || "Not saved yet"}</span><div><button className="quiet-action" type="button" disabled={!activeDraftId||!activeDraft} onClick={remove}><Trash2 size={13}/> Delete</button><button className="primary-action" type="button" disabled={!draftTitle.trim()||!draft.trim()} onClick={save}><Save size={14}/> Save draft</button><button className="quiet-action" type="button" disabled={!draft.trim()} onClick={()=>setReviewed(true)}><ClipboardCheck size={14}/> Review</button></div></div>
      </section>
      <aside className="review-side">
        <section className="panel saved-drafts"><div className="panel-head"><div><span className="eyebrow">YOUR WRITING</span><h3>Saved drafts</h3></div><span>{drafts.length}</span></div>{drafts.length?drafts.map(item=><button key={item.id} className={"saved-draft"+(item.id===activeDraftId?" active":"")} onClick={()=>openDraft(item.id)}><span><b>{item.title}</b><small>{item.assignmentId?snapshot.assignments.find(a=>a.id===item.assignmentId)?.title??"Coursework draft":"Independent draft"}</small></span><small>{dateLabel(item.savedAt)}</small></button>):<div className="draft-empty">Saved writing will appear here. Drafts stay local to this browser.</div>}</section>
        <section className="panel review-summary"><span className="eyebrow">REVIEW SIGNAL</span><h3>{reviewed?signal:"Ready when you are"}</h3><p>{reviewed?"Use these checks as prompts for your own revision. They do not grade the draft.":"Run a local review to see structural signals and revision prompts."}</p>{reviewed&&<><div className="review-metrics"><div><strong>{analysis.wordCount}</strong><small>Words</small></div><div><strong>{analysis.sentenceCount}</strong><small>Sentences</small></div><div><strong>{analysis.averageSentence}</strong><small>Avg. words / sentence</small></div></div><div className="review-flags">{analysis.flags.length?analysis.flags.map((flag,index)=><div key={index}><i/>{flag}</div>):<div><i/>No basic structure flags found. Continue with a substantive human review.</div>}</div></>}</section>
      </aside>
    </div>
  </div>;
}

function Settings({ snapshot, onReset, onImport }: { snapshot:AcademicSnapshot; onReset:()=>void; onImport:(snapshot:AcademicSnapshot)=>void }) {
  const [message,setMessage]=useState("");
  const exportBackup=()=>{
    const blob=new Blob([createAcademicBackup(snapshot)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url;
    anchor.download=`northstar-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
    setMessage("Backup exported. Store the file somewhere safe.");
  };
  const importBackup=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];
    if(!file)return;
    try{
      const restored=parseAcademicBackup(await file.text());
      if(!restored){setMessage("That file is not a valid NORTHSTAR academic backup.");return;}
      if(window.confirm("Restore this backup and replace the current local academic workspace?")){
        onImport(restored);setMessage("Backup restored in this browser.");
      }
    }catch{setMessage("The selected file could not be read.");}
    finally{event.target.value="";}
  };
  return <div className="content workspace-page"><div className="page-intro"><div className="eyebrow"><i/> PERSONALIZE & PROTECT</div><h1>Settings<em>.</em></h1><p>Manage this browser’s academic workspace and protect your local work.</p></div><div className="settings-grid">
    <section className="panel settings-panel"><div><span className="eyebrow">BACKUP & RECOVERY</span><b>Export your academic workspace</b><small>Download courses, assignments, resources, flashcards and saved writing drafts as a validated JSON backup.</small></div><button className="primary-action" onClick={exportBackup}><Download size={14}/> Export backup</button></section>
    <section className="panel settings-panel"><div><span className="eyebrow">RESTORE</span><b>Restore from a NORTHSTAR backup</b><small>Import a previously exported backup. This replaces the current local workspace after confirmation.</small></div><label className="primary-action import-backup"><Upload size={14}/> Choose backup<input type="file" accept="application/json,.json" onChange={importBackup}/></label></section>
    <section className="panel settings-panel"><div><span className="eyebrow">DEMO DATA</span><b>Reset local demo data</b><small>Restore the original illustrative courses, assignments, resources and study cards. Saved writing drafts are cleared.</small></div><button className="quiet-action" onClick={()=>{if(window.confirm("Reset this browser’s NORTHSTAR demo workspace? This replaces current local changes.")){onReset();setMessage("Demo workspace reset.");}}}><RotateCcw size={14}/> Reset demo workspace</button></section>
  </div>{message&&<div className="settings-message" role="status">{message}</div>}<div className="footnote">Local browser storage only · No cloud backup or synchronization is connected. Keep exported backup files private.</div></div>;
}

function Placeholder({ path, onReset }: { path: string; onReset: () => void }) {
  const page = pages[path] ?? { eyebrow: "PERSONALIZE", title: "Workspace", copy: "This workspace will be built on the shared NORTHSTAR academic foundation." };
  return <div className="content placeholder"><div className="eyebrow"><i/> {page.eyebrow}</div><h1>{page.title}<em>.</em></h1><p>{page.copy}</p><section className="panel coming"><Sparkles size={22}/><span><b>{path==="/ai"?"Provider connection is intentionally disabled.":"This workspace is taking shape."}</b><small>{path==="/ai"?"The UI is a safe placeholder. No AI provider, API key, or external service is connected.":"This area will be implemented incrementally using the approved NORTHSTAR architecture."}</small></span><em>IN DEVELOPMENT</em></section>{path==="/settings" && <section className="panel settings-panel"><div><b>Reset local demo data</b><small>Restore the original illustrative courses and assignment statuses in this browser.</small></div><button onClick={onReset}><RotateCcw size={14}/> Reset demo workspace</button></section>}</div>;
}
function Routed({ snapshot, onStatus, onCreate, onUpdate, onDelete, onResourceCreate, onResourceUpdate, onResourceDelete, onStudyCreate, onStudyRate, onStudyDelete, onDraftSave, onDraftDelete, onImport, onReset }: { snapshot: AcademicSnapshot; onStatus: (id:string,status:AssignmentStatus)=>void; onCreate:(input:AssignmentInput)=>void; onUpdate:(id:string,input:AssignmentInput)=>void; onDelete:(id:string)=>void; onResourceCreate:(input:ResourceInput)=>void; onResourceUpdate:(id:string,input:ResourceInput)=>void; onResourceDelete:(id:string)=>void; onStudyCreate:(input:StudyCardInput)=>void; onStudyRate:(id:string,rating:StudyRating)=>void; onStudyDelete:(id:string)=>void; onDraftSave:(input:WritingDraftInput)=>void; onDraftDelete:(id:string)=>void; onImport:(snapshot:AcademicSnapshot)=>void; onReset:()=>void }) {
  const location = useLocation();
  return <><Topbar pathname={location.pathname}/><AnimatePresence mode="wait"><motion.main key={location.pathname} className="scroll" initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.18}}><Routes><Route path="/" element={<Dashboard snapshot={snapshot}/>}/><Route path="/assignments" element={<Assignments snapshot={snapshot} onStatus={onStatus} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete}/>}/><Route path="/courses" element={<Courses snapshot={snapshot}/>}/><Route path="/courses/:courseId" element={<CourseDetail snapshot={snapshot}/>}/><Route path="/calendar" element={<Calendar snapshot={snapshot}/>}/><Route path="/study" element={<StudyLab snapshot={snapshot} onCreate={onStudyCreate} onRate={onStudyRate} onDelete={onStudyDelete}/>}/><Route path="/gradebook" element={<Gradebook snapshot={snapshot}/>}/><Route path="/resources" element={<Resources snapshot={snapshot} onCreate={onResourceCreate} onUpdate={onResourceUpdate} onDelete={onResourceDelete}/>}/><Route path="/review" element={<ReviewCenter snapshot={snapshot} onSaveDraft={onDraftSave} onDeleteDraft={onDraftDelete}/>}/><Route path="/settings" element={<Settings snapshot={snapshot} onReset={onReset} onImport={onImport}/>}/><Route path="*" element={<Placeholder path={location.pathname} onReset={onReset}/>}/></Routes></motion.main></AnimatePresence></>;
}
export default function App() {
  const [snapshot, setSnapshot] = useState<AcademicSnapshot>(() => loadAcademicSnapshot());
  const [storageAvailable,setStorageAvailable] = useState(true);
  useEffect(() => { setStorageAvailable(saveAcademicSnapshot(snapshot)); }, [snapshot]);
  const handleStatus = (id: string, status: AssignmentStatus) => setSnapshot(current => updateAssignmentStatus(current,id,status));
  const handleCreate = (input: AssignmentInput) => setSnapshot(current => createAssignment(current,input));
  const handleUpdate = (id: string, input: AssignmentInput) => setSnapshot(current => updateAssignment(current,id,input));
  const handleDelete = (id: string) => setSnapshot(current => deleteAssignment(current,id));
  const handleResourceCreate = (input: ResourceInput) => setSnapshot(current => createResource(current,input));
  const handleResourceUpdate = (id: string,input: ResourceInput) => setSnapshot(current => updateResource(current,id,input));
  const handleResourceDelete = (id: string) => setSnapshot(current => deleteResource(current,id));
  const handleStudyCreate = (input: StudyCardInput) => setSnapshot(current => createStudyCard(current,input));
  const handleStudyRate = (id: string,rating: StudyRating) => setSnapshot(current => rateStudyCard(current,id,rating));
  const handleStudyDelete = (id: string) => setSnapshot(current => deleteStudyCard(current,id));
  const handleDraftSave = (input: WritingDraftInput) => setSnapshot(current => saveWritingDraft(current,input));
  const handleDraftDelete = (id: string) => setSnapshot(current => deleteWritingDraft(current,id));
  const handleImport = (restored:AcademicSnapshot) => setSnapshot(restored);
  const handleReset = () => setSnapshot(resetAcademicSnapshot());
  return <div className="app"><Sidebar snapshot={snapshot}/><div className="main"><Routed snapshot={snapshot} onStatus={handleStatus} onCreate={handleCreate} onUpdate={handleUpdate} onDelete={handleDelete} onResourceCreate={handleResourceCreate} onResourceUpdate={handleResourceUpdate} onResourceDelete={handleResourceDelete} onStudyCreate={handleStudyCreate} onStudyRate={handleStudyRate} onStudyDelete={handleStudyDelete} onDraftSave={handleDraftSave} onDraftDelete={handleDraftDelete} onImport={handleImport} onReset={handleReset}/>{!storageAvailable&&<div className="storage-warning" role="status">Browser storage is unavailable. Changes are kept for this session only.</div>}</div></div>;
}
