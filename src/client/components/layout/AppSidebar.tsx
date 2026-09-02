"use client";

import React from "react";
import clsx from "clsx";
import {
  LayoutGrid,
  ClipboardCheck,
  Search,
  BarChart3,
  History,
  Settings,
  Plus,
} from "lucide-react";

export type NavItemKey =
  | "home"
  | "assessments"
  | "findings"
  | "reports"
  | "audit"
  | "settings";

interface AppSidebarProps {
  activeTab: NavItemKey;
  onNavigate: (tab: NavItemKey) => void;
  onNewAssessment: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onNavigate,
  onNewAssessment,
}) => {
  const navItems = [
    { key: "home" as const, label: "Home", icon: LayoutGrid },
    { key: "assessments" as const, label: "Assessments", icon: ClipboardCheck },
    { key: "findings" as const, label: "Findings", icon: Search },
    { key: "reports" as const, label: "Reports", icon: BarChart3 },
    { key: "audit" as const, label: "Audit", icon: History },
  ];

  return (
    <aside className="w-60 bg-white text-slate-800 border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-20 font-sans">
      {/* Top Header & Main Navigation */}
      <div className="pt-6 pb-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 pb-8">
          <div className="h-10 w-10 rounded-md bg-[#0f172a] text-slate-200 font-sans font-bold text-sm flex items-center justify-center shrink-0 shadow-xs tracking-tight">
            CV
          </div>
          <div>
            <div className="font-bold text-slate-950 text-base tracking-tight leading-tight">
              CV Integrity
            </div>
            <div className="text-[11px] font-mono text-slate-500 font-medium leading-tight mt-0.5">
              Assurance Platform
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <nav className="space-y-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={clsx(
                  "w-full flex items-center justify-between pl-5 pr-0 py-1 text-sm font-medium transition-colors text-left cursor-pointer group relative",
                  isActive
                    ? "text-[#0284c7] font-semibold"
                    : "text-slate-700 hover:text-slate-950"
                )}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={clsx(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? "text-[#0284c7] stroke-[2.2]"
                        : "text-slate-700 group-hover:text-slate-950 stroke-[1.9]"
                    )}
                  />
                  <span className="leading-none">{item.label}</span>
                </div>

                {/* Right Edge Cyan Vertical Pill Indicator */}
                {isActive && (
                  <span className="w-1 h-6 bg-[#0284c7] rounded-l-full shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Action & Settings Section */}
      <div className="p-4 pb-6">
        {/* Pitch Black New Assessment Button */}
        <button
          onClick={onNewAssessment}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-black hover:bg-neutral-900 active:bg-neutral-950 text-white font-mono font-bold text-xs py-3 px-4 uppercase tracking-wider transition-all shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>New Assessment</span>
        </button>

        {/* Divider */}
        <div className="border-t border-slate-200 mt-4 mb-3" />

        {/* Settings Link */}
        <button
          onClick={() => onNavigate("settings")}
          className={clsx(
            "w-full flex items-center gap-3.5 px-1 py-1.5 text-sm font-medium transition-colors text-left cursor-pointer group",
            activeTab === "settings"
              ? "text-[#0284c7] font-semibold"
              : "text-slate-700 hover:text-slate-950"
          )}
        >
          <Settings
            className={clsx(
              "h-5 w-5 shrink-0 transition-colors",
              activeTab === "settings"
                ? "text-[#0284c7] stroke-[2.2]"
                : "text-slate-700 group-hover:text-slate-950 stroke-[1.9]"
            )}
          />
          <span className="leading-none">Settings</span>
        </button>
      </div>
    </aside>
  );
};
