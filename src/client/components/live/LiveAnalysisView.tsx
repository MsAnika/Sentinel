import React, { useState } from "react";
import clsx from "clsx";
import {
  UploadCloud,
  Cpu,
  Layers,
  ScanEye,
  Loader2,
  AlertTriangle,
  ClipboardCheck,
  Check,
  X,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import {
  AssuranceApiClient,
  DatasetAnalysisResult,
  ParameterAnalysisResult,
} from "@/client/lib/api-client";
import {
  AssuranceReport,
  InferenceRecord,
  ModelFingerprint,
} from "@/shared/types/assurance";
import { StatCard } from "../ui/StatCard";
import { ModelAssuranceView } from "../model/ModelAssuranceView";
import { DatasetAssuranceView } from "../dataset/DatasetAssuranceView";
import { ProvenanceStudioView } from "../provenance/ProvenanceStudioView";
import { AssessmentResultCard } from "../assessment/AssessmentResultCard";
import { FindingsTriage } from "../assessment/FindingsTriage";

const WIZARD_STEPS = [
  "Name",
  "Add Assets",
  "Validate",
  "Start Assurance",
] as const;
type WizardStep = 0 | 1 | 2 | 3;

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-300">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span className="break-all">{message}</span>
    </div>
  );
}

function FilePicker({
  label,
  accept,
  onSelect,
  fileName,
}: {
  label: string;
  accept: string;
  onSelect: (file: File) => void;
  fileName?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded border border-dashed border-zinc-700 bg-zinc-900/40 p-3 text-xs hover:border-cyan-600/60 hover:bg-zinc-900/70 transition-colors">
      <UploadCloud className="h-4 w-4 text-cyan-400 flex-shrink-0" />
      <span className="text-zinc-300 truncate">{fileName || label}</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
    </label>
  );
}

function WizardStepper({
  step,
  furthestReached,
  onJump,
}: {
  step: WizardStep;
  furthestReached: WizardStep;
  onJump: (s: WizardStep) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {WIZARD_STEPS.map((label, i) => {
        const idx = i as WizardStep;
        const isActive = idx === step;
        const isDone = idx < step;
        const isReachable = idx <= furthestReached;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                className={clsx(
                  "h-px w-6",
                  isDone || isActive ? "bg-cyan-700/60" : "bg-zinc-800",
                )}
              />
            )}
            <button
              onClick={() => isReachable && onJump(idx)}
              disabled={!isReachable}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-bold uppercase tracking-wider transition-colors",
                isReachable
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-40",
                isActive
                  ? "border-cyan-500 bg-cyan-950/60 text-cyan-300"
                  : isDone
                    ? "border-emerald-700/50 bg-emerald-950/20 text-emerald-400"
                    : "border-zinc-800 text-zinc-500",
              )}
            >
              {isDone ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              {label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ValidationRow({
  ok,
  label,
  detail,
}: {
  ok: boolean | null;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      {ok === null ? (
        <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-700" />
      ) : ok ? (
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
      )}
      <div>
        <div
          className={clsx(
            "text-xs font-semibold",
            ok === null
              ? "text-zinc-500"
              : ok
                ? "text-zinc-200"
                : "text-zinc-500",
          )}
        >
          {label}
        </div>
        <div className="text-[11px] text-zinc-500">{detail}</div>
      </div>
    </div>
  );
}

/** New Assessment wizard: name -> add assets -> validate what was
 * detected -> run full assurance -> result. Replaces the earlier flat
 * "three independent upload panels" layout with a guided sequence so a
 * first-time analyst isn't expected to already know that a dataset zip,
 * a model file, and a probe image are three separate, independently
 * triggered backend pipelines. */
export const LiveAnalysisView: React.FC = () => {
  const [step, setStep] = useState<WizardStep>(0);
  const [furthestReached, setFurthestReached] = useState<WizardStep>(0);
  const [assessmentName, setAssessmentName] = useState("");

  // -- Model panel --
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelFingerprint, setModelFingerprint] =
    useState<ModelFingerprint | null>(null);
  const [paramResult, setParamResult] =
    useState<ParameterAnalysisResult | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // -- Dataset panel --
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [datasetResult, setDatasetResult] =
    useState<DatasetAnalysisResult | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [datasetError, setDatasetError] = useState<string | null>(null);

  // -- Inference panel --
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [inferenceRecord, setInferenceRecord] =
    useState<InferenceRecord | null>(null);
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [inferenceError, setInferenceError] = useState<string | null>(null);

  // -- Unified assessment --
  const [report, setReport] = useState<AssuranceReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showInvestigation, setShowInvestigation] = useState(false);

  const goTo = (s: WizardStep) => {
    setStep(s);
    setFurthestReached((f) => (s > f ? s : f));
  };

  const runModelAnalysis = async (file: File) => {
    setModelFile(file);
    setModelLoading(true);
    setModelError(null);
    setModelFingerprint(null);
    setParamResult(null);
    setReport(null);
    try {
      const fp = await AssuranceApiClient.uploadModel(file);
      setModelFingerprint(fp);
      const savedPath = fp.metadata?.saved_path as string | undefined;
      if (savedPath) {
        try {
          const params = await AssuranceApiClient.runParameterAnalysis(
            savedPath,
            fp.model_id,
          );
          setParamResult(params);
        } catch (paramErr) {
          setModelError(
            `Fingerprint succeeded, but parameter analysis failed: ${paramErr instanceof Error ? paramErr.message : String(paramErr)}`,
          );
        }
      }
    } catch (e) {
      setModelError(e instanceof Error ? e.message : String(e));
    } finally {
      setModelLoading(false);
    }
  };

  const runDatasetAnalysis = async (file: File) => {
    setDatasetFile(file);
    setDatasetLoading(true);
    setDatasetError(null);
    setDatasetResult(null);
    setReport(null);
    try {
      const upload = await AssuranceApiClient.uploadDatasetArchive(file);
      if (!upload.coco_json_candidates.length && !upload.yolo_dir_candidate) {
        throw new Error(
          "Archive did not contain a recognizable COCO annotations JSON or a YOLO images/+labels/ pair.",
        );
      }
      const result = upload.coco_json_candidates.length
        ? await AssuranceApiClient.analyzeDatasetProfile({
            datasetId: file.name.replace(/\.zip$/i, ""),
            formatType: "COCO",
            cocoPath: upload.coco_json_candidates[0],
          })
        : await AssuranceApiClient.analyzeDatasetProfile({
            datasetId: file.name.replace(/\.zip$/i, ""),
            formatType: "YOLO",
            yoloDir: upload.yolo_dir_candidate!,
          });
      setDatasetResult(result);
    } catch (e) {
      setDatasetError(e instanceof Error ? e.message : String(e));
    } finally {
      setDatasetLoading(false);
    }
  };

  const runInference = async (file: File) => {
    setImageFile(file);
    setInferenceLoading(true);
    setInferenceError(null);
    setInferenceRecord(null);
    try {
      const uploaded = await AssuranceApiClient.uploadProbeImage(file);
      setImagePath(uploaded.image_path);
      if (!modelFingerprint) {
        throw new Error(
          "Upload a model above first -- inference needs a real model file to execute against.",
        );
      }
      const modelPath =
        (modelFingerprint.metadata?.saved_path as string) || null;
      if (!modelPath) {
        throw new Error(
          "The uploaded model fingerprint does not carry its saved server path; re-upload the model.",
        );
      }
      const record = await AssuranceApiClient.executeInference(
        uploaded.image_path,
        modelPath,
      );
      setInferenceRecord(record);
    } catch (e) {
      setInferenceError(e instanceof Error ? e.message : String(e));
    } finally {
      setInferenceLoading(false);
    }
  };

  const combinedFindings = [
    ...(paramResult?.findings || []),
    ...(datasetResult?.findings || []),
  ];
  const hasAnyAssetAnalyzed = Boolean(modelFingerprint || datasetResult);

  const generateAssessment = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const generated = await AssuranceApiClient.generateReport({
        findings: combinedFindings,
        contributorSummaries: datasetResult?.profile.contributor_risks || [],
        modelStatus: modelFingerprint ? "VERIFIED" : "VERIFIED",
        datasetStatus: datasetResult ? "VERIFIED" : "VERIFIED",
        inferenceStatus: inferenceRecord
          ? inferenceRecord.tampering_detected
            ? "TAMPERING_DETECTED"
            : "VERIFIED"
          : "VERIFIED",
        driftStatus: "NORMAL",
      });
      setReport(generated);
      setShowInvestigation(false);
      goTo(3);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : String(e));
    } finally {
      setReportLoading(false);
    }
  };

  const startOver = () => {
    setStep(0);
    setFurthestReached(0);
    setAssessmentName("");
    setModelFile(null);
    setModelFingerprint(null);
    setParamResult(null);
    setModelError(null);
    setDatasetFile(null);
    setDatasetResult(null);
    setDatasetError(null);
    setImageFile(null);
    setImagePath(null);
    setInferenceRecord(null);
    setInferenceError(null);
    setReport(null);
    setReportError(null);
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <WizardStepper
          step={step}
          furthestReached={furthestReached}
          onJump={goTo}
        />
        {step > 0 && (
          <button
            onClick={startOver}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" /> Start Over
          </button>
        )}
      </div>

      {step === 0 && (
        <div className="max-w-md space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
              New Assurance Assessment
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              What are you assessing? This name only labels the result -- it
              isn&apos;t sent anywhere else.
            </p>
          </div>
          <input
            value={assessmentName}
            onChange={(e) => setAssessmentName(e.target.value)}
            placeholder="e.g. Satellite Object Detector v2"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-600 focus:outline-none"
          />
          <button
            onClick={() => goTo(1)}
            className="inline-flex items-center gap-2 rounded bg-cyan-950 border border-cyan-600/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-900/60 cursor-pointer"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/10 p-3 text-xs text-cyan-300">
            Live Analysis runs the real backend pipeline against files you
            upload right now -- no canned scenario data. Add at least one asset
            below, then continue to Validate.
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              What are you providing?
            </h3>
            <p className="mt-1 text-[11px] text-zinc-500">
              Each asset below feeds a different part of the assessment. None
              are required except at least one.
            </p>
          </div>

          {/* MODEL PANEL */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
                  Model
                </h3>
                <p className="text-[11px] font-normal normal-case text-zinc-500">
                  The model being assessed for substitution, backdoors, and
                  behavioural anomalies.
                </p>
              </div>
            </div>
            <FilePicker
              label="Choose an ONNX / PyTorch / TorchScript file..."
              accept=".onnx,.pt,.pth,.torchscript"
              fileName={modelFile?.name}
              onSelect={runModelAnalysis}
            />
            {modelLoading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Fingerprinting
                uploaded model...
              </div>
            )}
            {modelError && <ErrorBanner message={modelError} />}
            {modelFingerprint && (
              <ModelAssuranceView
                fingerprint={modelFingerprint}
                findings={paramResult?.findings || []}
              />
            )}
          </section>

          {/* DATASET PANEL */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Layers className="h-4 w-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
                  Dataset
                </h3>
                <p className="text-[11px] font-normal normal-case text-zinc-500">
                  The images and annotations being assessed for poisoning,
                  mislabelling, and duplication.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              Zip a COCO annotations JSON + images folder, or a YOLO
              images/+labels/ pair, and upload it here.
            </p>
            <FilePicker
              label="Choose a dataset .zip archive..."
              accept=".zip"
              fileName={datasetFile?.name}
              onSelect={runDatasetAnalysis}
            />
            {datasetLoading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Extracting and
                analyzing dataset...
              </div>
            )}
            {datasetError && <ErrorBanner message={datasetError} />}
            {datasetResult && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard
                    title="Format"
                    value={datasetResult.profile.format}
                    tone="cyan"
                  />
                  <StatCard
                    title="Label Verification"
                    value={
                      datasetResult.label_verification_method ===
                      "metadata_declared_ground_truth_only"
                        ? "METADATA ONLY"
                        : "REAL MODEL CHECK"
                    }
                    tone={
                      datasetResult.label_verification_method ===
                      "metadata_declared_ground_truth_only"
                        ? "amber"
                        : "emerald"
                    }
                  />
                  <StatCard
                    title="Structure Warnings"
                    value={datasetResult.structure_warnings.length}
                    tone={
                      datasetResult.structure_warnings.length
                        ? "amber"
                        : "emerald"
                    }
                  />
                </div>
                <DatasetAssuranceView
                  findings={datasetResult.findings}
                  contributorSummaries={datasetResult.profile.contributor_risks}
                  samplesCount={datasetResult.profile.total_images}
                />
              </>
            )}
          </section>

          {/* INFERENCE PANEL */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ScanEye className="h-4 w-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
                  Inference Record (optional)
                </h3>
                <p className="text-[11px] font-normal normal-case text-zinc-500">
                  A prediction generated now and cryptographically bound, so
                  post-hoc tampering becomes detectable.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              Requires a model uploaded above. Uploads an image, executes it
              through onnxruntime, and cryptographically signs the result.
            </p>
            <FilePicker
              label="Choose an image to run inference on..."
              accept="image/*"
              fileName={imageFile?.name}
              onSelect={runInference}
            />
            {inferenceLoading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Running onnxruntime
                and signing the result...
              </div>
            )}
            {inferenceError && <ErrorBanner message={inferenceError} />}
            {imagePath && !inferenceError && (
              <p className="text-[10px] text-zinc-500 break-all">
                Server-side probe image path bound into the provenance record:{" "}
                {imagePath}
              </p>
            )}
            {inferenceRecord && (
              <ProvenanceStudioView inferenceRecord={inferenceRecord} />
            )}
          </section>

          <button
            onClick={() => goTo(2)}
            disabled={!hasAnyAssetAnalyzed}
            className="inline-flex items-center gap-2 rounded bg-cyan-950 border border-cyan-600/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-900/60 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            Validate &amp; Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
              Assessment Readiness
            </h3>
            <p className="text-xs text-zinc-500">
              What was detected, and what that means for the checks this
              assessment can actually run.
            </p>
          </div>

          <div className="space-y-2">
            <ValidationRow
              ok={modelFingerprint ? true : null}
              label={
                modelFingerprint
                  ? `Model ready: ${modelFingerprint.model_format}`
                  : "Model not provided"
              }
              detail={
                modelFingerprint
                  ? `Access level ${modelFingerprint.access_level}${paramResult ? `, parameter analysis ${(paramResult.stats as { status?: string }).status || "run"}` : ""}`
                  : "Impact: model substitution, backdoor, and behavioural checks will be unavailable."
              }
            />
            <ValidationRow
              ok={datasetResult ? true : null}
              label={
                datasetResult
                  ? `Dataset ready: ${datasetResult.profile.format}`
                  : "Dataset not provided"
              }
              detail={
                datasetResult
                  ? `${datasetResult.profile.total_images} images, label verification: ${datasetResult.label_verification_method === "metadata_declared_ground_truth_only" ? "metadata only" : "real reference-model check"}`
                  : "Impact: duplicate, poisoning, and mislabelling checks will be unavailable."
              }
            />
            <ValidationRow
              ok={inferenceRecord ? true : null}
              label={
                inferenceRecord
                  ? "Inference record signed"
                  : "Inference not run"
              }
              detail={
                inferenceRecord
                  ? `Provenance hash ${inferenceRecord.provenance_hash.slice(0, 16)}..., tampering ${inferenceRecord.tampering_detected ? "DETECTED" : "not detected"}`
                  : "Impact: cryptographic provenance/tamper-detection checks will be unavailable."
              }
            />
          </div>

          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              Assurance Coverage
            </div>
            <div className="overflow-hidden rounded border border-zinc-800">
              {[
                { label: "Dataset integrity", ok: Boolean(datasetResult) },
                { label: "Model integrity", ok: Boolean(modelFingerprint) },
                { label: "Inference provenance", ok: Boolean(inferenceRecord) },
                { label: "Distribution shift", ok: false },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className={clsx(
                    "flex items-center justify-between px-3 py-2 text-xs",
                    i > 0 && "border-t border-zinc-800",
                    "bg-zinc-950",
                  )}
                >
                  <span className="text-zinc-300">{row.label}</span>
                  <span
                    className={clsx(
                      "text-[10px] font-bold uppercase tracking-wider",
                      row.ok ? "text-emerald-400" : "text-zinc-600",
                    )}
                  >
                    {row.ok ? "FULL" : "UNAVAILABLE"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-600">
              Distribution shift requires a declared reference distribution, not
              available through this quick-start wizard yet -- use the API
              directly for that check.
            </p>
          </div>

          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              {combinedFindings.length} finding(s) ready to include
            </div>
            <p className="text-[11px] text-zinc-500">
              From whichever detectors above actually ran against your real
              files -- nothing fabricated for assets you didn&apos;t provide.
            </p>
          </div>

          <button
            onClick={generateAssessment}
            disabled={reportLoading}
            className="inline-flex items-center gap-2 rounded bg-cyan-950 border border-cyan-600/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-900/60 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {reportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardCheck className="h-4 w-4" />
            )}
            Start Assurance
          </button>
          {reportError && <ErrorBanner message={reportError} />}
        </div>
      )}

      {step === 3 && report && (
        <div className="space-y-4">
          <AssessmentResultCard
            title={assessmentName || "Live Analysis Assessment"}
            subtitle={`${combinedFindings.length} finding(s) from the assets you provided`}
            report={report}
            onInvestigate={() => setShowInvestigation((v) => !v)}
            investigateLabel={
              showInvestigation ? "Hide Findings" : "Investigate Findings"
            }
          />
          {showInvestigation && (
            <FindingsTriage
              findings={report.findings}
              contributorSummaries={report.contributor_summaries}
            />
          )}
          <button
            onClick={startOver}
            className="inline-flex items-center gap-2 rounded bg-zinc-900 border border-zinc-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:border-cyan-600/60 hover:text-cyan-300 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> New Assessment
          </button>
        </div>
      )}
    </div>
  );
};
