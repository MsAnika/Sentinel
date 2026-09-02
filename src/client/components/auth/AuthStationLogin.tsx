"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  Shield,
  Lock,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  Cpu,
} from "lucide-react";

export interface OperatorProfile {
  id: string;
  name: string;
  role: "analyst" | "admin";
  roleTitle: string;
  department: string;
  initials: string;
  avatarColor: string;
}

export const OPERATOR_PROFILES: OperatorProfile[] = [
  {
    id: "0x8F9A",
    name: "Dr. A. Turing",
    role: "analyst",
    roleTitle: "Lead Assurance Analyst",
    department: "DGIS / CV Integrity Unit",
    initials: "AT",
    avatarColor: "bg-slate-900 text-white",
  },
  {
    id: "USR-992",
    name: "SYSADMIN",
    role: "admin",
    roleTitle: "Platform Security Admin",
    department: "MoD Air-Gap Infrastructure",
    initials: "SA",
    avatarColor: "bg-slate-800 text-sky-400",
  },
  {
    id: "0x4B21",
    name: "E. Lovelace",
    role: "analyst",
    roleTitle: "Neural Forensics Specialist",
    department: "Vision & Sensor Analytics",
    initials: "EL",
    avatarColor: "bg-slate-900 text-white",
  },
];

interface AuthStationLoginProps {
  onAuthenticated: (operator: OperatorProfile) => void;
}

export const AuthStationLogin: React.FC<AuthStationLoginProps> = ({
  onAuthenticated,
}) => {
  const [selectedOperator, setSelectedOperator] = useState<OperatorProfile>(
    OPERATOR_PROFILES[0]
  );
  const [passphrase, setPassphrase] = useState<string>("••••••••••••");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setError("Station access token / passphrase required.");
      return;
    }
    setLoading(true);
    setError(null);

    setTimeout(() => {
      setLoading(false);
      onAuthenticated(selectedOperator);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4 antialiased font-sans text-slate-100 relative overflow-hidden">
      {/* Background Decorative Tech Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-2xl p-8 relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-[#0f172a] text-white items-center justify-center shadow-md ring-4 ring-slate-100">
            <Shield className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950 tracking-tight">
              CV Integrity Assurance
            </h1>
            <p className="text-[11px] font-mono text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Air-Gapped Station Access
            </p>
          </div>
        </div>

        {/* Air-gap Telemetry Badge */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AIR-GAP ENFORCED: LOCALHOST ONLY</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-700/80 mt-0.5">
            Zero telemetry / No external egress / SHA-256 Chain Active
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
          {/* Operator Select */}
          <div className="space-y-1.5">
            <label className="block font-mono font-bold text-slate-700 uppercase text-[10px] tracking-wider">
              Select Operating Officer
            </label>
            <div className="space-y-2">
              {OPERATOR_PROFILES.map((op) => {
                const isSelected = selectedOperator.id === op.id;
                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOperator(op)}
                    className={clsx(
                      "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                      isSelected
                        ? "bg-slate-50 border-2 border-slate-900 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          "h-8 w-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-2xs",
                          op.avatarColor
                        )}
                      >
                        {op.initials}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{op.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            ({op.id})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {op.roleTitle}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Passphrase Input */}
          <div className="space-y-1.5 pt-1">
            <label className="block font-mono font-bold text-slate-700 uppercase text-[10px] tracking-wider">
              Station Security Key / Token
            </label>
            <div className="relative">
              <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter air-gap passkey..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
          >
            <span>{loading ? "AUTHENTICATING..." : "AUTHENTICATE STATION"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3 text-slate-400" />
            <span>Engine: Python 3.11 / PyTorch</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-slate-400" />
            <span>Ed25519 Signatures</span>
          </div>
        </div>
      </div>
    </div>
  );
};
