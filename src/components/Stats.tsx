import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
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

export default function Stats({ userId }: StatsProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  useEffect(() => {
    async function fetchWorkouts() {
      try {
        const q = query(
          collection(db, "users", userId, "workouts"),
          orderBy("date", "asc")
        );
        const snap = await getDocs(q);
        const data: Workout[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Workout, "id">),
        }));
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

  return (
    <div className="p-6 pb-8">
      <h2 className="text-3xl font-black neon-text-cyan mb-1 uppercase tracking-widest font-display neon-flicker">
        Stats
      </h2>
      <p className="text-gray-400 text-sm mb-6">Track your progress over time.</p>

      {loading ? (
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
      )}
    </div>
  );
}
