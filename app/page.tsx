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
import { AssuranceApiClient } from "@/client/lib/api-client";
import { ScenarioRunResult } from "@/shared/types/assurance";
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
  const [selectedAssessmentId, setSelectedAssessmentId] =
    useState<string>("satellite-v2");

  useEffect(() => {
    AssuranceApiClient.runScenario("A")
      .then((data) => setScenarioData(data))
      .catch((err) => console.error("Scenario load:", err));
  }, []);

  const handleSelectScenario = async (scenarioId: string) => {
    setLoading(true);
    setActiveScenario(scenarioId);
    try {
      const data = await AssuranceApiClient.runScenario(scenarioId);
      setScenarioData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = async () => {
    setLoading(true);
    try {
      const res = await AssuranceApiClient.runScenario("A");
      setScenarioData(res);
      setShowWizard(false);
      setActiveNav("assessments");
      setSecondaryTab("overview");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToAssessment = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setActiveNav("assessments");
    setSecondaryTab("overview");
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
                  activeAssessmentId={selectedAssessmentId}
                  onInvestigate={() => setSecondaryTab("findings")}
                  activeScenario={activeScenario}
                  loading={loading}
                  onSelectScenario={handleSelectScenario}
                />
              )}

              {secondaryTab === "assets" && (
                <div className="space-y-8">
                  {scenarioData ? (
                    <>
                      <DatasetAssuranceView
                        findings={scenarioData.report.findings}
                        contributorSummaries={
                          scenarioData.contributor_summaries || []
                        }
                        samplesCount={scenarioData.samples_count ?? 0}
                      />
                      <ModelAssuranceView
                        fingerprint={scenarioData.model_fingerprint}
                        behaviour={scenarioData.model_behaviour}
                        findings={scenarioData.report.findings}
                      />
                    </>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 font-mono">
                      Loading assets...
                    </div>
                  )}
                </div>
              )}

              {secondaryTab === "findings" && (
                <div className="space-y-6">
                  {scenarioData ? (
                    <FindingsTriage
                      findings={scenarioData.report.findings}
                      contributorSummaries={
                        scenarioData.contributor_summaries ||
                        scenarioData.report.contributor_summaries
                      }
                    />
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 font-mono">
                      Loading findings database...
                    </div>
                  )}
                </div>
              )}

              {secondaryTab === "evidence" && (
                <div className="space-y-8">
                  {scenarioData ? (
                    <>
                      <ProvenanceStudioView
                        inferenceRecord={scenarioData.inference_record}
                        validRecord={scenarioData.valid_record}
                        tamperedRecord={scenarioData.tampered_record}
                      />
                      <DistributionShiftView
                        report={scenarioData.drift_report}
                      />
                    </>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 font-mono">
                      Loading evidence telemetry...
                    </div>
                  )}
                </div>
              )}

              {secondaryTab === "decision" && (
                <div className="space-y-6">
                  {scenarioData ? (
                    <AssuranceReportView report={scenarioData.report} />
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 font-mono">
                      Loading assurance decision report...
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeNav === "findings" ? (
            /* Dedicated Findings View */
            <div className="space-y-6">
              {scenarioData ? (
                <FindingsTriage
                  findings={scenarioData.report.findings}
                  contributorSummaries={
                    scenarioData.contributor_summaries ||
                    scenarioData.report.contributor_summaries
                  }
                />
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 font-mono">
                  Loading findings triage...
                </div>
              )}
            </div>
          ) : activeNav === "reports" ? (
            /* Dedicated Reports View */
            <ReportsView
              onOpenReport={() => {
                setActiveNav("assessments");
                setSecondaryTab("decision");
              }}
            />
          ) : activeNav === "audit" ? (
            /* Dedicated Audit View */
            <div className="space-y-6">
              {scenarioData ? (
                <AuditLedgerView entries={scenarioData.audit_entries || []} />
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 font-mono">
                  Loading audit hash chain...
                </div>
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
                    Engine: Python 3.11 / ONNX 1.16+
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
