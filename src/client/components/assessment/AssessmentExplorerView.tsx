"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  Database,
  Cpu,
  ArrowUpDown,
  Radio,
  ArrowRight,
  Info,
  CircleAlert,
  RotateCcw,
} from "lucide-react";
import { ScenarioSelector } from "@/client/components/scenarios/ScenarioSelector";

export interface CleanAssessmentData {
  caseId: string;
  name: string;
  statusText: string;
  statusType: "REVIEW" | "QUARANTINE" | "ACCEPTED";
  overallScore: number;
  metrics: {
    dataset: { score: number; status: "PASS" | "FAIL" | "WARN" };
    model: { score: number; status: "PASS" | "FAIL" | "WARN" };
    inference: { score: number; status: "PASS" | "FAIL" | "WARN" };
    shift: { score: number; status: "PASS" | "FAIL" | "WARN" };
  };
  triggers: Array<{
    id: string;
    event: string;
    module: string;
    confidence: number;
    isCritical: boolean;
  }>;
  recommendation: {
    title: string;
    description: string;
  };
}

const ASSESSMENTS_CATALOG: Record<string, CleanAssessmentData> = {
  "satellite-v2": {
    caseId: "#AS-2026-019",
    name: "Satellite Detector v2",
    statusText: "REVIEW REQUIRED",
    statusType: "REVIEW",
    overallScore: 68,
    metrics: {
      dataset: { score: 82, status: "PASS" },
      model: { score: 54, status: "FAIL" },
      inference: { score: 98, status: "PASS" },
      shift: { score: 71, status: "WARN" },
    },
    triggers: [
      {
        id: "t1",
        event: "Potential trigger behaviour detected in visual feed",
        module: "model.heuristic",
        confidence: 94,
        isCritical: true,
      },
      {
        id: "t2",
        event: "Contributor anomaly: spatial drift out of bounds",
        module: "shift.spatial",
        confidence: 89,
        isCritical: true,
      },
      {
        id: "t3",
        event: "Minor latency variance observed during batch inference",
        module: "infer.latency",
        confidence: 42,
        isCritical: false,
      },
    ],
    recommendation: {
      title: "Review before deployment",
      description:
        "The current model snapshot (#AS-2026-019) exhibits highly correlative failure modes in target detection. Automatic promotion to staging is blocked.",
    },
  },
  "urban-seg": {
    caseId: "#AS-2026-014",
    name: "Urban Segmentation Model",
    statusText: "QUARANTINE RECOMMENDED",
    statusType: "QUARANTINE",
    overallScore: 34,
    metrics: {
      dataset: { score: 45, status: "FAIL" },
      model: { score: 32, status: "FAIL" },
      inference: { score: 78, status: "WARN" },
      shift: { score: 29, status: "FAIL" },
    },
    triggers: [
      {
        id: "u1",
        event: "Severe spectral distribution shift across test tiles",
        module: "shift.spectral",
        confidence: 97,
        isCritical: true,
      },
      {
        id: "u2",
        event: "Backdoor Trojan pattern detected in convolutional filters",
        module: "model.trojan",
        confidence: 91,
        isCritical: true,
      },
    ],
    recommendation: {
      title: "Quarantine model immediately",
      description:
        "Severe vulnerability indicators present. Retraining with clean contributor partitions required.",
    },
  },
};

interface AssessmentExplorerViewProps {
  activeAssessmentId?: string;
  onInvestigate: () => void;
  activeScenario: string;
  loading: boolean;
  onSelectScenario: (scenarioId: string) => void;
}

export const AssessmentExplorerView: React.FC<AssessmentExplorerViewProps> = ({
  activeAssessmentId = "satellite-v2",
  onInvestigate,
  activeScenario,
  loading,
  onSelectScenario,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>(activeAssessmentId);
  const [showLogs, setShowLogs] = useState(false);

  const assessment = ASSESSMENTS_CATALOG[selectedKey] || ASSESSMENTS_CATALOG["satellite-v2"];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Assessment Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
              Case ID {assessment.caseId}
            </span>
            <span
              className={clsx(
                "font-mono text-xs px-2.5 py-0.5 rounded font-bold border flex items-center gap-1",
                assessment.statusType === "REVIEW"
                  ? "bg-rose-50 border-rose-300 text-rose-600"
                  : assessment.statusType === "QUARANTINE"
                    ? "bg-rose-100 border-rose-400 text-rose-700"
                    : "bg-emerald-50 border-emerald-300 text-emerald-600"
              )}
            >
              <CircleAlert className="h-3 w-3 inline" />
              {assessment.statusText}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2">
            {assessment.name}
          </h1>
        </div>

        {/* Overall Assurance Card */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-5 py-3 shadow-xs flex items-center justify-between sm:justify-end gap-5">
          <div className="text-left sm:text-right">
            <div className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Overall Assurance
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Confidence Level
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-[#e11d48] tracking-tight font-sans">
              {assessment.overallScore}
            </span>
            <span className="text-xs font-mono text-slate-400 ml-1">/100</span>
          </div>
        </div>
      </div>

      {/* 4 Domain Metric Cards (Bento row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DATASET */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col justify-between h-28 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-600 tracking-wider">
              DATASET
            </span>
            <Database className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {assessment.metrics.dataset.score}
            </span>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-sky-300 text-sky-600 bg-sky-50/30">
              {assessment.metrics.dataset.status}
            </span>
          </div>
        </div>

        {/* MODEL (Fail card with soft rose background) */}
        <div className="bg-rose-50/40 border border-rose-200/90 rounded-xl p-4 shadow-xs flex flex-col justify-between h-28 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-rose-700 tracking-wider">
              MODEL
            </span>
            <Radio className="h-4 w-4 text-rose-600" />
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-rose-600 tracking-tight">
              {assessment.metrics.model.score}
            </span>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-rose-300 text-rose-600 bg-rose-100/60">
              {assessment.metrics.model.status}
            </span>
          </div>
        </div>

        {/* INFERENCE */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col justify-between h-28 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-600 tracking-wider">
              INFERENCE
            </span>
            <Cpu className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {assessment.metrics.inference.score}
            </span>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-sky-300 text-sky-600 bg-sky-50/30">
              {assessment.metrics.inference.status}
            </span>
          </div>
        </div>

        {/* SHIFT */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col justify-between h-28 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-600 tracking-wider">
              SHIFT
            </span>
            <ArrowUpDown className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {assessment.metrics.shift.score}
            </span>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300 text-amber-700 bg-amber-50/30">
              {assessment.metrics.shift.status}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section (Triggers & Recommended Action) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: High Confidence Triggers Table */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-mono text-xs font-bold text-slate-700 uppercase tracking-wide">
              WHY? - HIGH CONFIDENCE TRIGGERS
            </h2>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="font-mono text-xs text-sky-600 hover:text-sky-700 underline transition-colors cursor-pointer"
            >
              {showLogs ? "Hide Logs" : "View Raw Logs"}
            </button>
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5">TRIGGER EVENT</th>
                  <th className="py-2.5">MODULE</th>
                  <th className="py-2.5 text-right">CONFIDENCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessment.triggers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        {item.isCritical ? (
                          <span className="h-3 w-3 rounded-full border-2 border-rose-500 shrink-0" />
                        ) : (
                          <Info className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                        )}
                        <span className="text-slate-800 font-medium text-xs">
                          {item.event}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-slate-600 text-xs">
                      {item.module}
                    </td>
                    <td
                      className={clsx(
                        "py-3.5 text-right font-mono text-xs font-bold",
                        item.isCritical ? "text-[#e11d48]" : "text-slate-600"
                      )}
                    >
                      {item.confidence}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showLogs && (
            <div className="mt-4 p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto">
              <div>[2026-09-02T15:20:01Z] [model.heuristic] Neural Cleanse pattern detected at layer conv4_block3_out: delta_norm=0.28.</div>
              <div>[2026-09-02T15:20:03Z] [shift.spatial] Contributor user_128 geographic cluster density=0.89 deviation.</div>
            </div>
          )}
        </div>

        {/* Right: Recommended Action Card */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 border-t-2 border-t-rose-600 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="font-mono text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>!</span>
              <span>RECOMMENDED ACTION</span>
            </div>

            <h3 className="font-bold text-base text-slate-900 mt-2">
              {assessment.recommendation.title}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              {assessment.recommendation.description}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={onInvestigate}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-black hover:bg-slate-800 text-white font-mono font-bold text-xs py-3 px-4 uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              <span>INVESTIGATE</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedKey(selectedKey === "satellite-v2" ? "urban-seg" : "satellite-v2")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono text-xs py-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Switch Case</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Matrix & Vector Replay */}
      <div className="pt-4 border-t border-slate-200/80">
        <ScenarioSelector
          activeScenario={activeScenario}
          loading={loading}
          onSelectScenario={onSelectScenario}
        />
      </div>
    </div>
  );
};
