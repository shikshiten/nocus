import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, LabelList } from "recharts";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
import { Syllabus } from "../types";

// Custom premium bar tooltip displaying full details
const getBarColor = (percentage: number) => {
  if (percentage < 50) return "#ef4444"; // red
  if (percentage < 100) return "#eab308"; // yellow/amber
  return "#10b981"; // green
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const barColor = getBarColor(data.Percentage);
    const textClass = data.Percentage === 100 
      ? "text-emerald-400 font-bold" 
      : data.Percentage < 50 
        ? "text-rose-400 font-bold" 
        : "text-amber-400 font-bold";

    return (
      <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-xs max-w-xs">
        <p className="font-bold text-slate-100 text-xs leading-snug">{data.fullName}</p>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <p className="font-semibold flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
            <span>Progress:</span>
            <span className={textClass}>
              {data.Percentage}%
            </span>
          </p>
          <span className="text-slate-400 text-[10px] font-mono">
            {data.Completed}/{data.Completed + data.Remaining} topics
          </span>
        </div>
      </div>
    );
  }
  return null;
};

interface ProgressChartsProps {
  syllabus: Syllabus;
}

export default function ProgressCharts({ syllabus }: ProgressChartsProps) {
  if (!syllabus) {
    return null;
  }

  // 1. Calculate Unit-wise Progress
  const unitData = syllabus.units.map((unit, index) => {
    const total = unit.topics.length;
    const completed = unit.topics.filter((t) => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Preferred Approach: Format X-Axis ticks to short prefix (e.g. "Unit 1", "Unit 2")
    // and display full title in the Tooltip.
    let shortName = `Unit ${index + 1}`;
    const prefixMatch = unit.name.match(/^((?:Unit|Module|Chapter|Section|Part)\s*(?:\d+|[IVXLCDM]+))/i);
    if (prefixMatch) {
      shortName = prefixMatch[1];
    } else if (unit.name.includes(":")) {
      const beforeColon = unit.name.split(":")[0].trim();
      if (beforeColon.length <= 12) {
        shortName = beforeColon;
      }
    }

    return {
      name: shortName,
      fullName: unit.name,
      Completed: completed,
      Remaining: total - completed,
      Percentage: percentage,
    };
  });

  // 2. Calculate Weekly Completion Progress (Last 7 Days)
  const getWeeklyData = () => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const weekdayName = d.toLocaleDateString(undefined, { weekday: "short" });
      days.push({
        dateStr,
        dayName: weekdayName,
        count: 0,
      });
    }

    // Scan all topics
    syllabus.units.forEach((unit) => {
      unit.topics.forEach((topic) => {
        if (topic.completed && topic.completedAt) {
          const completionDate = topic.completedAt.split("T")[0];
          const matchedDay = days.find((day) => day.dateStr === completionDate);
          if (matchedDay) {
            matchedDay.count += 1;
          }
        }
      });
    });

    return days.map((day) => ({
      name: day.dayName,
      Completed: day.count,
    }));
  };

  const weeklyData = getWeeklyData();
  const maxWeeklyValue = Math.max(...weeklyData.map((d) => d.Completed), 0);

  // Line dot color system: red for low (< 20% max or standard low count), yellow for medium, green for high.
  const getLineDotColor = (value: number) => {
    if (maxWeeklyValue > 15) {
      if (value < 20) return "#ef4444"; // red
      if (value < 50) return "#eab308"; // yellow
      return "#10b981"; // green
    } else {
      // Dynamic fallback for smaller workloads
      if (value === 0) return "#ef4444";
      if (value < 3) return "#eab308";
      return "#10b981";
    }
  };

  // Custom Line Tooltip
  const CustomLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dotColor = getLineDotColor(data.Completed);
      return (
        <div className="bg-slate-900 border border-slate-800 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-xs">
          <p className="font-bold text-slate-200">{data.name} Activity</p>
          <p className="font-semibold flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
            <span>Completed:</span>
            <span className="text-emerald-400 font-bold">
              {data.Completed} {data.Completed === 1 ? "topic" : "topics"}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Subject-Wise Progress Chart */}
      <div className="bg-surface-app border border-hairline-app p-4 sm:p-5 rounded-[24px] shadow-none chart-container-gpu">
        <h3 className="text-xs font-bold text-ink-app uppercase tracking-widest mb-3.5 font-serif flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary-app" />
          Unit-wise Progress (%)
        </h3>
        <div className="h-64 w-full focus:outline-none select-none border-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={unitData} margin={{ top: 20, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:stroke-white/[0.04]" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: "600" }} 
                height={25}
                interval={0}
              />
              <YAxis 
                domain={[0, 100]} 
                ticks={[0, 20, 40, 60, 80, 100]}
                tick={{ fill: "#94a3b8", fontSize: 11 }} 
                tickFormatter={(val) => `${val}%`}
                padding={{ top: 15, bottom: 0 }}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="Percentage" radius={[6, 6, 0, 0]} barSize={36}>
                {unitData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.Percentage)} 
                  />
                ))}
                <LabelList 
                  dataKey="Percentage" 
                  position="top" 
                  formatter={(val: number) => `${val}%`} 
                  style={{ fill: "#64748b", fontSize: 10, fontWeight: "600" }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="bg-surface-app border border-hairline-app p-4 sm:p-5 rounded-[24px] shadow-none chart-container-gpu">
        <h3 className="text-xs font-bold text-ink-app uppercase tracking-widest mb-3.5 font-serif flex items-center gap-2">
          <LineChartIcon className="w-4 h-4 text-primary-app" />
          Weekly Study Output (Topics Completed)
        </h3>
        <div className="h-64 w-full focus:outline-none select-none border-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData} margin={{ top: 20, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:stroke-white/[0.04]" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip content={<CustomLineTooltip />} cursor={{ fill: "transparent" }} />
              <Line 
                type="monotone" 
                dataKey="Completed" 
                stroke="var(--primary)" 
                strokeWidth={3}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const color = getLineDotColor(payload.Completed);
                  return (
                    <circle
                      key={`dot-${payload.name}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={2}
                      className="transition-all duration-150"
                    />
                  );
                }}
                activeDot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const color = getLineDotColor(payload.Completed);
                  return (
                    <circle
                      key={`active-dot-${payload.name}`}
                      cx={cx}
                      cy={cy}
                      r={7}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={2.5}
                      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
