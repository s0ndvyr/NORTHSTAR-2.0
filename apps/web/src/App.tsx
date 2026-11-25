import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, BookOpenCheck, CalendarDays, ClipboardCheck, CheckCircle2, ChevronRight, Clock3, Download, FileText, Filter, GraduationCap, LayoutDashboard, Library, Pencil, Plus, Power, RotateCcw, Save, Search, Settings2, Sparkles, Target, Timer, Trash2, Upload, X } from "lucide-react";
import type { AcademicAssignment, AcademicEvent, AcademicEventKind, AcademicResource, AcademicResourceKind, AcademicSnapshot, AssignmentPriority, AssignmentStatus, GradeItem, GradeItemStatus, StudyRating } from "./domain/academic";
import { ASSIGNMENT_STATUS_LABELS } from "./domain/academic";
import { buildCourseStudyGuide, searchWorkspaceResults, selectAcademicNotifications, selectCourseProgress, sortAssignments } from "./domain/workspace-intelligence";
import { createAcademicBackup, parseAcademicBackup, createCourse, updateCourse, createAcademicEvent, updateAcademicEvent, createGradeItem, createPracticeAttempt, completePracticeAttempt, updatePracticeAttempt, createAssignment, createResource, createStudyCard, deleteAcademicEvent, deleteGradeItem, deleteAssignment, deleteResource, deleteStudyCard, loadAcademicSnapshot, resetAcademicSnapshot, saveAcademicSnapshot, updateAssignment, updateAssignmentStatus, updateResource, updateGradeItem, rateStudyCard, saveWritingDraft, selectGradeSummary, deleteWritingDraft, type AcademicEventInput, type CourseInput, type AssignmentInput, type GradeItemInput, type ResourceInput, type StudyCardInput, type WritingDraftInput } from "./domain/academic-repository";

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
  const termStart = new Date(snapshot.term.startsAt).getTime();
  const termEnd = new Date(snapshot.term.endsAt).getTime();
  const semesterProgress = Number.isFinite(termStart) && Number.isFinite(termEnd) && termEnd > termStart ? Math.max(0,Math.min(100,Math.round((Date.now()-termStart)/(termEnd-termStart)*100))) : 0;
  return <aside className="sidebar">
    <NavLink to="/" className="brand"><span className="brand-mark"><i /></span><b>NORTHSTAR</b><small>5.0</small></NavLink>
    <div className="side-label">WORKSPACE</div>
    <nav aria-label="Primary navigation">{links.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}><Icon size={17}/><span>{label}</span>{label === "Assignments" && <small className="count">{outstanding}</small>}</NavLink>)}</nav>
    <div className="side-bottom">
      <div className="semester"><span className="side-label">CURRENT TERM</span><strong>{snapshot.term.name}</strong><div className="progress"><i style={{width:`${semesterProgress}%`}}/></div><small><span>Semester progress</span><b>{semesterProgress}%</b></small></div>
      <NavLink to="/settings" className="nav-link"><Settings2 size={17}/><span>Settings</span></NavLink>
      <div className="profile"><span className="avatar">N</span><span><b>Student workspace</b><small>Personal environment</small></span><i/></div>
    </div>
  </aside>;
}
function Topbar({ pathname, onOpenPalette, onToggleNotifications, notificationCount }: { pathname: string; onOpenPalette:()=>void; onToggleNotifications:()=>void; notificationCount:number }) {
  const title = pathname === "/" ? "Overview" : pathname.slice(1).replace(/^./, c => c.toUpperCase());
  return <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>{title}</b></div><div className="top-actions"><span className="demo-state"><i/> LOCAL DEMO DATA</span><button type="button" className="quick command-trigger" onClick={onOpenPalette} aria-label="Open command palette"><Search size={13}/> Search / Go <kbd>⌘ K</kbd></button><button type="button" className="notification-trigger" onClick={onToggleNotifications} aria-label={notificationCount?(`Open notifications, ${notificationCount} items`):"Open notifications"}><Bell size={15}/>{notificationCount>0&&<i>{notificationCount>9?"9+":notificationCount}</i>}</button></div></header>;
}

function CommandPalette({ snapshot, onClose, onNavigate }: { snapshot:AcademicSnapshot; onClose:()=>void; onNavigate:(path:string)=>void }) {
  const [query,setQuery]=useState("");
  const [activeIndex,setActiveIndex]=useState(0);
  const results=useMemo(()=>searchWorkspaceResults(snapshot,query),[snapshot,query]);
  useEffect(()=>setActiveIndex(0),[query]);
  const openResult=(index:number)=>{const result=results[index];if(!result)return;onNavigate(result.to);onClose();};
  const onSearchKeyDown=(event:ReactKeyboardEvent<HTMLInputElement>)=>{
    if(event.key==="ArrowDown"){event.preventDefault();setActiveIndex(index=>Math.min(index+1,Math.max(0,results.length-1)));}
    else if(event.key==="ArrowUp"){event.preventDefault();setActiveIndex(index=>Math.max(0,index-1));}
    else if(event.key==="Enter"){event.preventDefault();openResult(activeIndex);}
  };
  return <div className="palette-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="NORTHSTAR command palette">
      <div className="palette-search"><Search size={17}/><input autoFocus role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="northstar-palette-results" aria-activedescendant={results[activeIndex]?"palette-"+results[activeIndex].id:undefined} value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={onSearchKeyDown} placeholder="Search courses, assignments, events, resources…" aria-label="Search NORTHSTAR"/><kbd>ESC</kbd></div>
      <div className="palette-results" id="northstar-palette-results" role="listbox">{results.length?results.map((result,index)=>{const Icon=result.type==="WORKSPACE"?(links.find(item=>item.to===result.to)?.icon??Search):result.type==="COURSE"?GraduationCap:result.type==="ASSIGNMENT"?CheckCircle2:result.type==="EVENT"?CalendarDays:result.type==="RESOURCE"?Library:FileText;return <button type="button" role="option" aria-selected={index===activeIndex} id={"palette-"+result.id} className={index===activeIndex?"selected":""} key={result.id} onMouseEnter={()=>setActiveIndex(index)} onClick={()=>openResult(index)}><i><Icon size={15}/></i><span><b>{result.title}</b><small>{result.detail}</small></span><em>{result.type}</em></button>}):<div className="palette-empty">No matching items. Try a course code, assignment title or workspace name.</div>}</div>
      <footer><span><kbd>↑↓</kbd> Navigate</span><span><kbd>↵</kbd> Open result</span><span><kbd>ESC</kbd> Close</span></footer>
    </section>
  </div>;
}

function NotificationCenter({ snapshot, onNavigate, onClose }: { snapshot:AcademicSnapshot; onNavigate:(path:string)=>void; onClose:()=>void }) {
  const items=selectAcademicNotifications(snapshot);
  return <div className="notification-layer" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="notification-panel" role="dialog" aria-modal="true" aria-label="Academic notifications">
      <div className="notification-head"><div><span className="eyebrow">ACADEMIC SIGNALS</span><h3>Notifications</h3></div><button type="button" className="icon-action" aria-label="Close notifications" onClick={onClose}><X size={16}/></button></div>
      {items.length?items.map(item=><button type="button" className="notification-item" key={item.id} onClick={()=>{onNavigate(item.to);onClose();}}><i className={item.tone}/><span><b>{item.title}</b><small>{item.detail}</small></span><ChevronRight size={14}/></button>):<div className="notification-empty"><Bell size={20}/><b>All clear for now</b><span>No overdue work or upcoming reminders in this snapshot.</span></div>}
      <footer>Local reminders · Based on your current academic snapshot</footer>
    </section>
  </div>;
}

function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Timer }) {
  return <article className="stat"><div><span>{label}</span><i><Icon size={16}/></i></div><strong>{value}</strong><small>{note}</small></article>;
}
function Dashboard({ snapshot }: { snapshot: AcademicSnapshot }) {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now);
  const completed = snapshot.assignments.filter(a => ["graded", "submitted"].includes(a.status)).length;
  const open = snapshot.assignments.filter(a => !["graded", "submitted"].includes(a.status));
  const overdue = open.filter(a => a.status === "missing" || new Date(a.dueAt) < now).length;
  const upcoming = open.filter(a => a.status !== "missing" && new Date(a.dueAt) >= now).length;
  const priorities = [...open].sort((a,b) => {
    const rank = (a: AcademicAssignment) => a.status === "missing" ? 0 : new Date(a.dueAt) < now ? 1 : new Date(a.dueAt).toDateString()===now.toDateString()?2:a.priority === "urgent" ? 3 : a.priority === "high" ? 4 : a.status==="in_progress"?5:6;
    return rank(a)-rank(b) || new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime();
  }).slice(0,5);
  const courseName = (id: string) => snapshot.courses.find(c => c.id === id)?.code ?? "COURSE";
  const semesterStart = new Date(snapshot.term.startsAt).getTime();
  const semesterEnd = new Date(snapshot.term.endsAt).getTime();
  const semesterProgress = Number.isFinite(semesterStart)&&Number.isFinite(semesterEnd)&&semesterEnd>semesterStart?Math.max(0,Math.min(100,Math.round((now.getTime()-semesterStart)/(semesterEnd-semesterStart)*100))):0;
  const upcomingEvents = (snapshot.events??[]).filter(event=>new Date(event.endsAt)>=now).slice().sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  const nextEvent = upcomingEvents[0];
  const gradeSummary = selectGradeSummary(snapshot);
  const drafts = (snapshot.writingDrafts??[]).slice().sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt));
  const latestDraft = drafts[0];
  const draftCount = drafts.length;
  const eventTime = nextEvent ? new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(nextEvent.startsAt)) : "No events scheduled";
  return <div className="content">
    <div className="welcome"><div><div className="eyebrow"><i/> YOUR ACADEMIC COMMAND CENTER <span/> {date.toUpperCase()}</div><h1>Make today <em>count.</em></h1><p>Your semester, your priorities, all moving in the right direction.</p></div><div className="focus"><i/><span><b>Focus mode</b><small>{priorities[0]?"Your next priority is ready":"Ready when you are"}</small></span></div></div>
    <section className="hero"><div className="hero-copy"><div className="eyebrow">✦ &nbsp; SEMESTER OVERVIEW</div><h2>Stay close to<br/>what <em>matters.</em></h2><p>Your academic picture, brought into focus. Build momentum one thoughtful step at a time.</p><NavLink to="/assignments">View your priorities <ArrowUpRight size={15}/></NavLink></div><div className="cosmos" aria-hidden="true"><div className="stars"/><div className="halo"/><div className="planet"><i/><b/><span/></div><div className="orbit orbit-a"/><div className="orbit orbit-b"/><small>01 / 02 &nbsp; — &nbsp; SEMESTER IN MOTION</small></div><span className="hero-index">N° 01</span></section>
    <section className="stats"><Stat label="COURSES" value={String(snapshot.courses.length)} note="Active this semester" icon={GraduationCap}/><Stat label="COMPLETED WORK" value={String(completed)} note={`Of ${snapshot.assignments.length} tracked items`} icon={CheckCircle2}/><Stat label="OVERDUE / MISSING" value={String(overdue)} note="Needs your attention" icon={CalendarDays}/><Stat label="UPCOMING WORK" value={String(upcoming)} note="Still on your list" icon={Timer}/></section>
    <section className="columns">
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">YOUR NEXT MOVES</span><h3>Priority queue</h3></div><NavLink to="/assignments">All assignments <ChevronRight size={14}/></NavLink></div>
        {priorities.length?priorities.map(a=><div className="priority" key={a.id}><i className={a.status === "missing" || new Date(a.dueAt)<now ? "urgent" : a.priority === "high" || new Date(a.dueAt).toDateString()===now.toDateString() ? "today" : "next"}/><span><b>{a.title}</b><small>{courseName(a.courseId)} · {dueLabel(a.dueAt)}</small></span><em className={a.status === "missing" || new Date(a.dueAt)<now ? "urgent" : "next"}>{a.status === "missing" ? "MISSING" : new Date(a.dueAt)<now ? "OVERDUE" : a.dueAt.slice(0,10)===now.toISOString().slice(0,10)?"DUE TODAY":"UP NEXT"}</em></div>):<div className="empty-state">You have no open assignments in this snapshot.</div>}
      </article>
      <article className="panel continue"><div className="panel-head"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h3>Continue working</h3></div><span>{latestDraft?"SAVED DRAFT":"COURSEWORK"}</span></div><div className="document"><FileText size={27}/><b>{latestDraft?"WRITING":priorities[0]?courseName(priorities[0].courseId):"NORTHSTAR"}</b><i/><i/><i/></div><strong>{latestDraft?latestDraft.title:priorities[0]?.title??"You're all caught up"}</strong><small>{latestDraft?"Saved "+new Date(latestDraft.savedAt).toLocaleDateString() : priorities[0]?"Your next priority is ready":"No outstanding assignments"}</small><NavLink to={latestDraft?"/review":"/assignments"}>{latestDraft?"Open Review Center":"Open coursework"} <ArrowUpRight size={14}/></NavLink></article>
    </section>
    <section className="columns lower">
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">LEARNING IN MOTION</span><h3>Course pulse</h3></div><NavLink to="/courses">View courses <ChevronRight size={14}/></NavLink></div>{snapshot.courses.map(course=>{const progress=selectCourseProgress(snapshot,course.id);return <div className="course" key={course.id}><i>{course.code.slice(0,2)}</i><span><b>{course.name}</b><small>{course.code} · {course.instructor}</small></span><div className="bar"><i style={{width:`${progress}%`}}/></div><small>{progress}%</small></div>})}</article>
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">ACADEMIC SNAPSHOT</span><h3>At a glance</h3></div><Activity size={17}/></div>
        <div className="dashboard-meter"><div><span>Semester progress</span><b>{semesterProgress}%</b></div><div className="bar"><i style={{width:`${semesterProgress}%`}}/></div></div>
        <div className="activity"><i><Target size={14}/></i><span><b>{gradeSummary.percentage===null?"No scored items":gradeSummary.percentage+"% recorded points"}</b><small>{gradeSummary.earned} of {gradeSummary.possible} points · excludes pending and missing</small></span><NavLink to="/gradebook" aria-label="Open Gradebook"><ChevronRight size={14}/></NavLink></div>
        <div className="activity"><i><CalendarDays size={14}/></i><span><b>{nextEvent?.title??"No upcoming calendar event"}</b><small>{eventTime}{nextEvent?" · "+(nextEvent.courseId?courseName(nextEvent.courseId):"Personal schedule"):" · Add a class or study block"}</small></span><NavLink to="/calendar" aria-label="Open Calendar"><ChevronRight size={14}/></NavLink></div>
        <div className="activity"><i><FileText size={14}/></i><span><b>{draftCount} saved writing {draftCount===1?"draft":"drafts"}</b><small>{latestDraft?latestDraft.title:"Create and resume work in Review Center"}</small></span><NavLink to="/review" aria-label="Open Review Center"><ChevronRight size={14}/></NavLink></div>
      </article>
    </section>
    <div className="dashboard-term-note"><span>TERM</span><b>{snapshot.term.name}</b><span>{new Date(snapshot.term.startsAt).toLocaleDateString()} — {new Date(snapshot.term.endsAt).toLocaleDateString()}</span></div>
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

function AssignmentDetail({ snapshot, onStatus }: { snapshot:AcademicSnapshot; onStatus:(id:string,status:AssignmentStatus)=>void }) {
  const { assignmentId } = useParams();
  const assignment=snapshot.assignments.find(item=>item.id===assignmentId);
  if(!assignment)return <div className="content workspace-page"><div className="empty-state"><b>Assignment not found.</b><NavLink to="/assignments">Return to assignments</NavLink></div></div>;
  const course=snapshot.courses.find(item=>item.id===assignment.courseId);
  const grade=snapshot.gradeItems?.find(item=>item.assignmentId===assignment.id);
  const linkedEvents=(snapshot.events??[]).filter(item=>item.assignmentId===assignment.id);
  const draft=(snapshot.writingDrafts??[]).find(item=>item.assignmentId===assignment.id);
  const overdue=Date.parse(assignment.dueAt)<Date.now()&&!["submitted","graded"].includes(assignment.status);
  return <div className="content workspace-page assignment-detail-page">
    <div className="page-intro"><NavLink className="text-link" to="/assignments"><ArrowLeft size={13}/> All assignments</NavLink><div className="eyebrow"><i/> ASSIGNMENT BRIEF · {course?.code??"COURSE"}</div><h1>{assignment.title}<em>.</em></h1><p>{course?.name??"Course unavailable"} · {course?.instructor??"Instructor not listed"}</p></div>
    <div className="assignment-detail-grid">
      <section className="panel assignment-brief">
        <div className="panel-head"><div><span className="eyebrow">COURSEWORK DETAILS</span><h3>Assignment brief</h3></div><span className={overdue?"status-pill status-missing":"status-pill status-"+assignment.status}>{overdue&&assignment.status!=="missing"?"Past due":ASSIGNMENT_STATUS_LABELS[assignment.status]}</span></div>
        <p className="assignment-detail-description">{assignment.description||"No assignment instructions have been added to this local record."}</p>
        <div className="assignment-detail-facts"><div><span>Due date</span><b>{dateLabel(assignment.dueAt)}</b><small>{new Date(assignment.dueAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small></div><div><span>Points possible</span><b>{assignment.pointsPossible}</b><small>Points</small></div><div><span>Estimated effort</span><b>{assignment.estimatedMinutes}</b><small>Minutes</small></div><div><span>Priority</span><b>{assignment.priority.toUpperCase()}</b><small>Personal priority</small></div></div>
        <div className="assignment-detail-notes"><span className="eyebrow">PERSONAL NOTES</span><p>{assignment.personalNotes||"No personal notes yet. Use Edit in the assignment list to add your own reminders."}</p></div>
        <div className="assignment-detail-actions"><NavLink className="quiet-action" to={`/assignments?edit=${encodeURIComponent(assignment.id)}`}><Pencil size={13}/> Edit assignment</NavLink><label>Workflow status<select aria-label="Assignment workflow status" value={assignment.status} onChange={event=>onStatus(assignment.id,event.target.value as AssignmentStatus)}>{Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><NavLink className="primary-action" to={`/review?assignmentId=${encodeURIComponent(assignment.id)}`}><Pencil size={14}/>{draft?"Continue saved draft":"Open writing workspace"}</NavLink></div>
        <p className="editor-hint">NORTHSTAR workflow status is personal and local. Changing it does not submit work to Canvas or change an institution record.</p>
      </section>
      <aside className="assignment-detail-aside">
        <section className="panel"><span className="eyebrow">COURSE CONTEXT</span><h3>{course?.code??"Course"}</h3><p>{course?.name??"This assignment is not linked to an available course."}</p>{course&&<NavLink className="text-link" to={`/courses/${course.id}`}>Open course hub <ArrowUpRight size={12}/></NavLink>}</section>
        <section className="panel"><span className="eyebrow">CONNECTED WORK</span><div className="detail-related"><b>{draft?"Saved writing draft":"No linked draft"}</b><small>{draft?`Last saved ${dateLabel(draft.savedAt)}`:"Writing drafts can be linked from the writing workspace."}</small></div><div className="detail-related"><b>{linkedEvents.length} calendar item{linkedEvents.length===1?"":"s"}</b><small>Personal events linked to this assignment</small></div>{grade&&<div className="detail-related"><b>{grade.status==="graded"?`${grade.score} / ${grade.pointsPossible} points`:"Grade pending"}</b><small>{grade.feedback||"Gradebook record"}</small></div>}<NavLink className="text-link" to="/calendar">Open calendar <ArrowUpRight size={12}/></NavLink></section>
      </aside>
    </div>
  </div>;
}

function Assignments({ snapshot, onStatus, onCreate, onUpdate, onDelete }: { snapshot: AcademicSnapshot; onStatus: (id: string, status: AssignmentStatus) => void; onCreate: (input: AssignmentInput) => void; onUpdate: (id: string, input: AssignmentInput) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all"); const [course, setCourse] = useState("all"); const [sort,setSort]=useState<"due"|"priority"|"updated">("due");
  const [searchParams,setSearchParams]=useSearchParams();
  const requestedEdit=searchParams.get("edit");
  const [editor, setEditor] = useState<"new" | string | null>(()=>requestedEdit&&snapshot.assignments.some(item=>item.id===requestedEdit)?requestedEdit:null);
  const [submitNotice,setSubmitNotice] = useState("");
  const filtered = useMemo(() => sortAssignments(snapshot.assignments.filter(a => {
    const matchesQuery = [a.title, a.description, a.personalNotes].join(" ").toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || a.status === status) && (course === "all" || a.courseId === course);
  }), sort), [snapshot.assignments, query, status, course, sort]);
  const editing = typeof editor === "string" ? snapshot.assignments.find(a=>a.id===editor) : undefined;
  const submitLocally = (assignment:AcademicAssignment) => { if(window.confirm("Mark this assignment as submitted in the NORTHSTAR local demo only? Nothing will be sent to Canvas or your institution.")){onStatus(assignment.id,"submitted");setSubmitNotice(`${assignment.title} marked submitted locally. No external submission was made.`);} };
  const handleSave = (input: AssignmentInput) => {
    if (editor === "new") onCreate(input);
    else if (typeof editor === "string") onUpdate(editor, input);
    setEditor(null);
    if(searchParams.has("edit"))setSearchParams({});
  };
  return <div className="content workspace-page">
    <div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> COURSEWORK MANAGEMENT</div><h1>Assignments<em>.</em></h1><p>One clear queue for every piece of work across your courses.</p></div><button className="primary-action" onClick={()=>{setSearchParams({});setEditor("new");}}><Plus size={15}/> New assignment</button></div>
    <div className="assignment-summary"><div><strong>{snapshot.assignments.length}</strong><span>Tracked items</span></div><div><strong>{snapshot.assignments.filter(a=>!["graded","submitted"].includes(a.status)).length}</strong><span>Open</span></div><div><strong>{snapshot.assignments.filter(a=>a.status==="missing" || (new Date(a.dueAt)<new Date() && !["graded","submitted"].includes(a.status))).length}</strong><span>Needs attention</span></div></div>
    {editor && <AssignmentEditor key={editor} courses={snapshot.courses} initial={editing} onSave={handleSave} onCancel={()=>{setEditor(null);if(searchParams.has("edit"))setSearchParams({});}}/>}
    {submitNotice&&<motion.div className="submission-toast" initial={{opacity:0,y:8,scale:.98}} animate={{opacity:1,y:0,scale:1}}><CheckCircle2 size={15}/><span>{submitNotice}</span><button aria-label="Dismiss submission notice" onClick={()=>setSubmitNotice("")}><X size={13}/></button></motion.div>}
    <section className="panel assignment-panel"><div className="assignment-toolbar"><label className="assignment-search"><Search size={16}/><input aria-label="Search assignments" placeholder="Search assignments and notes..." value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="filter-control"><Filter size={14}/><select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="filter-control"><select aria-label="Filter by course" value={course} onChange={e=>setCourse(e.target.value)}><option value="all">All courses</option>{snapshot.courses.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}</select></label><label className="filter-control"><select aria-label="Sort assignments" value={sort} onChange={e=>setSort(e.target.value)}><option value="due">Sort: due date</option><option value="priority">Sort: priority</option><option value="updated">Sort: recently updated</option></select></label></div>
      <div className="assignment-list">{filtered.map(a=><article className="assignment-row" key={a.id}><div className="assignment-main"><div className="assignment-meta"><span>{snapshot.courses.find(c=>c.id===a.courseId)?.code}</span><span>·</span><span>{a.pointsPossible} pts</span><span>·</span><span>{a.estimatedMinutes} min</span><span>·</span><span>{a.priority.toUpperCase()}</span></div><h3><NavLink to={`/assignments/${a.id}`}>{a.title}</NavLink></h3><p>{a.description || "No description added."}</p><small className="assignment-due">{dueLabel(a.dueAt)} · {dateLabel(a.dueAt)}</small><NavLink className="text-link assignment-draft-link" to={`/review?assignmentId=${encodeURIComponent(a.id)}`}>Open draft workspace <ArrowUpRight size={12}/></NavLink>{a.personalNotes && <p className="personal-note">Note: {a.personalNotes}</p>}</div><div className="assignment-actions"><span className={`status-pill status-${a.status}`}>{ASSIGNMENT_STATUS_LABELS[a.status]}</span><select aria-label={`Update status for ${a.title}`} value={a.status} onChange={e=>onStatus(a.id,e.target.value as AssignmentStatus)}>{Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>{!["submitted","graded"].includes(a.status)&&<button className="submit-action" onClick={()=>submitLocally(a)}><CheckCircle2 size={12}/> Turn in locally</button>}<div className="row-actions"><button aria-label={`Edit ${a.title}`} className="icon-action" onClick={()=>setEditor(a.id)}><Pencil size={14}/></button><button aria-label={`Delete ${a.title}`} className="icon-action danger-action" onClick={()=>{if(window.confirm(`Delete “${a.title}” from this local demo?`))onDelete(a.id)}}><Trash2 size={14}/></button></div></div></article>)}
      {filtered.length===0 && <div className="empty-state"><Search size={22}/><b>No assignments match those filters.</b><span>Try a different search or status.</span></div>}</div>
      <div className="list-footnote">Status changes and personal notes are local workflow overlays. They do not represent official Canvas submission records.</div>
    </section>
  </div>;
}
function CourseEditor({ initial, onSave, onCancel }: { initial?:AcademicSnapshot["courses"][number]; onSave:(input:CourseInput)=>void; onCancel:()=>void }) {
  const [code,setCode]=useState(initial?.code??"");
  const [name,setName]=useState(initial?.name??"");
  const [instructor,setInstructor]=useState(initial?.instructor??"");
  const [color,setColor]=useState(initial?.color??"blue");
  const [progress,setProgress]=useState(String(initial?.progress??0));
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const value=Number(progress);if(!Number.isFinite(value)||value<0||value>100)return;onSave({code,name,instructor,color,progress:value});};
  return <form className="panel editor-panel" onSubmit={submit}>
    <div className="panel-head"><div><span className="eyebrow">{initial?"EDIT COURSE":"NEW COURSE"}</span><h3>{initial?"Update course details":"Add a course"}</h3></div><button type="button" className="icon-action" aria-label="Close course editor" onClick={onCancel}><X size={17}/></button></div>
    <div className="editor-grid"><label>Course code<input required maxLength={24} value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. PSY 201"/></label><label>Course name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Course title"/></label><label>Instructor<input required maxLength={100} value={instructor} onChange={e=>setInstructor(e.target.value)} placeholder="Instructor name"/></label><label>Course accent<select value={color} onChange={e=>setColor(e.target.value)}><option value="blue">Blue</option><option value="green">Green</option><option value="amber">Amber</option><option value="violet">Violet</option><option value="rose">Rose</option></select></label><label>Progress baseline (%)<input required type="number" min="0" max="100" step="1" value={progress} onChange={e=>setProgress(e.target.value)}/></label></div>
    <p className="editor-hint">New courses are added to the current term. This progress baseline is used until assignments are tracked; after that, course progress follows completed coursework. Existing linked records stay connected when course details change.</p>
    <div className="editor-actions"><button type="button" className="quiet-action" onClick={onCancel}>Cancel</button><button type="submit" className="primary-action"><Save size={14}/>{initial?"Save course":"Add course"}</button></div>
  </form>;
}

function Courses({ snapshot, onCreate, onUpdate }: { snapshot:AcademicSnapshot; onCreate:(input:CourseInput)=>void; onUpdate:(id:string,input:CourseInput)=>void }) {
  const [editor,setEditor]=useState<"new"|string|null>(null);
  const editing=typeof editor==="string"?snapshot.courses.find(course=>course.id===editor):undefined;
  const save=(input:CourseInput)=>{if(editor==="new")onCreate(input);else if(typeof editor==="string")onUpdate(editor,input);setEditor(null);};
  return <div className="content workspace-page"><div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> YOUR SEMESTER</div><h1>Courses<em>.</em></h1><p>Each course brings its assignments, study cards and resources into one connected hub.</p></div><button className="primary-action" onClick={()=>setEditor("new")}><Plus size={15}/> Add course</button></div>
    {editor&&<CourseEditor key={editor} initial={editing} onSave={save} onCancel={()=>setEditor(null)}/>}
    <div className="course-grid">{snapshot.courses.map(course=><article className="panel course-card" key={course.id}><NavLink to={`/courses/${course.id}`} className="course-card-link"><div className="course-card-top"><span>{course.code}</span><GraduationCap size={18}/></div><h3>{course.name}</h3><p>{course.instructor}</p><div className="bar"><i style={{width:`${selectCourseProgress(snapshot,course.id)}%`}}/></div><small>{selectCourseProgress(snapshot,course.id)}% course progress · {snapshot.assignments.filter(a=>a.courseId===course.id).length} assignments</small><span className="course-open">Open course hub <ArrowUpRight size={13}/></span></NavLink><button className="icon-action course-edit-action" aria-label={`Edit ${course.code}`} onClick={()=>setEditor(course.id)}><Pencil size={13}/></button></article>)}</div>
    <div className="footnote">Course records are illustrative demo data, not institution-connected records. New and edited courses are stored locally in this browser.</div>
  </div>;
}

function CourseDetail({ snapshot }: { snapshot: AcademicSnapshot }) {
  const { courseId } = useParams();
  const course=snapshot.courses.find(item=>item.id===courseId);
  if(!course)return <div className="content workspace-page"><div className="empty-state"><b>Course not found.</b><NavLink to="/courses">Return to courses</NavLink></div></div>;
  const assignments=snapshot.assignments.filter(item=>item.courseId===course.id).sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
  const resources=(snapshot.resources??[]).filter(item=>item.courseId===course.id);
  const cards=(snapshot.studyCards??[]).filter(item=>item.courseId===course.id);
  return <div className="content workspace-page"><div className="page-intro"><NavLink className="text-link" to="/courses"><ArrowLeft size={13}/> All courses</NavLink><div className="eyebrow"><i/> COURSE HUB · {course.code}</div><h1>{course.name}<em>.</em></h1><p>{course.instructor} · {snapshot.term.name}</p></div><div className="assignment-summary"><div><strong>{assignments.length}</strong><span>Assignments</span></div><div><strong>{resources.length}</strong><span>Resources</span></div><div><strong>{cards.length}</strong><span>Study cards</span></div></div><section className="course-detail-progress panel"><div><span className="eyebrow">COURSE PROGRESS</span><strong>{selectCourseProgress(snapshot,course.id)}%</strong></div><div className="bar"><i style={{width:`${selectCourseProgress(snapshot,course.id)}%`}}/></div></section><div className="course-detail-grid"><section className="panel"><div className="panel-head"><div><span className="eyebrow">COURSEWORK</span><h3>Assignments</h3></div><NavLink to="/assignments">Manage <ArrowUpRight size={13}/></NavLink></div>{assignments.map(item=><div className="priority" key={item.id}><i className={item.status==="missing"?"urgent":"next"}/><span><b>{item.title}</b><small>{dueLabel(item.dueAt)} · {ASSIGNMENT_STATUS_LABELS[item.status]}</small></span></div>)}{!assignments.length&&<p className="empty-inline">No assignments linked to this course.</p>}</section><section className="panel"><div className="panel-head"><div><span className="eyebrow">REFERENCE MATERIAL</span><h3>Resources</h3></div><NavLink to="/resources">Library <ArrowUpRight size={13}/></NavLink></div>{resources.map(item=><div className="priority" key={item.id}><i className="next"/><span><b>{item.title}</b><small>{item.kind.toUpperCase()} · {item.description}</small></span></div>)}{!resources.length&&<p className="empty-inline">No resources linked to this course.</p>}</section><section className="panel"><div className="panel-head"><div><span className="eyebrow">LEARNING & RETENTION</span><h3>Study cards</h3></div><NavLink to="/study">Study Lab <ArrowUpRight size={13}/></NavLink></div>{cards.map(item=><div className="priority" key={item.id}><i className="next"/><span><b>{item.prompt}</b><small>Next review {dateLabel(item.nextReviewAt)}</small></span></div>)}{!cards.length&&<p className="empty-inline">No study cards linked to this course.</p>}</section></div></div>;
}
function Calendar({ snapshot, onCreateEvent, onUpdateEvent, onDeleteEvent }: { snapshot:AcademicSnapshot; onCreateEvent:(input:AcademicEventInput)=>void; onUpdateEvent:(id:string,input:AcademicEventInput)=>void; onDeleteEvent:(id:string)=>void }) {
  const [showEditor,setShowEditor]=useState(false);
  const [editingEvent,setEditingEvent]=useState<AcademicEvent|undefined>();
  const [title,setTitle]=useState("");
  const [kind,setKind]=useState<AcademicEventKind>("class");
  const [courseId,setCourseId]=useState("");
  const [assignmentId,setAssignmentId]=useState("");
  const [startsAt,setStartsAt]=useState(localDateTime());
  const [endsAt,setEndsAt]=useState(localDateTime(new Date(Date.now()+3600000).toISOString()));
  const [notes,setNotes]=useState("");
  const [eventError,setEventError]=useState("");
  const assignments=snapshot.assignments.map(item=>({id:item.id,title:item.title,courseId:item.courseId,startsAt:item.dueAt,endsAt:item.dueAt,kind:"deadline" as const,notes:item.personalNotes,source:"northstar" as const,status:item.status}));
  const events=(snapshot.events??[]).map(item=>({...item,kind:item.kind as string,status:"event"}));
  const timeline=[...assignments,...events].sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  const grouped=timeline.reduce<Record<string,typeof timeline>>((groups,item)=>{const key=new Date(item.startsAt).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});(groups[key]??=[]).push(item);return groups;},{});
  const openNew=()=>{setEditingEvent(undefined);setEventError("");setTitle("");setKind("class");setCourseId("");setAssignmentId("");setStartsAt(localDateTime());setEndsAt(localDateTime(new Date(Date.now()+3600000).toISOString()));setNotes("");setShowEditor(true);};
  const openEdit=(id:string)=>{const item=(snapshot.events??[]).find(event=>event.id===id);if(!item)return;setEditingEvent(item);setEventError("");setTitle(item.title);setKind(item.kind);setCourseId(item.courseId??"");setAssignmentId(item.assignmentId??"");setStartsAt(localDateTime(item.startsAt));setEndsAt(localDateTime(item.endsAt));setNotes(item.notes);setShowEditor(true);};
  const closeEditor=()=>{setShowEditor(false);setEditingEvent(undefined);};
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const startTime=Date.parse(startsAt);const endTime=Date.parse(endsAt);if(!Number.isFinite(startTime)||!Number.isFinite(endTime)||endTime<=startTime){setEventError("Choose an end time later than the start time.");return;}const input:AcademicEventInput={title,kind,courseId:courseId||undefined,assignmentId:assignmentId||undefined,startsAt:new Date(startTime).toISOString(),endsAt:new Date(endTime).toISOString(),notes};if(editingEvent)onUpdateEvent(editingEvent.id,input);else onCreateEvent(input);closeEditor();};
  return <div className="content workspace-page">
    <div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> TIME & MOMENTUM</div><h1>Calendar<em>.</em></h1><p>Assignment deadlines, class sessions, study blocks and personal reminders in one agenda.</p></div><button className="primary-action" onClick={openNew}><Plus size={15}/> Add event</button></div>
    {showEditor&&<form className="panel editor-panel" onSubmit={submit}><div className="panel-head"><div><span className="eyebrow">{editingEvent?"EDIT CALENDAR EVENT":"NEW CALENDAR EVENT"}</span><h3>{editingEvent?"Update agenda item":"Add to your agenda"}</h3></div><button type="button" className="icon-action" aria-label="Close event editor" onClick={closeEditor}><X size={17}/></button></div><div className="editor-grid"><label className="wide">Event title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Biology lecture"/></label><label>Event type<select value={kind} onChange={e=>setKind(e.target.value as AcademicEventKind)}><option value="class">Class</option><option value="study">Study block</option><option value="reminder">Reminder</option><option value="personal">Personal</option></select></label><label>Course<select value={courseId} onChange={e=>{setCourseId(e.target.value);const linked=snapshot.assignments.find(a=>a.id===assignmentId);if(linked&&linked.courseId!==e.target.value)setAssignmentId("");}}><option value="">No course</option>{snapshot.courses.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}</select></label><label>Starts<input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label><label>Ends<input required type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)}/></label><label className="wide">Related assignment<select value={assignmentId} onChange={e=>{setAssignmentId(e.target.value);const linked=snapshot.assignments.find(a=>a.id===e.target.value);if(linked)setCourseId(linked.courseId);}}><option value="">No linked assignment</option>{snapshot.assignments.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label className="wide">Notes<textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Bring materials, topics to review, etc."/></label></div><div className="editor-actions">{eventError&&<span className="form-error" role="alert">{eventError}</span>}<button type="button" className="quiet-action" onClick={closeEditor}>Cancel</button><button type="submit" className="primary-action"><Save size={14}/>{editingEvent?"Save changes":"Save event"}</button></div></form>}
    <div className="calendar-layout"><section className="panel calendar-list">{Object.entries(grouped).map(([day,items])=><div className="calendar-day" key={day}><div className="calendar-date">{day}</div>{items.map(item=><div className="calendar-item" key={item.id}><i className={item.kind==="deadline"?(item.status==="graded"?"complete":item.status==="missing"?"overdue":""):"event-dot"}/><span><b>{item.title}</b><small>{item.kind==="deadline"?"ASSIGNMENT DEADLINE":item.kind.toUpperCase()} · {snapshot.courses.find(c=>c.id===item.courseId)?.code??"PERSONAL"}{item.status==="event"?"":" · "+ASSIGNMENT_STATUS_LABELS[item.status as AssignmentStatus]}</small>{item.notes&&<small>{item.notes}</small>}</span><span className="calendar-time">{new Date(item.startsAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span>{item.kind!=="deadline"&&item.source==="northstar"&&<><button className="icon-action" aria-label={"Edit "+item.title} onClick={()=>openEdit(item.id)}><Pencil size={13}/></button><button className="icon-action" aria-label={"Delete "+item.title} onClick={()=>{if(window.confirm("Delete this calendar event?"))onDeleteEvent(item.id);}}><Trash2 size={13}/></button></>}</div>)}</div>)}{!timeline.length&&<div className="empty-state">No calendar items yet.</div>}</section><aside className="panel calendar-aside"><span className="eyebrow">AGENDA OVERVIEW</span><h3>{timeline.length} tracked items</h3><p>{assignments.length} assignment deadlines · {(snapshot.events??[]).length} class, study and personal events.</p><NavLink to="/assignments" className="text-link">Manage assignments <ArrowUpRight size={14}/></NavLink></aside></div>
  </div>;
}

function PracticeMode({ snapshot, onStart, onSave, onComplete }: { snapshot:AcademicSnapshot; onStart:(courseId:string,durationSeconds:number)=>void; onSave:(id:string,answers:Record<string,string>,flagged:string[],elapsed:number)=>void; onComplete:(id:string,answers:Record<string,string>,flagged:string[],elapsed:number)=>void }) {
  const [courseId,setCourseId]=useState(snapshot.courses[0]?.id??"");
  const [durationMinutes,setDurationMinutes]=useState(10);
  const [index,setIndex]=useState(0);
  const [clock,setClock]=useState(Date.now());
  const questions=snapshot.practiceQuestions??[];
  const attempts=snapshot.practiceAttempts??[];
  const active=attempts.find(attempt=>attempt.courseId===courseId&&attempt.status==="in_progress");
  const completed=attempts.filter(attempt=>attempt.courseId===courseId&&attempt.status==="completed").sort((a,b)=>Date.parse(b.completedAt??b.startedAt)-Date.parse(a.completedAt??a.startedAt))[0];
  const activeQuestions=active?active.questionIds.map(id=>questions.find(question=>question.id===id)).filter((question):question is NonNullable<typeof question>=>Boolean(question)):[];
  const question=activeQuestions[index];
  const elapsed=active?Math.max(active.elapsedSeconds,Math.floor((clock-Date.parse(active.startedAt))/1000)):0;
  const duration=active?.durationSeconds??600;
  const remaining=Math.max(0,duration-elapsed);
  const formatTime=(seconds:number)=>Math.floor(seconds/60).toString().padStart(2,"0")+":"+Math.floor(seconds%60).toString().padStart(2,"0");
  useEffect(()=>{if(!active)return;const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer)},[active?.id]);
  useEffect(()=>{setIndex(0)},[active?.id,courseId]);
  useEffect(()=>{if(active&&elapsed>=duration)onComplete(active.id,active.answers,active.flaggedIds,elapsed)},[active?.id,active?.status,elapsed]);
  const save=(answers:Record<string,string>,flagged:string[])=>{if(active)onSave(active.id,answers,flagged,elapsed)};
  const choose=(optionId:string)=>{if(!active||!question)return;save({...active.answers,[question.id]:optionId},active.flaggedIds)};
  const toggleFlag=()=>{if(!active||!question)return;const flagged=active.flaggedIds.includes(question.id)?active.flaggedIds.filter(id=>id!==question.id):[...active.flaggedIds,question.id];save(active.answers,flagged)};
  const navigate=(next:number)=>{save(active?.answers??{},active?.flaggedIds??[]);setIndex(Math.max(0,Math.min(activeQuestions.length-1,next)))};
  const finish=()=>{if(active&&window.confirm("Finish this timed practice set and calculate your local practice score?"))onComplete(active.id,active.answers,active.flaggedIds,elapsed)};
  const resultQuestions=completed?completed.questionIds.map(id=>questions.find(question=>question.id===id)).filter((item):item is NonNullable<typeof item>=>Boolean(item)):[];
  const courseQuestionCount=questions.filter(item=>item.courseId===courseId).length;
  const completedCount=attempts.filter(attempt=>attempt.courseId===courseId&&attempt.status==="completed").length;
  return <div className="practice-workspace">
    <div className="panel practice-toolbar"><label>Course<select value={courseId} onChange={event=>setCourseId(event.target.value)}>{snapshot.courses.map(course=><option key={course.id} value={course.id}>{course.code} — {course.name}</option>)}</select></label><div className="practice-meta"><span>{courseQuestionCount} questions available</span><span><Clock3 size={13}/> {active?formatTime(remaining)+" remaining":durationMinutes+" minute session"}</span></div></div>
    {active&&question?<section className="panel practice-panel">
      <div className="practice-head"><span className="eyebrow">TIMED PRACTICE · {snapshot.courses.find(course=>course.id===courseId)?.code}</span><span>QUESTION {index+1} OF {activeQuestions.length}</span></div>
      <div className="practice-progress"><i style={{width:((index+1)/activeQuestions.length*100)+"%"}}/></div>
      <div className="practice-timer"><span><Clock3 size={14}/> TIME REMAINING</span><b className={remaining<=60?"urgent":""}>{formatTime(remaining)}</b></div>
      <div className="practice-question"><span className="eyebrow">{question.concept}</span><h2>{question.prompt}</h2></div>
      <div className="practice-options">{question.options.map((option,optionIndex)=><button type="button" key={option.id} className={active.answers[question.id]===option.id?"practice-option selected":"practice-option"} aria-pressed={active.answers[question.id]===option.id} onClick={()=>choose(option.id)}><span>{String.fromCharCode(65+optionIndex)}</span>{option.text}</button>)}</div>
      <div className="practice-controls"><button type="button" className={active.flaggedIds.includes(question.id)?"quiet-action flagged":"quiet-action"} onClick={toggleFlag}><Target size={13}/>{active.flaggedIds.includes(question.id)?"Flagged for review":"Flag for review"}</button><div><button type="button" className="quiet-action" onClick={()=>navigate(index-1)} disabled={index===0}><ArrowLeft size={13}/> Previous</button><button type="button" className="primary-action" onClick={()=>navigate(index+1)} disabled={index===activeQuestions.length-1}>Next <ArrowRight size={13}/></button></div></div>
      <div className="practice-question-nav">{activeQuestions.map((item,itemIndex)=><button type="button" key={item.id} className={[itemIndex===index?"current":"",active.answers[item.id]?"answered":"",active.flaggedIds.includes(item.id)?"flagged":""].filter(Boolean).join(" ")} aria-label={"Go to question "+(itemIndex+1)} aria-current={itemIndex===index?"step":undefined} onClick={()=>navigate(itemIndex)}>{itemIndex+1}</button>)}</div>
      <div className="practice-finish"><span>{Object.keys(active.answers).length} of {activeQuestions.length} answered · {active.flaggedIds.length} flagged · autosaved locally</span><button type="button" className="primary-action" onClick={finish}>Finish practice <CheckCircle2 size={14}/></button></div>
    </section>:completed?<section className="panel practice-results"><div className="eyebrow">PRACTICE RESULTS · {snapshot.courses.find(course=>course.id===courseId)?.code}</div><h2>{completed.score}% <em>score</em></h2><p>{completed.questionIds.filter(id=>completed.answers[id]===questions.find(question=>question.id===id)?.correctOptionId).length} of {completed.questionIds.length} correct · {formatTime(completed.elapsedSeconds)} elapsed · Attempt {completedCount}</p><div className="practice-result-list">{resultQuestions.map((item,itemIndex)=>{const selected=completed.answers[item.id];const correct=selected===item.correctOptionId;return <article key={item.id}><div><b>{itemIndex+1}. {item.prompt}</b><span className={correct?"result-correct":"result-incorrect"}>{correct?"Correct":"Review this answer"}</span></div><small>Your answer: {item.options.find(option=>option.id===selected)?.text??"Not answered"}</small><small>Correct answer: {item.options.find(option=>option.id===item.correctOptionId)?.text}</small><p>{item.explanation}</p></article>})}</div><button className="primary-action" onClick={()=>onStart(courseId,duration)}><RotateCcw size={14}/> Start another practice set</button><div className="footnote">Local practice result only · This does not change the official Gradebook or send a submission.</div></section>:<section className="panel practice-empty">
      <BookOpenCheck size={24}/><h3>{courseQuestionCount?"Ready for a timed practice set?":"No practice questions for this course yet."}</h3>
      <p>{active?"Resume your saved attempt.":"Choose a time limit. Your answers and flags autosave in this browser, and you can return to an unfinished attempt."}</p>
      <label className="practice-duration">Time limit<select value={durationMinutes} onChange={event=>setDurationMinutes(Number(event.target.value))}><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option></select></label>
      <button className="primary-action" disabled={!courseQuestionCount} onClick={()=>onStart(courseId,durationMinutes*60)}>{attempts.some(item=>item.courseId===courseId&&item.status==="in_progress")?"Resume practice":"Start timed practice"} <ArrowRight size={14}/></button>
      {completedCount>0&&<small>{completedCount} completed attempt{completedCount===1?"":"s"} · review your results in the Answer tab</small>}
    </section>}
  </div>;
}

function StudyLab({ snapshot, onCreate, onRate, onDelete, onPracticeStart, onPracticeSave, onPracticeComplete }: { snapshot: AcademicSnapshot; onCreate:(input:StudyCardInput)=>void; onRate:(id:string,rating:StudyRating)=>void; onDelete:(id:string)=>void; onPracticeStart:(courseId:string,durationSeconds:number)=>void; onPracticeSave:(id:string,answers:Record<string,string>,flagged:string[],elapsed:number)=>void; onPracticeComplete:(id:string,answers:Record<string,string>,flagged:string[],elapsed:number)=>void }) {
  const cards=snapshot.studyCards??[];
  const [index,setIndex]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [showEditor,setShowEditor]=useState(false);
  const [mode,setMode]=useState<"answer"|"learn"|"practice"|"review">("practice");
  const [courseId,setCourseId]=useState(snapshot.courses[0]?.id??"");
  const [guideCourseId,setGuideCourseId]=useState(snapshot.courses[0]?.id??"");
  const guide=useMemo(()=>buildCourseStudyGuide(snapshot,guideCourseId),[snapshot,guideCourseId]);
  const exportGuide=()=>{if(!guide)return;const content=["NORTHSTAR STUDY GUIDE",guide.courseCode+" — "+guide.courseName,"Instructor: "+guide.instructor,"Course progress: "+guide.progress+"%","",...guide.sections.flatMap(section=>[section.title.toUpperCase(),...section.items.map(item=>"• "+item),""])].join("\n");const blob=new Blob([content],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="northstar-study-guide-"+guide.courseCode.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".txt";document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);};
  const [prompt,setPrompt]=useState("");
  const [answer,setAnswer]=useState("");
  const card=cards[index];
  const dueCount=cards.filter(item=>Date.parse(item.nextReviewAt)<=Date.now()).length;
  useEffect(()=>{if(index>=cards.length)setIndex(Math.max(0,cards.length-1));setRevealed(false)},[cards.length,index]);
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();onCreate({courseId,prompt,answer});setPrompt("");setAnswer("");setShowEditor(false)};
  const rate=(rating:StudyRating)=>{if(!card)return;onRate(card.id,rating);setRevealed(false);setIndex(current=>cards.length?((current+1)%cards.length):0)};
  const completedAttempts=(snapshot.practiceAttempts??[]).filter(item=>item.status==="completed").slice().sort((a,b)=>Date.parse(b.completedAt??b.startedAt)-Date.parse(a.completedAt??a.startedAt));
  return <div className="content workspace-page">
    <div className="page-intro page-intro-row"><div><div className="eyebrow"><i/> LEARNING & RETENTION</div><h1>Study Lab<em>.</em></h1><p>Answer, learn, practice and review with course material, timed questions and spaced repetition. Your work stays in this browser.</p></div>{mode==="review"&&<button className="primary-action" onClick={()=>setShowEditor(value=>!value)}><Plus size={15}/> Create flashcard</button>}</div>
    <div className="study-mode-tabs study-tabs" role="tablist" aria-label="Study Lab workspaces">
      <button role="tab" aria-selected={mode==="answer"} className={mode==="answer"?"active":""} onClick={()=>setMode("answer")}>Answer <span>{completedAttempts.length}</span></button>
      <button role="tab" aria-selected={mode==="learn"} className={mode==="learn"?"active":""} onClick={()=>setMode("learn")}>Learn <span>{(snapshot.resources??[]).length}</span></button>
      <button role="tab" aria-selected={mode==="practice"} className={mode==="practice"?"active":""} onClick={()=>setMode("practice")}>Practice <span>{(snapshot.practiceQuestions??[]).length}</span></button>
      <button role="tab" aria-selected={mode==="review"} className={mode==="review"?"active":""} onClick={()=>setMode("review")}>Review <span>{cards.length}</span></button>
    </div>
    {mode==="practice"?<PracticeMode snapshot={snapshot} onStart={onPracticeStart} onSave={onPracticeSave} onComplete={onPracticeComplete}/>:mode==="answer"?<section className="panel study-answer-workspace"><div className="panel-head"><div><span className="eyebrow">ANSWER REVIEW</span><h3>Recent practice results</h3></div><span>{completedAttempts.length} attempts</span></div>{completedAttempts.map(attempt=>{const questions=(snapshot.practiceQuestions??[]).filter(question=>attempt.questionIds.includes(question.id));return <article className="answer-attempt" key={attempt.id}><div className="answer-attempt-head"><span><b>{snapshot.courses.find(course=>course.id===attempt.courseId)?.code??"COURSE"}</b><small>{dateLabel(attempt.completedAt??attempt.startedAt)} · {questions.length} questions</small></span><strong>{attempt.score??0}%</strong></div>{questions.map((question,qIndex)=>{const selected=attempt.answers[question.id];const correct=selected===question.correctOptionId;return <div className="answer-review-row" key={question.id}><b>{qIndex+1}. {question.prompt}</b><span className={correct?"result-correct":"result-incorrect"}>{correct?"Correct":"Review"}</span><small>Your answer: {question.options.find(option=>option.id===selected)?.text??"Not answered"}</small><small>Correct answer: {question.options.find(option=>option.id===question.correctOptionId)?.text}</small><p>{question.explanation}</p></div>})}</article>})}{!completedAttempts.length&&<div className="empty-state">Completed practice attempts will appear here with your answers and explanations.</div>}</section>:mode==="learn"?<><section className="panel study-guide-panel"><div className="panel-head"><div><span className="eyebrow">STRUCTURED COURSE GUIDE</span><h3>{guide?guide.courseCode+" · "+guide.courseName:"Choose a course"}</h3></div><button className="primary-action" onClick={exportGuide} disabled={!guide}><Download size={14}/> Export guide</button></div><div className="study-guide-toolbar"><label>Course<select value={guideCourseId} onChange={event=>setGuideCourseId(event.target.value)}>{snapshot.courses.map(course=><option key={course.id} value={course.id}>{course.code} — {course.name}</option>)}</select></label><span>{guide?.progress??0}% course progress</span></div><p className="editor-hint">Compiled from this course’s saved practice concepts, flashcards, resources and open assignments. This is a deterministic local guide, not AI-generated instruction.</p><div className="study-guide-sections">{guide?.sections.map(section=><section key={section.title}><h4>{section.title}</h4><ul>{section.items.map((item,index)=><li key={index}>{item}</li>)}</ul></section>)}{guide?.sections.length===0&&<p className="empty-inline">Add course resources, flashcards or practice content to build this guide.</p>}</div></section><div className="study-learn-grid">{(snapshot.resources??[]).map(resource=><article className="panel learn-resource" key={resource.id}><span className="eyebrow">{snapshot.courses.find(course=>course.id===resource.courseId)?.code??"ACADEMIC RESOURCE"} · {resource.kind.toUpperCase()}</span><h3>{resource.title}</h3><p>{resource.description}</p>{resource.content&&<div className="learn-resource-content">{resource.content}</div>}{resource.url&&<a href={resource.url} target="_blank" rel="noreferrer">Open reference <ArrowUpRight size={13}/></a>}</article>)}{!(snapshot.resources??[]).length&&<div className="empty-state">Course resources will appear here as learning material is added.</div>}</div></>:<>
      <div className="assignment-summary"><div><strong>{cards.length}</strong><span>Total flashcards</span></div><div><strong>{dueCount}</strong><span>Due for review</span></div><div><strong>{cards.reduce((sum,item)=>sum+item.repetitions,0)}</strong><span>Successful reviews</span></div></div>
      {showEditor&&<form className="panel editor-panel" onSubmit={submit}><div className="panel-head"><div><span className="eyebrow">NEW STUDY CARD</span><h3>Create a flashcard</h3></div><button type="button" className="icon-action" aria-label="Close flashcard editor" onClick={()=>setShowEditor(false)}><X size={17}/></button></div><div className="editor-grid"><label>Course<select value={courseId} onChange={event=>setCourseId(event.target.value)}>{snapshot.courses.map(course=><option key={course.id} value={course.id}>{course.code} — {course.name}</option>)}</select></label><label className="wide">Prompt<input required maxLength={240} value={prompt} onChange={event=>setPrompt(event.target.value)} placeholder="What do you want to remember?"/></label><label className="wide">Answer<textarea required rows={3} value={answer} onChange={event=>setAnswer(event.target.value)} placeholder="Write a clear answer or explanation…"/></label></div><div className="editor-actions"><button type="button" className="quiet-action" onClick={()=>setShowEditor(false)}>Cancel</button><button type="submit" className="primary-action"><Save size={14}/> Save flashcard</button></div></form>}
      <div className="study-layout"><section className="panel study-card-panel"><div className="study-card-top"><span className="eyebrow">SPACED REVIEW · {dueCount} DUE</span><span>{cards.length?index+1:0} / {cards.length}</span></div>{card?<><div className="flashcard" onClick={()=>setRevealed(value=>!value)} role="button" tabIndex={0} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setRevealed(value=>!value)}}}><span>{revealed?"ANSWER":"PROMPT"} · {snapshot.courses.find(course=>course.id===card.courseId)?.code}</span><h2>{revealed?card.answer:card.prompt}</h2><small>{revealed?"Tap to return to prompt":"Tap to reveal answer"}</small></div><div className="study-rating"><span>How well did you recall it?</span><div><button onClick={()=>rate("again")} className="rating-again">Again</button><button onClick={()=>rate("hard")} className="rating-hard">Hard</button><button onClick={()=>rate("good")} className="rating-good">Good</button><button onClick={()=>rate("easy")} className="rating-easy">Easy</button></div></div><div className="study-controls"><button className="quiet-action" onClick={()=>{setIndex(Math.max(0,index-1));setRevealed(false)}} disabled={index===0}><ArrowLeft size={14}/> Previous</button><button className="quiet-action" onClick={()=>{if(window.confirm("Delete this flashcard from your local study deck?"))onDelete(card.id)}}><Trash2 size={13}/> Delete card</button><button className="quiet-action" onClick={()=>{setIndex((index+1)%cards.length);setRevealed(false)}}><ArrowRight size={14}/> Next</button></div><div className="study-schedule">Next review: {dateLabel(card.nextReviewAt)} · Interval: {card.intervalDays<1?"Less than a day":card.intervalDays+" days"} · Ease: {card.easeFactor.toFixed(2)}</div></>:<div className="empty-state"><BookOpenCheck size={22}/><b>Your study deck is ready to grow.</b><span>Create a flashcard to begin spaced review.</span></div>}</section><aside className="panel study-aside"><BookOpenCheck size={22}/><h3>Remember more, deliberately.</h3><p>Each rating schedules the next review interval. “Again” brings a card back sooner; stronger recall increases the interval. Your progress stays local to this browser.</p><div><Clock3 size={14}/> Suggested session · 10 minutes</div></aside></div>
    </>}
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
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const input:GradeItemInput={courseId,assignmentId:assignmentId||undefined,title,score:status==="graded"?Number(score):null,pointsPossible:Number(pointsPossible),status,feedback:feedback||undefined};if(editing)onUpdate(editing.id,input);else onCreate(input);setShowEditor(false);};
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

function Settings({ snapshot, onReset, onImport, theme, onThemeChange }: { snapshot:AcademicSnapshot; onReset:()=>void; onImport:(snapshot:AcademicSnapshot)=>void; theme:"midnight"|"light"; onThemeChange:(theme:"midnight"|"light")=>void }) {
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
    <section className="panel settings-panel theme-panel"><div><span className="eyebrow">APPEARANCE</span><b>Workspace theme</b><small>Midnight is the NORTHSTAR default. Your preference stays on this browser.</small></div><div className="theme-options" role="group" aria-label="Workspace theme"><button type="button" className={theme==="midnight"?"theme-choice active":"theme-choice"} aria-pressed={theme==="midnight"} onClick={()=>onThemeChange("midnight")}><span className="theme-swatch midnight-swatch"/>Midnight</button><button type="button" className={theme==="light"?"theme-choice active":"theme-choice"} aria-pressed={theme==="light"} onClick={()=>onThemeChange("light")}><span className="theme-swatch light-swatch"/>Light</button></div></section>
    <section className="panel settings-panel"><div><span className="eyebrow">BACKUP & RECOVERY</span><b>Export your academic workspace</b><small>Download courses, assignments, calendar events, grade records, resources, flashcards and saved writing drafts as a validated JSON backup.</small></div><button className="primary-action" onClick={exportBackup}><Download size={14}/> Export backup</button></section>
    <section className="panel settings-panel"><div><span className="eyebrow">RESTORE</span><b>Restore from a NORTHSTAR backup</b><small>Import a previously exported backup. This replaces the current local workspace after confirmation.</small></div><label className="primary-action import-backup"><Upload size={14}/> Choose backup<input type="file" accept="application/json,.json" onChange={importBackup}/></label></section>
    <section className="panel settings-panel"><div><span className="eyebrow">DEMO DATA</span><b>Reset local demo data</b><small>Restore the original illustrative courses, assignments, calendar events, grade records, resources and study cards. Saved writing drafts are cleared.</small></div><button className="quiet-action" onClick={()=>{if(window.confirm("Reset this browser’s NORTHSTAR demo workspace? This replaces current local changes.")){onReset();setMessage("Demo workspace reset.");}}}><RotateCcw size={14}/> Reset demo workspace</button></section>
  </div>{message&&<div className="settings-message" role="status">{message}</div>}<div className="footnote">Local browser storage only · No cloud backup or synchronization is connected. Keep exported backup files private.</div></div>;
}

function AIWorkspace({ snapshot }: { snapshot:AcademicSnapshot }) {
  const [enabled,setEnabled]=useState(false);
  const [notifications,setNotifications]=useState<string[]>(["Simulation initialized · no provider connected"]);
  const [prepared,setPrepared]=useState("");
  const toggle=()=>{const next=!enabled;setEnabled(next);setNotifications(items=>[`Co-pilot simulation ${next?"enabled · standing by":"paused"}`,...items].slice(0,6));};
  const request=(label:string)=>{if(!enabled)return;setPrepared(label);setNotifications(items=>[`Simulated request prepared: ${label} · no AI call was made`,...items].slice(0,6));};
  return <div className="content workspace-page">
    <div className="page-intro"><div className="eyebrow"><i/> INTELLIGENT ACADEMIC ASSISTANCE</div><h1>AI Workspace<em>.</em></h1><p>A future-ready co-pilot surface connected to your academic context, currently operating in simulation mode.</p></div>
    <div className="ai-demo-banner"><Sparkles size={16}/><span><b>SIMULATION ONLY</b><small>No AI provider, API key, model request, or external data transfer is connected. Actions below demonstrate the intended interface only.</small></span></div>
    <section className="panel copilot-panel"><div><span className="eyebrow">NORTHSTAR CO-PILOT</span><h3>{enabled?"Standing by":"Co-pilot is paused"}</h3><p>{enabled?"The demo interface is active. It can prepare simulated actions, but it cannot generate or execute AI work.":"Turn on the simulation to explore the future co-pilot controls."}</p></div><div className="copilot-toggle"><span className={enabled?"copilot-status on":"copilot-status"}><i/>{enabled?"STANDING BY":"OFF"}</span><button className={enabled?"quiet-action":"primary-action"} onClick={toggle}>{enabled?"Turn off":"Turn on"} <Power size={14}/></button></div></section>
    <div className="ai-workspace-grid"><section className="panel ai-actions"><div className="panel-head"><div><span className="eyebrow">SIMULATED ASSISTANCE</span><h3>Choose a starting point</h3></div><Sparkles size={17}/></div><button disabled={!enabled} onClick={()=>request("Study plan outline")}><span><b>Prepare a study plan</b><small>Illustrative outline based on current courses and deadlines</small></span><ArrowUpRight size={14}/></button><button disabled={!enabled} onClick={()=>request("Priority review")}><span><b>Review academic priorities</b><small>Demonstrate how urgent work could be surfaced</small></span><ArrowUpRight size={14}/></button><button disabled={!enabled} onClick={()=>request("Course summary")}><span><b>Summarize course context</b><small>Show the intended cross-workspace context entry point</small></span><ArrowUpRight size={14}/></button>{prepared&&<div className="ai-prepared"><span className="eyebrow">SIMULATION OUTPUT</span><b>{prepared}</b><p>This is a placeholder state, not generated advice. The live assistant service is not connected.</p></div>}</section>
    <section className="panel ai-context"><div className="panel-head"><div><span className="eyebrow">ACADEMIC CONTEXT</span><h3>What NORTHSTAR knows locally</h3></div><BookOpen size={17}/></div><div className="ai-context-stat"><b>{snapshot.courses.length}</b><span>Courses</span></div><div className="ai-context-stat"><b>{snapshot.assignments.length}</b><span>Assignments</span></div><div className="ai-context-stat"><b>{(snapshot.resources??[]).length}</b><span>Resources</span></div><div className="ai-context-stat"><b>{(snapshot.studyCards??[]).length}</b><span>Study cards</span></div><small>All context shown here remains in the local browser. Nothing is sent to an AI provider.</small></section>
    <section className="panel ai-notifications"><div className="panel-head"><div><span className="eyebrow">ACTIVITY</span><h3>Co-pilot notifications</h3></div><Bell size={16}/></div>{notifications.map((item,index)=><div className="ai-notification" key={index}><i/><span>{item}</span></div>)}</section></div>
    <div className="footnote">When a provider is authorized in a future phase, this workspace will require a secure server-side integration, explicit data controls, and visible source/provenance indicators.</div>
  </div>;
}

function Placeholder({ path, onReset }: { path: string; onReset: () => void }) {
  const page = pages[path] ?? { eyebrow: "PERSONALIZE", title: "Workspace", copy: "This workspace will be built on the shared NORTHSTAR academic foundation." };
  return <div className="content placeholder"><div className="eyebrow"><i/> {page.eyebrow}</div><h1>{page.title}<em>.</em></h1><p>{page.copy}</p><section className="panel coming"><Sparkles size={22}/><span><b>{path==="/ai"?"Provider connection is intentionally disabled.":"This workspace is taking shape."}</b><small>{path==="/ai"?"The UI is a safe placeholder. No AI provider, API key, or external service is connected.":"This area will be implemented incrementally using the approved NORTHSTAR architecture."}</small></span><em>IN DEVELOPMENT</em></section>{path==="/settings" && <section className="panel settings-panel"><div><b>Reset local demo data</b><small>Restore the original illustrative courses and assignment statuses in this browser.</small></div><button onClick={onReset}><RotateCcw size={14}/> Reset demo workspace</button></section>}</div>;
}
function Routed({ snapshot, onStatus, onCreate, onUpdate, onDelete, onCourseCreate, onCourseUpdate, onResourceCreate, onResourceUpdate, onResourceDelete, onStudyCreate, onStudyRate, onStudyDelete, onDraftSave, onDraftDelete, onEventCreate, onEventUpdate, onEventDelete, onGradeCreate, onGradeUpdate, onGradeDelete, onPracticeStart, onPracticeSave, onPracticeComplete, onImport, onReset, theme, onThemeChange }: { snapshot: AcademicSnapshot; onStatus: (id:string,status:AssignmentStatus)=>void; onCreate:(input:AssignmentInput)=>void; onUpdate:(id:string,input:AssignmentInput)=>void; onDelete:(id:string)=>void; onCourseCreate:(input:CourseInput)=>void; onCourseUpdate:(id:string,input:CourseInput)=>void; onResourceCreate:(input:ResourceInput)=>void; onResourceUpdate:(id:string,input:ResourceInput)=>void; onResourceDelete:(id:string)=>void; onStudyCreate:(input:StudyCardInput)=>void; onStudyRate:(id:string,rating:StudyRating)=>void; onStudyDelete:(id:string)=>void; onDraftSave:(input:WritingDraftInput)=>void; onDraftDelete:(id:string)=>void; onEventCreate:(input:AcademicEventInput)=>void; onEventUpdate:(id:string,input:AcademicEventInput)=>void; onEventDelete:(id:string)=>void; onGradeCreate:(input:GradeItemInput)=>void; onGradeUpdate:(id:string,input:GradeItemInput)=>void; onGradeDelete:(id:string)=>void; onPracticeStart:(courseId:string,durationSeconds:number)=>void; onPracticeSave:(id:string,answers:Record<string,string>,flagged:string[],elapsed:number)=>void; onPracticeComplete:(id:string,answers:Record<string,string>,flagged:string[],elapsed:number)=>void; onImport:(snapshot:AcademicSnapshot)=>void; onReset:()=>void; theme:"midnight"|"light"; onThemeChange:(theme:"midnight"|"light")=>void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen,setPaletteOpen] = useState(false);
  const [notificationsOpen,setNotificationsOpen] = useState(false);
  const notificationCount = selectAcademicNotifications(snapshot).length;
  useEffect(()=>{
    const onKeyDown=(event:WindowEventMap["keydown"])=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setPaletteOpen(true);setNotificationsOpen(false);}
      if(event.key==="Escape"){setPaletteOpen(false);setNotificationsOpen(false);}
    };
    window.addEventListener("keydown",onKeyDown);
    return ()=>window.removeEventListener("keydown",onKeyDown);
  },[]);
  const go=(path:string)=>navigate(path);
  return <><Topbar pathname={location.pathname} onOpenPalette={()=>{setPaletteOpen(true);setNotificationsOpen(false);}} onToggleNotifications={()=>{setNotificationsOpen(value=>!value);setPaletteOpen(false);}} notificationCount={notificationCount}/>{paletteOpen&&<CommandPalette snapshot={snapshot} onClose={()=>setPaletteOpen(false)} onNavigate={go}/ >}{notificationsOpen&&<NotificationCenter snapshot={snapshot} onNavigate={go} onClose={()=>setNotificationsOpen(false)}/>}<AnimatePresence mode="wait"><motion.main key={location.pathname} className="scroll" initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.18}}><Routes><Route path="/" element={<Dashboard snapshot={snapshot}/>}/><Route path="/assignments/:assignmentId" element={<AssignmentDetail snapshot={snapshot} onStatus={onStatus}/>}/><Route path="/assignments" element={<Assignments snapshot={snapshot} onStatus={onStatus} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete}/>}/><Route path="/courses" element={<Courses snapshot={snapshot} onCreate={onCourseCreate} onUpdate={onCourseUpdate}/>}/><Route path="/courses/:courseId" element={<CourseDetail snapshot={snapshot}/>}/><Route path="/calendar" element={<Calendar snapshot={snapshot} onCreateEvent={onEventCreate} onUpdateEvent={onEventUpdate} onDeleteEvent={onEventDelete}/>}/><Route path="/study" element={<StudyLab snapshot={snapshot} onCreate={onStudyCreate} onRate={onStudyRate} onDelete={onStudyDelete} onPracticeStart={onPracticeStart} onPracticeSave={onPracticeSave} onPracticeComplete={onPracticeComplete}/>}/><Route path="/gradebook" element={<Gradebook snapshot={snapshot} onCreate={onGradeCreate} onUpdate={onGradeUpdate} onDelete={onGradeDelete}/>}/><Route path="/resources" element={<Resources snapshot={snapshot} onCreate={onResourceCreate} onUpdate={onResourceUpdate} onDelete={onResourceDelete}/>}/><Route path="/review" element={<ReviewCenter snapshot={snapshot} onSaveDraft={onDraftSave} onDeleteDraft={onDraftDelete}/>}/><Route path="/settings" element={<Settings snapshot={snapshot} onReset={onReset} onImport={onImport} theme={theme} onThemeChange={onThemeChange}/>}/><Route path="/ai" element={<AIWorkspace snapshot={snapshot}/>}/><Route path="*" element={<Placeholder path={location.pathname} onReset={onReset}/>}/></Routes></motion.main></AnimatePresence></>;
}
export default function App() {
  const [snapshot, setSnapshot] = useState<AcademicSnapshot>(() => loadAcademicSnapshot());
  const [theme,setTheme] = useState<"midnight"|"light">(()=>{try{return window.localStorage.getItem("northstar-theme")==="light"?"light":"midnight";}catch{return "midnight";}});
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{window.localStorage.setItem("northstar-theme",theme);}catch{/* Theme remains active for this session. */}},[theme]);
  const [storageAvailable,setStorageAvailable] = useState(true);
  useEffect(() => { setStorageAvailable(saveAcademicSnapshot(snapshot)); }, [snapshot]);
  const handleStatus = (id: string, status: AssignmentStatus) => setSnapshot(current => updateAssignmentStatus(current,id,status));
  const handleCourseCreate = (input:CourseInput) => setSnapshot(current => createCourse(current,input));
  const handleCourseUpdate = (id:string,input:CourseInput) => setSnapshot(current => updateCourse(current,id,input));
  const handleCreate = (input: AssignmentInput) => setSnapshot(current => createAssignment(current,input));
  const handleUpdate = (id: string, input: AssignmentInput) => setSnapshot(current => updateAssignment(current,id,input));
  const handleDelete = (id: string) => setSnapshot(current => deleteAssignment(current,id));
  const handleResourceCreate = (input: ResourceInput) => setSnapshot(current => createResource(current,input));
  const handleResourceUpdate = (id: string,input: ResourceInput) => setSnapshot(current => updateResource(current,id,input));
  const handleResourceDelete = (id: string) => setSnapshot(current => deleteResource(current,id));
  const handleStudyCreate = (input: StudyCardInput) => setSnapshot(current => createStudyCard(current,input));
  const handleStudyRate = (id: string,rating: StudyRating) => setSnapshot(current => rateStudyCard(current,id,rating));
  const handleStudyDelete = (id: string) => setSnapshot(current => deleteStudyCard(current,id));
  const handlePracticeStart = (courseId:string,durationSeconds:number) => setSnapshot(current => createPracticeAttempt(current,courseId,durationSeconds));
  const handlePracticeSave = (id:string,answers:Record<string,string>,flagged:string[],elapsed:number) => setSnapshot(current => updatePracticeAttempt(current,id,answers,flagged,elapsed));
  const handlePracticeComplete = (id:string,answers:Record<string,string>,flagged:string[],elapsed:number) => setSnapshot(current => completePracticeAttempt(updatePracticeAttempt(current,id,answers,flagged,elapsed),id));
  const handleDraftSave = (input: WritingDraftInput) => setSnapshot(current => saveWritingDraft(current,input));
  const handleDraftDelete = (id: string) => setSnapshot(current => deleteWritingDraft(current,id));
  const handleEventCreate = (input:AcademicEventInput) => setSnapshot(current => createAcademicEvent(current,input));
  const handleEventUpdate = (id:string,input:AcademicEventInput) => setSnapshot(current => updateAcademicEvent(current,id,input));
  const handleEventDelete = (id:string) => setSnapshot(current => deleteAcademicEvent(current,id));
  const handleGradeCreate = (input:GradeItemInput) => setSnapshot(current => createGradeItem(current,input));
  const handleGradeUpdate = (id:string,input:GradeItemInput) => setSnapshot(current => updateGradeItem(current,id,input));
  const handleGradeDelete = (id:string) => setSnapshot(current => deleteGradeItem(current,id));
  const handleImport = (restored:AcademicSnapshot) => setSnapshot(restored);
  const handleReset = () => setSnapshot(resetAcademicSnapshot());
  return <div className="app" data-theme={theme}><Sidebar snapshot={snapshot}/><div className="main"><Routed theme={theme} onThemeChange={setTheme} snapshot={snapshot} onStatus={handleStatus} onCreate={handleCreate} onCourseCreate={handleCourseCreate} onCourseUpdate={handleCourseUpdate} onUpdate={handleUpdate} onDelete={handleDelete} onResourceCreate={handleResourceCreate} onResourceUpdate={handleResourceUpdate} onResourceDelete={handleResourceDelete} onStudyCreate={handleStudyCreate} onStudyRate={handleStudyRate} onStudyDelete={handleStudyDelete} onPracticeStart={handlePracticeStart} onPracticeSave={handlePracticeSave} onPracticeComplete={handlePracticeComplete} onDraftSave={handleDraftSave} onDraftDelete={handleDraftDelete} onEventCreate={handleEventCreate} onEventUpdate={handleEventUpdate} onEventDelete={handleEventDelete} onGradeCreate={handleGradeCreate} onGradeUpdate={handleGradeUpdate} onGradeDelete={handleGradeDelete} onImport={handleImport} onReset={handleReset}/>{!storageAvailable&&<div className="storage-warning" role="status">Browser storage is unavailable. Changes are kept for this session only.</div>}</div></div>;
}
