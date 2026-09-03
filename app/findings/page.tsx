"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAtom, useSetAtom } from "jotai";
import { activeReportAtom, assessmentTabAtom } from "@/client/state/atoms";
import { WorkspaceShell } from "@/client/components/layout/WorkspaceShell";
import { FindingsQueueView } from "@/client/components/assessment/FindingsQueueView";

export default function FindingsPage() {
  const router = useRouter();
  const [activeReport] = useAtom(activeReportAtom);
  const setSecondaryTab = useSetAtom(assessmentTabAtom);

  return (
    <WorkspaceShell
      title="Findings Queue"
      activeNav="findings"
      searchPlaceholder="Search findings, models, IDs..."
      shortcutKey="⌘K"
    >
      <FindingsQueueView
        findings={activeReport?.findings}
        onSelectFinding={() => {
          setSecondaryTab("evidence");
          router.push("/assessments");
        }}
        onNewManualEntry={() => router.push("/assessments/new")}
      />
    </WorkspaceShell>
  );
}
