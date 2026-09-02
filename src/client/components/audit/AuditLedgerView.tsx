"use client";

import React, { useState } from "react";
import {
  Shield,
  Copy,
  Calendar,
  Filter,
  Download,
  RotateCw,
  User,
  Cpu,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { AuditLogEntry } from "@/shared/types/assurance";

interface AuditLedgerViewProps {
  entries?: AuditLogEntry[];
}

const DEFAULT_EVENTS = [
  {
    id: "evt-1",
    timestamp: "24-10-27 14:01:12",
    actor: "Dr. A. Turing",
    actorType: "USER",
    eventType: "Decision Overridden",
    details: "Changed status of [BoundingBox_7A] from Anomaly to Valid",
    ref: "ASMT-8921-X",
  },
  {
    id: "evt-2",
    timestamp: "24-10-27 13:45:00",
    actor: "SYS_AUTOMATION",
    actorType: "SYSTEM",
    eventType: "Assessment Run",
    details: "Batch inference completed on 142 frames. 3 anomalies flagged.",
    ref: "v4.2.1-prod",
  },
  {
    id: "evt-3",
    timestamp: "24-10-27 11:20:05",
    actor: "E. Lovelace",
    actorType: "USER",
    eventType: "Asset Uploaded",
    details: "Uploaded raw video feed: cam_north_04.mp4",
    ref: "SHA256: 9f86...24a1",
  },
  {
    id: "evt-4",
    timestamp: "24-10-26 09:15:33",
    actor: "SYS_MONITOR",
    actorType: "ALERT",
    eventType: "System Alert",
    details: "Latency spike detected in Edge Node 03 (>500ms).",
    ref: "Severity: High",
  },
  {
    id: "evt-5",
    timestamp: "24-10-26 08:00:00",
    actor: "ADMIN",
    actorType: "ADMIN",
    eventType: "System Config",
    details: "Updated global confidence threshold from 0.85 to 0.88",
    ref: "Ticket: OPS-442",
  },
];

export const AuditLedgerView: React.FC<AuditLedgerViewProps> = ({ entries }) => {
  const [copied, setCopied] = useState(false);
  const [timeRange, setTimeRange] = useState("24h");
  const [eventFilter, setEventFilter] = useState("ALL");

  const displayEvents =
    entries && entries.length > 0
      ? entries.map((e, idx) => ({
          id: e.entry_id || `evt-${idx}`,
          timestamp: e.timestamp
            ? e.timestamp.replace("T", " ").replace("Z", "")
            : "2026-10-14 14:00:00",
          actor:
            e.actor ||
            (e.event_type?.includes("ALERT")
              ? "SYS_MONITOR"
              : e.event_type?.includes("OVERRIDE")
                ? "Dr. A. Turing"
                : "SYS_AUTOMATION"),
          actorType: e.event_type?.includes("ALERT")
            ? "ALERT"
            : e.actor?.includes("ADMIN")
              ? "ADMIN"
              : e.actor
                ? "USER"
                : "SYSTEM",
          eventType: e.action || e.event_type || "Event",
          details: e.details || `Operation on ${e.resource_id}`,
          ref: e.chain_digest
            ? `Digest: ${e.chain_digest.substring(0, 16)}...`
            : e.resource_id || "Ref: SYSTEM",
        }))
      : DEFAULT_EVENTS;

  const currentDigest =
    entries && entries.length > 0 && entries[entries.length - 1].chain_digest
      ? entries[entries.length - 1].chain_digest.substring(0, 14) + "..."
      : "0x7a8c...4f2e";

  const copyHash = () => {
    navigator.clipboard.writeText(
      entries && entries.length > 0 && entries[entries.length - 1].chain_digest
        ? entries[entries.length - 1].chain_digest
        : "0x7a8c991e2b4f2e"
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner: Audit Integrity: VERIFIED */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0 shadow-2xs">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight">
              Audit Integrity: <span className="text-[#0284c7]">VERIFIED</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-0.5">
              <span>CHAIN HASH:</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {currentDigest}
              </span>
              <button
                onClick={copyHash}
                className="hover:text-slate-900 transition-colors cursor-pointer"
                title="Copy Hash"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 inline" />
                ) : (
                  <Copy className="h-3.5 w-3.5 inline" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-left md:text-right font-mono text-xs">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            LAST SYNC
          </div>
          <div className="text-slate-700 font-medium mt-0.5">
            2023-10-27 14:02:45 UTC
          </div>
        </div>
      </div>

      {/* Filter & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex items-center bg-white border border-slate-300 rounded-md px-3 py-1.5 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400 mr-2" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div className="relative flex items-center bg-white border border-slate-300 rounded-md px-3 py-1.5 shadow-2xs">
            <Filter className="h-3.5 w-3.5 text-slate-400 mr-2" />
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Events</option>
              <option value="OVERRIDE">Decision Overridden</option>
              <option value="RUN">Assessment Run</option>
              <option value="UPLOAD">Asset Uploaded</option>
              <option value="ALERT">System Alert</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-medium transition-colors shadow-2xs cursor-pointer">
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer">
            <RotateCw className="h-3.5 w-3.5" />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Immutable Event Ledger Table Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 tracking-tight font-sans">
            Immutable Event Ledger
          </h2>
          <span className="font-mono text-xs text-slate-400">
            Showing 1-10 of 1,248
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-100 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-5">TIMESTAMP (UTC)</th>
                <th className="py-3 px-5">ACTOR</th>
                <th className="py-3 px-5">EVENT TYPE</th>
                <th className="py-3 px-5">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEFAULT_EVENTS.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-slate-500 text-xs whitespace-nowrap">
                    {evt.timestamp}
                  </td>
                  <td className="py-3.5 px-5 font-medium text-slate-800 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {evt.actorType === "USER" ? (
                        <User className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      ) : evt.actorType === "SYSTEM" ? (
                        <Cpu className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      ) : evt.actorType === "ALERT" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <Settings className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      )}
                      <span>{evt.actor}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span
                      className={
                        evt.eventType === "System Alert"
                          ? "text-[#e11d48] font-bold font-mono"
                          : "text-slate-800 font-medium"
                      }
                    >
                      {evt.eventType}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">
                    <div>{evt.details}</div>
                    <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                      {evt.ref}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select className="bg-slate-50 border border-slate-200 text-slate-700 py-0.5 px-2 rounded text-xs">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button className="p-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
