"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  Download,
  Plus,
  Filter,
  Ban,
  Sliders,
  BarChart2,
  Cpu,
  Shield,
  Activity,
} from "lucide-react";

interface FindingItem {
  id: string;
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "INVESTIGATED" | "RESOLVED";
  timeAgo: string;
  title: string;
  description: string;
  affectedAsset: string;
  category: string;
  confidence: number;
  recommendedDisposition: {
    label: string;
    actionType: "QUARANTINE" | "RECALIBRATE" | "MONITOR";
  };
}

const DEFAULT_FINDINGS: FindingItem[] = [
  {
    id: "f-001",
    code: "F-001",
    severity: "CRITICAL",
    status: "OPEN",
    timeAgo: "2 mins ago",
    title: "Potential Adversarial Perturbation",
    description:
      "Structured noise pattern detected in input tensor bounding boxes, suggesting active evasion attempt.",
    affectedAsset: "Model: YOLOv8-Core-v2.1",
    category: "Security / Evasion",
    confidence: 94,
    recommendedDisposition: {
      label: "QUARANTINE",
      actionType: "QUARANTINE",
    },
  },
  {
    id: "f-002",
    code: "F-002",
    severity: "HIGH",
    status: "INVESTIGATED",
    timeAgo: "45 mins ago",
    title: "Severe Covariate Shift",
    description:
      "Distribution of lighting conditions in input stream deviates significantly from training baseline (KL Divergence > 0.8).",
    affectedAsset: "Stream: Cam-West-04",
    category: "Data Drift",
    confidence: 88,
    recommendedDisposition: {
      label: "RECALIBRATE",
      actionType: "RECALIBRATE",
    },
  },
  {
    id: "f-003",
    code: "F-003",
    severity: "MEDIUM",
    status: "OPEN",
    timeAgo: "2 hrs ago",
    title: "Elevated Inference Latency",
    description:
      "P99 latency spiked to 450ms (threshold 300ms) over a 5-minute window.",
    affectedAsset: "Node: GPU-Cluster-A",
    category: "Infrastructure",
    confidence: 99,
    recommendedDisposition: {
      label: "MONITOR",
      actionType: "MONITOR",
    },
  },
];

interface FindingsQueueViewProps {
  onSelectFinding?: (findingId: string) => void;
}

export const FindingsQueueView: React.FC<FindingsQueueViewProps> = ({
  onSelectFinding,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>("CRITICAL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

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
            <span>Displaying 43 active anomalies requiring disposition.</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-medium transition-colors shadow-2xs cursor-pointer">
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer">
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
                onClick={() => setSelectedSeverity("CRITICAL")}
                className={clsx(
                  "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer text-xs",
                  selectedSeverity === "CRITICAL"
                    ? "bg-rose-50 border border-rose-300 text-rose-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Critical (12)
              </button>
              <button
                onClick={() => setSelectedSeverity("HIGH")}
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
                onClick={() => setSelectedSeverity("MEDIUM")}
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
                onClick={() => setSelectedSeverity("LOW")}
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
              <option value="INFRA">Infrastructure</option>
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
        {DEFAULT_FINDINGS.map((f) => (
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
                  <span
                    className={clsx(
                      "font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                      f.status === "INVESTIGATED"
                        ? "bg-sky-50 border border-sky-300 text-sky-700"
                        : "bg-slate-100 border border-slate-200 text-slate-600"
                    )}
                  >
                    {f.status}
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {f.timeAgo}
                </span>
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
                  className={clsx(
                    "w-full py-2 px-3 rounded-md border text-xs font-mono font-bold uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                    f.recommendedDisposition.actionType === "QUARANTINE"
                      ? "border-rose-300 text-rose-600 bg-rose-50/50 hover:bg-rose-100/70"
                      : f.recommendedDisposition.actionType === "RECALIBRATE"
                        ? "border-sky-300 text-sky-700 bg-sky-50/50 hover:bg-sky-100/70"
                        : "border-slate-300 text-slate-700 bg-slate-50/50 hover:bg-slate-100/70"
                  )}
                >
                  {f.recommendedDisposition.actionType === "QUARANTINE" ? (
                    <Ban className="h-3.5 w-3.5" />
                  ) : f.recommendedDisposition.actionType === "RECALIBRATE" ? (
                    <Sliders className="h-3.5 w-3.5" />
                  ) : (
                    <BarChart2 className="h-3.5 w-3.5" />
                  )}
                  <span>{f.recommendedDisposition.label}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
