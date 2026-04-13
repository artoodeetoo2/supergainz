import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, addDoc, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Scale, ChevronDown, Trash2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
}

interface ExerciseLog {
  name: string;
  muscleGroup: string;
  sets: SetLog[];
}

interface Workout {
  id: string;
  programName: string;
  date: string;
  exercises: ExerciseLog[];
}

interface StatsProps {
  userId: string;
}

interface ChartPoint {
  date: string;
  maxWeight: number;
  flameWeight?: number;
}

interface BodyWeightEntry {
  id: string;
  date: string;
  weight: number;
}

interface BwChartPoint {
  date: string;
  weight: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload.find((p: any) => p.dataKey === "maxWeight" || p.dataKey === "flameWeight");
  if (!val) return null;
  return (
    <div className="bg-[#141a29] border border-purple-900 rounded-xl px-3 py-2 text-xs shadow-[0_0_10px_rgba(0,255,255,0.2)]">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-cyan-400 font-bold">{val.value} kg</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GlowDot(props: any) {
  const { cx, cy, index, dataLength, isTrending } = props;
  const isLast = index === dataLength - 1;
  if (!isLast) {
    return <circle cx={cx} cy={cy} r={3} fill="#00ffff" opacity={0.7} />;
  }
  return (
    <g>
      {/* Outer pulse ring */}
      <circle cx={cx} cy={cy} r={10} fill={isTrending ? "#ff007f" : "#00ffff"} opacity={0.15} />
      <circle cx={cx} cy={cy} r={6} fill={isTrending ? "#ff007f" : "#00ffff"} opacity={0.25} />
      <circle cx={cx} cy={cy} r={4} fill={isTrending ? "#ff007f" : "#00ffff"} opacity={0.9} />
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BwTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141a29] border border-purple-900 rounded-xl px-3 py-2 text-xs shadow-[0_0_10px_rgba(251,146,60,0.2)]">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-orange-400 font-bold">{payload[0].value} kg</p>
    </div>
  );
}

function epley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export default function Stats({ userId }: StatsProps) {
  const [tab, setTab] = useState<"lifts" | "bodyweight" | "1rm" | "history">("lifts");

  // Lifts
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  // 1RM calculator
  const [rmWeight, setRmWeight] = useState("");
  const [rmReps, setRmReps] = useState("");

  // Body weight
  const [bwEntries, setBwEntries] = useState<BodyWeightEntry[]>([]);
  const [bwLoading, setBwLoading] = useState(false);
  const [bwDate, setBwDate] = useState(new Date().toISOString().slice(0, 10));
  const [bwValue, setBwValue] = useState("");
  const [bwSaving, setBwSaving] = useState(false);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkouts() {
      try {
        const q = query(collection(db, "users", userId, "workouts"), orderBy("date", "asc"));
        const snap = await getDocs(q);
        const data: Workout[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Workout, "id">) }));
        setWorkouts(data);
        const first = data[0]?.exercises?.[0]?.name;
        if (first) setSelectedExercise(first);
      } catch (err) {
        console.error("Failed to fetch workouts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkouts();
  }, [userId]);

  useEffect(() => {
    if (tab !== "bodyweight") return;
    async function fetchBw() {
      setBwLoading(true);
      try {
        const q = query(collection(db, "users", userId, "bodyweight"), orderBy("date", "asc"));
        const snap = await getDocs(q);
        setBwEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BodyWeightEntry, "id">) })));
      } catch (err) {
        console.error("Failed to fetch body weight:", err);
      } finally {
        setBwLoading(false);
      }
    }
    fetchBw();
  }, [tab, userId]);

  async function saveBw() {
    const w = parseFloat(bwValue);
    if (!bwDate || isNaN(w) || w <= 0) return;
    setBwSaving(true);
    try {
      const ref = await addDoc(collection(db, "users", userId, "bodyweight"), {
        date: bwDate,
        weight: w,
        createdAt: Timestamp.now().toDate().toISOString(),
      });
      setBwEntries((prev) =>
        [...prev, { id: ref.id, date: bwDate, weight: w }].sort((a, b) => a.date.localeCompare(b.date))
      );
      setBwValue("");
    } catch (err) {
      console.error("Failed to save body weight:", err);
    } finally {
      setBwSaving(false);
    }
  }

  async function deleteBw(id: string) {
    try {
      await deleteDoc(doc(db, "users", userId, "bodyweight", id));
      setBwEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete body weight:", err);
    }
  }

  const exerciseNames = Array.from(
    new Set(workouts.flatMap((w) => w.exercises.map((e) => e.name)))
  ).sort();

  const baseData: ChartPoint[] = workouts
    .filter((w) => w.exercises.some((e) => e.name === selectedExercise))
    .map((w) => {
      const ex = w.exercises.find((e) => e.name === selectedExercise)!;
      const completed = ex.sets.filter((s) => s.completed && s.weight > 0);
      const maxWeight =
        completed.length > 0
          ? Math.max(...completed.map((s) => s.weight))
          : Math.max(...ex.sets.map((s) => s.weight), 0);
      return { date: formatDate(w.date), maxWeight };
    });

  // Detect upward trend on last segment
  const isTrending =
    baseData.length >= 2 &&
    baseData[baseData.length - 1].maxWeight > baseData[baseData.length - 2].maxWeight;

  // Build flame overlay data: only last two points visible, rest undefined
  const chartData: ChartPoint[] = baseData.map((point, i) => ({
    ...point,
    flameWeight:
      i >= baseData.length - 2 && isTrending ? point.maxWeight : undefined,
  }));

  const pr = baseData.length ? Math.max(...baseData.map((d) => d.maxWeight)) : 0;

  const bwChartData: BwChartPoint[] = bwEntries.map((e) => ({
    date: formatDate(e.date),
    weight: e.weight,
  }));
  const bwMin = bwChartData.length ? Math.min(...bwChartData.map((d) => d.weight)) : 0;
  const bwMax = bwChartData.length ? Math.max(...bwChartData.map((d) => d.weight)) : 0;

  return (
    <div className="p-6 pb-8">
      <h2 className="text-3xl font-black neon-text-cyan mb-1 uppercase tracking-widest font-display neon-flicker">
        Stats
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "lifts", label: "Lifts" },
          { key: "1rm", label: "1RM" },
          { key: "bodyweight", label: "Weight" },
          { key: "history", label: "History" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest font-display transition-colors ${
              tab === key
                ? "bg-[#141a29] border border-cyan-700 neon-text-cyan"
                : "border border-purple-900/50 text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── LIFTS TAB ── */}
      {tab === "lifts" && (loading ? (
        <p className="text-gray-400 text-center py-10">Loading workouts...</p>
      ) : workouts.length === 0 ? (
        <p className="text-gray-400 text-center py-10">
          No workouts logged yet. Complete a session to see your progress.
        </p>
      ) : (
        <>
          {/* Exercise selector */}
          <div className="mb-6">
            <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">
              Exercise
            </label>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="bg-[#141a29] border border-purple-900 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-pink-500"
            >
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* PR badge */}
          {pr > 0 && (
            <div className="flex items-center gap-3 bg-[#141a29] border border-pink-900/50 rounded-2xl px-4 py-3 mb-6">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest">Personal Record</p>
                <p className="text-2xl font-black neon-text-pink">{pr} kg</p>
              </div>
              {isTrending && (
                <span className="ml-auto text-xl">🔥</span>
              )}
            </div>
          )}

          {/* Chart */}
          {chartData.length < 2 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              Need at least 2 sessions to show a graph.
            </p>
          ) : (
            <div
              className="border border-cyan-900/40 rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: "#0b0f19",
                backgroundImage: `
                  linear-gradient(rgba(0,255,255,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,255,255,0.04) 1px, transparent 1px)
                `,
                backgroundSize: "36px 36px",
                boxShadow: "0 0 20px rgba(0,255,255,0.08), inset 0 0 40px rgba(0,255,255,0.03)",
              }}
            >
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">
                Max weight (kg)
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glow-flame" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#4b5563", fontSize: 11 }}
                    axisLine={{ stroke: "#1e2435" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#4b5563", fontSize: 11 }}
                    axisLine={{ stroke: "#1e2435" }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {/* Main cyan line */}
                  <Line
                    type="monotone"
                    dataKey="maxWeight"
                    stroke="#00ffff"
                    strokeWidth={2}
                    filter="url(#glow-cyan)"
                    dot={(props) => (
                      <GlowDot
                        key={`dot-${props.index}`}
                        {...props}
                        dataLength={chartData.length}
                        isTrending={isTrending}
                      />
                    )}
                    activeDot={{ fill: "#00ffff", r: 6, strokeWidth: 0, filter: "url(#glow-cyan)" }}
                  />

                  {/* Flame overlay on last upward segment */}
                  {isTrending && (
                    <Line
                      type="monotone"
                      dataKey="flameWeight"
                      stroke="#ff007f"
                      strokeWidth={3}
                      filter="url(#glow-flame)"
                      dot={false}
                      activeDot={false}
                      connectNulls={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="text-gray-600 text-xs text-center mt-4">
            {workouts.length} session{workouts.length !== 1 ? "s" : ""} logged total
          </p>
        </>
      ))}

      {/* ── 1RM TAB ── */}
      {tab === "1rm" && (() => {
        const w = parseFloat(rmWeight);
        const r = parseInt(rmReps);
        const result = !isNaN(w) && !isNaN(r) && w > 0 && r > 0 ? epley(w, r) : null;

        // Build best-set 1RM per exercise from workout history
        const bestSets: Record<string, { weight: number; reps: number; estimated1rm: number }> = {};
        for (const workout of workouts) {
          for (const ex of workout.exercises) {
            for (const s of ex.sets) {
              if (!s.completed || s.weight <= 0 || s.reps <= 0) continue;
              const est = epley(s.weight, s.reps);
              if (!bestSets[ex.name] || est > bestSets[ex.name].estimated1rm) {
                bestSets[ex.name] = { weight: s.weight, reps: s.reps, estimated1rm: est };
              }
            }
          }
        }
        const sorted = Object.entries(bestSets).sort((a, b) => b[1].estimated1rm - a[1].estimated1rm);

        return (
          <div>
            {/* Calculator */}
            <div className="bg-[#141a29] border border-purple-900 rounded-2xl p-4 mb-5">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Epley 1RM Calculator</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-gray-500 text-[10px] uppercase tracking-widest block mb-1">Weight (kg)</label>
                  <input
                    type="number" min={0} step={0.5} placeholder="100"
                    value={rmWeight} onChange={(e) => setRmWeight(e.target.value)}
                    className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white text-sm w-full text-center focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-gray-500 text-[10px] uppercase tracking-widest block mb-1">Reps</label>
                  <input
                    type="number" min={1} max={30} placeholder="5"
                    value={rmReps} onChange={(e) => setRmReps(e.target.value)}
                    className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white text-sm w-full text-center focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
              {result !== null ? (
                <div className="text-center py-3 rounded-xl bg-pink-950/20 border border-pink-900/40">
                  <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Estimated 1RM</p>
                  <p className="font-black font-display neon-text-pink text-4xl tracking-widest" style={{ textShadow: "0 0 20px rgba(255,0,127,0.6)" }}>
                    {result} <span className="text-2xl">kg</span>
                  </p>
                  <p className="text-gray-600 text-[10px] mt-1">weight × (1 + reps/30)</p>
                </div>
              ) : (
                <div className="text-center py-3 rounded-xl bg-[#0b0f19] border border-purple-900/30">
                  <p className="text-gray-600 text-xs">Enter weight and reps above</p>
                </div>
              )}
            </div>

            {/* History from logged workouts */}
            {sorted.length > 0 && (
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3">Estimated 1RM from history</p>
                <div className="space-y-2">
                  {sorted.map(([name, data]) => (
                    <div key={name} className="bg-[#141a29] border border-purple-900 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{data.weight}kg × {data.reps} reps</p>
                      </div>
                      <p className="font-black font-display neon-text-cyan text-xl tracking-widest shrink-0">
                        {data.estimated1rm} kg
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-gray-700 text-[10px] text-center mt-4 uppercase tracking-widest">
                  Based on best completed set per exercise · Epley formula
                </p>
              </div>
            )}
            {sorted.length === 0 && !loading && (
              <p className="text-gray-400 text-sm text-center py-6">No workout history yet.</p>
            )}
          </div>
        );
      })()}

      {/* ── BODY WEIGHT TAB ── */}
      {tab === "bodyweight" && (
        <div>
          {/* Beta / privacy note */}
          <div className="flex gap-2 bg-yellow-950/30 border border-yellow-800/50 rounded-2xl px-4 py-3 mb-5">
            <Scale size={16} className="text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-yellow-300/80 text-xs leading-relaxed">
              <span className="font-bold uppercase tracking-wider">Beta — käytä omalla vastuullasi.</span>{" "}
              Paino on henkilökohtaista tietoa. Tämä tallennetaan vain omaan Firebase-tiliisi.
              Ennen sovelluksen laajempaa julkaisua käyttöehdot ja GDPR-käytännöt tulee tarkistaa.
            </p>
          </div>

          {/* Log form */}
          <div className="bg-[#141a29] border border-purple-900 rounded-2xl p-4 mb-5">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Log weight</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={bwDate}
                onChange={(e) => setBwDate(e.target.value)}
                className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500 flex-1"
              />
              <input
                type="number"
                min={20}
                max={300}
                step={0.1}
                placeholder="kg"
                value={bwValue}
                onChange={(e) => setBwValue(e.target.value)}
                className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500 w-24 text-center"
              />
              <button
                onClick={saveBw}
                disabled={bwSaving || !bwValue || !bwDate}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold uppercase tracking-wider px-4 rounded-xl disabled:opacity-50 shrink-0"
              >
                {bwSaving ? "..." : "Save"}
              </button>
            </div>
          </div>

          {/* Chart */}
          {bwLoading ? (
            <p className="text-gray-400 text-center py-10">Loading...</p>
          ) : bwChartData.length < 2 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              Log at least 2 entries to see your trend.
            </p>
          ) : (
            <>
              {/* Min/max summary */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 bg-[#141a29] border border-purple-900 rounded-2xl px-4 py-3 text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Lowest</p>
                  <p className="text-orange-300 font-black text-xl font-display">{bwMin} kg</p>
                </div>
                <div className="flex-1 bg-[#141a29] border border-purple-900 rounded-2xl px-4 py-3 text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Latest</p>
                  <p className="text-orange-400 font-black text-xl font-display">{bwChartData[bwChartData.length - 1].weight} kg</p>
                </div>
                <div className="flex-1 bg-[#141a29] border border-purple-900 rounded-2xl px-4 py-3 text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Highest</p>
                  <p className="text-orange-300 font-black text-xl font-display">{bwMax} kg</p>
                </div>
              </div>

              <div
                className="border border-orange-900/30 rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: "#0b0f19",
                  backgroundImage: `linear-gradient(rgba(251,146,60,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.04) 1px, transparent 1px)`,
                  backgroundSize: "36px 36px",
                  boxShadow: "0 0 20px rgba(251,146,60,0.06), inset 0 0 40px rgba(251,146,60,0.02)",
                }}
              >
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">Body weight (kg)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={bwChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(251,146,60,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={{ stroke: "#1e2435" }} tickLine={false} />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fill: "#4b5563", fontSize: 11 }}
                      axisLine={{ stroke: "#1e2435" }}
                      tickLine={false}
                    />
                    <Tooltip content={<BwTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#fb923c"
                      strokeWidth={2}
                      filter="url(#glow-orange)"
                      dot={(props) => (
                        <GlowDot key={`bw-dot-${props.index}`} {...props} dataLength={bwChartData.length} isTrending={false} />
                      )}
                      activeDot={{ fill: "#fb923c", r: 6, strokeWidth: 0, filter: "url(#glow-orange)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-gray-600 text-xs text-center mt-4">{bwEntries.length} entr{bwEntries.length !== 1 ? "ies" : "y"} logged</p>
            </>
          )}

          {/* Entry list with delete */}
          {!bwLoading && bwEntries.length > 0 && (
            <div className="mt-5">
              <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-2">All entries</p>
              <div className="space-y-1.5">
                {[...bwEntries].reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between bg-[#141a29] border border-purple-900/50 rounded-xl px-4 py-2.5">
                    <span className="text-gray-400 text-xs">{formatDate(entry.date)}</span>
                    <span className="text-orange-300 font-bold text-sm">{entry.weight} kg</span>
                    <button
                      onClick={() => deleteBw(entry.id)}
                      className="text-gray-600 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (() => {
        if (loading) return <p className="text-gray-400 text-center py-10">Loading...</p>;
        if (workouts.length === 0) return <p className="text-gray-400 text-center py-10">No workouts logged yet.</p>;
        const sorted = [...workouts].reverse();
        return (
          <div className="space-y-2">
            {sorted.map((w) => {
              const isExpanded = expandedWorkoutId === w.id;
              const d = new Date(w.date);
              const dateStr = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
              const completedSets = w.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0);
              const totalSets = w.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
              return (
                <div key={w.id} className="bg-[#141a29] border border-purple-900 rounded-2xl overflow-hidden">
                  <button
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
                    onClick={() => setExpandedWorkoutId(isExpanded ? null : w.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{w.programName}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{dateStr} · {completedSets}/{totalSets} sets</p>
                    </div>
                    <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-purple-900/50 pt-3 space-y-1.5">
                      {w.exercises.map((ex, i) => {
                        const done = ex.sets.filter((s) => s.completed && s.weight > 0);
                        const maxW = done.length ? Math.max(...done.map((s) => s.weight)) : 0;
                        return (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300 truncate flex-1">{ex.name}</span>
                            <span className="text-gray-500 shrink-0 ml-2">
                              {done.length}/{ex.sets.length} sets{maxW > 0 ? ` · ${maxW}kg` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
