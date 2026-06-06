import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  id?: string;
  title: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  badgeText?: string;
  badgeType?: "success" | "warning" | "danger" | "info";
}

export function MetricCard({
  id,
  title,
  value,
  subtext,
  icon: Icon,
  badgeText,
  badgeType = "info",
}: MetricCardProps) {
  const getBorderColorClass = () => {
    switch (badgeType) {
      case "success":
        return "border-l-4 border-l-emerald-500";
      case "warning":
        return "border-l-4 border-l-amber-500";
      case "danger":
        return "border-l-4 border-l-rose-500";
      case "info":
      default:
        return "border-l-4 border-l-blue-500";
    }
  };

  const getBadgeStyles = () => {
    switch (badgeType) {
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
      case "danger":
        return "bg-rose-550/10 text-rose-450 border border-rose-550/30";
      case "info":
      default:
        return "bg-slate-900 text-slate-400 border border-slate-700";
    }
  };

  return (
    <div
      id={id || `metric-${title.replace(/\s+/g, "-").toLowerCase()}`}
      className={`p-5 bg-slate-900 border border-slate-800 ${getBorderColorClass()} transition-all hover:border-slate-700 shadow-lg`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-mono">
            {title}
          </p>
          <h3 className="mt-1.5 text-2xl font-mono font-bold text-white tracking-tighter">
            {value}
          </h3>
        </div>
        <div className="p-2 bg-slate-950 text-slate-400 border border-slate-800">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">{subtext}</span>
        {badgeText && (
          <span className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-tight ${getBadgeStyles()}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}
export default MetricCard;
