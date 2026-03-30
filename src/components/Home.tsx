import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { MUSCLE_ICONS } from "../lib/muscleIcons";

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

export default function Home({ userId, userName }: HomeProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const firstName = userName?.split(" ")[0] || "Warrior";

  useEffect(() => {
    async function loadPrograms() {
      const cacheKey = `programs_${userId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          setPrograms(JSON.parse(cached));
          setLoading(false);
          return;
        } catch {
          // fall through to Firestore
        }
      }
      try {
        const snap = await getDocs(collection(db, `users/${userId}/programs`));
        const data: Program[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Program, "id">),
        }));
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        setPrograms(data);
      } catch (err) {
        console.error("Failed to load programs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrograms();
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
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0b0f19] to-transparent" />
        {/* Title overlay at bottom of image */}
        <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center">
          <h1 className="text-2xl font-black neon-text-pink uppercase tracking-widest text-center font-display neon-flicker">
            SUPERGAINZ
          </h1>
          <p className="text-gray-400 text-xs text-center">
            Hi {firstName} — pick a program and start your session.
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 w-full">

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
                className="bg-[#141a29] border border-purple-900 rounded-2xl p-4 flex items-center justify-between gap-3"
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
      </div>
    </div>
  );
}
