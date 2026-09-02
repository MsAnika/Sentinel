"use client";

import React from "react";
import {
  UploadCloud,
  CheckCircle2,
  Shield,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";

interface AssessmentAssetsViewProps {
  onUploadNew?: () => void;
  onViewDatasetDetails?: () => void;
  onViewModelDetails?: () => void;
}

export const AssessmentAssetsView: React.FC<AssessmentAssetsViewProps> = ({
  onUploadNew,
  onViewDatasetDetails,
  onViewModelDetails,
}) => {
  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Asset Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Materials uploaded and verified for Assessment AS-2026-019.
          </p>
        </div>

        <button
          onClick={onUploadNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer"
        >
          <UploadCloud className="h-3.5 w-3.5 text-slate-700" />
          <span>UPLOAD NEW ASSET</span>
        </button>
      </div>

      {/* Grid of 2 Top Asset Cards (Dataset & Model Weights) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Card: DATASET */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-700 uppercase tracking-wide">
                <span className="h-3.5 w-3.5 rounded bg-slate-900 text-white flex items-center justify-center text-[9px]">▦</span>
                <span>DATASET</span>
              </div>
              <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold px-2 py-0.5 rounded">
                <CheckCircle2 className="h-3 w-3" />
                <span>Verified</span>
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Urban-Set-B
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Primary training dataset containing high-resolution urban street scenes.
              Annotated for vehicle and pedestrian tracking under varying lighting
              conditions.
            </p>

            {/* 3 Metric Boxes */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 font-mono">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  SIZE
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  45k Images
                </div>
              </div>

              <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 font-mono">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  FORMAT
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  COCO
                </div>
              </div>

              <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 font-mono">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  FILE SIZE
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  12.4 GB
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Uploaded: 2026-10-14 08:22:10 UTC</span>
            </div>
            <button
              onClick={onViewDatasetDetails}
              className="px-4 py-2 rounded-md bg-black hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
            >
              VIEW DETAILS
            </button>
          </div>
        </div>

        {/* Right Card: MODEL WEIGHTS */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-700 uppercase tracking-wide">
                <span className="text-sky-600">⚙</span>
                <span>MODEL WEIGHTS</span>
              </div>
              <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold px-2 py-0.5 rounded">
                <Shield className="h-3 w-3" />
                <span>Secure</span>
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              YOLOv8-Core
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Compiled ONNX model optimized for edge deployment. Weights frozen.
            </p>

            <div className="border-t border-slate-100 pt-2 space-y-2 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Format</span>
                <span className="text-slate-900 font-bold">ONNX</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Size</span>
                <span className="text-slate-900 font-bold">145 MB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">SHA-256</span>
                <span className="text-sky-600 font-semibold cursor-pointer hover:underline">
                  e3b0c442...
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2 space-y-3">
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>2026-10-14 09:05:33 UTC</span>
            </div>
            <button
              onClick={onViewModelDetails}
              className="w-full py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
            >
              VIEW DETAILS
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Card: INFERENCE RECORDS */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-800 uppercase tracking-wide">
            <span className="text-sky-600 font-mono">{`{ }`}</span>
            <span>INFERENCE RECORDS</span>
          </div>
          <span className="bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
            <span>⚡ Pending Review</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-100 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-5">FILENAME / ID</th>
                <th className="py-3 px-5">CONTENT</th>
                <th className="py-3 px-5">FORMAT / SIZE</th>
                <th className="py-3 px-5">TIMESTAMP</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-5 font-bold text-slate-900 whitespace-nowrap flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>run_04_results.json</span>
                </td>
                <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                  142 Analyzed Frames
                </td>
                <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                  JSON • 2.1 MB
                </td>
                <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">
                  2026-10-14 11:30:00 UTC
                </td>
                <td className="py-3.5 px-5 text-right whitespace-nowrap">
                  <button className="text-slate-700 hover:text-slate-900 hover:underline text-xs font-bold cursor-pointer inline-flex items-center gap-1">
                    <span>View</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
