import React, { useEffect, useState } from "react";
import { Shield, Cpu, Lock, Radio } from "lucide-react";

export const Header: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50">
      <div className="flex h-7 items-center justify-between bg-zinc-900/90 px-4 text-[10px] font-mono tracking-widest text-zinc-400 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-zinc-300 font-bold">
            MINISTRY OF DEFENCE (MoD) — INDIAN ARMY (DGIS)
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-amber-400 font-bold">PS ID: 26228</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <Lock className="h-3 w-3" />
            AIR-GAPPED — ZERO EXTERNAL NETWORK
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-300">
            {timeStr || "SYNCHRONIZING CLOCK..."}
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono tracking-wider text-zinc-100">
                IntelX
              </h1>
              <span className="rounded bg-emerald-950 border border-emerald-600/50 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 font-semibold">
                v1.0.0 AIR-GAP
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Trustworthy Computer Vision Integrity Assurance Platform
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 rounded bg-zinc-900 border border-zinc-800 px-3 py-1.5">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-zinc-400">ENGINE ACCESS</div>
              <div className="font-bold text-zinc-200">
                LOCAL EVALUATION CORE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded bg-zinc-900 border border-zinc-800 px-3 py-1.5">
            <Radio className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-zinc-400">AUDIT HASH CHAIN</div>
              <div className="font-bold text-emerald-400">IMMUTABLE ACTIVE</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
