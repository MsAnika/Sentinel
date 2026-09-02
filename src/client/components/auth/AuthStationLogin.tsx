"use client";

import React, { useState } from "react";
import {
  Shield,
  Lock,
  KeyRound,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { AssuranceApiClient } from "@/client/lib/api-client";

export interface OperatorProfile {
  /** Free-text name entered at the login screen, used only for local
   * display and for attribution on actions this station records (e.g. the
   * `actor` field on a recorded assurance decision) -- it is not a
   * credential and is not verified against anything. */
  name: string;
  /** The role the backend's real X-API-Key gate (backend/api/auth.py)
   * resolved the presented key to. `null` means this deployment has no
   * keys configured at all -- a single-workstation posture with no other
   * users on the network path, per that gate's own documented behavior. */
  role: "analyst" | "admin" | null;
}

interface AuthStationLoginProps {
  onAuthenticated: (operator: OperatorProfile) => void;
}

export const AuthStationLogin: React.FC<AuthStationLoginProps> = ({
  onAuthenticated,
}) => {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Operator name is required.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await AssuranceApiClient.whoami(apiKey.trim());
      AssuranceApiClient.setApiKey(apiKey.trim() || null);
      onAuthenticated({
        name: name.trim(),
        role: (result.role as "analyst" | "admin" | null) ?? null,
      });
    } catch {
      setError(
        "Station key rejected. Verify the X-API-Key value with your platform administrator, or leave it blank if this deployment has no keys configured."
      );
    } finally {
      setLoading(false);
    }
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
          {/* Operator Name */}
          <div className="space-y-1.5">
            <label className="block font-mono font-bold text-slate-700 uppercase text-[10px] tracking-wider">
              Operator Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. A. Sharma"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <p className="text-[10px] text-slate-400">
              Used for local attribution only (e.g. who recorded a decision) -- not a credential.
            </p>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5 pt-1">
            <label className="block font-mono font-bold text-slate-700 uppercase text-[10px] tracking-wider">
              Station API Key (X-API-Key)
            </label>
            <div className="relative">
              <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Leave blank if this deployment has no keys configured"
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
            <span>{loading ? "VERIFYING KEY..." : "AUTHENTICATE STATION"}</span>
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
