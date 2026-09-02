"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  Download,
  Share2,
  ExternalLink,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  CircleAlert,
} from "lucide-react";
import { useReportList } from "@/client/lib/useReportList";
import { AssuranceReport } from "@/shared/types/assurance";

interface ReportsViewProps {
  onOpenReport?: (reportId: string, report: AssuranceReport) => void;
  onGenerateReport?: () => void;
}

const DEFAULT_REPORTS = [
  {
    id: "rep-1",
    title: "Satellite Detector v2 - Final Assurance",
    caseId: "#AS-2026-019",
    dateGenerated: "2026-10-14 14:32:01 UTC",
    score: 68,
    disposition: "QUARANTINED",
    dispositionType: "QUARANTINE",
  },
  {
    id: "rep-2",
    title: "Perimeter Breach CV - Q3 Validation",
    caseId: "#AS-2026-018",
    dateGenerated: "2026-10-12 09:15:44 UTC",
    score: 96,
    disposition: "CLEARED",
    dispositionType: "CLEARED",
  },
  {
    id: "rep-3",
    title: "Facial Recog Module A - Bias Assessment",
    caseId: "#AS-2026-017",
    dateGenerated: "2026-10-10 18:02:12 UTC",
    score: 81,
    disposition: "PENDING REVIEW",
    dispositionType: "REVIEW",
  },
  {
    id: "rep-4",
    title: "License Plate OCR - Night Vision Calibration",
    caseId: "#AS-2026-016",
    dateGenerated: "2026-10-08 11:20:05 UTC",
    score: 92,
    disposition: "CLEARED",
    dispositionType: "CLEARED",
  },
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  onOpenReport,
  onGenerateReport,
}) => {
  const { cards } = useReportList(50);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedDisposition, setSelectedDisposition] = useState<string>("ALL");

  const displayList =
    cards && cards.length > 0
      ? cards.map((c, i) => {
          const disp = c.summary.overall_disposition;
          return {
            id: c.summary.report_id,
            title: `Assessment Run ${c.summary.report_id}`,
            caseId: `#AS-2026-${String(100 - i).padStart(3, "0")}`,
            dateGenerated: c.summary.generated_at.replace("T", " ").replace("Z", " UTC"),
            score: Math.round(c.summary.overall_risk_score),
            disposition:
              disp === "QUARANTINE"
                ? "QUARANTINED"
                : disp === "ACCEPT"
                  ? "CLEARED"
                  : "PENDING REVIEW",
            dispositionType: disp,
            rawReport: c.report,
          };
        })
      : DEFAULT_REPORTS;

  const filteredList =
    selectedDisposition === "ALL"
      ? displayList
      : displayList.filter((r) => r.dispositionType === selectedDisposition);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Assurance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive library of generated model validation and integrity reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filters</span>
          </button>
          <button
            onClick={onGenerateReport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate New Report</span>
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs flex items-center gap-3 font-mono text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Filter by Disposition:</span>
          {["ALL", "CLEARED", "REVIEW", "QUARANTINE"].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDisposition(d)}
              className={clsx(
                "px-2.5 py-1 rounded transition-colors cursor-pointer",
                selectedDisposition === d
                  ? "bg-slate-900 text-white font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {/* Reports Table Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-100 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-5">Report Subject / ID</th>
                <th className="py-3 px-5">Date Generated</th>
                <th className="py-3 px-5">Assurance Score</th>
                <th className="py-3 px-5">Disposition</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((r) => (
                <tr
                  key={r.id}
                  onClick={() =>
                    onOpenReport &&
                    onOpenReport(r.id, ("rawReport" in r ? r.rawReport : null) as unknown as AssuranceReport)
                  }
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {r.title}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                      {r.caseId}
                    </div>
                  </td>

                  <td className="py-3.5 px-5 font-mono text-slate-600 text-xs whitespace-nowrap">
                    <div>{r.dateGenerated.split(" ")[0]}</div>
                    <div className="text-[10px] text-slate-400">
                      {r.dateGenerated.split(" ").slice(1).join(" ")}
                    </div>
                  </td>

                  <td className="py-3.5 px-5 w-44">
                    <div className="font-mono font-bold text-xs mb-1">
                      <span
                        className={clsx(
                          r.score < 70
                            ? "text-[#e11d48]"
                            : r.score < 85
                              ? "text-slate-800"
                              : "text-sky-600"
                        )}
                      >
                        {r.score}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          "h-1.5 rounded-full",
                          r.score < 70
                            ? "bg-[#e11d48]"
                            : r.score < 85
                              ? "bg-slate-600"
                              : "bg-sky-600"
                        )}
                        style={{ width: `${r.score}%` }}
                      />
                    </div>
                  </td>

                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase",
                        r.dispositionType === "QUARANTINE"
                          ? "bg-rose-50 border border-rose-200 text-rose-600"
                          : r.dispositionType === "CLEARED" || r.dispositionType === "ACCEPT"
                            ? "bg-sky-50 border border-sky-200 text-sky-700"
                            : "bg-slate-100 border border-slate-200 text-slate-700"
                      )}
                    >
                      {r.dispositionType === "QUARANTINE" ? (
                        <CircleAlert className="h-3 w-3" />
                      ) : r.dispositionType === "CLEARED" || r.dispositionType === "ACCEPT" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      <span>{r.disposition}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 text-slate-400">
                      <a
                        href={`/api/report/${r.id}/export.html`}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer inline-block"
                        title="Download HTML"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`${window.location.origin}/report/${r.id}`);
                        }}
                        className="p-1 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="Copy Report Link"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenReport) {
                            onOpenReport(r.id, ("rawReport" in r ? r.rawReport : null) as unknown as AssuranceReport);
                          }
                        }}
                        className="p-1 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="Open Details"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Showing 1-{filteredList.length} of {filteredList.length} records</span>
          <div className="flex items-center gap-1.5">
            <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 cursor-pointer">
              Prev
            </button>
            <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
