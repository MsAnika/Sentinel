"use client";

import React, { useState } from "react";
import { Header } from "@/client/components/layout/Header";
import { Breadcrumbs } from "@/client/components/layout/Breadcrumbs";
import { ScenarioSelector } from "@/client/components/scenarios/ScenarioSelector";
import { DatasetAssuranceView } from "@/client/components/dataset/DatasetAssuranceView";
import { ModelAssuranceView } from "@/client/components/model/ModelAssuranceView";
import { ProvenanceStudioView } from "@/client/components/provenance/ProvenanceStudioView";
import { DistributionShiftView } from "@/client/components/drift/DistributionShiftView";
import { AuditLedgerView } from "@/client/components/audit/AuditLedgerView";
import { AssuranceReportView } from "@/client/components/report/AssuranceReportView";
import { AssessmentResultCard } from "@/client/components/assessment/AssessmentResultCard";
import { FindingsTriage } from "@/client/components/assessment/FindingsTriage";
import { HomeView } from "@/client/components/home/HomeView";
import { ReportsView } from "@/client/components/reports/ReportsView";
import { AssuranceApiClient } from "@/client/lib/api-client";
import { AssuranceReport, ScenarioRunResult } from "@/shared/types/assurance";
import {
  Layers,
  Link2,
  Shield,
  FlaskConical,
  UploadCloud,
  BarChart3,
  Search,
  History,
  Home as HomeIcon,
  FileStack,
} from "lucide-react";
import clsx from "clsx";
import { LiveAnalysisView } from "@/client/components/live/LiveAnalysisView";
import { TrendDashboardView } from "@/client/components/dashboard/TrendDashboardView";

type AppMode = "home" | "reports" | "scenarios" | "live" | "dashboard";
type SecondaryTab = "assets" | "findings" | "evidence" | "report" | "audit";

const APP_MODE_LABELS: Record<AppMode, string> = {
  home: "Home",
  reports: "Reports",
  scenarios: "Scenario Replay",
  live: "Live Analysis",
  dashboard: "Dashboard",
};

export default function DashboardPage() {
  const [appMode, setAppMode] = useState<AppMode>("home");
  const [activeScenario, setActiveScenario] = useState<string>("A");
  const [activeTab, setActiveTab] = useState<SecondaryTab>("findings");
  const [scenarioData, setScenarioData] = useState<ScenarioRunResult | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);

  // A report opened from Home's triage list or the Reports history. It
  // carries only what's actually persisted in the AssuranceReport
  // (findings, contributor summaries, coverage) -- not the live-only side
  // channels (raw model fingerprint objects, inference records) a fresh
  // Scenario Replay/Live Analysis run also produces, so its drill-down
  // surface is Findings + Report only, not the full Assets/Evidence tabs.
  const [openedReport, setOpenedReport] = useState<AssuranceReport | null>(
    null,
  );
  const [openedReportId, setOpenedReportId] = useState<string | null>(null);
  const [openedFrom, setOpenedFrom] = useState<"home" | "reports">("home");
  const [openedTab, setOpenedTab] = useState<"findings" | "report">(
    "findings",
  );

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

  const openScenariosMode = () => {
    setOpenedReport(null);
    setAppMode("scenarios");
    if (!scenarioData) {
      handleSelectScenario(activeScenario);
    }
  };

  const openReport = (
    reportId: string,
    report: AssuranceReport,
    from: "home" | "reports",
  ) => {
    setOpenedReportId(reportId);
    setOpenedReport(report);
    setOpenedFrom(from);
    setOpenedTab("findings");
  };

  // Reduced from a flat 6-item tab bar of backend-module names down to the
  // analyst's actual investigation surfaces: Findings is the triage
  // entry point (default), Assets groups the dataset/model panels that
  // used to be separate top-level destinations, Evidence groups the
  // cryptographic/drift technical detail, and Audit is deliberately last
  // -- governance infrastructure available on demand, not something that
  // interrupts the investigation.
  const tabs = [
    { id: "findings", label: "FINDINGS", icon: Search },
    { id: "assets", label: "ASSETS", icon: Layers },
    { id: "evidence", label: "EVIDENCE", icon: Link2 },
    { id: "report", label: "REPORT", icon: Shield },
    { id: "audit", label: "AUDIT", icon: History },
  ] as const;

  const navButtons: Array<{ id: AppMode; label: string; icon: typeof FlaskConical }> = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "reports", label: "Reports", icon: FileStack },
    { id: "scenarios", label: "Scenario Replay", icon: FlaskConical },
    { id: "live", label: "Live Analysis", icon: UploadCloud },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  // Persistent trail so the analyst always knows where they are, and can
  // jump back a level in one click rather than repeated "back" presses.
  const breadcrumbItems = openedReport
    ? [
        {
          label: APP_MODE_LABELS[openedFrom],
          onClick: () => setOpenedReport(null),
        },
        { label: openedReportId || "Assessment", onClick: () => setOpenedTab("findings") },
        { label: openedTab },
      ]
    : appMode === "scenarios" && scenarioData
      ? [{ label: "Scenario Replay" }, { label: scenarioData.title, onClick: () => setActiveTab("findings") }, { label: activeTab }]
      : [{ label: APP_MODE_LABELS[appMode] }];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <Breadcrumbs items={breadcrumbItems} />

        {openedReport ? (
          // -- Investigation drill-down for a report opened from Home/Reports --
          <div className="space-y-6">
            <AssessmentResultCard
              title={openedReportId || "Assessment"}
              subtitle={`Generated ${new Date(openedReport.generated_at).toLocaleString()}`}
              report={openedReport}
              onInvestigate={() => setOpenedTab("findings")}
            />

            <div className="border-b border-zinc-800 flex overflow-x-auto gap-2 pb-px text-xs">
              {(
                [
                  { id: "findings", label: "FINDINGS", icon: Search },
                  { id: "report", label: "REPORT", icon: Shield },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = openedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setOpenedTab(tab.id)}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2.5 font-bold tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer",
                      isActive
                        ? "border-cyan-400 text-cyan-300 bg-zinc-900/60"
                        : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {openedTab === "findings" && (
              <FindingsTriage
                findings={openedReport.findings}
                contributorSummaries={openedReport.contributor_summaries}
              />
            )}
            {openedTab === "report" && (
              <AssuranceReportView report={openedReport} />
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2 text-xs overflow-x-auto">
              {navButtons.map((nav) => {
                const Icon = nav.icon;
                const isActive = appMode === nav.id;
                return (
                  <button
                    key={nav.id}
                    onClick={() =>
                      nav.id === "scenarios" ? openScenariosMode() : setAppMode(nav.id)
                    }
                    className={clsx(
                      "flex items-center gap-2 rounded-t border border-b-0 px-4 py-2 font-bold tracking-wider uppercase transition-colors cursor-pointer whitespace-nowrap",
                      isActive
                        ? "border-cyan-700/60 bg-zinc-900 text-cyan-300"
                        : "border-transparent text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    <Icon className="h-4 w-4" /> {nav.label}
                  </button>
                );
              })}
            </div>

            {appMode === "home" ? (
              <HomeView
                onOpenReport={(id, report) => openReport(id, report, "home")}
                onNewAssessment={openScenariosMode}
              />
            ) : appMode === "reports" ? (
              <ReportsView
                onOpenReport={(id, report) => openReport(id, report, "reports")}
              />
            ) : appMode === "dashboard" ? (
              <TrendDashboardView />
            ) : appMode === "live" ? (
              <LiveAnalysisView />
            ) : (
              <>
                {/* Visually distinct from a real assessment: these are
                    synthetic attack fixtures for demo/validation, and
                    must never be mistaken for an operational finding. */}
                <div className="inline-flex items-center gap-1.5 rounded border border-amber-700/50 bg-amber-950/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  <FlaskConical className="h-3 w-3" /> Demonstration / Validation Mode — Synthetic Attack Fixtures, Not a Live Assessment
                </div>
                <ScenarioSelector
                  activeScenario={activeScenario}
                  loading={loading}
                  onSelectScenario={handleSelectScenario}
                />

                {loading ? (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-12 text-center text-xs text-zinc-400 space-y-3">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    <div>RUNNING AIR-GAPPED ASSURANCE PIPELINE...</div>
                  </div>
                ) : scenarioData ? (
                  <div className="space-y-6">
                    {/* The case-file summary is always visible -- it IS the
                        overview. The tabs below are drill-downs from it, not
                        competing top-level destinations. */}
                    <AssessmentResultCard
                      title={scenarioData.title}
                      subtitle={scenarioData.description}
                      report={scenarioData.report}
                      onInvestigate={() => setActiveTab("findings")}
                    />

                    <div className="border-b border-zinc-800 flex overflow-x-auto gap-2 pb-px text-xs">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                              "flex items-center gap-2 px-4 py-2.5 font-bold tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer",
                              isActive
                                ? "border-cyan-400 text-cyan-300 bg-zinc-900/60"
                                : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {activeTab === "findings" && (
                      <FindingsTriage
                        findings={scenarioData.report.findings}
                        contributorSummaries={
                          scenarioData.contributor_summaries ||
                          scenarioData.report.contributor_summaries
                        }
                      />
                    )}

                    {activeTab === "assets" && (
                      <div className="space-y-8">
                        <DatasetAssuranceView
                          findings={scenarioData.report.findings}
                          contributorSummaries={
                            scenarioData.contributor_summaries || []
                          }
                          samplesCount={scenarioData.samples_count || 40}
                        />
                        <ModelAssuranceView
                          fingerprint={scenarioData.model_fingerprint}
                          behaviour={scenarioData.model_behaviour}
                          findings={scenarioData.report.findings}
                        />
                      </div>
                    )}

                    {activeTab === "evidence" && (
                      <div className="space-y-8">
                        <ProvenanceStudioView
                          inferenceRecord={scenarioData.inference_record}
                          validRecord={scenarioData.valid_record}
                          tamperedRecord={scenarioData.tampered_record}
                        />
                        <DistributionShiftView
                          report={scenarioData.drift_report}
                        />
                      </div>
                    )}

                    {activeTab === "audit" && (
                      <AuditLedgerView
                        entries={scenarioData.audit_entries || []}
                      />
                    )}

                    {activeTab === "report" && (
                      <AssuranceReportView report={scenarioData.report} />
                    )}
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-3 text-center text-[10px] text-zinc-500 font-mono">
        IntelX ASSURANCE PLATFORM • DEVELOPED FOR INDIAN ARMY (DGIS) / MoD •
        PROBLEM STATEMENT ID: 26228 • 100% AIR-GAPPED
      </footer>
    </div>
  );
}
