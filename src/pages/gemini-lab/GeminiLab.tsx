import { useState } from 'react';
import {
  runCoordinatorCopilotQuery,
  runSkillMatchProxy,
  generateGeminiImpactReport,
  runSurgeRagForecast,
  runBurnoutDetection,
  generateCrisisEscalationDraft,
} from '../../services/api';
import { AppIcon } from '../../components/shared';
import styles from './GeminiLab.module.css';

type CardResult = { loading: boolean; data: any; error: string | null };

const tools = [
  { id: 'copilot', label: 'Copilot', icon: 'spark' as const, description: 'Context-aware coordinator suggestions', wide: false },
  { id: 'skillMatch', label: 'Skill Match', icon: 'volunteer' as const, description: 'AI-ranked volunteer matching for a given need', wide: false },
  { id: 'impact', label: 'Impact Report', icon: 'dashboard' as const, description: 'Donor-ready narrative + SDG mapping', wide: true },
  { id: 'surge', label: 'Surge Forecast', icon: 'alert' as const, description: 'Demand projection for coming weeks', wide: false },
  { id: 'burnout', label: 'Burnout Prediction', icon: 'shield' as const, description: 'Volunteer fatigue risk assessment', wide: false },
  { id: 'escalation', label: 'Escalation Draft', icon: 'crisis' as const, description: 'Auto-drafted escalation with evidence', wide: true },
] as const;

type ToolId = typeof tools[number]['id'];

function ResultCard({ data, loading, error }: CardResult) {
  if (loading) return <div className={styles.resultNotice}>Processing...</div>;
  if (error) return <div className={styles.resultNotice}>{error}</div>;
  if (!data) return <div className={styles.resultNotice}>Run the tool to see results.</div>;

  if (typeof data === 'string') return <p className={styles.resultText}>{data}</p>;

  return (
    <div className={styles.resultBlock}>
      {data.summary && <p className={styles.resultText}>{data.summary}</p>}
      {data.narrative && <p className={styles.resultText}>{data.narrative}</p>}
      {data.recommendation && <p className={styles.resultText}>{data.recommendation}</p>}

      {Array.isArray(data.suggestions) && data.suggestions.length > 0 && (
        <div className={styles.chipRow}>
          {data.suggestions.map((s: string, i: number) => <span key={i} className={styles.chip}>{s}</span>)}
        </div>
      )}

      {Array.isArray(data.matches) && data.matches.length > 0 && (
        <div className={styles.matchList}>
          {data.matches.slice(0, 5).map((m: any) => (
            <div key={m.volunteerId} className={styles.matchCard}>
              <strong>{m.volunteerName}</strong>
              <span>{Math.round((m.score || 0) * 100)} score</span>
            </div>
          ))}
        </div>
      )}

      {data.riskLevel && (
        <div className={styles.inlineMetric}>
          <span>Risk level</span><strong>{data.riskLevel}</strong>
        </div>
      )}

      {!data.summary && !data.narrative && !data.recommendation && !data.suggestions && !data.matches && !data.riskLevel && (
        <pre className={styles.jsonBlock}>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

export function GeminiLab() {
  const [results, setResults] = useState<Record<ToolId, CardResult>>(() => {
    const init: Record<string, CardResult> = {};
    tools.forEach(t => { init[t.id] = { loading: false, data: null, error: null }; });
    return init as Record<ToolId, CardResult>;
  });

  const [inputs, setInputs] = useState<Record<ToolId, string>>(() => {
    const init: Record<string, string> = {};
    tools.forEach(t => { init[t.id] = ''; });
    return init as Record<ToolId, string>;
  });

  async function runTool(toolId: ToolId) {
    setResults(prev => ({ ...prev, [toolId]: { loading: true, data: null, error: null } }));

    try {
      let res: any;
      const query = inputs[toolId] || 'Delhi urban district needs';

      switch (toolId) {
        case 'copilot': res = await runCoordinatorCopilotQuery(query); break;
        case 'skillMatch': res = await runSkillMatchProxy(query.split(',').map(s => s.trim()), 'general field need'); break;
        case 'impact': res = await generateGeminiImpactReport({ ngoName: 'SevaSetu', periodLabel: '2025-03', rawActivityLogs: query || 'sample', language: 'en' }); break;
        case 'surge': res = await runSurgeRagForecast({ historicalSummary: query || 'zone_4b data', weatherSignals: 'stable', socialSignals: 'standard' }); break;
        case 'burnout': res = await runBurnoutDetection({ messageToneSample: query || 'sample', usageSummary: 'volunteer_001', optIn: true }); break;
        case 'escalation': res = await generateCrisisEscalationDraft({ zone: 'zone_4b', needsSummary: query || 'report', evidenceSummary: 'field evidence' }); break;
      }

      if (res?.success) {
        setResults(prev => ({ ...prev, [toolId]: { loading: false, data: res.data, error: null } }));
      } else {
        setResults(prev => ({ ...prev, [toolId]: { loading: false, data: null, error: res?.error?.message || 'Tool run failed' } }));
      }
    } catch (err: any) {
      setResults(prev => ({ ...prev, [toolId]: { loading: false, data: null, error: err?.message || 'Unknown error' } }));
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>AI Workbench</div>
          <h1 className={styles.heroTitle}>
            Six tools, one surface.<br />
            Run any model against live field data.
          </h1>
          <p className={styles.heroSub}>
            Copilot suggestions, volunteer matching, impact reporting, and escalation drafting.
          </p>
        </div>
      </section>

      <div className={styles.toolGrid}>
        {tools.map((tool) => (
          <article key={tool.id} className={`${styles.toolCard} ${tool.wide ? styles.toolCardWide : ''}`}>
            <div className={styles.toolHeader}>
              <span className={styles.toolIcon}>
                <AppIcon name={tool.icon} size={18} />
              </span>
              <div>
                <strong>{tool.label}</strong>
                <span className={styles.toolDesc}>{tool.description}</span>
              </div>
            </div>

            <div className={styles.toolBody}>
              <input
                className={styles.toolInput}
                placeholder={`Query for ${tool.label}...`}
                value={inputs[tool.id]}
                onChange={(e) => setInputs(prev => ({ ...prev, [tool.id]: e.target.value }))}
              />
              <button className={styles.runBtn} type="button" onClick={() => void runTool(tool.id)}>
                <AppIcon name="spark" size={14} /> Run
              </button>
            </div>

            <div className={styles.toolResult}>
              <ResultCard {...results[tool.id]} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default GeminiLab;
