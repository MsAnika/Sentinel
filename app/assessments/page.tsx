"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAtom } from "jotai";
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
import { AssuranceApiClient } from "@/client/lib/api-client";
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

  // Initial load if no report exists
  useEffect(() => {
    let isMounted = true;
    if (!activeReport) {
      Promise.resolve().then(() => {
        if (!isMounted) return;
        setLoading(true);
        AssuranceApiClient.runScenario(activeScenario || "A")
          .then((res) => {
            if (isMounted) setActiveReport(res.report);
          })
          .catch(console.error)
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      });
    }
    return () => {
      isMounted = false;
    };
  }, [activeReport, activeScenario, setActiveReport]);

  const handleSelectScenario = useCallback(
    async (scenarioId: string) => {
      setLoading(true);
      setActiveScenario(scenarioId);
      try {
        const res = await AssuranceApiClient.runScenario(scenarioId);
        setActiveReport(res.report);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [setActiveReport, setActiveScenario]
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
        {secondaryTab === "overview" && (
          <AssessmentExplorerView
            report={activeReport}
            onInvestigate={() => setSecondaryTab("evidence")}
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
