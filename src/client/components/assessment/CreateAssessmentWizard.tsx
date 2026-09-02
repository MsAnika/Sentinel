"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Lightbulb,
  Upload,
  Cpu,
  CheckCircle2,
  FileCheck,
  Shield,
  Layers,
} from "lucide-react";

interface CreateAssessmentWizardProps {
  onBack: () => void;
  onComplete: (assessmentData: AssessmentFormData) => void;
}

export interface AssessmentFormData {
  name: string;
  description: string;
  assessmentType: string;
  useCaseDomain: string;
  referenceData: string;
  referenceModel: string;
  tags: string;
  modelFile?: File | null;
  datasetFile?: File | null;
}

export const CreateAssessmentWizard: React.FC<CreateAssessmentWizardProps> = ({
  onBack,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<AssessmentFormData>({
    name: "",
    description: "",
    assessmentType: "",
    useCaseDomain: "",
    referenceData: "",
    referenceModel: "",
    tags: "",
    modelFile: null,
    datasetFile: null,
  });

  const [errors, setErrors] = useState<{ name?: string; type?: string }>({});

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; type?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = "Assessment name is required.";
    }
    if (!formData.assessmentType) {
      newErrors.type = "Please select an assessment type.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setCurrentStep(2);
  };

  const steps = [
    { number: 1, label: "Assessment Details" },
    { number: 2, label: "Add Assets" },
    { number: 3, label: "Validate" },
    { number: 4, label: "Review & Start" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Navigation */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Assessments</span>
        </button>
      </div>

      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Create New Assessment
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Provide details and upload assets to start a new assurance assessment.
        </p>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="flex items-center justify-between max-w-3xl py-4">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.number;
          const isDone = currentStep > step.number;
          return (
            <React.Fragment key={step.number}>
              <div
                onClick={() => isDone && setCurrentStep(step.number)}
                className={clsx(
                  "flex items-center gap-2 text-xs font-semibold",
                  isDone ? "cursor-pointer" : "cursor-default"
                )}
              >
                <div
                  className={clsx(
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                      : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500"
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.number}
                </div>
                <span
                  className={clsx(
                    isActive
                      ? "text-slate-900 font-bold"
                      : isDone
                        ? "text-slate-700"
                        : "text-slate-400 font-medium"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={clsx(
                    "flex-1 mx-4 h-0.5 transition-all",
                    currentStep > step.number ? "bg-emerald-400" : "bg-slate-200"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Step Content / Form */}
        <div className="lg:col-span-8">
          {currentStep === 1 && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Assessment Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide basic information about the assessment.
                </p>
              </div>

              <form onSubmit={handleStep1Submit} className="mt-5 space-y-5">
                {/* Assessment Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Assessment Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Satellite Detector v2 Integrity Check"
                    className={clsx(
                      "w-full rounded-lg border px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all",
                      errors.name ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                    )}
                  />
                  {errors.name ? (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      A clear and unique name for this assessment.
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe the purpose, scope, and context of this assessment..."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Optional but recommended.
                  </p>
                </div>

                {/* Row: Assessment Type & Use Case */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Assessment Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.assessmentType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assessmentType: e.target.value,
                        })
                      }
                      className={clsx(
                        "w-full rounded-lg border px-3.5 py-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all",
                        errors.type ? "border-rose-400" : "border-slate-300"
                      )}
                    >
                      <option value="">Select assessment type</option>
                      <option value="FULL_PIPELINE">
                        Full Pipeline Assurance (Data + Model + Inference)
                      </option>
                      <option value="MODEL_BACKDOOR">
                        Model Vulnerability & Backdoor Audit
                      </option>
                      <option value="DATASET_POISONING">
                        Dataset Poisoning & Contributor Triage
                      </option>
                      <option value="RUNTIME_DRIFT">
                        Distribution Shift & Sensor Drift
                      </option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Choose the primary focus of this assessment.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Use Case / Domain
                    </label>
                    <input
                      type="text"
                      value={formData.useCaseDomain}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          useCaseDomain: e.target.value,
                        })
                      }
                      placeholder="e.g., Satellite Imagery, Object Detection"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      The operational domain or application.
                    </p>
                  </div>
                </div>

                {/* Row: Reference Data & Reference Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Reference Data (Optional)
                    </label>
                    <select
                      value={formData.referenceData}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referenceData: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    >
                      <option value="">Select reference dataset</option>
                      <option value="clean_dgis_baseline">
                        Clean DGIS Satellite Baseline v1
                      </option>
                      <option value="operational_archive">
                        Operational Target Dataset Archive
                      </option>
                      <option value="synthetic_split">
                        Synthetic Ground Truth Split
                      </option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Used for comparative analysis (e.g., distribution shift,
                      OOD).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Reference Model (Optional)
                    </label>
                    <select
                      value={formData.referenceModel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referenceModel: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    >
                      <option value="">Select reference model</option>
                      <option value="resnet50_golden">
                        ResNet50 Golden Baseline (Verified)
                      </option>
                      <option value="yolov8_clean">
                        YOLOv8 Air-Gapped Clean Weights
                      </option>
                      <option value="mobilenet_v1">
                        MobileNet Satellite Classifier v1
                      </option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Used for behavioral comparison and integrity checks.
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="Add tags (e.g., production, internal, sprint-23)"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Add relevant tags to help organize and filter assessments.
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    Fields marked with <span className="text-rose-500">*</span>{" "}
                    are required.
                  </span>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-all cursor-pointer"
                  >
                    <span>Save and Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 2 && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Step 2: Add Pipeline Assets
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload ONNX model weights, COCO/YOLO dataset archives, or select
                  from verified local storage.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Model Asset */}
                <div className="p-4 rounded-xl border border-dashed border-slate-300 hover:border-blue-500/80 bg-slate-50/50 flex flex-col items-center text-center space-y-2">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    Model Weights (.onnx)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Candidate model file for parameter analysis & backdoor
                    battery.
                  </p>
                  <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Choose ONNX File</span>
                    <input
                      type="file"
                      accept=".onnx"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setFormData({
                            ...formData,
                            modelFile: e.target.files[0],
                          });
                        }
                      }}
                    />
                  </label>
                  {formData.modelFile && (
                    <span className="text-[11px] text-emerald-600 font-medium">
                      ✓ {formData.modelFile.name}
                    </span>
                  )}
                </div>

                {/* Dataset Asset */}
                <div className="p-4 rounded-xl border border-dashed border-slate-300 hover:border-blue-500/80 bg-slate-50/50 flex flex-col items-center text-center space-y-2">
                  <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    Dataset Archive (.zip / .tar)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    COCO annotations, image directory, and contributor provenance
                    metadata.
                  </p>
                  <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Choose Archive</span>
                    <input
                      type="file"
                      accept=".zip,.tar,.gz"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setFormData({
                            ...formData,
                            datasetFile: e.target.files[0],
                          });
                        }
                      }}
                    />
                  </label>
                  {formData.datasetFile && (
                    <span className="text-[11px] text-emerald-600 font-medium">
                      ✓ {formData.datasetFile.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  <span>Continue to Validate</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Step 3: Pipeline Asset Validation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-flight cryptographic integrity check and format
                  verification.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold">
                      Air-Gapped Local Environment
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 font-bold">
                    PASSED (Zero External Outbound)
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold">
                      Audit Hash Chain Immutable Ledger
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 font-bold">
                    VALID (SHA-256 Chain Intact)
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold">
                      Target Domain Compatibility
                    </span>
                  </div>
                  <span className="font-medium text-blue-700">
                    {formData.useCaseDomain || "Computer Vision Pipeline"}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  <span>Review & Start</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Step 4: Review Assessment Configuration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm assessment parameters before launching the air-gapped
                  assurance engine.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-bold text-slate-900">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span className="font-semibold text-slate-800">
                    {formData.assessmentType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Domain:</span>
                  <span className="font-medium text-slate-700">
                    {formData.useCaseDomain || "General Vision"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference Model:</span>
                  <span className="font-mono text-slate-700">
                    {formData.referenceModel || "None"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference Dataset:</span>
                  <span className="font-mono text-slate-700">
                    {formData.referenceData || "None"}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => onComplete(formData)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  <span>Launch Assessment</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Information & Help Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
            {/* About New Assessment */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Info className="h-4 w-4 text-blue-600" />
                <span>About New Assessment</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                An assessment evaluates the trust and integrity of a computer
                vision pipeline by analyzing data, models, and inference outputs.
              </p>

              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-800 mb-2">
                  You will be able to:
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Upload dataset, model, and inference records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Run comprehensive assurance checks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Investigate findings with evidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Make a disposition decision</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Generate a formal assurance report</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Tips Box */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>Tips</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Providing reference data and/or model improves the accuracy and
                coverage of the analysis.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                You can always update or add more assets after creating the
                assessment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
