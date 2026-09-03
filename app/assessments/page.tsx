"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAtom } from "jotai";
import {
  Plus,
  FileType,
  Loader2,
} from "lucide-react";
import {
  activeReportAtom,
  activeScenarioAtom,
  assessmentTabAtom,
  auditEntriesAtom,
  operatorAtom,
  selectedFindingIdAtom,
} from "@/client/state/atoms";
import { WorkspaceShell } from "@/client/components/layout/WorkspaceShell";
import { AssessmentExplorerView } from "@/client/components/assessment/AssessmentExplorerView";
import { AssessmentAssetsView } from "@/client/components/assessment/AssessmentAssetsView";
import { AssessmentPrioritizedFindingsView } from "@/client/components/assessment/AssessmentPrioritizedFindingsView";
import { EvidenceInvestigationView } from "@/client/components/assessment/EvidenceInvestigationView";
import { AssessmentFinalDecisionView } from "@/client/components/assessment/AssessmentFinalDecisionView";
import { AssuranceApiClient, StoredReportSummary } from "@/client/lib/api-client";
import { ExplorerSecondaryTab } from "@/client/components/layout/AppTopNav";

function AssessmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [operator] = useAtom(operatorAtom);
  const [activeReport, setActiveReport] = useAtom(activeReportAtom);
  const [activeScenario, setActiveScenario] = useAtom(activeScenarioAtom);
  const [secondaryTab, setSecondaryTab] = useAtom(assessmentTabAtom);
  const [, setAuditEntries] = useAtom(auditEntriesAtom);

  const [loading, setLoading] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [reportSummaries, setReportSummaries] = useState<StoredReportSummary[]>([]);

  // Sync with ?tab= query param if present
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ExplorerSecondaryTab | null;
    if (
      tabParam &&
      ["overview", "assets", "findings", "evidence", "decision"].includes(tabParam)
    ) {
      setSecondaryTab(tabParam);
    }
  }, [searchParams, setSecondaryTab]);

  // Load report summaries and sync report
  useEffect(() => {
    let isMounted = true;
    const idParam = searchParams.get("id");

    Promise.resolve().then(async () => {
      if (!isMounted) return;
      try {
        const summaries = await AssuranceApiClient.listReportSummaries(100);
        if (!isMounted) return;
        setReportSummaries(summaries);

        if (idParam && (!activeReport || activeReport.report_id !== idParam)) {
          setLoading(true);
          const rep = await AssuranceApiClient.getReportById(idParam);
          if (isMounted) setActiveReport(rep);
        } else if (!activeReport) {
          setLoading(true);
          if (summaries && summaries.length > 0) {
            const rep = await AssuranceApiClient.getReportById(summaries[0].report_id);
            if (isMounted) setActiveReport(rep);
          } else {
            const res = await AssuranceApiClient.runScenario(activeScenario || "A");
            if (isMounted) setActiveReport(res.report);
          }
        }
      } catch (err) {
        console.error("Failed to load assessments:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [searchParams, activeReport, activeScenario, setActiveReport]);

  const refreshSummaries = useCallback(async () => {
    try {
      const summaries = await AssuranceApiClient.listReportSummaries(100);
      setReportSummaries(summaries);
      return summaries;
    } catch (err) {
      console.error("Failed to refresh report summaries:", err);
      return [];
    }
  }, []);

  const handleSwitchReport = async (reportId: string) => {
    if (!reportId || reportId === activeReport?.report_id) return;
    setLoading(true);
    try {
      const rep = await AssuranceApiClient.getReportById(reportId);
      setActiveReport(rep);
    } catch (err) {
      console.error("Failed to switch report:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScenario = useCallback(
    async (scenarioId: string) => {
      setLoading(true);
      setActiveScenario(scenarioId);
      try {
        const res = await AssuranceApiClient.runScenario(scenarioId);
        setActiveReport(res.report);
        await refreshSummaries();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [setActiveReport, setActiveScenario, refreshSummaries]
  );

  const [selectedFindingId, setSelectedFindingId] = useAtom(selectedFindingIdAtom);
  const selectedFinding =
    (activeReport?.findings || []).find((f) => f.finding_id === selectedFindingId) ||
    (activeReport?.findings && activeReport.findings.length > 0 ? activeReport.findings[0] : null);

  const handleFinalizeDecision = async (
    decision: "ACCEPT" | "REVIEW" | "QUARANTINE",
    notes: string
  ) => {
    if (!activeReport) return;
    setSubmittingDecision(true);
    try {
      const res = await AssuranceApiClient.recordReportDecision(
        activeReport.report_id,
        decision,
        notes,
        operator?.name || "Dr. A. Turing"
      );
      setActiveReport(res.report);
      setAuditEntries((prev) => [res.audit_entry, ...prev]);
      await refreshSummaries();
    } catch (err) {
      console.error("Failed to record decision:", err);
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <WorkspaceShell
      title="Assessment Explorer"
      activeNav="assessments"
      showSecondaryTabs={true}
      searchPlaceholder="Search findings, models, IDs..."
      shortcutKey="⌘K"
    >
      <div>
        {/* Assessment Control & Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 mb-5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                ACTIVE ASSESSMENT:
              </span>
              <select
                value={activeReport?.report_id || ""}
                onChange={(e) => handleSwitchReport(e.target.value)}
                className="font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              >
                {reportSummaries.map((s) => (
                  <option key={s.report_id} value={s.report_id}>
                    {s.report_id} ({s.overall_disposition} • {Math.round(s.assurance_score)}/100 • {s.generated_at.slice(0, 10)})
                  </option>
                ))}
              </select>
            </div>

            {loading && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-sky-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeReport && (
              <a
                href={AssuranceApiClient.reportExportUrl(activeReport.report_id, "pdf")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-mono font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
                title="Download Official Defense PDF Certificate (FR-14)"
              >
                <FileType className="h-3.5 w-3.5 text-rose-600" />
                <span>Download PDF</span>
              </a>
            )}

            <button
              onClick={() => router.push("/assessments/new")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Assessment</span>
            </button>
          </div>
        </div>

        {secondaryTab === "overview" && (
          <AssessmentExplorerView
            report={activeReport}
            onInvestigate={() => setSecondaryTab("evidence")}
            onNavigateTab={(tab) => setSecondaryTab(tab)}
            activeScenario={activeScenario}
            loading={loading}
            onSelectScenario={handleSelectScenario}
          />
        )}

        {secondaryTab === "assets" && (
          <AssessmentAssetsView onUploadNew={() => router.push("/assessments/new")} />
        )}

        {secondaryTab === "findings" && (
          <AssessmentPrioritizedFindingsView
            reportId={activeReport?.report_id}
            findings={activeReport?.findings}
            onInvestigateFinding={(id) => {
              setSelectedFindingId(id);
              setSecondaryTab("evidence");
            }}
          />
        )}

        {secondaryTab === "evidence" && (
          <EvidenceInvestigationView
            finding={selectedFinding}
            onBack={() => setSecondaryTab("overview")}
          />
        )}

        {secondaryTab === "decision" && (
          <AssessmentFinalDecisionView
            report={activeReport}
            onFinalize={handleFinalizeDecision}
            submitting={submittingDecision}
          />
        )}
      </div>
    </WorkspaceShell>
  );
}

export default function AssessmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-[#f8fafc] text-xs font-mono text-slate-400">
          Loading assessment explorer...
        </div>
      }
    >
      <AssessmentsContent />
    </Suspense>
  );
}
