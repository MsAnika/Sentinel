import React, { useState } from 'react'
import { UploadCloud, Cpu, Layers, ScanEye, Loader2, AlertTriangle } from 'lucide-react'
import {
  AssuranceApiClient,
  DatasetAnalysisResult,
  ParameterAnalysisResult,
} from '@/client/lib/api-client'
import { InferenceRecord, ModelFingerprint } from '@/shared/types/assurance'
import { StatCard } from '../ui/StatCard'
import { ModelAssuranceView } from '../model/ModelAssuranceView'
import { DatasetAssuranceView } from '../dataset/DatasetAssuranceView'
import { ProvenanceStudioView } from '../provenance/ProvenanceStudioView'

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-300">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span className="break-all">{message}</span>
    </div>
  )
}

function FilePicker({
  label,
  accept,
  onSelect,
  fileName,
}: {
  label: string
  accept: string
  onSelect: (file: File) => void
  fileName?: string
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
          const f = e.target.files?.[0]
          if (f) onSelect(f)
        }}
      />
    </label>
  )
}

export const LiveAnalysisView: React.FC = () => {
  // -- Model panel --
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [modelFingerprint, setModelFingerprint] = useState<ModelFingerprint | null>(null)
  const [paramResult, setParamResult] = useState<ParameterAnalysisResult | null>(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  // -- Dataset panel --
  const [datasetFile, setDatasetFile] = useState<File | null>(null)
  const [datasetResult, setDatasetResult] = useState<DatasetAnalysisResult | null>(null)
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [datasetError, setDatasetError] = useState<string | null>(null)

  // -- Inference panel --
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [inferenceRecord, setInferenceRecord] = useState<InferenceRecord | null>(null)
  const [inferenceLoading, setInferenceLoading] = useState(false)
  const [inferenceError, setInferenceError] = useState<string | null>(null)

  const runModelAnalysis = async (file: File) => {
    setModelFile(file)
    setModelLoading(true)
    setModelError(null)
    setModelFingerprint(null)
    setParamResult(null)
    try {
      const fp = await AssuranceApiClient.uploadModel(file)
      setModelFingerprint(fp)
      const savedPath = fp.metadata?.saved_path as string | undefined
      if (fp.model_format === 'ONNX' && savedPath) {
        try {
          const params = await AssuranceApiClient.runParameterAnalysis(savedPath, fp.model_id)
          setParamResult(params)
        } catch (paramErr) {
          setModelError(`Fingerprint succeeded, but parameter analysis failed: ${paramErr instanceof Error ? paramErr.message : String(paramErr)}`)
        }
      }
    } catch (e) {
      setModelError(e instanceof Error ? e.message : String(e))
    } finally {
      setModelLoading(false)
    }
  }

  const runDatasetAnalysis = async (file: File) => {
    setDatasetFile(file)
    setDatasetLoading(true)
    setDatasetError(null)
    setDatasetResult(null)
    try {
      const upload = await AssuranceApiClient.uploadDatasetArchive(file)
      if (!upload.coco_json_candidates.length && !upload.yolo_dir_candidate) {
        throw new Error('Archive did not contain a recognizable COCO annotations JSON or a YOLO images/+labels/ pair.')
      }
      const result = upload.coco_json_candidates.length
        ? await AssuranceApiClient.analyzeDatasetProfile({
            datasetId: file.name.replace(/\.zip$/i, ''),
            formatType: 'COCO',
            cocoPath: upload.coco_json_candidates[0],
          })
        : await AssuranceApiClient.analyzeDatasetProfile({
            datasetId: file.name.replace(/\.zip$/i, ''),
            formatType: 'YOLO',
            yoloDir: upload.yolo_dir_candidate!,
          })
      setDatasetResult(result)
    } catch (e) {
      setDatasetError(e instanceof Error ? e.message : String(e))
    } finally {
      setDatasetLoading(false)
    }
  }

  const runInference = async (file: File) => {
    setImageFile(file)
    setInferenceLoading(true)
    setInferenceError(null)
    setInferenceRecord(null)
    try {
      const uploaded = await AssuranceApiClient.uploadProbeImage(file)
      setImagePath(uploaded.image_path)
      if (!modelFingerprint) {
        throw new Error('Upload a model above first -- inference needs a real model file to execute against.')
      }
      const modelPath = (modelFingerprint.metadata?.saved_path as string) || null
      if (!modelPath) {
        throw new Error('The uploaded model fingerprint does not carry its saved server path; re-upload the model.')
      }
      const record = await AssuranceApiClient.executeInference(uploaded.image_path, modelPath)
      setInferenceRecord(record)
    } catch (e) {
      setInferenceError(e instanceof Error ? e.message : String(e))
    } finally {
      setInferenceLoading(false)
    }
  }

  return (
    <div className="space-y-6 font-mono">
      <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/10 p-3 text-xs text-cyan-300">
        Live Analysis runs the real backend pipeline against files you upload right now -- no canned scenario data.
        Everything below reflects the actual bytes you provide.
      </div>

      {/* MODEL PANEL */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">Upload &amp; Fingerprint a Model</h3>
        </div>
        <FilePicker
          label="Choose an ONNX / PyTorch / TorchScript file..."
          accept=".onnx,.pt,.pth,.torchscript"
          fileName={modelFile?.name}
          onSelect={runModelAnalysis}
        />
        {modelLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Fingerprinting uploaded model...
          </div>
        )}
        {modelError && <ErrorBanner message={modelError} />}
        {modelFingerprint && (
          <ModelAssuranceView fingerprint={modelFingerprint} findings={paramResult?.findings || []} />
        )}
      </section>

      {/* DATASET PANEL */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Layers className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">Upload &amp; Analyze a Dataset</h3>
        </div>
        <p className="text-[11px] text-zinc-500">
          Zip a COCO annotations JSON + images folder, or a YOLO images/+labels/ pair, and upload it here.
        </p>
        <FilePicker
          label="Choose a dataset .zip archive..."
          accept=".zip"
          fileName={datasetFile?.name}
          onSelect={runDatasetAnalysis}
        />
        {datasetLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Extracting and analyzing dataset...
          </div>
        )}
        {datasetError && <ErrorBanner message={datasetError} />}
        {datasetResult && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard title="Format" value={datasetResult.profile.format} tone="cyan" />
              <StatCard title="Label Verification" value={datasetResult.label_verification_method === 'metadata_declared_ground_truth_only' ? 'METADATA ONLY' : 'REAL MODEL CHECK'} tone={datasetResult.label_verification_method === 'metadata_declared_ground_truth_only' ? 'amber' : 'emerald'} />
              <StatCard title="Structure Warnings" value={datasetResult.structure_warnings.length} tone={datasetResult.structure_warnings.length ? 'amber' : 'emerald'} />
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
          <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">Run Real Inference &amp; Provenance Binding</h3>
        </div>
        <p className="text-[11px] text-zinc-500">
          Requires a model uploaded above. Uploads an image, executes it through onnxruntime, and cryptographically signs the result.
        </p>
        <FilePicker
          label="Choose an image to run inference on..."
          accept="image/*"
          fileName={imageFile?.name}
          onSelect={runInference}
        />
        {inferenceLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Running onnxruntime and signing the result...
          </div>
        )}
        {inferenceError && <ErrorBanner message={inferenceError} />}
        {imagePath && !inferenceError && (
          <p className="text-[10px] text-zinc-500 break-all">Server-side probe image path bound into the provenance record: {imagePath}</p>
        )}
        {inferenceRecord && <ProvenanceStudioView inferenceRecord={inferenceRecord} />}
      </section>
    </div>
  )
}
