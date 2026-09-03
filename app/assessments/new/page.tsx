"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { activeReportAtom, assessmentTabAtom } from "@/client/state/atoms";
import { WorkspaceShell } from "@/client/components/layout/WorkspaceShell";
import { CreateAssessmentWizard } from "@/client/components/assessment/CreateAssessmentWizard";
import { AssuranceReport } from "@/shared/types/assurance";

export default function NewAssessmentPage() {
  const router = useRouter();
  const setActiveReport = useSetAtom(activeReportAtom);
  const setSecondaryTab = useSetAtom(assessmentTabAtom);

  const handleComplete = (report: AssuranceReport) => {
    setActiveReport(report);
    setSecondaryTab("overview");
    router.push("/assessments");
  };

  return (
    <WorkspaceShell title="New Assessment" activeNav="assessments">
      <CreateAssessmentWizard
        onBack={() => router.push("/assessments")}
        onComplete={handleComplete}
      />
    </WorkspaceShell>
  );
}
