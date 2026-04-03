import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { MUSCLE_ICONS } from "../lib/muscleIcons";
import { Zap, Flame, BarChart2 } from "lucide-react";

interface ProgramExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  muscleGroup: string;
}

interface Program {
  id: string;
  name: string;
  muscleGroups: string[];
  exercises: ProgramExercise[];
  createdAt: string;
}

interface HomeProps {
  userId: string;
  userName: string;
}

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: "bg-pink-900/50 text-pink-300 border-pink-700",
  back: "bg-purple-900/50 text-purple-300 border-purple-700",
  legs: "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  shoulders: "bg-orange-900/50 text-orange-300 border-orange-700",
  arms: "bg-green-900/50 text-green-300 border-green-700",
  core: "bg-gray-800/50 text-gray-300 border-gray-600",
};

// Score each program based on recent workout history:
// - Days since last done (more = higher score)
// - Overlap with recently trained muscle groups (more overlap = lower score)
function pickNextProgram(
  programs: Program[],
  workouts: { date: string; programId: string; exercises: { muscleGroup: string }[] }[]
): { program: Program; reason: string } | null {
  if (!programs.length) return null;

  const now = Date.now();
  const DAY = 86400000;

  // Last session date per program
  const lastDone: Record<string, number> = {};
  for (const w of workouts) {
    const t = new Date(w.date).getTime();
    if (!lastDone[w.programId] || t > lastDone[w.programId]) {
      lastDone[w.programId] = t;
    }
  }

  // Muscle groups trained in the last 2 days
  const recentCutoff = now - 2 * DAY;
  const recentMuscles = new Set<string>();
  for (const w of workouts) {
    if (new Date(w.date).getTime() >= recentCutoff) {
      for (const ex of w.exercises) {
        if (ex.muscleGroup) recentMuscles.add(ex.muscleGroup);
      }
    }
  }

  let best: Program | null = null;
  let bestScore = -Infinity;
  let bestReason = "";

  for (const p of programs) {
    const last = lastDone[p.id];
    const daysSince = last ? (now - last) / DAY : 999;

    // Overlap penalty: how many of this program's muscle groups were trained recently
    const overlap = p.muscleGroups.filter((mg) => recentMuscles.has(mg)).length;
    const overlapRatio = p.muscleGroups.length ? overlap / p.muscleGroups.length : 0;

    // Score: favour long rest + low overlap
    const score = daysSince - overlapRatio * 5;

    if (score > bestScore) {
      bestScore = score;
      best = p;

      if (!last) {
        bestReason = "You haven't tried this one yet.";
      } else if (daysSince >= 7) {
        bestReason = `${Math.round(daysSince)} days since your last session — time to hit it.`;
      } else if (overlap === 0) {
        bestReason = `Muscles are fresh — no overlap with your recent training.`;
      } else {
        bestReason = `${Math.round(daysSince)} day${Math.round(daysSince) !== 1 ? "s" : ""} of rest — good to go.`;
      }
    }
  }

  return best ? { program: best, reason: bestReason } : null;
}

export default function Home({ userId, userName }: HomeProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<{ program: Program; reason: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [weekSummary, setWeekSummary] = useState<{
    sessions: number;
    sets: number;
    bestLift: { name: string; weight: number } | null;
    days: boolean[]; // Mon-Sun, true = trained
  } | null>(null);
  const navigate = useNavigate();

  const firstName = userName?.split(" ")[0] || "Warrior";

  useEffect(() => {
    async function loadData() {
      const cacheKey = `programs_${userId}`;
      let programData: Program[] = [];

      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try { programData = JSON.parse(cached); } catch { /* fall through */ }
      }

      if (!programData.length) {
        try {
          const snap = await getDocs(collection(db, `users/${userId}/programs`));
          programData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Program, "id">) }));
          sessionStorage.setItem(cacheKey, JSON.stringify(programData));
        } catch (err) {
          console.error("Failed to load programs:", err);
        }
      }

      setPrograms(programData);
      setLoading(false);

      if (!programData.length) return;

      // Fetch last 4 weeks of workouts for suggestion logic
      try {
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const cutoff = fourWeeksAgo.toISOString();
        const q = query(collection(db, `users/${userId}/workouts`), orderBy("date", "desc"), limit(30));
        const wSnap = await getDocs(q);
        const recentWorkouts = wSnap.docs
          .map((d) => d.data() as { date: string; programId: string; exercises: { muscleGroup: string }[] })
          .filter((w) => w.date >= cutoff);

        setSuggestion(pickNextProgram(programData, recentWorkouts));

        // Weekly summary — current Mon–Sun
        const now = new Date();
        const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartStr = weekStart.toISOString().slice(0, 10);

        type WorkoutDoc = { date: string; exercises: { name: string; sets: { weight: number; reps: number; completed: boolean }[] }[] };
        const allDocs = wSnap.docs.map((d) => d.data() as WorkoutDoc);
        const weekWorkouts = allDocs.filter((w) => w.date?.slice(0, 10) >= weekStartStr);
        const prevWorkouts = allDocs.filter((w) => w.date?.slice(0, 10) < weekStartStr);

        if (weekWorkouts.length > 0) {
          const trainedDays = new Set(weekWorkouts.map((w) => w.date?.slice(0, 10)));
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return trainedDays.has(d.toISOString().slice(0, 10));
          });

          // Max weight this week per exercise
          const weekMax: Record<string, number> = {};
          let totalSets = 0;
          for (const w of weekWorkouts) {
            for (const ex of w.exercises ?? []) {
              for (const s of ex.sets ?? []) {
                if (!s.completed || s.weight <= 0) continue;
                totalSets++;
                if (s.weight > (weekMax[ex.name] ?? 0)) weekMax[ex.name] = s.weight;
              }
            }
          }

          // Max weight before this week per exercise
          const prevMax: Record<string, number> = {};
          for (const w of prevWorkouts) {
            for (const ex of w.exercises ?? []) {
              for (const s of ex.sets ?? []) {
                if (!s.completed || s.weight <= 0) continue;
                if (s.weight > (prevMax[ex.name] ?? 0)) prevMax[ex.name] = s.weight;
              }
            }
          }

          // Find biggest improvement (kg delta, only positive)
          let topGain: { name: string; weight: number; delta: number } | null = null;
          for (const [name, w] of Object.entries(weekMax)) {
            const prev = prevMax[name] ?? 0;
            const delta = w - prev;
            if (delta > 0 && (!topGain || delta > topGain.delta)) {
              topGain = { name, weight: w, delta };
            }
          }

          setWeekSummary({ sessions: weekWorkouts.length, sets: totalSets, bestLift: topGain ? { name: topGain.name, weight: topGain.delta } : null, days });
        }

        // Calculate streak: consecutive calendar days with at least one workout (newest first)
        const days = new Set(wSnap.docs.map((d) => d.data().date?.slice(0, 10)).filter(Boolean));
        let s = 0;
        const today = new Date();
        for (let i = 0; i <= 365; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          if (days.has(key)) { s++; }
          else if (i > 0) break; // gap found — stop (allow missing today)
        }
        setStreak(s);
      } catch {
        // suggestion is optional, fail silently
      }
    }
    loadData();
  }, [userId]);

  return (
    <div className="flex flex-col items-center">
      {/* Hero banner */}
      <div className="relative w-full" style={{ height: "380px" }}>
        <img
          src="/zyzz-character.jpg"
          alt="SuperGainZ"
          className="w-full h-full object-cover"
          style={{ objectPosition: "center 18%" }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0b0f19] to-transparent" />
        <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center">
          <h1 className="text-2xl font-black neon-text-pink uppercase tracking-widest text-center font-display neon-flicker">
            SUPERGAINZ
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400 text-xs text-center">
              Hi {firstName} — pick a program and start your session.
            </p>
            {streak > 0 && (
              <div className="flex items-center gap-1 bg-orange-950/60 border border-orange-700/50 rounded-full px-2 py-0.5 shrink-0"
                style={{ boxShadow: "0 0 8px rgba(251,146,60,0.3)" }}>
                <Flame size={11} className="text-orange-400" />
                <span className="text-orange-300 text-[10px] font-black font-display tracking-wider">{streak}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 w-full">

        {/* Next workout suggestion */}
        {suggestion && (
          <div className="mb-4 rounded-2xl border border-pink-800/60 bg-pink-950/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={13} className="text-pink-400 shrink-0" />
              <span className="text-pink-400 text-[10px] font-bold uppercase tracking-widest font-display">Next up</span>
            </div>
            <p className="font-black uppercase tracking-wider font-display neon-text-pink mb-0.5" style={{ fontSize: "14px" }}>
              {suggestion.program.name}
            </p>
            <p className="text-gray-400 text-xs mb-3">{suggestion.reason}</p>
            <button
              onClick={() => navigate("/workout", { state: { program: suggestion.program } })}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl shadow-[0_0_12px_rgba(255,0,127,0.5)] hover:scale-[1.02] transition-transform"
            >
              Start Now
            </button>
          </div>
        )}

        {/* Weekly summary */}
        {weekSummary && (
          <div className="mb-4 rounded-2xl border border-purple-900/60 bg-[#141a29] p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={13} className="text-purple-400 shrink-0" />
              <span className="text-purple-400 text-[10px] font-bold uppercase tracking-widest font-display">This week</span>
            </div>
            {/* Day dots Mon–Sun */}
            <div className="flex gap-1.5 mb-3">
              {["M","T","W","T","F","S","S"].map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full h-1.5 rounded-full ${weekSummary.days[i] ? "bg-purple-400" : "bg-gray-800"}`}
                    style={weekSummary.days[i] ? { boxShadow: "0 0 6px rgba(192,132,252,0.6)" } : {}} />
                  <span className="text-[9px] text-gray-600 font-display">{d}</span>
                </div>
              ))}
            </div>
            {/* Stats row */}
            <div className="flex justify-between text-center">
              <div>
                <p className="text-white font-black font-display text-lg">{weekSummary.sessions}</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Sessions</p>
              </div>
              <div>
                <p className="text-white font-black font-display text-lg">{weekSummary.sets}</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Sets done</p>
              </div>
              {weekSummary.bestLift && (
                <div className="max-w-[110px] text-center">
                  <p className="neon-text-cyan font-black font-display text-lg">+{weekSummary.bestLift.weight} kg</p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider truncate">{weekSummary.bestLift.name}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Programs list */}
        <div className="w-full">
          {loading ? (
            <p className="text-gray-400 text-center mt-4">Loading programs...</p>
          ) : programs.length === 0 ? (
            <div className="text-center mt-4">
              <button
                onClick={() => navigate("/programs")}
                className="neon-text-cyan text-sm hover:underline"
              >
                No programs yet → Go to Programs
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {programs.map((program) => (
                <div
                  key={program.id}
                  className={`bg-[#141a29] border rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors ${
                    suggestion?.program.id === program.id
                      ? "border-pink-800/50"
                      : "border-purple-900"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase tracking-wider truncate font-display neon-text-cyan" style={{ fontSize: "13px" }}>{program.name}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {program.muscleGroups.map((mg) => {
                        const icon = MUSCLE_ICONS[mg];
                        const textColor = (MUSCLE_GROUP_COLORS[mg] ?? "text-gray-400")
                          .split(" ").find((c) => c.startsWith("text-")) ?? "text-gray-400";
                        return (
                          <div key={mg} className="flex flex-col items-center gap-0.5">
                            {icon ? (
                              <img
                                src={icon}
                                alt={mg}
                                className="w-11 h-11 rounded-xl object-cover object-top"
                                style={{ boxShadow: "0 0 8px rgba(0,255,255,0.15)" }}
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 text-xs font-bold uppercase">
                                {mg[0]}
                              </div>
                            )}
                            <span className={`text-[9px] uppercase tracking-widest font-semibold ${textColor}`}>
                              {mg}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-gray-400 text-xs mt-1.5">
                      {program.exercises.length} exercise{program.exercises.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/workout", { state: { program } })}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl shadow-[0_0_10px_rgba(255,0,127,0.4)] hover:scale-105 transition-transform shrink-0"
                  >
                    START
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-gray-700 text-[10px] uppercase tracking-widest text-center py-4 font-display">
          v0.2.0
        </p>
      </div>
    </div>
  );
}
