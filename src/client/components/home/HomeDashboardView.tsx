"use client";

import React from "react";
import clsx from "clsx";
import {
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Shield,
  Activity,
  Lock,
  Radio,
} from "lucide-react";

interface HomeDashboardViewProps {
  onNavigateToAssessment: (assessmentId: string) => void;
  onViewAllAssessments: () => void;
  onViewAllFindings: () => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  onNavigateToAssessment,
  onViewAllAssessments,
  onViewAllFindings,
}) => {
  const needingAttentionList = [
    {
      id: "satellite-v2",
      name: "Satellite Detector v2",
      caseId: "#AS-2026-019",
      tags: ["Model", "Dataset", "Inference"],
      score: 28,
      disposition: "QUARANTINE",
      riskText: "Critical Backdoor Risk",
      updated: "2h ago",
      accent: "border-l-4 border-l-rose-500",
      tone: "rose",
    },
    {
      id: "urban-seg",
      name: "Urban Segmentation Model",
      caseId: "#AS-2026-014",
      tags: ["Model", "Dataset", "Inference"],
      score: 62,
      disposition: "REVIEW",
      riskText: "High Distribution Shift",
      updated: "1d ago",
      accent: "border-l-4 border-l-amber-500",
      tone: "amber",
    },
    {
      id: "traffic-flow",
      name: "Traffic Flow Analyzer",
      caseId: "#AS-2026-009",
      tags: ["Model", "Dataset", "Inference"],
      score: 68,
      disposition: "REVIEW",
      riskText: "Night Anomaly Drift",
      updated: "2d ago",
      accent: "border-l-4 border-l-amber-500",
      tone: "amber",
    },
  ];

  const recentAssessments = [
    {
      id: "forest-change",
      name: "Forest Change Detector",
      caseId: "#AS-2026-008",
      tags: ["Dataset", "Model", "Inference"],
      score: 82,
      disposition: "ACCEPTED",
      updated: "1 day ago",
    },
    {
      id: "crop-health",
      name: "Crop Health Classifier",
      caseId: "#AS-2026-005",
      tags: ["Dataset", "Model", "Inference"],
      score: 76,
      disposition: "ACCEPTED",
      updated: "2 days ago",
    },
    {
      id: "object-det",
      name: "Object Detection v1",
      caseId: "#AS-2026-003",
      tags: ["Dataset", "Model", "Inference"],
      score: 55,
      disposition: "REVIEW",
      updated: "3 days ago",
    },
    {
      id: "building-footprint",
      name: "Building Footprint Extractor",
      caseId: "#AS-2026-002",
      tags: ["Dataset", "Model", "Inference"],
      score: 79,
      disposition: "ACCEPTED",
      updated: "4 days ago",
    },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Executive Welcome & Air-Gap Telemetry Banner */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>OPERATIONAL INTEGRITY CORE</span>
            <span>•</span>
            <span className="text-slate-700 font-semibold">100% AIR-GAPPED</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            CV Trust & Fleet Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time assurance metrics across all active models, datasets, and inference pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-mono">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-slate-700 font-medium">Outbound: Blocked</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-mono">
            <Radio className="h-3.5 w-3.5 text-sky-600" />
            <span className="text-slate-700 font-medium">Hash Chain: Intact</span>
          </div>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Assessments */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shrink-0">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              20
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Total Assessments
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">All time</div>
          </div>
        </div>

        {/* Needs Attention */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              3
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Needs Attention
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Require review
            </div>
          </div>
        </div>

        {/* High Risk Findings */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              8
            </div>
            <div className="text-xs font-semibold text-slate-700">
              High Risk Findings
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Across models
            </div>
          </div>
        </div>

        {/* Accepted Assessments */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              12
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Accepted Assessments
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Trusted in production
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Assessments Needing Attention */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Assessments Needing Attention
              </h2>
            </div>
            <button
              onClick={onViewAllAssessments}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-2">
            {needingAttentionList.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigateToAssessment(item.id)}
                className={clsx(
                  "flex items-center justify-between p-3.5 rounded-lg bg-slate-50/50 hover:bg-slate-100/70 cursor-pointer transition-all border border-slate-200/80",
                  item.accent
                )}
              >
                <div className="min-w-0 pr-3">
                  <div className="font-bold text-slate-900 text-sm truncate">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                    <span>{item.caseId}</span>
                    <span>•</span>
                    <span className="text-rose-600 font-medium">{item.riskText}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 font-sans">
                      {item.score}
                      <span className="text-[11px] font-normal text-slate-400">
                        /100
                      </span>
                    </div>
                  </div>

                  <span
                    className={clsx(
                      "px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                      item.disposition === "QUARANTINE"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-800"
                    )}
                  >
                    {item.disposition}
                  </span>

                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Platform Health & Quick Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Fleet Integrity Status
                </h2>
              </div>
              <button
                onClick={onViewAllFindings}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
              >
                Triage
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Verified Air-Gapped Models</span>
                <span className="font-mono font-bold text-slate-900">8 / 11</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-sky-500 h-2 rounded-full" style={{ width: "72%" }} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-600">Dataset Prov-Check Rate</span>
                <span className="font-mono font-bold text-slate-900">96.4%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "96.4%" }} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-600">Active Sensor Drift Alerts</span>
                <span className="font-mono font-bold text-amber-600">2 Low-Risk</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-3">
              Recent Activity
            </h3>
            <div className="space-y-3 text-xs">
              {recentAssessments.slice(0, 3).map((ra) => (
                <div key={ra.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="font-semibold text-slate-900">{ra.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{ra.updated}</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    {ra.score}/100
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
