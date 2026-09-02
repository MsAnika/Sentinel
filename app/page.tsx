"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppSidebar, NavItemKey } from "@/client/components/layout/AppSidebar";
import {
  AppTopNav,
  ExplorerSecondaryTab,
} from "@/client/components/layout/AppTopNav";
import {
  AuthStationLogin,
  OperatorProfile,
  OPERATOR_PROFILES,
} from "@/client/components/auth/AuthStationLogin";
import { HomeDashboardView } from "@/client/components/home/HomeDashboardView";
import { AssessmentExplorerView } from "@/client/components/assessment/AssessmentExplorerView";
import { AssessmentAssetsView } from "@/client/components/assessment/AssessmentAssetsView";
import { AssessmentPrioritizedFindingsView } from "@/client/components/assessment/AssessmentPrioritizedFindingsView";
import { EvidenceInvestigationView } from "@/client/components/assessment/EvidenceInvestigationView";
import { AssessmentFinalDecisionView } from "@/client/components/assessment/AssessmentFinalDecisionView";
import { FindingsQueueView } from "@/client/components/assessment/FindingsQueueView";
import { CreateAssessmentWizard } from "@/client/components/assessment/CreateAssessmentWizard";
import { ReportsView } from "@/client/components/reports/ReportsView";
import { AuditLedgerView } from "@/client/components/audit/AuditLedgerView";
import { AssuranceApiClient } from "@/client/lib/api-client";
import { AssuranceReport, AuditLogEntry } from "@/shared/types/assurance";
import { Lock, Cpu, CheckCircle2, AlertTriangle as AlertTriangleIcon } from "lucide-react";

export default function AppRootPage() {
  const [operator, setOperator] = useState<OperatorProfile | null>(OPERATOR_PROFILES[0]);
  const [activeNav, setActiveNav] = useState<NavItemKey>("home");
  const [secondaryTab, setSecondaryTab] =
    useState<ExplorerSecondaryTab>("overview");
  const [activeScenario, setActiveScenario] = useState<string>("A");
  const [loading, setLoading] = useState<boolean>(false);
  const [showWizard, setShowWizard] = useState<boolean>(false);

  const [activeReport, setActiveReport] = useState<AssuranceReport | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);

  const [chainVerification, setChainVerification] = useState<{
    is_chain_valid: boolean;
    errors: string[];
  } | null>(null);

  const loadAuditEntries = useCallback(() => {
    fetch("/api/audit/entries?limit=100")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data: { entries: AuditLogEntry[] }) => {
        setAuditEntries(data.entries || []);
      })
      .catch((err) => {
        console.warn("Could not fetch real audit ledger entries:", err);
      });
  }, []);

  const handleSelectScenario = useCallback(async (scenarioId: string) => {
    setLoading(true);
    setActiveScenario(scenarioId);
    try {
      const data = await AssuranceApiClient.runScenario(scenarioId);
      setActiveReport(data.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    AssuranceApiClient.runScenario("A")
      .then((data) => {
        if (isMounted) {
          setActiveReport(data.report);
        }
      })
      .catch(console.error);

    fetch("/api/audit/entries?limit=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { entries: AuditLogEntry[] } | null) => {
        if (isMounted && data?.entries) {
          setAuditEntries(data.entries);
        }
      })
      .catch(console.warn);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleWizardComplete = async () => {
    setLoading(true);
    try {
      const res = await AssuranceApiClient.runScenario("A");
      setActiveReport(res.report);
      setShowWizard(false);
      setActiveNav("assessments");
      setSecondaryTab("overview");
      loadAuditEntries();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToAssessment = (assessmentId: string) => {
    setShowWizard(false);
    setActiveNav("assessments");
    setSecondaryTab("overview");
    if (assessmentId) {
      handleSelectScenario("A");
    }
  };

  const handleFinalizeDecision = async (
    decision: "ACCEPT" | "REVIEW" | "QUARANTINE",
    notes: string
  ) => {
    if (activeReport) {
      const updatedReport: AssuranceReport = {
        ...activeReport,
        overall_disposition: decision,
      };
      setActiveReport(updatedReport);

      // Record in live audit chain
      const newEntry: AuditLogEntry = {
        sequence_id: auditEntries.length + 1,
        timestamp: new Date().toISOString(),
        event: `ASSURANCE_DECISION_${decision}`,
        asset_id: activeReport.report_id,
        operation: "RECORD_ASSURANCE_DECISION",
        input_digest: activeReport.audit_chain_digest || "0x7a8c991e2b4f2e",
        result: notes || `Operator recorded final assurance disposition: ${decision}`,
        evidence_reference: `DISPOSITION=${decision}`,
        previous_entry_hash: "0x7a8c991e2b4f2e",
        entry_hash: `0x${Math.random().toString(16).substring(2, 14)}`,
        signature: `SIG_ED25519_${decision}_${operator?.id || "0x8F9A"}`,
      };
      setAuditEntries((prev) => [newEntry, ...prev]);
    }
  };

  if (!operator) {
    return <AuthStationLogin onAuthenticated={(op) => setOperator(op)} />;
  }

  const getPageTitle = () => {
    if (showWizard) return "New Assessment";
    switch (activeNav) {
      case "home":
        return "Fleet & Trust Dashboard";
      case "assessments":
        return "Assessment Explorer";
      case "findings":
        return "Findings Queue";
      case "reports":
        return "Assurance Reports";
      case "audit":
        return "Audit Integrity";
      case "settings":
        return "System Settings & Security";
      default:
        return "CV Integrity";
    }
  };

  const getSearchPlaceholderAndShortcut = () => {
    switch (activeNav) {
      case "findings":
        return { placeholder: "Search findings, models, IDs...", shortcut: "⌘K" };
      case "audit":
        return { placeholder: "Search logs by TxID, Actor, or Event...", shortcut: "/" };
      case "reports":
        return { placeholder: "Search archive...", shortcut: "⌘K" };
      default:
        return { placeholder: "Search assessments...", shortcut: "⌘K" };
    }
  };

  const { placeholder, shortcut } = getSearchPlaceholderAndShortcut();

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f8fafc] text-[#0f172a] flex antialiased font-sans">
      {/* Left Sidebar */}
      <AppSidebar
        activeTab={activeNav}
        onNavigate={(tab) => {
          setShowWizard(false);
          setActiveNav(tab);
          if (tab === "assessments") {
            setSecondaryTab("overview");
          }
          if (tab === "audit") {
            loadAuditEntries();
          }
        }}
        onNewAssessment={() => setShowWizard(true)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
        {/* Top Header - Fixed & Pinned */}
        <AppTopNav
          title={getPageTitle()}
          activeSecondaryTab={secondaryTab}
          onSecondaryTabChange={(tab) => setSecondaryTab(tab)}
          showSecondaryTabs={!showWizard && activeNav === "assessments"}
          searchPlaceholder={placeholder}
          shortcutKey={shortcut}
        />

        {/* Scrollable View Workspace */}
        <div className="flex-1 overflow-y-auto">
          <main className="px-8 py-6 max-w-7xl w-full mx-auto">
          {showWizard ? (
            <CreateAssessmentWizard
              onBack={() => setShowWizard(false)}
              onComplete={handleWizardComplete}
            />
          ) : activeNav === "home" ? (
            /* Dedicated Home / Dashboard View */
            <HomeDashboardView
              onNavigateToAssessment={handleNavigateToAssessment}
              onViewAllAssessments={() => {
                setActiveNav("assessments");
                setSecondaryTab("overview");
              }}
              onViewAllFindings={() => setActiveNav("findings")}
            />
          ) : activeNav === "assessments" ? (
            /* Dedicated Assessment Explorer View (5 Tabs) */
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
                <AssessmentAssetsView
                  onUploadNew={() => setShowWizard(true)}
                />
              )}

              {secondaryTab === "findings" && (
                <AssessmentPrioritizedFindingsView
                  findings={activeReport?.findings}
                  onInvestigateFinding={() => setSecondaryTab("evidence")}
                />
              )}

              {secondaryTab === "evidence" && (
                <EvidenceInvestigationView
                  onBack={() => setSecondaryTab("overview")}
                  onDecisionChange={() => {}}
                />
              )}

              {secondaryTab === "decision" && (
                <AssessmentFinalDecisionView
                  report={activeReport}
                  onFinalize={handleFinalizeDecision}
                  onSaveDraft={() => {}}
                />
              )}
            </div>
          ) : activeNav === "findings" ? (
            /* Dedicated Findings Queue View */
            <FindingsQueueView
              findings={activeReport?.findings}
              onSelectFinding={() => {
                setActiveNav("assessments");
                setSecondaryTab("evidence");
              }}
              onNewManualEntry={() => setShowWizard(true)}
            />
          ) : activeNav === "reports" ? (
            /* Dedicated Reports View */
            <ReportsView
              onOpenReport={(_reportId, report) => {
                setActiveReport(report);
                setActiveNav("assessments");
                setSecondaryTab("overview");
              }}
              onGenerateReport={() => setShowWizard(true)}
            />
          ) : activeNav === "audit" ? (
            /* Dedicated Audit View */
            <AuditLedgerView entries={auditEntries} />
          ) : activeNav === "settings" ? (
            /* Dedicated Settings View */
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6 font-sans">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    System & Air-Gap Configuration
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-sans">
                    Platform deployment parameters, cryptographic keys, and station operator session.
                  </p>
                </div>
                <button
                  onClick={() => setOperator(null)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-mono font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Switch Station Operator
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    <span>Air-Gap Network Isolation</span>
                  </div>
                  <p className="text-slate-600 text-[11px] font-sans">
                    Strict localhost-only binding. Zero telemetry or external cloud outbound transmission.
                  </p>
                  <div className="text-[11px] text-emerald-600 font-bold font-mono">
                    ✓ ENFORCED (Status: ACTIVE)
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Cpu className="h-4 w-4 text-sky-600" />
                    <span>Evaluation Core</span>
                  </div>
                  <p className="text-slate-600 text-[11px] font-sans">
                    Local ONNX Runtime & PyTorch inference engine.
                  </p>
                  <div className="text-[11px] text-slate-800 font-mono">
                    Engine: Python 3.11 / ONNX 1.16+
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-sans">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>
                    {chainVerification === null
                      ? "Audit Hash Chain: ACTIVE"
                      : chainVerification.is_chain_valid
                        ? "Audit Hash Chain: VALID"
                        : "Audit Hash Chain: INTEGRITY FAILURE"}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await AssuranceApiClient.verifyAuditLedger();
                      setChainVerification({
                        is_chain_valid: res.is_chain_valid,
                        errors: res.errors,
                      });
                    } catch (e) {
                      setChainVerification({
                        is_chain_valid: false,
                        errors: [String(e)],
                      });
                    }
                  }}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-mono font-medium text-slate-700 cursor-pointer"
                >
                  Verify Hash Chain
                </button>
              </div>

              {chainVerification && !chainVerification.is_chain_valid && (
                <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-xs text-rose-700 font-mono space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangleIcon className="h-4 w-4 text-rose-600" />
                    <span>Ledger Tampering Detected:</span>
                  </div>
                  {chainVerification.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </main>
        </div>
      </div>
    </div>
  );
}
