"use client";

import React, { useRef, useState } from "react";
import { Upload, FileJson, PlayCircle, CheckCircle2 } from "lucide-react";
import { AssuranceApiClient } from "@/client/lib/api-client";
import { DistributionShiftReport } from "@/shared/types/assurance";
import { DistributionShiftView } from "./DistributionShiftView";

interface ParsedManifest {
  raw: Record<string, unknown>;
  declared_reference_id?: string;
  terrain?: string;
  sensor?: string;
  mean_illumination?: number;
}

export const DriftEvaluationRunner: React.FC = () => {
  const [manifest, setManifest] = useState<ParsedManifest | null>(null);
  const [manifestFileName, setManifestFileName] = useState<string | null>(null);
  const [datasetFileName, setDatasetFileName] = useState<string | null>(null);
  const [probePaths, setProbePaths] = useState<string[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DistributionShiftReport | undefined>(undefined);

  const manifestInputRef = useRef<HTMLInputElement>(null);
  const datasetInputRef = useRef<HTMLInputElement>(null);

  const handleManifestFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      setManifest({
        raw: parsed,
        declared_reference_id: parsed.declared_reference_id as string | undefined,
        terrain: parsed.terrain as string | undefined,
        sensor: parsed.sensor as string | undefined,
        mean_illumination: parsed.mean_illumination as number | undefined,
      });
      setManifestFileName(file.name);
    } catch (e) {
      setError(
        `"${file.name}" is not a valid reference manifest JSON: ${
          e instanceof Error ? e.message : String(e)
        }. This is a declared reference_profile (terrain/sensor/embedding baseline), not an inference record -- use the Assessment dropzone for inference-record .json files instead.`
      );
    }
  };

  const handleDatasetFile = async (file: File) => {
    setError(null);
    setProbePaths(null);
    try {
      const upload = await AssuranceApiClient.uploadDatasetArchive(file);
      const formatType: "COCO" | "YOLO" = upload.coco_json_candidates.length > 0 ? "COCO" : "YOLO";
      const analysis = await AssuranceApiClient.analyzeDatasetProfile({
        datasetId: `drift_probe_${Date.now()}`,
        formatType,
        cocoPath: upload.coco_json_candidates[0],
        imagesDir: upload.coco_images_dir ?? undefined,
        yoloDir: upload.yolo_dir_candidate ?? undefined,
      });
      setProbePaths(analysis.probe_sample_image_paths);
      setDatasetFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runEvaluation = async () => {
    if (!manifest || !probePaths || probePaths.length === 0) {
      setError("Load a reference manifest AND an observed dataset archive first.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const observedSamples = probePaths.map((p) => ({
        terrain: manifest.terrain ?? "plains",
        sensor: manifest.sensor ?? "EO_optical",
        illumination: manifest.mean_illumination ?? 0.75,
        image_path: p,
      }));
      const result = await AssuranceApiClient.evaluateDistributionShift({
        referenceProfile: manifest.raw,
        observedSamples,
        declaredReferenceId: manifest.declared_reference_id ?? "declared_reference_baseline",
        observedDatasetId: datasetFileName ?? "observed_dataset",
      });
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Distribution-shift assessment requires two separate inputs: a{" "}
          <strong className="text-zinc-200">declared reference manifest</strong> (terrain/sensor/
          illumination + an embedding-space baseline, established by the operator ahead of time --
          this is NOT an inference record, dropping it on the Assessment page's asset dropzone will
          fail with missing-field errors) and an{" "}
          <strong className="text-zinc-200">observed dataset archive</strong> to evaluate against
          that baseline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
            <div className="text-[10px] uppercase text-zinc-500 font-semibold flex items-center gap-1.5">
              <FileJson className="h-3.5 w-3.5" /> Reference Manifest (.json)
            </div>
            <input
              ref={manifestInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleManifestFile(e.target.files[0])}
            />
            <button
              onClick={() => manifestInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs hover:border-cyan-700 hover:text-cyan-300 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              {manifestFileName ?? "Load reference_manifest.json"}
            </button>
            {manifest && (
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {manifest.declared_reference_id} ({manifest.terrain}/{manifest.sensor})
              </div>
            )}
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
            <div className="text-[10px] uppercase text-zinc-500 font-semibold flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Observed Dataset Archive (.zip)
            </div>
            <input
              ref={datasetInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleDatasetFile(e.target.files[0])}
            />
            <button
              onClick={() => datasetInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs hover:border-cyan-700 hover:text-cyan-300 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              {datasetFileName ?? "Upload observed dataset .zip"}
            </button>
            {probePaths && (
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {probePaths.length} probe image(s) resolved
              </div>
            )}
          </div>
        </div>

        <button
          onClick={runEvaluation}
          disabled={running || !manifest || !probePaths}
          className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold uppercase tracking-wide transition-colors"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          {running ? "Evaluating..." : "Run Drift Evaluation"}
        </button>

        {error && (
          <div className="rounded border border-rose-900/50 bg-rose-950/20 p-3 text-[11px] text-rose-300 whitespace-pre-wrap">
            {error}
          </div>
        )}
      </div>

      <DistributionShiftView report={report} />
    </div>
  );
};
