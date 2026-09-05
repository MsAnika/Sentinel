"use client";

import React, { useState } from "react";
import { Network, ShieldAlert, ShieldCheck, Play, KeyRound } from "lucide-react";
import { StatCard } from "../ui/StatCard";
import { AssuranceApiClient } from "@/client/lib/api-client";
import { FederatedSimulationResult } from "@/shared/types/assurance";

const AVAILABLE_BRANCHES = ["army", "navy", "airforce"] as const;

export const FederatedLearningView: React.FC = () => {
  const [selectedBranches, setSelectedBranches] = useState<string[]>(["army", "navy"]);
  const [maliciousBranches, setMaliciousBranches] = useState<string[]>([]);
  const [numRounds, setNumRounds] = useState(5);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FederatedSimulationResult | null>(null);

  const toggleBranch = (list: string[], setList: (v: string[]) => void, branch: string) => {
    setList(list.includes(branch) ? list.filter((b) => b !== branch) : [...list, branch]);
  };

  const runSimulation = async () => {
    if (selectedBranches.length < 2) {
      setError("Select at least two branches to federate across.");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await AssuranceApiClient.runFederatedSimulation({
        branchIds: selectedBranches,
        numRounds,
        maliciousBranchIds: maliciousBranches.filter((b) => selectedBranches.includes(b)),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Network className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
            Cross-Branch Secure Federated Learning
          </h3>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Each selected branch trains locally on its own data -- raw imagery never leaves that
          branch's node. Only a signed weight-delta update is exchanged per round. Every update is
          cryptographically authenticated against that branch's enrolled Ed25519 identity, robustly
          screened for statistically anomalous (poisoned/gradient-scaled) contributions, and every
          decision is recorded into the same tamper-evident audit ledger used elsewhere in this
          system.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-[10px] uppercase text-zinc-500 font-semibold">
              Participating branches (select 2 or more)
            </div>
            <div className="flex gap-2 flex-wrap">
              {AVAILABLE_BRANCHES.map((branch) => {
                const active = selectedBranches.includes(branch);
                return (
                  <button
                    key={branch}
                    onClick={() => toggleBranch(selectedBranches, setSelectedBranches, branch)}
                    className={`px-3 py-1.5 rounded border text-xs uppercase tracking-wide transition-colors ${
                      active
                        ? "bg-cyan-950/40 border-cyan-700 text-cyan-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {branch}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase text-zinc-500 font-semibold">
              Simulate a compromised/malicious branch (optional)
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedBranches.map((branch) => {
                const active = maliciousBranches.includes(branch);
                return (
                  <button
                    key={branch}
                    onClick={() => toggleBranch(maliciousBranches, setMaliciousBranches, branch)}
                    className={`px-3 py-1.5 rounded border text-xs uppercase tracking-wide transition-colors ${
                      active
                        ? "bg-rose-950/40 border-rose-700 text-rose-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {branch}
                  </button>
                );
              })}
              {selectedBranches.length === 0 && (
                <span className="text-[11px] text-zinc-600">Select branches first.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            Rounds
            <input
              type="number"
              min={1}
              max={20}
              value={numRounds}
              onChange={(e) => setNumRounds(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="w-16 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 text-xs"
            />
          </label>
          <button
            onClick={runSimulation}
            disabled={running || selectedBranches.length < 2}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold uppercase tracking-wide transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            {running ? "Running secure aggregation..." : "Run Federated Simulation"}
          </button>
        </div>

        {error && (
          <div className="rounded border border-rose-900/50 bg-rose-950/20 p-3 text-[11px] text-rose-300">
            {error}
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              title="Branches"
              value={result.branch_ids.join(" + ")}
              subtitle="Cryptographically distinct identities"
              icon={<KeyRound className="h-4 w-4" />}
            />
            <StatCard
              title="Rounds Completed"
              value={result.rounds.length}
              icon={<Network className="h-4 w-4" />}
            />
            <StatCard
              title="Final Global Accuracy"
              value={
                result.final_eval_accuracy != null
                  ? `${(result.final_eval_accuracy * 100).toFixed(1)}%`
                  : "N/A"
              }
              tone="emerald"
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <StatCard
              title="Total Exclusions"
              value={result.rounds.reduce((sum, r) => sum + r.excluded_branches.length, 0)}
              tone={result.rounds.some((r) => r.excluded_branches.length > 0) ? "rose" : "default"}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Round-by-round secure aggregation
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-zinc-500 uppercase text-[9px] border-b border-zinc-800">
                    <th className="py-2 pr-4">Round</th>
                    <th className="py-2 pr-4">Accepted</th>
                    <th className="py-2 pr-4">Excluded</th>
                    <th className="py-2 pr-4">Global Accuracy</th>
                    <th className="py-2 pr-4">Aggregate Digest</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rounds.map((round) => (
                    <tr key={round.round_id} className="border-b border-zinc-900">
                      <td className="py-2 pr-4 text-zinc-300">#{round.round_id}</td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-1 flex-wrap">
                          {round.accepted_branches.map((b) => (
                            <span
                              key={b}
                              className="inline-flex items-center gap-1 rounded border border-emerald-800/40 bg-emerald-950/20 px-2 py-0.5 text-[10px] uppercase text-emerald-300"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {round.excluded_branches.length === 0 ? (
                          <span className="text-zinc-600">none</span>
                        ) : (
                          <div className="space-y-1">
                            {round.excluded_branches.map((d) => (
                              <div key={d.branch_id} className="text-rose-300">
                                <span className="font-bold">{d.branch_id}</span>
                                <span className="text-zinc-500"> -- {d.reason}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-zinc-300">
                        {round.global_eval_accuracy != null
                          ? `${(round.global_eval_accuracy * 100).toFixed(1)}%`
                          : "N/A"}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600 truncate max-w-[140px]">
                        {round.aggregate_digest.slice(0, 16)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-[10px] text-zinc-500 space-y-1">
            <div className="text-zinc-400 font-semibold uppercase text-[9px]">Limitations</div>
            {result.limitations.map((l, i) => (
              <p key={i}>- {l}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
