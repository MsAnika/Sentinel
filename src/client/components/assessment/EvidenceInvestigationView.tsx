"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft,
  Lock,
  Search,
  Maximize2,
  FileSpreadsheet,
  User,
  Activity,
  Check,
} from "lucide-react";

interface EvidenceInvestigationViewProps {
  onBack: () => void;
  onDecisionChange?: (decision: "ACCEPT" | "REVIEW" | "QUARANTINE") => void;
}

export const EvidenceInvestigationView: React.FC<
  EvidenceInvestigationViewProps
> = ({ onBack, onDecisionChange }) => {
  const [selectedDecision, setSelectedDecision] = useState<
    "ACCEPT" | "REVIEW" | "QUARANTINE"
  >("QUARANTINE");
  const [decisionConfirmed, setDecisionConfirmed] = useState(false);

  const handleDecision = (d: "ACCEPT" | "REVIEW" | "QUARANTINE") => {
    setSelectedDecision(d);
    if (onDecisionChange) onDecisionChange(d);
  };

  return (
    <div className="space-y-5 pb-12 font-sans">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
        <button
          onClick={onBack}
          className="hover:text-slate-900 transition-colors cursor-pointer"
        >
          Assessment
        </button>
        <span>&gt;</span>
        <button
          onClick={onBack}
          className="hover:text-slate-900 transition-colors cursor-pointer"
        >
          Findings
        </button>
        <span>&gt;</span>
        <span className="text-slate-700 font-bold">F-001</span>
        <span>&gt;</span>
        <span className="text-slate-900 font-bold">Evidence</span>
      </div>

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 font-bold text-slate-900 hover:text-sky-600 text-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
            <span>F-001</span>
          </button>

          <span className="bg-rose-50 border border-rose-300 text-rose-600 font-mono text-xs px-2.5 py-0.5 rounded font-bold">
            ⚠ HIGH
          </span>

          <span className="bg-sky-50 border border-sky-300 text-sky-700 font-mono text-xs px-2.5 py-0.5 rounded font-bold">
            94% CONFIDENCE
          </span>

          <span className="bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs px-2.5 py-0.5 rounded font-medium flex items-center gap-1">
            <Lock className="h-3 w-3 text-slate-500" />
            <span>PROVENANCE VERIFIED</span>
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-slate-500">
          <span>
            Model: <strong className="text-slate-800">YOLOv8-Core</strong>
          </span>
          <span>•</span>
          <span>
            Dataset: <strong className="text-slate-800">Urban-Set-B</strong>
          </span>
        </div>
      </div>

      {/* Two Main Columns (Bento Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Finding Details */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between min-h-[460px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                FINDING DETAILS
              </span>
              <span className="font-mono text-xs text-slate-400">0xAFF2</span>
            </div>

            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Potential trigger behaviour
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed">
              The vision model exhibits a localized activation spike when processing
              specifically patterned geometric noise superimposed on regulatory
              signage. This behavior suggests a vulnerability to adversarial patch
              attacks, leading to misclassification of critical navigational
              elements.
            </p>
          </div>

          {/* Structured Metadata Rows */}
          <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Trigger Type</span>
              <span className="text-slate-800 font-bold">Geometric Overlay</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Target Class</span>
              <span className="text-slate-800 font-bold">Stop Sign (ID:14)</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Misclassification</span>
              <span className="text-sky-600 font-bold">Speed Limit 60</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 font-medium uppercase text-[11px]">
                RECOMMENDED DISPOSITION
              </span>
              <span className="bg-rose-50 border border-rose-200 text-rose-600 font-bold px-2 py-0.5 rounded text-[11px]">
                QUARANTINE
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Evidence Comparison */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
              EVIDENCE COMPARISON
            </span>
            <div className="flex items-center gap-2 text-slate-400">
              <button
                className="p-1 hover:text-slate-700 transition-colors cursor-pointer"
                title="Search Evidence"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <button
                className="p-1 hover:text-slate-700 transition-colors cursor-pointer"
                title="Expand View"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Visual Images Comparison Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Original Base Image */}
            <div className="rounded-lg border border-slate-200 bg-slate-900 p-2 text-white relative overflow-hidden h-44 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 z-10">
                <span className="bg-slate-800/80 px-1.5 py-0.5 rounded">
                  ORIGINAL IMAGE
                </span>
                <span className="text-slate-400">Base.jpg</span>
              </div>

              {/* Graphical Simulation of Traffic Scene */}
              <div className="absolute inset-0 flex items-center justify-center opacity-85 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 200 120">
                  <rect width="200" height="120" fill="#0f172a" />
                  <line x1="0" y1="60" x2="200" y2="60" stroke="#334155" strokeWidth="20" />
                  <line x1="100" y1="0" x2="100" y2="120" stroke="#334155" strokeWidth="20" />
                  <line x1="0" y1="60" x2="200" y2="60" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4" />
                  <circle cx="100" cy="60" r="16" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="130" cy="45" r="8" fill="#e11d48" opacity="0.9" />
                  <text x="130" y="48" fontSize="6" fill="#fff" textAnchor="middle" fontWeight="bold">STOP</text>
                  <circle cx="130" cy="45" r="12" fill="none" stroke="#e11d48" strokeWidth="1" strokeDasharray="2" />
                </svg>
              </div>

              <div className="text-[10px] font-mono text-slate-400 z-10 bg-slate-950/70 px-2 py-0.5 rounded w-fit">
                Ground Truth: Stop Sign
              </div>
            </div>

            {/* Suspicious Modified Input */}
            <div className="rounded-lg border border-rose-300 bg-slate-950 p-2 text-white relative overflow-hidden h-44 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono z-10">
                <span className="bg-rose-950 text-rose-300 border border-rose-700/60 px-1.5 py-0.5 rounded font-bold">
                  ⚠ SUSPICIOUS INPUT
                </span>
                <span className="text-rose-400">Modified.jpg</span>
              </div>

              {/* Graphical Simulation with Perturbation */}
              <div className="absolute inset-0 flex items-center justify-center opacity-85 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 200 120">
                  <rect width="200" height="120" fill="#0b1120" />
                  <line x1="0" y1="60" x2="200" y2="60" stroke="#1e293b" strokeWidth="20" />
                  <line x1="100" y1="0" x2="100" y2="120" stroke="#1e293b" strokeWidth="20" />
                  {/* Perturbation noise grid */}
                  <pattern id="noise" width="4" height="4" patternUnits="userSpaceOnUse">
                    <rect width="2" height="2" fill="#38bdf8" opacity="0.5" />
                    <rect x="2" y="2" width="2" height="2" fill="#e11d48" opacity="0.6" />
                  </pattern>
                  <circle cx="130" cy="45" r="14" fill="url(#noise)" stroke="#e11d48" strokeWidth="1.5" />
                  <text x="130" y="48" fontSize="6" fill="#38bdf8" textAnchor="middle" fontWeight="bold">60</text>
                  {/* Telemetry overlay box */}
                  <rect x="15" y="65" width="80" height="45" fill="#000000" opacity="0.75" rx="3" stroke="#334155" />
                  <text x="20" y="77" fontSize="5" fill="#94a3b8" fontFamily="monospace">SHA-256: 0f5e...c33b</text>
                  <text x="20" y="86" fontSize="5" fill="#94a3b8" fontFamily="monospace">SIGNER: --</text>
                  <text x="20" y="95" fontSize="5" fill="#94a3b8" fontFamily="monospace">GID: VAL33</text>
                  <text x="20" y="104" fontSize="5" fill="#38bdf8" fontFamily="monospace" fontWeight="bold">Confidence: 14%</text>
                </svg>
              </div>

              <div className="text-[10px] font-mono text-rose-400 z-10 bg-slate-950/80 px-2 py-0.5 rounded w-fit border border-rose-900/60">
                Classified: Speed Limit 60
              </div>
            </div>
          </div>

          {/* Spatial Anomaly Metrics Row */}
          <div className="pt-2">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
              Spatial Anomaly Metrics
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] text-slate-400">Lp-norm Perturbation</div>
                <div className="font-bold text-slate-900 mt-1">0.034</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] text-slate-400">Structural Similarity (SSIM)</div>
                <div className="font-bold text-slate-900 mt-1">0.982</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] text-slate-400">Activation Gradient Max</div>
                <div className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded mt-1 inline-block">
                  4.2x baseline
                </div>
              </div>
            </div>
          </div>

          {/* Why was this flagged? */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
              Why was this flagged?
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-800">Frequency anomaly:</strong>{" "}
                  High-frequency noise detected specifically within the bounds of a
                  primary target object.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-800">Trigger correlation:</strong>{" "}
                  The noise pattern matches known gradient signatures of Projected
                  Gradient Descent (PGD) attacks.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-800">Repeated across samples:</strong>{" "}
                  Identical perturbation matrix identified in 43 other dataset entries.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-800">Inference Provenance:</strong>{" "}
                  Cryptographic mismatch detected between model weights and execution
                  environment signature.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Disposition & Action Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left inspection tools */}
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-mono font-medium transition-colors cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
            <span>RELATED SAMPLES</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-mono font-medium transition-colors cursor-pointer">
            <User className="h-3.5 w-3.5 text-slate-500" />
            <span>CONTRIBUTOR</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-mono font-medium transition-colors cursor-pointer">
            <Activity className="h-3.5 w-3.5 text-slate-500" />
            <span>MODEL BEHAVIOUR</span>
          </button>
        </div>

        {/* Right Disposition Decision Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDecision("ACCEPT")}
            className={clsx(
              "px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer border",
              selectedDecision === "ACCEPT"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            )}
          >
            ACCEPT
          </button>

          <button
            onClick={() => handleDecision("REVIEW")}
            className={clsx(
              "px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer border",
              selectedDecision === "REVIEW"
                ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            )}
          >
            REVIEW
          </button>

          <button
            onClick={() => handleDecision("QUARANTINE")}
            className={clsx(
              "px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer border",
              selectedDecision === "QUARANTINE"
                ? "bg-[#e11d48] text-white border-[#e11d48] shadow-xs"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            )}
          >
            QUARANTINE
          </button>

          <button
            onClick={() => setDecisionConfirmed(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer ml-2"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{decisionConfirmed ? "SIGNED" : "FINAL DECISION"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
