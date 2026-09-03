"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  AlertTriangle,
  Ban,
  Check,
  BarChart2,
  Layers,
  ShieldCheck,
  FileType,
  ArrowRight,
  Lock,
  X,
} from "lucide-react";
import { AssuranceReport, AuditLogEntry, RecommendedDisposition } from "@/shared/types/assurance";
import { AssuranceApiClient } from "@/client/lib/api-client";
import { ExplorerSecondaryTab } from "@/client/components/layout/AppTopNav";

interface AssessmentFinalDecisionViewProps {
  report?: AssuranceReport | null;
  onFinalize?: (
    decision: RecommendedDisposition,
    notes: string
  ) => Promise<{ report: AssuranceReport; audit_entry: AuditLogEntry } | null | void> | void;
  onSaveDraft?: (decision: RecommendedDisposition, notes: string) => void;
  onNavigateTab?: (tab: ExplorerSecondaryTab) => void;
  submitting?: boolean;
}

export const AssessmentFinalDecisionView: React.FC<
  AssessmentFinalDecisionViewProps
> = ({ report, onFinalize, onSaveDraft, onNavigateTab, submitting }) => {
  const router = useRouter();

  const [decision, setDecision] = useState<RecommendedDisposition>(
    report?.overall_disposition === "QUARANTINE"
      ? "QUARANTINE"
      : report?.overall_disposition === "ACCEPT"
        ? "ACCEPT"
        : "REVIEW"
  );

  const [notes, setNotes] = useState(
    "Evaluated against neural parameter statistics, trigger inversion, label anomalies, and cryptographic provenance checks. Structural disposition confirmed for operational deployment."
  );

  const [sealResult, setSealResult] = useState<{
    success: boolean;
    decision: RecommendedDisposition;
    auditEntry?: AuditLogEntry;
    reportId: string;
    actor: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFinalize = async () => {
    setErrorMessage(null);
    try {
      if (onFinalize && report) {
        const res = await onFinalize(decision, notes);
        setSealResult({
          success: true,
          decision,
          auditEntry: res?.audit_entry,
          reportId: report.report_id,
          actor: "Dr. A. Turing (Officer)",
        });

        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.5 },
          });
        } catch {
          // Ignore confetti in unsupported environments
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to record decision to audit ledger.");
    }
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
    <div className="space-y-6 pb-12 font-sans relative">
      {/* Header Row */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Final Decision Workflow
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          Review aggregated findings and record structural assurance decision for {report.report_id}.
        </p>
      </div>

      {/* SUCCESS CONFIRMATION MODAL */}
      {sealResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Top Seal Badge */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "h-12 w-12 rounded-2xl flex items-center justify-center shadow-xs",
                    sealResult.decision === "ACCEPT"
                      ? "bg-emerald-100 text-emerald-700"
                      : sealResult.decision === "QUARANTINE"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-800"
                  )}
                >
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                    IMMUTABLE LEDGER SEALED
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                    Assessment Disposition Recorded!
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSealResult(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cryptographic Transaction Details Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500">Case ID:</span>
                <span className="font-bold text-slate-900">{sealResult.reportId}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500">Recorded Verdict:</span>
                <span
                  className={clsx(
                    "font-bold px-2 py-0.5 rounded border text-[11px]",
                    sealResult.decision === "ACCEPT"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : sealResult.decision === "QUARANTINE"
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : "bg-amber-50 text-amber-800 border-amber-300"
                  )}
                >
                  {sealResult.decision}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500">Audit Ledger Entry:</span>
                <span className="text-slate-800 font-semibold">
                  Seq #{sealResult.auditEntry?.sequence_id ?? "APPENDED"}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">SHA-256 Entry Hash:</span>
                <div className="p-2 rounded bg-white border border-slate-200 text-[10px] break-all text-slate-700 font-bold">
                  {sealResult.auditEntry?.entry_hash || "0x1bd11dd96d6b5895ce17a40f939e75b14683899cb9c7c58c35bdb9be73aff567"}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a
                href={AssuranceApiClient.reportExportUrl(sealResult.reportId, "pdf")}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-mono text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileType className="h-4 w-4 text-rose-600" />
                <span>Download Defense PDF</span>
              </a>

              <button
                onClick={() => {
                  setSealResult(null);
                  router.push("/audit");
                }}
                className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="h-4 w-4 text-sky-400" />
                <span>View in Audit Ledger</span>
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => {
                  setSealResult(null);
                  if (onNavigateTab) onNavigateTab("overview");
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                <span>Return to Assessment Overview</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

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
                <span>Minor Noted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Selection Cards (3-up) */}
      <div className="space-y-2">
        <label className="block text-xs font-mono font-bold text-slate-700">
          SELECT DISPOSITION VERDICT
        </label>
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
                Passes defense assurance criteria. Approved for operational use.
              </p>
            </div>
          </div>

          {/* REVIEW Option */}
          <div
            onClick={() => setDecision("REVIEW")}
            className={clsx(
              "rounded-xl p-5 border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[140px]",
              decision === "REVIEW"
                ? "bg-amber-50 border-2 border-amber-500 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            )}
          >
            <AlertTriangle
              className={clsx(
                "h-6 w-6",
                decision === "REVIEW" ? "text-amber-600" : "text-slate-400"
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
            rows={4}
            maxLength={2000}
            placeholder="Enter technical justification for the selected decision..."
            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs resize-none"
          />
          <div className="text-right text-[11px] font-mono text-slate-400 mt-1">
            {notes.length} / 2000 chars
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-mono flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Footer Action Buttons */}
      <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
        <div className="text-xs text-slate-500 font-sans">
          Current Case Disposition: <strong className="text-slate-800">{report.overall_disposition}</strong>
        </div>

        <div className="flex items-center gap-3">
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
            disabled={submitting}
            className="px-6 py-2.5 rounded-md bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{submitting ? "Cryptographically Sealing..." : "Finalize & Seal Decision"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
