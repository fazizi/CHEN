import { useState, useEffect } from "react";
import { examsRef, set, onValue } from "./firebase";

const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Grad Level"];
const HOURS = Array.from({ length: 13 }, (_, i) => `${i + 7}:00`); // 7:00 to 19:00

function getDayName(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

const CONFLICT_GAP_HOURS = 2; // exams within 2h flagged as "close"

function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function overlap(a, b) {
  const aStart = timeToMinutes(a.startTime);
  const aEnd = aStart + a.duration;
  const bStart = timeToMinutes(b.startTime);
  const bEnd = bStart + b.duration;
  return aStart < bEnd && bStart < aEnd;
}

function isClose(a, b) {
  const aStart = timeToMinutes(a.startTime);
  const aEnd = aStart + a.duration;
  const bStart = timeToMinutes(b.startTime);
  const bEnd = bStart + b.duration;
  const gap = Math.min(Math.abs(bStart - aEnd), Math.abs(aStart - bEnd));
  return gap > 0 && gap <= CONFLICT_GAP_HOURS * 60;
}

function getConflicts(exams) {
  const conflicts = [];
  const close = [];
  for (let i = 0; i < exams.length; i++) {
    for (let j = i + 1; j < exams.length; j++) {
      const a = exams[i], b = exams[j];
      if (a.date !== b.date) continue;
      const sharedYears = a.years.filter(y => b.years.includes(y));
      if (sharedYears.length === 0) continue;
      if (overlap(a, b)) {
        conflicts.push({ a, b, sharedYears, type: "conflict" });
      } else if (isClose(a, b)) {
        close.push({ a, b, sharedYears, type: "close" });
      }
    }
  }
  return { conflicts, close };
}

const initialForm = {
  professor: "",
  course: "",
  years: [],
  date: "",
  startTime: "9:00",
  duration: 120,
  semester: "Spring 2025",
};

export default function ExamScheduler() {
  const [exams, setExams] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filterYear, setFilterYear] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [tab, setTab] = useState("schedule"); // schedule | add | conflicts
  const [editId, setEditId] = useState(null);
  const [saved, setSaved] = useState(false);

  // Sync from Firebase in real time
  useEffect(() => {
    const unsubscribe = onValue(examsRef, (snapshot) => {
      const data = snapshot.val();
      setExams(data ? Object.values(data) : []);
    });
    return () => unsubscribe();
  }, []);

  // Save to Firebase
  function saveExams(data) {
    const mapped = {};
    data.forEach(e => { mapped[e.id] = e; });
    set(examsRef, mapped);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSubmit() {
    if (!form.professor || !form.course || form.years.length === 0 || !form.date) return;
    let updated;
    if (editId !== null) {
      updated = exams.map(e => e.id === editId ? { ...form, id: editId } : e);
      setEditId(null);
    } else {
      updated = [...exams, { ...form, id: Date.now() }];
    }
    setExams(updated);
    saveExams(updated);
    setForm(initialForm);
    setTab("schedule");
  }

  function handleDelete(id) {
    const updated = exams.filter(e => e.id !== id);
    setExams(updated);
    saveExams(updated);
  }

  function handleEdit(exam) {
    setForm({ ...exam });
    setEditId(exam.id);
    setTab("add");
  }

  function toggleYear(y) {
    setForm(f => ({
      ...f,
      years: f.years.includes(y) ? f.years.filter(x => x !== y) : [...f.years, y]
    }));
  }

  const allMonths = [...new Set(exams.map(e => e.date?.slice(0, 7)).filter(Boolean))].sort();

  const filtered = exams.filter(e =>
    (filterYear === "All" || e.years.includes(filterYear)) &&
    (filterMonth === "All" || e.date?.startsWith(filterMonth))
  );

  const { conflicts, close } = getConflicts(exams);
  const hasIssues = conflicts.length + close.length > 0;

  // Group by date for timeline view
  const allDates = [...new Set(filtered.map(e => e.date).filter(Boolean))].sort();
  const byDate = allDates.map(date => ({
    date,
    exams: filtered.filter(e => e.date === date).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  }));

  const examHasConflict = (exam) =>
    conflicts.some(c => c.a.id === exam.id || c.b.id === exam.id);
  const examIsClose = (exam) =>
    close.some(c => c.a.id === exam.id || c.b.id === exam.id);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f3ee",
      fontFamily: "'Georgia', serif",
      color: "#1a1a2e",
    }}>
      {/* Header */}
      <div style={{
        background: "#1a1a2e",
        color: "#f5f3ee",
        padding: "28px 40px 20px",
        borderBottom: "4px solid #c8a96e",
      }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#c8a96e", textTransform: "uppercase", marginBottom: 6 }}>
              Department of Chemical Engineering · AUB
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: "normal", letterSpacing: 1 }}>
              Exam Schedule Coordinator
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saved && (
              <span style={{ fontSize: 12, color: "#c8a96e", letterSpacing: 1 }}>✓ Saved</span>
            )}
            {hasIssues && (
              <span style={{
                background: conflicts.length > 0 ? "#c0392b" : "#e67e22",
                color: "#fff",
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 20,
                cursor: "pointer",
              }} onClick={() => setTab("conflicts")}>
                {conflicts.length > 0 ? `⚠ ${conflicts.length} Conflict${conflicts.length > 1 ? "s" : ""}` : `⏱ ${close.length} Close`}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 20 }}>
          {[["schedule", "📅 Schedule"], ["add", editId ? "✏️ Edit Exam" : "＋ Add Exam"], ["conflicts", `⚠ Issues (${conflicts.length + close.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: tab === key ? "#c8a96e" : "transparent",
              color: tab === key ? "#1a1a2e" : "#c8a96e",
              border: "1px solid #c8a96e",
              borderBottom: tab === key ? "1px solid #c8a96e" : "none",
              padding: "8px 20px",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "Georgia, serif",
              letterSpacing: 0.5,
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>

        {/* SCHEDULE TAB */}
        {tab === "schedule" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#666", display: "block", marginBottom: 6 }}>Year of Study</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["All", ...YEARS].map(y => (
                    <button key={y} onClick={() => setFilterYear(y)} style={{
                      padding: "5px 14px",
                      border: "1px solid",
                      borderColor: filterYear === y ? "#1a1a2e" : "#ccc",
                      background: filterYear === y ? "#1a1a2e" : "#fff",
                      color: filterYear === y ? "#f5f3ee" : "#1a1a2e",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "Georgia, serif",
                      borderRadius: 2,
                    }}>{y}</button>
                  ))}
                </div>
              </div>
              {allMonths.length > 1 && (
                <div>
                  <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#666", display: "block", marginBottom: 6 }}>Month</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["All", ...allMonths].map(m => (
                      <button key={m} onClick={() => setFilterMonth(m)} style={{
                        padding: "5px 14px",
                        border: "1px solid",
                        borderColor: filterMonth === m ? "#1a1a2e" : "#ccc",
                        background: filterMonth === m ? "#1a1a2e" : "#fff",
                        color: filterMonth === m ? "#f5f3ee" : "#1a1a2e",
                        cursor: "pointer",
                        fontSize: 13,
                        fontFamily: "Georgia, serif",
                        borderRadius: 2,
                      }}>{m === "All" ? "All" : new Date(m + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {exams.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#999" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 16 }}>No exams scheduled yet.</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Click "Add Exam" to get started.</div>
              </div>
            ) : byDate.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>No exams match the selected filters.</div>
            ) : (
              byDate.map(({ date, exams: dayExams }) => (
                <div key={date} style={{ marginBottom: 32 }}>
                  <div style={{
                    fontSize: 11, letterSpacing: 4, textTransform: "uppercase",
                    color: "#c8a96e", borderBottom: "1px solid #c8a96e",
                    paddingBottom: 6, marginBottom: 14,
                  }}>{formatDate(date)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {dayExams.map(exam => {
                      const isConflict = examHasConflict(exam);
                      const isCloseW = !isConflict && examIsClose(exam);
                      return (
                        <div key={exam.id} style={{
                          display: "flex", alignItems: "stretch",
                          background: "#fff",
                          border: "1px solid",
                          borderColor: isConflict ? "#c0392b" : isCloseW ? "#e67e22" : "#ddd",
                          borderLeft: `4px solid ${isConflict ? "#c0392b" : isCloseW ? "#e67e22" : "#c8a96e"}`,
                          borderRadius: 2,
                          overflow: "hidden",
                        }}>
                          <div style={{ padding: "14px 20px", flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                              <div>
                                <span style={{ fontWeight: "bold", fontSize: 15 }}>{exam.course}</span>
                                <span style={{ color: "#888", fontSize: 13, marginLeft: 10 }}>— {exam.professor}</span>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                {isConflict && <span style={{ background: "#c0392b", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 10 }}>CONFLICT</span>}
                                {isCloseW && <span style={{ background: "#e67e22", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 10 }}>CLOSE</span>}
                              </div>
                            </div>
                            <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#555" }}>
                              <span>🕐 {exam.startTime} — {(() => {
                                const end = timeToMinutes(exam.startTime) + exam.duration;
                                return `${Math.floor(end / 60)}:${String(end % 60).padStart(2, "0")}`;
                              })()} ({exam.duration} min)</span>
                              <span>📆 {exam.semester}</span>
                              <span style={{ display: "flex", gap: 4 }}>
                                {exam.years.map(y => (
                                  <span key={y} style={{
                                    background: "#1a1a2e", color: "#c8a96e",
                                    fontSize: 11, padding: "2px 8px", borderRadius: 10,
                                  }}>{y}</span>
                                ))}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid #eee" }}>
                            <button onClick={() => handleEdit(exam)} style={{
                              flex: 1, padding: "0 16px", background: "none", border: "none",
                              cursor: "pointer", color: "#666", fontSize: 16,
                              borderBottom: "1px solid #eee",
                            }}>✏️</button>
                            <button onClick={() => handleDelete(exam.id)} style={{
                              flex: 1, padding: "0 16px", background: "none", border: "none",
                              cursor: "pointer", color: "#c0392b", fontSize: 16,
                            }}>🗑</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ADD / EDIT TAB */}
        {tab === "add" && (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontWeight: "normal", marginBottom: 28, fontSize: 20 }}>
              {editId ? "Edit Exam Entry" : "Schedule a New Exam"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {[["Professor Name", "professor", "text"], ["Course Code / Name", "course", "text"], ["Semester", "semester", "text"]].map(([label, key, type]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={inputStyle} placeholder={label} />
                </div>
              ))}

              <div>
                <label style={labelStyle}>Year(s) of Study <span style={{ color: "#999", fontStyle: "italic" }}>(select all that apply)</span></label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {YEARS.map(y => (
                    <button key={y} type="button" onClick={() => toggleYear(y)} style={{
                      padding: "7px 16px",
                      border: "1px solid",
                      borderColor: form.years.includes(y) ? "#1a1a2e" : "#ccc",
                      background: form.years.includes(y) ? "#1a1a2e" : "#fff",
                      color: form.years.includes(y) ? "#c8a96e" : "#555",
                      cursor: "pointer", borderRadius: 2,
                      fontFamily: "Georgia, serif", fontSize: 13,
                    }}>{y}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Exam Date</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={inputStyle} />
                  {form.date && (
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      {getDayName(form.date)}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start Time</label>
                  <select value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={inputStyle}>
                    {HOURS.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Duration (min)</label>
                  <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} style={inputStyle}>
                    {[60, 90, 120, 150, 180].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={handleSubmit} disabled={!form.professor || !form.course || form.years.length === 0 || !form.date}
                  style={{
                    background: "#1a1a2e", color: "#c8a96e", border: "none",
                    padding: "12px 32px", cursor: "pointer", fontSize: 14,
                    fontFamily: "Georgia, serif", letterSpacing: 1,
                    opacity: (!form.professor || !form.course || form.years.length === 0 || !form.date) ? 0.4 : 1,
                  }}>
                  {editId ? "Save Changes" : "Add Exam"}
                </button>
                {editId && (
                  <button onClick={() => { setEditId(null); setForm(initialForm); setTab("schedule"); }} style={{
                    background: "none", border: "1px solid #ccc", padding: "12px 24px",
                    cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif", color: "#666",
                  }}>Cancel</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONFLICTS TAB */}
        {tab === "conflicts" && (
          <div>
            <h2 style={{ fontWeight: "normal", marginBottom: 28, fontSize: 20 }}>Scheduling Issues</h2>

            {conflicts.length === 0 && close.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16 }}>No conflicts or close exams detected.</div>
              </div>
            ) : (
              <>
                {conflicts.length > 0 && (
                  <div style={{ marginBottom: 36 }}>
                    <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#c0392b", borderBottom: "1px solid #c0392b", paddingBottom: 6, marginBottom: 14 }}>
                      ⚠ Overlapping Exams ({conflicts.length})
                    </div>
                    {conflicts.map((c, i) => <IssueCard key={i} issue={c} type="conflict" />)}
                  </div>
                )}
                {close.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#e67e22", borderBottom: "1px solid #e67e22", paddingBottom: 6, marginBottom: 14 }}>
                      ⏱ Exams Scheduled Close Together ({close.length}) — within {CONFLICT_GAP_HOURS}h
                    </div>
                    {close.map((c, i) => <IssueCard key={i} issue={c} type="close" />)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IssueCard({ issue, type }) {
  const color = type === "conflict" ? "#c0392b" : "#e67e22";
  const { a, b, sharedYears } = issue;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 2, padding: "16px 20px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <ExamPill exam={a} />
        <div style={{ display: "flex", alignItems: "center", color, fontWeight: "bold", fontSize: 18 }}>
          {type === "conflict" ? "⟺" : "~"}
        </div>
        <ExamPill exam={b} />
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: "#888" }}>
        Affects: {sharedYears.join(", ")} · {formatDate(a.date)}
      </div>
    </div>
  );
}

function ExamPill({ exam }) {
  const end = timeToMinutes(exam.startTime) + exam.duration;
  const endStr = `${Math.floor(end / 60)}:${String(end % 60).padStart(2, "0")}`;
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ fontWeight: "bold", fontSize: 14 }}>{exam.course}</div>
      <div style={{ color: "#777", fontSize: 12 }}>{exam.professor}</div>
      <div style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
        {formatDate(exam.date)} · {exam.startTime} – {endStr} ({exam.duration} min)
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
  color: "#666", display: "block", marginBottom: 6,
};

const inputStyle = {
  width: "100%", padding: "10px 14px",
  border: "1px solid #ccc", background: "#fff",
  fontFamily: "Georgia, serif", fontSize: 14,
  color: "#1a1a2e", boxSizing: "border-box",
  borderRadius: 2, outline: "none",
};
