"use client";

import React from "react";
import clsx from "clsx";
import {
  Home,
  BarChart2,
  AlertOctagon,
  FileText,
  ShieldCheck,
  Shield,
  User,
} from "lucide-react";
import { OperatorProfile } from "@/client/components/auth/AuthStationLogin";

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
  operator?: OperatorProfile | null;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onNavigate,
  operator,
}) => {
  const navItems = [
    { key: "home" as const, label: "Home", icon: Home },
    { key: "assessments" as const, label: "Assessments", icon: BarChart2 },
    { key: "findings" as const, label: "Findings", icon: AlertOctagon },
    { key: "reports" as const, label: "Reports", icon: FileText },
    { key: "audit" as const, label: "Audit", icon: ShieldCheck },
  ];

  return (
    <aside className="w-56 bg-white text-slate-800 border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-20 font-sans">
      {/* Top Header & Main Navigation */}
      <div className="pt-5 pb-4">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-4 pb-6">
          <div className="h-8 w-8 rounded-md bg-[#0f172a] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Shield className="h-4 w-4 text-sky-400" />
          </div>
          <div>
            <div className="font-bold text-slate-950 text-sm tracking-tight leading-tight">
              CV Integrity
            </div>
            <div className="text-[9px] font-mono text-slate-500 font-semibold uppercase tracking-wider leading-tight mt-0.5">
              Precision AI Assurance
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all text-left cursor-pointer group relative",
                  isActive
                    ? "bg-slate-100 text-slate-950 font-bold border-r-2 border-sky-500 rounded-r-none"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={clsx(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-slate-950 stroke-[2.2]"
                        : "text-slate-500 group-hover:text-slate-800 stroke-[1.8]"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Widget: real logged-in operator, when known */}
      <div className="p-4 border-t border-slate-100">
        {operator ? (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-slate-800 text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
              {initialsOf(operator.name)}
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-bold text-slate-900 truncate">{operator.name}</div>
              <div className="font-mono text-[10px] text-slate-400 truncate">
                {operator.role ? `ROLE: ${operator.role.toUpperCase()}` : "NO AUTH CONFIGURED"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-slate-400">
            <User className="h-4 w-4" />
            <span className="text-xs">Not signed in</span>
          </div>
        )}
      </div>
    </aside>
  );
};
