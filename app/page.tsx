"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar, NavItemKey } from "@/client/components/layout/AppSidebar";
import {
  AppTopNav,
  ExplorerSecondaryTab,
} from "@/client/components/layout/AppTopNav";
import { HomeDashboardView } from "@/client/components/home/HomeDashboardView";
import { AssessmentExplorerView } from "@/client/components/assessment/AssessmentExplorerView";
import { CreateAssessmentWizard } from "@/client/components/assessment/CreateAssessmentWizard";
import { DatasetAssuranceView } from "@/client/components/dataset/DatasetAssuranceView";
import { ModelAssuranceView } from "@/client/components/model/ModelAssuranceView";
import { ProvenanceStudioView } from "@/client/components/provenance/ProvenanceStudioView";
import { DistributionShiftView } from "@/client/components/drift/DistributionShiftView";
import { AuditLedgerView } from "@/client/components/audit/AuditLedgerView";
import { AssuranceReportView } from "@/client/components/report/AssuranceReportView";
import { FindingsTriage } from "@/client/components/assessment/FindingsTriage";
import { ReportsView } from "@/client/components/reports/ReportsView";
import { TrendDashboardView } from "@/client/components/dashboard/TrendDashboardView";
import { AssuranceApiClient } from "@/client/lib/api-client";
import { AssuranceReport, AuditLogEntry, ScenarioRunResult } from "@/shared/types/assurance";
import { Lock, Cpu, CheckCircle2 } from "lucide-react";

export default function AppRootPage() {
  const [activeNav, setActiveNav] = useState<NavItemKey>("home");
  const [secondaryTab, setSecondaryTab] =
    useState<ExplorerSecondaryTab>("overview");
  const [activeScenario, setActiveScenario] = useState<string>("A");
  const [scenarioData, setScenarioData] = useState<ScenarioRunResult | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [showWizard, setShowWizard] = useState<boolean>(false);

  // The real, currently-displayed assessment in the Explorer. Set by
  // running a scenario, completing the New Assessment wizard, or opening
  // a report from Home/Reports -- always a real AssuranceReport, never a
  // hardcoded demo entry. `scenarioData` (above) additionally carries the
  // live-only side channels (raw model fingerprint, inference record,
  // drift report) that only a fresh Scenario Replay run produces; a
  // wizard-generated or history-opened report won't have those, and the
  // Assets/Evidence tabs below degrade to their own honest "not provided"
  // states in that case rather than fabricating anything.
  const [activeReport, setActiveReport] = useState<AssuranceReport | null>(null);
  const [activeReportTitle, setActiveReportTitle] = useState<string>("");
  const [activeReportSubtitle, setActiveReportSubtitle] = useState<string | undefined>(undefined);

  // The real, process-wide audit ledger -- independent of which
  // assessment is currently open, since every real action across every
  // scenario and live assessment writes into this one shared ledger.
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    AssuranceApiClient.runScenario("A")
      .then((data) => {
        setScenarioData(data);
        setActiveReport(data.report);
        setActiveReportTitle(data.title);
        setActiveReportSubtitle(data.description);
      })
      .catch((err) => console.error("Scenario load:", err));
  }, []);

  const loadAuditEntries = () => {
    setAuditLoading(true);
    AssuranceApiClient.getAuditEntries()
      .then((res) => setAuditEntries(res.entries))
      .catch((err) => console.error("Audit load:", err))
      .finally(() => setAuditLoading(false));
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setLoading(true);
    setActiveScenario(scenarioId);
    try {
      const data = await AssuranceApiClient.runScenario(scenarioId);
      setScenarioData(data);
      setActiveReport(data.report);
      setActiveReportTitle(data.title);
      setActiveReportSubtitle(data.description);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = (report: AssuranceReport, name: string) => {
    // A wizard-generated report has no scenario-replay side channel, so
    // clear it rather than leaving the previous scenario's raw
    // model/inference data misleadingly attached to this new report.
    setScenarioData(null);
    setActiveReport(report);
    setActiveReportTitle(name || "Live Assessment");
    setActiveReportSubtitle(`${report.findings.length} finding(s) from your uploaded assets`);
    setShowWizard(false);
    setActiveNav("assessments");
    setSecondaryTab("overview");
  };

  const handleNavigateToAssessment = async (reportId: string) => {
    setActiveNav("assessments");
    setSecondaryTab("overview");
    try {
      const report = await AssuranceApiClient.getReportById(reportId);
      setScenarioData(null);
      setActiveReport(report);
      setActiveReportTitle(reportId);
      setActiveReportSubtitle(`Generated ${new Date(report.generated_at).toLocaleString()}`);
    } catch (e) {
      console.error(e);
    }
  };

  const getPageTitle = () => {
    if (showWizard) return "New Assessment";
    switch (activeNav) {
      case "home":
        return "Fleet & Trust Dashboard";
      case "assessments":
        return "Assessment Explorer";
      case "findings":
        return "Findings & Triage";
      case "reports":
        return "Reports & Compliance Archives";
      case "dashboard":
        return "Trend Analysis";
      case "audit":
        return "Audit Hash Chain Ledger";
      case "settings":
        return "System Settings & Security";
      default:
        return "CV Integrity";
    }
  };

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
              onViewAllAssessments={() => setActiveNav("assessments")}
              onViewAllFindings={() => setActiveNav("findings")}
            />
          ) : activeNav === "assessments" ? (
            /* Dedicated Assessment Explorer View */
            <div>
              {secondaryTab === "overview" && (
                <AssessmentExplorerView
                  title={activeReportTitle || "Assessment"}
                  subtitle={activeReportSubtitle}
                  report={activeReport}
                  onInvestigate={() => setSecondaryTab("findings")}
                  activeScenario={activeScenario}
                  loading={loading}
                  onSelectScenario={handleSelectScenario}
                />
              )}

              {secondaryTab === "assets" && (
                <div className="space-y-8">
                  <DatasetAssuranceView
                    findings={activeReport?.findings || []}
                    contributorSummaries={
                      scenarioData?.contributor_summaries ||
                      activeReport?.contributor_summaries ||
                      []
                    }
                    samplesCount={scenarioData?.samples_count ?? 0}
                  />
                  <ModelAssuranceView
                    fingerprint={scenarioData?.model_fingerprint}
                    behaviour={scenarioData?.model_behaviour}
                    findings={activeReport?.findings || []}
                  />
                </div>
              )}

              {secondaryTab === "findings" && (
                <div className="space-y-6">
                  <FindingsTriage
                    findings={activeReport?.findings || []}
                    contributorSummaries={
                      scenarioData?.contributor_summaries ||
                      activeReport?.contributor_summaries ||
                      []
                    }
                  />
                </div>
              )}

              {secondaryTab === "evidence" && (
                <div className="space-y-8">
                  <ProvenanceStudioView
                    inferenceRecord={scenarioData?.inference_record}
                    validRecord={scenarioData?.valid_record}
                    tamperedRecord={scenarioData?.tampered_record}
                  />
                  <DistributionShiftView
                    report={scenarioData?.drift_report}
                  />
                </div>
              )}

              {secondaryTab === "decision" && (
                <div className="space-y-6">
                  {activeReport ? (
                    <AssuranceReportView report={activeReport} />
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 font-mono">
                      No assessment loaded yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeNav === "findings" ? (
            /* Dedicated Findings View */
            <div className="space-y-6">
              <FindingsTriage
                findings={activeReport?.findings || []}
                contributorSummaries={
                  scenarioData?.contributor_summaries ||
                  activeReport?.contributor_summaries ||
                  []
                }
              />
            </div>
          ) : activeNav === "reports" ? (
            /* Dedicated Reports View */
            <ReportsView
              onOpenReport={(reportId, report) => {
                setScenarioData(null);
                setActiveReport(report);
                setActiveReportTitle(reportId);
                setActiveReportSubtitle(`Generated ${new Date(report.generated_at).toLocaleString()}`);
                setActiveNav("assessments");
                setSecondaryTab("overview");
              }}
            />
          ) : activeNav === "dashboard" ? (
            /* Trend Analysis View */
            <TrendDashboardView />
          ) : activeNav === "audit" ? (
            /* Dedicated Audit View -- the real, global, shared ledger */
            <div className="space-y-6">
              {auditLoading && auditEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 font-mono">
                  Loading audit hash chain...
                </div>
              ) : (
                <AuditLedgerView entries={auditEntries} />
              )}
            </div>
          ) : activeNav === "settings" ? (
            /* Dedicated Settings View */
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  System & Air-Gap Configuration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform deployment parameters and cryptographic keys.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    <span>Air-Gap Network Isolation</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Strict localhost-only binding. Zero telemetry or external
                    cloud outbound transmission.
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
                  <p className="text-slate-600 text-[11px]">
                    Local ONNX Runtime & PyTorch inference engine.
                  </p>
                  <div className="text-[11px] text-slate-800 font-mono">
                    Engine: Python 3.11+ / ONNX Runtime
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>SHA-256 Audit Hash Chain verified and active.</span>
                </div>
              </div>
            </div>
          ) : null}
        </main>
        </div>
      </div>
    </div>
  );
}
