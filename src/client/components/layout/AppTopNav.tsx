"use client";

import React from "react";
import {
  Search,
  History,
  Download,
  MoreVertical,
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
  searchPlaceholder?: string;
  shortcutKey?: string;
}

export const AppTopNav: React.FC<AppTopNavProps> = ({
  activeSecondaryTab = "overview",
  onSecondaryTabChange,
  showSecondaryTabs = false,
  searchPlaceholder = "Search findings, models, IDs...",
  shortcutKey = "⌘K",
}) => {
  const secondaryTabs = [
    { key: "overview" as const, label: "OVERVIEW" },
    { key: "assets" as const, label: "ASSETS" },
    { key: "findings" as const, label: "FINDINGS" },
    { key: "evidence" as const, label: "EVIDENCE" },
    { key: "decision" as const, label: "DECISION" },
  ];

  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-slate-200/80 bg-white sticky top-0 z-10 shrink-0 font-sans">
      <div className="flex items-center gap-8">
        {showSecondaryTabs && onSecondaryTabChange ? (
          <div className="flex items-center gap-8">
            <div className="shrink-0">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                Assessment Explorer
              </h1>
              <div className="font-mono text-[10px] text-slate-400 font-medium tracking-wide">
                AS-2026-019
              </div>
            </div>

            <nav className="flex items-center gap-6 text-xs font-mono font-bold">
              {secondaryTabs.map((tab) => {
                const isActive = activeSecondaryTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => onSecondaryTabChange(tab.key)}
                    className={clsx(
                      "py-5 transition-all relative cursor-pointer tracking-wider",
                      isActive
                        ? "text-slate-950 font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ) : (
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-80 sm:w-96 bg-slate-100/90 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 pl-8.5 pr-8 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white transition-all font-mono"
            />
            {shortcutKey && (
              <span className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1 py-0.5 rounded shadow-2xs">
                {shortcutKey}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {showSecondaryTabs && (
          <div className="relative mr-2">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-44 bg-slate-100/90 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 pl-8.5 pr-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white transition-all font-mono"
            />
          </div>
        )}

        <button
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="History"
        >
          <History className="h-4 w-4" />
        </button>

        <button
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Download Export"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {/* User profile avatar */}
        <div className="h-7 w-7 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center ml-1 ring-1 ring-slate-200 shadow-xs">
          AD
        </div>
      </div>
    </header>
  );
};
