"use client";

import React from "react";
import {
  Filter,
  ArrowUpDown,
  ArrowRight,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";

interface AssessmentPrioritizedFindingsViewProps {
  onInvestigateFinding?: (findingId: string) => void;
}

export const AssessmentPrioritizedFindingsView: React.FC<
  AssessmentPrioritizedFindingsViewProps
> = ({ onInvestigateFinding }) => {
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
              Filtered View
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
        {/* Card 1: F-001 (Critical) */}
        <div className="border border-rose-300 border-l-4 border-l-rose-600 rounded-xl bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-rose-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>F-001</span>
              </div>
              <span className="bg-[#e11d48] text-white font-mono text-xs font-bold px-2 py-0.5 rounded uppercase">
                CRITICAL
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Potential Trigger
            </h2>

            {/* Confidence Score Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-slate-500">Confidence Score</span>
                <span className="font-bold text-slate-900">94%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#e11d48] h-1.5 rounded-full" style={{ width: "94%" }} />
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans pt-1">
              Anomaly detected in primary identification layer. High probability of
              false positive gating condition. Requires immediate manual
              verification of frame sequence.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between font-mono text-xs">
            <div className="text-slate-500">
              <span className="text-slate-400 block text-[10px]">Layer:</span>
              <span className="text-slate-700 font-medium">Trigger_Module_v2</span>
            </div>
            <button
              onClick={() => onInvestigateFinding && onInvestigateFinding("F-001")}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <span>Investigate</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Card 2: F-002 (High) */}
        <div className="border border-slate-200/90 rounded-xl bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>F-002</span>
              </div>
              <span className="bg-sky-100 border border-sky-300 text-sky-800 font-mono text-xs font-bold px-2 py-0.5 rounded uppercase">
                HIGH
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Covariate Shift
            </h2>

            {/* Confidence Score Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-slate-500">Confidence Score</span>
                <span className="font-bold text-slate-900">88%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-sky-600 h-1.5 rounded-full" style={{ width: "88%" }} />
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans pt-1">
              Significant drift in input distribution detected compared to training
              baseline. Lighting condition variation suspected.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between font-mono text-xs">
            <div className="text-slate-500">
              <span className="text-slate-400 block text-[10px]">Layer:</span>
              <span className="text-slate-700 font-medium">Preprocessing</span>
            </div>
            <button
              onClick={() => onInvestigateFinding && onInvestigateFinding("F-002")}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <span>Investigate</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Card 3: F-003 (Medium) */}
        <div className="border border-slate-200/90 rounded-xl bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>F-003</span>
              </div>
              <span className="bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-bold px-2 py-0.5 rounded uppercase">
                MEDIUM
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Latency Spikes
            </h2>

            {/* Confidence Score Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-slate-500">Confidence Score</span>
                <span className="font-bold text-slate-900">72%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: "72%" }} />
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans pt-1">
              Processing time per frame exceeded 15ms threshold intermittently
              during complex object occlusion events.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between font-mono text-xs">
            <div className="text-slate-500">
              <span className="text-slate-400 block text-[10px]">Layer:</span>
              <span className="text-slate-700 font-medium">Inference_Engine</span>
            </div>
            <button
              onClick={() => onInvestigateFinding && onInvestigateFinding("F-003")}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <span>Investigate</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
