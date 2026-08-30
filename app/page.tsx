'use client'

import React, { useEffect, useState } from 'react'
import { Header } from '@/client/components/layout/Header'
import { ScenarioSelector } from '@/client/components/scenarios/ScenarioSelector'
import { DatasetAssuranceView } from '@/client/components/dataset/DatasetAssuranceView'
import { ModelAssuranceView } from '@/client/components/model/ModelAssuranceView'
import { ProvenanceStudioView } from '@/client/components/provenance/ProvenanceStudioView'
import { DistributionShiftView } from '@/client/components/drift/DistributionShiftView'
import { AuditLedgerView } from '@/client/components/audit/AuditLedgerView'
import { AssuranceReportView } from '@/client/components/report/AssuranceReportView'
import { AssuranceApiClient } from '@/client/lib/api-client'
import { ScenarioRunResult } from '@/shared/types/assurance'
import { Layers, Cpu, Link2, Compass, FileText, Shield, FlaskConical, UploadCloud, BarChart3 } from 'lucide-react'
import clsx from 'clsx'
import { LiveAnalysisView } from '@/client/components/live/LiveAnalysisView'
import { TrendDashboardView } from '@/client/components/dashboard/TrendDashboardView'

export default function DashboardPage() {
  const [appMode, setAppMode] = useState<'scenarios' | 'live' | 'dashboard'>('scenarios')
  const [activeScenario, setActiveScenario] = useState<string>('A')
  const [activeTab, setActiveTab] = useState<'dataset' | 'model' | 'provenance' | 'drift' | 'audit' | 'report'>('dataset')
  const [scenarioData, setScenarioData] = useState<ScenarioRunResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const handleSelectScenario = async (scenarioId: string) => {
    setLoading(true)
    setActiveScenario(scenarioId)
    try {
      const data = await AssuranceApiClient.runScenario(scenarioId)
      setScenarioData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    AssuranceApiClient.runScenario('A')
      .then((data) => {
        if (isMounted) {
          setScenarioData(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (isMounted) {
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  const tabs = [
    { id: 'dataset', label: '1. DATASET ASSURANCE', icon: Layers },
    { id: 'model', label: '2. MODEL ASSURANCE', icon: Cpu },
    { id: 'provenance', label: '3. CRYPTO PROVENANCE', icon: Link2 },
    { id: 'drift', label: '4. DISTRIBUTION SHIFT', icon: Compass },
    { id: 'audit', label: '5. AUDIT LEDGER', icon: FileText },
    { id: 'report', label: '6. ASSURANCE REPORT', icon: Shield },
  ] as const

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setAppMode('scenarios')}
            className={clsx(
              'flex items-center gap-2 rounded-t border border-b-0 px-4 py-2 font-bold tracking-wider uppercase transition-colors cursor-pointer',
              appMode === 'scenarios'
                ? 'border-cyan-700/60 bg-zinc-900 text-cyan-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            <FlaskConical className="h-4 w-4" /> Scenario Replay
          </button>
          <button
            onClick={() => setAppMode('live')}
            className={clsx(
              'flex items-center gap-2 rounded-t border border-b-0 px-4 py-2 font-bold tracking-wider uppercase transition-colors cursor-pointer',
              appMode === 'live'
                ? 'border-cyan-700/60 bg-zinc-900 text-cyan-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            <UploadCloud className="h-4 w-4" /> Live Analysis
          </button>
          <button
            onClick={() => setAppMode('dashboard')}
            className={clsx(
              'flex items-center gap-2 rounded-t border border-b-0 px-4 py-2 font-bold tracking-wider uppercase transition-colors cursor-pointer',
              appMode === 'dashboard'
                ? 'border-cyan-700/60 bg-zinc-900 text-cyan-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            <BarChart3 className="h-4 w-4" /> Dashboard
          </button>
        </div>

        {appMode === 'dashboard' ? (
          <TrendDashboardView />
        ) : appMode === 'live' ? (
          <LiveAnalysisView />
        ) : (
          <>
            <ScenarioSelector
              activeScenario={activeScenario}
              loading={loading}
              onSelectScenario={handleSelectScenario}
            />

            <div className="border-b border-zinc-800 flex overflow-x-auto gap-2 pb-px text-xs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2.5 font-bold tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer',
                      isActive
                        ? 'border-cyan-400 text-cyan-300 bg-zinc-900/60'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {loading ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-12 text-center text-xs text-zinc-400 space-y-3">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <div>RUNNING AIR-GAPPED ASSURANCE PIPELINE...</div>
              </div>
            ) : scenarioData ? (
              <div className="space-y-6">
                {activeTab === 'dataset' && (
                  <DatasetAssuranceView
                    findings={scenarioData.report.findings}
                    contributorSummaries={scenarioData.contributor_summaries || []}
                    samplesCount={scenarioData.samples_count || 40}
                  />
                )}

                {activeTab === 'model' && (
                  <ModelAssuranceView
                    fingerprint={scenarioData.model_fingerprint}
                    behaviour={scenarioData.model_behaviour}
                    findings={scenarioData.report.findings}
                  />
                )}

                {activeTab === 'provenance' && (
                  <ProvenanceStudioView
                    inferenceRecord={scenarioData.inference_record}
                    validRecord={scenarioData.valid_record}
                    tamperedRecord={scenarioData.tampered_record}
                  />
                )}

                {activeTab === 'drift' && <DistributionShiftView report={scenarioData.drift_report} />}

                {activeTab === 'audit' && (
                  <AuditLedgerView entries={scenarioData.audit_entries || []} />
                )}

                {activeTab === 'report' && (
                  <AssuranceReportView report={scenarioData.report} />
                )}
              </div>
            ) : null}
          </>
        )}
      </main>

      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-3 text-center text-[10px] text-zinc-500 font-mono">
        VIGIL-CV ASSURANCE PLATFORM • DEVELOPED FOR INDIAN ARMY (DGIS) / MoD • PROBLEM STATEMENT ID: 26228 • 100% AIR-GAPPED
      </footer>
    </div>
  )
}
