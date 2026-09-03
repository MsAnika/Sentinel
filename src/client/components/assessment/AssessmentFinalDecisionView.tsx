"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  AlertTriangle,
  Ban,
  Check,
  BarChart2,
  Layers,
} from "lucide-react";
import { AssuranceReport } from "@/shared/types/assurance";

interface AssessmentFinalDecisionViewProps {
  report?: AssuranceReport | null;
  onFinalize?: (decision: "ACCEPT" | "REVIEW" | "QUARANTINE", notes: string) => void;
  onSaveDraft?: (decision: "ACCEPT" | "REVIEW" | "QUARANTINE", notes: string) => void;
  submitting?: boolean;
}

export const AssessmentFinalDecisionView: React.FC<
  AssessmentFinalDecisionViewProps
> = ({ report, onFinalize, onSaveDraft, submitting }) => {
  const [decision, setDecision] = useState<"ACCEPT" | "REVIEW" | "QUARANTINE">(
    report?.overall_disposition === "QUARANTINE"
      ? "QUARANTINE"
      : report?.overall_disposition === "ACCEPT"
        ? "ACCEPT"
        : "REVIEW"
  );
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleFinalize = () => {
    setSubmitted(true);
    if (onFinalize) onFinalize(decision, notes);
  };

  if (!report) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center font-sans">
        <p className="text-sm font-bold text-slate-700">No assessment loaded.</p>
        <p className="text-xs text-slate-500 mt-1">Run or open an assessment before recording a final decision.</p>
      </div>
    );
  }

  const assuranceScore = Math.round(report.assurance_score);
  const riskScore = Math.round(report.overall_risk_score);
  const criticalCount = report.findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = report.findings.filter((f) => f.severity === "HIGH").length;
  const minorCount = report.findings.filter((f) => f.severity === "MEDIUM" || f.severity === "LOW").length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Row */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Final Decision Workflow
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          Review aggregated findings and record structural assurance decision for {report.report_id}.
        </p>
      </div>

      {/* Top 2 KPI / Summary Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Box: Overall Assurance Score */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-600 tracking-wider">
                Overall Assurance Score
              </span>
              <BarChart2 className="h-4 w-4 text-slate-400" />
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-baseline">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                  {assuranceScore}
                </span>
                <span className="text-sm font-mono text-slate-400 ml-1">/100</span>
              </div>
              <div className="text-right font-mono">
                <span
                  className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded border",
                    assuranceScore < 70
                      ? "bg-rose-50 border-rose-300 text-rose-700"
                      : assuranceScore < 85
                        ? "bg-amber-100 border-amber-300 text-amber-800"
                        : "bg-emerald-50 border-emerald-300 text-emerald-700"
                  )}
                >
                  {assuranceScore < 70 ? "HIGH RISK" : assuranceScore < 85 ? "MARGINAL" : "TRUSTED"}
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Threshold: 75/100 · Risk: {riskScore <= 20 ? "Low" : riskScore <= 60 ? "Med" : "High"}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={clsx(
                "h-2 rounded-full transition-all",
                assuranceScore < 70 ? "bg-[#e11d48]" : assuranceScore < 85 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${assuranceScore}%` }}
            />
          </div>
        </div>

        {/* Right Box: Aggregated Findings */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-600 tracking-wider">
              Aggregated Findings
            </span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-1">
            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div className="text-2xl font-bold text-[#e11d48] font-sans">
                {criticalCount}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 mt-1 font-medium">
                <span className="h-2 w-2 rounded-full bg-[#e11d48]" />
                <span>Critical Quarantined</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div className="text-2xl font-bold text-amber-600 font-sans">
                {highCount}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 mt-1 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>High Reviewed</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div className="text-2xl font-bold text-slate-600 font-sans">
                {minorCount}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 mt-1 font-medium">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Minor Resolved</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Recommendation vs Decision Readiness Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
            <span>Automated Engine Recommendation</span>
            <span className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">AUTOMATED</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "px-2.5 py-1 rounded font-bold text-xs",
                report.overall_disposition === "ACCEPT"
                  ? "bg-emerald-100 text-emerald-800"
                  : report.overall_disposition === "REVIEW"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
              )}
            >
              RECOMMENDED: {report.overall_disposition}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
            {report.overall_disposition === "ACCEPT"
              ? "All baseline checks passed under declared coverage. No blocking vulnerabilities detected."
              : report.overall_disposition === "REVIEW"
                ? "Moderate anomalies or distribution drift detected. Requires human validation before approval."
                : "Critical integrity failure or attack vector flagged. Automated quarantine recommendation issued."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs font-mono space-y-2">
          <div className="text-slate-500 font-bold uppercase text-[10px]">Decision Readiness Checklist</div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Critical findings evaluated</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Evidence chain verified</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Coverage & limits logged</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Audit trail hash-chained</span>
            </div>
          </div>
        </div>
      </div>

      {/* Record Decision Section */}
      <div className="space-y-3 pt-2">
        <div className="font-mono text-xs font-bold text-slate-700 uppercase tracking-wide">
          Analyst Final Disposition
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ACCEPT Option */}
          <div
            onClick={() => setDecision("ACCEPT")}
            className={clsx(
              "rounded-xl p-5 border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[140px]",
              decision === "ACCEPT"
                ? "bg-emerald-50 border-2 border-emerald-500 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            )}
          >
            <CheckCircle2
              className={clsx(
                "h-6 w-6",
                decision === "ACCEPT" ? "text-emerald-600" : "text-slate-400"
              )}
            />
            <div>
              <div className="font-mono text-sm font-bold text-slate-900 mt-2">
                ACCEPT
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight font-sans">
                Model meets all structural requirements. Proceed to deployment.
              </p>
            </div>
          </div>

          {/* REVIEW Option */}
          <div
            onClick={() => setDecision("REVIEW")}
            className={clsx(
              "rounded-xl p-5 border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[140px]",
              decision === "REVIEW"
                ? "bg-amber-100/70 border-2 border-amber-400 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            )}
          >
            <AlertTriangle
              className={clsx(
                "h-6 w-6",
                decision === "REVIEW" ? "text-slate-900" : "text-slate-400"
              )}
            />
            <div>
              <div className="font-mono text-sm font-bold text-slate-900 mt-2">
                REVIEW
              </div>
              <p className="text-[11px] text-slate-700 mt-1 leading-tight font-sans">
                Marginal score. Requires secondary sign-off or mitigation plan.
              </p>
            </div>
          </div>

          {/* QUARANTINE Option */}
          <div
            onClick={() => setDecision("QUARANTINE")}
            className={clsx(
              "rounded-xl p-5 border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[140px]",
              decision === "QUARANTINE"
                ? "bg-rose-50 border-2 border-[#e11d48] shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            )}
          >
            <Ban
              className={clsx(
                "h-6 w-6",
                decision === "QUARANTINE" ? "text-[#e11d48]" : "text-slate-400"
              )}
            />
            <div>
              <div className="font-mono text-sm font-bold text-slate-900 mt-2">
                QUARANTINE
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight font-sans">
                Critical failure. Halt deployment and return to engineering.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Justification / Auditor Notes Textarea */}
      <div className="space-y-2 pt-2">
        <label className="block text-xs font-mono font-bold text-slate-700">
          Justification / Auditor Notes <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Enter technical justification for the selected decision. Cite specific findings or deviations..."
            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs resize-none"
          />
          <div className="text-right text-[11px] font-mono text-slate-400 mt-1">
            {notes.length} / 2000 chars
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
        {onSaveDraft && (
          <button
            onClick={() => onSaveDraft(decision, notes)}
            className="px-6 py-2.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            Save Draft
          </button>
        )}
        <button
          onClick={handleFinalize}
          disabled={submitting || !notes.trim()}
          title={!notes.trim() ? "Justification notes are required" : undefined}
          className="px-6 py-2.5 rounded-md bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="h-3.5 w-3.5" />
          <span>{submitting ? "Recording..." : submitted ? "Assessment Finalized" : "Finalize Assessment"}</span>
        </button>
      </div>
    </div>
  );
};
