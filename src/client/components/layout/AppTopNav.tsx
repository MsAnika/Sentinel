"use client";

import React from "react";
import {
  Search,
  MoreVertical,
  Download,
  History,
} from "lucide-react";
import clsx from "clsx";

export type ExplorerSecondaryTab =
  | "overview"
  | "assets"
  | "findings"
  | "evidence"
  | "decision";

interface AppTopNavProps {
  title?: string;
  activeSecondaryTab?: ExplorerSecondaryTab;
  onSecondaryTabChange?: (tab: ExplorerSecondaryTab) => void;
  showSecondaryTabs?: boolean;
}

export const AppTopNav: React.FC<AppTopNavProps> = ({
  title = "Assessment Explorer",
  activeSecondaryTab = "overview",
  onSecondaryTabChange,
  showSecondaryTabs = true,
}) => {
  const secondaryTabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "assets" as const, label: "Assets" },
    { key: "findings" as const, label: "Findings" },
    { key: "evidence" as const, label: "Evidence" },
    { key: "decision" as const, label: "Decision" },
  ];

  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-slate-200/80 bg-white sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-8">
        <h1 className="text-base font-bold text-slate-900 tracking-tight shrink-0">
          {title}
        </h1>

        {showSecondaryTabs && onSecondaryTabChange && (
          <nav className="flex items-center gap-6 text-xs font-medium">
            {secondaryTabs.map((tab) => {
              const isActive = activeSecondaryTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onSecondaryTabChange(tab.key)}
                  className={clsx(
                    "py-5 transition-all relative cursor-pointer",
                    isActive
                      ? "text-slate-900 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search Input matching Image 1 & 2 */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search assessments..."
            className="w-56 bg-slate-100/90 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 pl-8.5 pr-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white transition-all font-mono"
          />
        </div>

        {/* Action icons */}
        <button
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="More Options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        <button
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Export Report"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="History & Audit"
        >
          <History className="h-4 w-4" />
        </button>

        {/* User profile avatar */}
        <div className="h-7 w-7 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center ml-1 ring-1 ring-slate-200 shadow-xs">
          AD
        </div>
      </div>
    </header>
  );
};
