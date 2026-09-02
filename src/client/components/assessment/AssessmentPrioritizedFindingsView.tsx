"use client";

import React from "react";
import clsx from "clsx";
import {
  Filter,
  ArrowUpDown,
  ArrowRight,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";
import { FindingSchema } from "@/shared/types/assurance";

interface AssessmentPrioritizedFindingsViewProps {
  findings?: FindingSchema[];
  onInvestigateFinding?: (findingId: string) => void;
}

export const AssessmentPrioritizedFindingsView: React.FC<
  AssessmentPrioritizedFindingsViewProps
> = ({ findings, onInvestigateFinding }) => {
  const displayFindings =
    findings && findings.length > 0
      ? findings.map((f, i) => ({
          id: f.finding_id || `F-00${i + 1}`,
          code: f.finding_id || `F-00${i + 1}`,
          severity: f.severity,
          title: f.reason || f.finding_type,
          description: f.description || `Integrity deviation identified in ${f.component_layer || f.finding_type}`,
          confidence: Math.round((f.confidence > 1 ? f.confidence : f.confidence * 100)),
          layer: f.component_layer || "Vision_Core",
        }))
      : [
          {
            id: "F-001",
            code: "F-001",
            severity: "CRITICAL" as const,
            title: "Potential Trigger",
            description:
              "Anomaly detected in primary identification layer. High probability of false positive gating condition. Requires immediate manual verification of frame sequence.",
            confidence: 94,
            layer: "Trigger_Module_v2",
          },
          {
            id: "F-002",
            code: "F-002",
            severity: "HIGH" as const,
            title: "Covariate Shift",
            description:
              "Significant drift in input distribution detected compared to training baseline. Lighting condition variation suspected.",
            confidence: 88,
            layer: "Preprocessing",
          },
          {
            id: "F-003",
            code: "F-003",
            severity: "MEDIUM" as const,
            title: "Latency Spikes",
            description:
              "Processing time per frame exceeded 15ms threshold intermittently during complex object occlusion events.",
            confidence: 72,
            layer: "Inference_Engine",
          },
        ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
              AS-2026-019
            </span>
            <span className="font-mono text-xs text-slate-500 font-medium">
              Filtered View ({displayFindings.length} findings)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Prioritized Findings
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-medium transition-colors shadow-2xs cursor-pointer">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-medium transition-colors shadow-2xs cursor-pointer">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
            <span>Sort: Severity</span>
          </button>
        </div>
      </div>

      {/* 3 Column Findings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {displayFindings.slice(0, 6).map((f) => {
          const isCritical = f.severity === "CRITICAL";
          const isHigh = f.severity === "HIGH";

          return (
            <div
              key={f.id}
              className={clsx(
                "border rounded-xl bg-white p-5 shadow-xs flex flex-col justify-between space-y-4",
                isCritical
                  ? "border-rose-300 border-l-4 border-l-rose-600"
                  : isHigh
                    ? "border-slate-200/90 border-l-4 border-l-sky-600"
                    : "border-slate-200/90"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700">
                    {isCritical ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    ) : isHigh ? (
                      <Layers className="h-3.5 w-3.5 text-sky-600" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <span className={clsx(isCritical && "text-rose-600")}>
                      {f.code}
                    </span>
                  </div>
                  <span
                    className={clsx(
                      "font-mono text-xs font-bold px-2 py-0.5 rounded uppercase",
                      isCritical
                        ? "bg-[#e11d48] text-white"
                        : isHigh
                          ? "bg-sky-100 border border-sky-300 text-sky-800"
                          : "bg-slate-100 border border-slate-200 text-slate-700"
                    )}
                  >
                    {f.severity}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {f.title}
                </h2>

                {/* Confidence Score Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-slate-500">Confidence Score</span>
                    <span className="font-bold text-slate-900">
                      {f.confidence}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-1.5 rounded-full",
                        isCritical
                          ? "bg-[#e11d48]"
                          : isHigh
                            ? "bg-sky-600"
                            : "bg-slate-500"
                      )}
                      style={{ width: `${f.confidence}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-sans pt-1">
                  {f.description}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between font-mono text-xs">
                <div className="text-slate-500">
                  <span className="text-slate-400 block text-[10px]">Layer:</span>
                  <span className="text-slate-700 font-medium">{f.layer}</span>
                </div>
                <button
                  onClick={() =>
                    onInvestigateFinding && onInvestigateFinding(f.id)
                  }
                  className={clsx(
                    "flex items-center gap-1 px-3.5 py-1.5 rounded-md font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer",
                    isCritical
                      ? "bg-black hover:bg-slate-800 text-white"
                      : "border border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
                  )}
                >
                  <span>Investigate</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
