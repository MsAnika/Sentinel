"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  Download,
  Plus,
  Filter,
  Ban,
  Eye,
  CheckCircle2,
  Cpu,
  Shield,
  Activity,
} from "lucide-react";
import { FindingSchema } from "@/shared/types/assurance";

interface FindingItem {
  id: string;
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  affectedAsset: string;
  category: string;
  confidence: number;
  recommendedDisposition: {
    label: string;
    actionType: "QUARANTINE" | "REVIEW" | "ACCEPT";
  };
}

interface FindingsQueueViewProps {
  findings?: FindingSchema[];
  onSelectFinding?: (findingId: string) => void;
  onNewManualEntry?: () => void;
}

export const FindingsQueueView: React.FC<FindingsQueueViewProps> = ({
  findings,
  onSelectFinding,
  onNewManualEntry,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const rawList: FindingItem[] = (findings || []).map((f, idx) => {
    // Real finding_type values are lowercase snake_case (e.g.
    // "backdoor_trojan_detected", "trigger_injection", "ood_insertion") --
    // normalize case before matching so this classification actually fires.
    const type = f.finding_type.toLowerCase();
    return {
      id: f.finding_id || `f-${idx + 1}`,
      code: f.finding_id || `F-${String(idx + 1).padStart(3, "0")}`,
      severity: f.severity,
      title: f.finding_type,
      description: f.reason,
      affectedAsset: `${f.asset_type}: ${f.asset}`,
      category:
        type.includes("backdoor") || type.includes("trojan") || type.includes("trigger") || type.includes("poison")
          ? "Security / Evasion"
          : type.includes("drift") || type.includes("shift") || type.includes("covariate") || type.startsWith("ood_")
            ? "Data Drift"
            : "Data / Model Integrity",
      confidence: Math.round(f.confidence > 1 ? f.confidence : f.confidence * 100),
      recommendedDisposition: {
        label: f.recommended_action,
        actionType: f.recommended_action,
      },
    };
  });

  const filteredFindings = rawList.filter((f) => {
    if (selectedSeverity !== "ALL" && f.severity !== selectedSeverity) {
      return false;
    }
    if (selectedCategory !== "ALL") {
      if (selectedCategory === "EVASION" && !f.category.includes("Security")) return false;
      if (selectedCategory === "DRIFT" && !f.category.includes("Drift")) return false;
      if (selectedCategory === "INTEGRITY" && !f.category.includes("Integrity")) return false;
    }
    return true;
  });

  const criticalCount = rawList.filter((f) => f.severity === "CRITICAL").length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Findings Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
            <Filter className="h-3 w-3 text-sky-500" />
            <span>Displaying {filteredFindings.length} active anomalies requiring disposition.</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(rawList, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "findings_export.json";
              a.click();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>
          <button
            onClick={onNewManualEntry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase text-[10px]">
              SEVERITY:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedSeverity(selectedSeverity === "CRITICAL" ? "ALL" : "CRITICAL")}
                className={clsx(
                  "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer text-xs",
                  selectedSeverity === "CRITICAL"
                    ? "bg-rose-50 border border-rose-300 text-rose-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Critical ({criticalCount})
              </button>
              <button
                onClick={() => setSelectedSeverity(selectedSeverity === "HIGH" ? "ALL" : "HIGH")}
                className={clsx(
                  "px-2.5 py-1 rounded transition-colors cursor-pointer text-xs",
                  selectedSeverity === "HIGH"
                    ? "bg-slate-100 border border-slate-300 text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                High
              </button>
              <button
                onClick={() => setSelectedSeverity(selectedSeverity === "MEDIUM" ? "ALL" : "MEDIUM")}
                className={clsx(
                  "px-2.5 py-1 rounded transition-colors cursor-pointer text-xs",
                  selectedSeverity === "MEDIUM"
                    ? "bg-slate-100 border border-slate-300 text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Medium
              </button>
              <button
                onClick={() => setSelectedSeverity(selectedSeverity === "LOW" ? "ALL" : "LOW")}
                className={clsx(
                  "px-2.5 py-1 rounded transition-colors cursor-pointer text-xs",
                  selectedSeverity === "LOW"
                    ? "bg-slate-100 border border-slate-300 text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Low
              </button>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px]">
              CATEGORY:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Categories</option>
              <option value="EVASION">Security / Evasion</option>
              <option value="DRIFT">Data Drift</option>
              <option value="INTEGRITY">Data / Model Integrity</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedSeverity("ALL");
            setSelectedCategory("ALL");
          }}
          className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
        >
          Clear Filters
        </button>
      </div>

      {/* Findings Cards List */}
      <div className="space-y-4">
        {filteredFindings.map((f) => (
          <div
            key={f.id}
            onClick={() => onSelectFinding && onSelectFinding(f.id)}
            className={clsx(
              "rounded-xl bg-white p-5 shadow-xs transition-all hover:shadow-sm cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-5 items-start",
              f.severity === "CRITICAL"
                ? "border border-rose-300 border-l-4 border-l-rose-600"
                : f.severity === "HIGH"
                  ? "border border-slate-200/90 border-l-4 border-l-[#881337]"
                  : "border border-slate-200/90 border-l-4 border-l-amber-400"
            )}
          >
            {/* Left Main Content */}
            <div className="lg:col-span-8 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "font-mono text-[10px] font-bold px-2 py-0.5 rounded text-white",
                      f.severity === "CRITICAL"
                        ? "bg-[#e11d48]"
                        : f.severity === "HIGH"
                          ? "bg-[#881337]"
                          : "bg-slate-400"
                    )}
                  >
                    ⚠ {f.severity}
                  </span>
                  <span className="font-mono text-xs text-slate-700 font-bold">
                    {f.code}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 tracking-tight mt-1">
                {f.title}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                {f.description}
              </p>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs font-mono text-slate-500">
                <div>
                  <span className="text-slate-400">AFFECTED ASSET: </span>
                  <strong className="text-slate-800">{f.affectedAsset}</strong>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">CATEGORY: </span>
                  {f.category.includes("Security") ? (
                    <Shield className="h-3.5 w-3.5 text-rose-500 inline" />
                  ) : f.category.includes("Drift") ? (
                    <Activity className="h-3.5 w-3.5 text-sky-500 inline" />
                  ) : (
                    <Cpu className="h-3.5 w-3.5 text-amber-500 inline" />
                  )}
                  <span className="text-slate-800 font-medium">
                    {f.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Action / Disposition Column */}
            <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-5 flex flex-col justify-between h-full space-y-4 font-mono">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  <span>DETECTION CONFIDENCE</span>
                  <span className="text-slate-900 font-mono text-xs font-bold">
                    {f.confidence}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      "h-2 rounded-full transition-all",
                      f.severity === "CRITICAL"
                        ? "bg-[#e11d48]"
                        : f.severity === "HIGH"
                          ? "bg-sky-600"
                          : "bg-slate-400"
                    )}
                    style={{ width: `${f.confidence}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  REC. DISPOSITION
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectFinding) onSelectFinding(f.id);
                  }}
                  className={clsx(
                    "w-full py-2 px-3 rounded-md border text-xs font-mono font-bold uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                    f.recommendedDisposition.actionType === "QUARANTINE"
                      ? "border-rose-300 text-rose-600 bg-rose-50/50 hover:bg-rose-100/70"
                      : f.recommendedDisposition.actionType === "REVIEW"
                        ? "border-sky-300 text-sky-700 bg-sky-50/50 hover:bg-sky-100/70"
                        : "border-slate-300 text-slate-700 bg-slate-50/50 hover:bg-slate-100/70"
                  )}
                >
                  {f.recommendedDisposition.actionType === "QUARANTINE" ? (
                    <Ban className="h-3.5 w-3.5" />
                  ) : f.recommendedDisposition.actionType === "REVIEW" ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>{f.recommendedDisposition.label}</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredFindings.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-bold text-slate-700">
              {rawList.length === 0 ? "No findings on the current assessment." : "No findings match the selected filters."}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {rawList.length === 0
                ? "Run or load an assessment to populate the findings queue."
                : "Clear filters to see all findings."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
