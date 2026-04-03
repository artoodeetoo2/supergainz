import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { LogOut, User as UserIcon, Download, FileJson, FileText } from "lucide-react";

export default function Profile({ user }: { user: any }) {
  const [workoutCount, setWorkoutCount] = useState<number | null>(null);
  const [programCount, setProgramCount] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadCounts() {
      try {
        const [wSnap, pSnap] = await Promise.all([
          getDocs(collection(db, "users", user.uid, "workouts")),
          getDocs(collection(db, "users", user.uid, "programs")),
        ]);
        setWorkoutCount(wSnap.size);
        setProgramCount(pSnap.size);
      } catch { /* fail silently */ }
    }
    loadCounts();
  }, [user.uid]);

  async function fetchAllData() {
    const [workouts, programs, bodyweight] = await Promise.all([
      getDocs(query(collection(db, "users", user.uid, "workouts"), orderBy("date", "asc"))),
      getDocs(collection(db, "users", user.uid, "programs")),
      getDocs(query(collection(db, "users", user.uid, "bodyweight"), orderBy("date", "asc"))),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      user: { displayName: user.displayName, email: user.email },
      workouts: workouts.docs.map((d) => ({ id: d.id, ...d.data() })),
      programs: programs.docs.map((d) => ({ id: d.id, ...d.data() })),
      bodyweight: bodyweight.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  }

  async function exportJson() {
    setExporting(true);
    try {
      const data = await fetchAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `supergainz-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const data = await fetchAllData();
      const html = buildPdfHtml(data);
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  function buildPdfHtml(data: any): string {
    const workoutRows = data.workouts.map((w: any) => {
      const exRows = (w.exercises ?? []).map((ex: any) => {
        const doneSets = (ex.sets ?? []).filter((s: any) => s.completed);
        const maxW = doneSets.length ? Math.max(...doneSets.map((s: any) => s.weight)) : 0;
        return `<tr><td>${ex.name}</td><td>${ex.muscleGroup}</td><td>${doneSets.length} sets</td><td>${maxW > 0 ? maxW + " kg" : "—"}</td></tr>`;
      }).join("");
      return `
        <div class="workout">
          <h3>${w.programName ?? "Workout"} <span class="date">${w.date?.slice(0, 10) ?? ""}</span></h3>
          <table><thead><tr><th>Exercise</th><th>Muscle</th><th>Sets done</th><th>Max weight</th></tr></thead>
          <tbody>${exRows}</tbody></table>
        </div>`;
    }).join("");

    const bwRows = data.bodyweight.map((e: any) =>
      `<tr><td>${e.date}</td><td>${e.weight} kg</td></tr>`
    ).join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>SuperGainZ Export — ${data.user.displayName}</title>
    <style>
      body { font-family: system-ui, sans-serif; color: #111; max-width: 800px; margin: 0 auto; padding: 24px; }
      h1 { font-size: 24px; margin-bottom: 4px; } h2 { font-size: 18px; margin: 24px 0 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
      h3 { font-size: 14px; margin: 16px 0 6px; } .date { color: #6b7280; font-weight: normal; font-size: 12px; margin-left: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
      th { text-align: left; padding: 4px 8px; background: #f3f4f6; } td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
      .meta { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
      .workout { margin-bottom: 16px; page-break-inside: avoid; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>SuperGainZ — Training Export</h1>
    <p class="meta">${data.user.displayName} · ${data.user.email} · Exported ${data.exportedAt.slice(0, 10)}</p>
    <p class="meta">${data.workouts.length} workouts · ${data.programs.length} programs · ${data.bodyweight.length} weight entries</p>

    <h2>Workouts (${data.workouts.length})</h2>
    ${workoutRows || "<p>No workouts logged yet.</p>"}

    ${data.bodyweight.length ? `<h2>Body Weight</h2>
    <table><thead><tr><th>Date</th><th>Weight</th></tr></thead><tbody>${bwRows}</tbody></table>` : ""}
    </body></html>`;
  }

  return (
    <div className="p-6 pb-8 flex flex-col items-center">
      <h2 className="text-3xl font-black neon-text-cyan mb-6 uppercase tracking-widest font-display neon-flicker">Profile</h2>

      {/* User card */}
      <div className="w-full bg-[#141a29] border border-purple-900 rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] mb-4 flex flex-col items-center">
        {user.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full mb-4 border-2 border-pink-700" style={{ boxShadow: "0 0 12px rgba(255,0,127,0.4)" }} />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-4 border-2 border-pink-700">
            <UserIcon size={40} className="text-pink-500" />
          </div>
        )}
        <h3 className="text-xl font-bold text-white mb-1">{user.displayName || "Gainz Warrior"}</h3>
        <p className="text-gray-400 text-sm mb-6">{user.email}</p>
        <div className="w-full grid grid-cols-2 gap-4 text-center">
          <div className="bg-[#0b0f19] p-3 rounded-xl border border-pink-900/50">
            <div className="text-2xl font-black font-display neon-text-pink">{workoutCount ?? "—"}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Workouts</div>
          </div>
          <div className="bg-[#0b0f19] p-3 rounded-xl border border-cyan-900/50">
            <div className="text-2xl font-black font-display neon-text-cyan">{programCount ?? "—"}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Programs</div>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="w-full bg-[#141a29] border border-purple-900 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Download size={14} className="text-purple-400" />
          <p className="text-purple-400 text-[10px] font-bold uppercase tracking-widest font-display">Take my data</p>
        </div>
        <p className="text-gray-500 text-xs mb-4">Export all your workouts, programs and body weight data.</p>
        <div className="flex gap-3">
          <button
            onClick={exportJson}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 border border-cyan-800 text-cyan-400 hover:border-cyan-500 hover:text-cyan-300 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider font-display transition-colors disabled:opacity-50"
          >
            <FileJson size={16} />
            JSON
          </button>
          <button
            onClick={exportPdf}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 border border-pink-800 text-pink-400 hover:border-pink-500 hover:text-pink-300 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider font-display transition-colors disabled:opacity-50"
          >
            <FileText size={16} />
            PDF
          </button>
        </div>
        {exporting && <p className="text-gray-500 text-xs text-center mt-3">Fetching data...</p>}
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut(auth)}
        className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white px-6 py-3 rounded-xl font-bold transition-colors"
      >
        <LogOut size={20} />
        SIGN OUT
      </button>
    </div>
  );
}
