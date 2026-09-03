"use client";

import React from "react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BarChart2,
  AlertOctagon,
  FileText,
  ShieldCheck,
  Shield,
  Settings,
} from "lucide-react";
import { useAtomValue } from "jotai";
import { operatorAtom } from "@/client/state/atoms";

export type NavItemKey =
  | "home"
  | "assessments"
  | "findings"
  | "reports"
  | "audit"
  | "settings";

interface AppSidebarProps {
  activeTab?: NavItemKey;
  onNavigate?: (tab: NavItemKey) => void;
  onNewAssessment?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab: propActiveTab,
  onNavigate,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const operator = useAtomValue(operatorAtom);

  const getActiveTab = (): NavItemKey => {
    if (propActiveTab) return propActiveTab;
    if (pathname.startsWith("/assessments")) return "assessments";
    if (pathname.startsWith("/findings")) return "findings";
    if (pathname.startsWith("/reports")) return "reports";
    if (pathname.startsWith("/audit")) return "audit";
    if (pathname.startsWith("/settings")) return "settings";
    return "home";
  };

  const activeTab = getActiveTab();

  const navItems = [
    { key: "home" as const, label: "Home", href: "/", icon: Home },
    { key: "assessments" as const, label: "Assessments", href: "/assessments", icon: BarChart2 },
    { key: "findings" as const, label: "Findings", href: "/findings", icon: AlertOctagon },
    { key: "reports" as const, label: "Reports", href: "/reports", icon: FileText },
    { key: "audit" as const, label: "Audit", href: "/audit", icon: ShieldCheck },
    { key: "settings" as const, label: "Settings", href: "/settings", icon: Settings },
  ];

  const handleItemClick = (key: NavItemKey, href: string) => {
    if (onNavigate) {
      onNavigate(key);
    } else {
      router.push(href);
    }
  };

  const initials = operator?.name
    ? operator.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "OP";

  return (
    <aside className="w-56 bg-white text-slate-800 border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-20 font-sans">
      {/* Top Header & Main Navigation */}
      <div className="pt-5 pb-4">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-2.5 px-4 pb-6 group">
          <div className="h-8 w-8 rounded-md bg-[#0f172a] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-slate-800 transition-colors">
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
        </Link>

        {/* Navigation Items List */}
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item.key, item.href)}
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

      {/* Bottom Footer Widget */}
      <div className="p-4 border-t border-slate-100">
        {operator ? (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-slate-900 text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-bold text-slate-900 truncate">
                {operator.name}
              </div>
              <div className="font-mono text-[10px] text-slate-400 truncate uppercase">
                {operator.role ? `Role: ${operator.role}` : "Air-Gap Station"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>
              System: <strong className="text-slate-800">AIR-GAPPED</strong>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
