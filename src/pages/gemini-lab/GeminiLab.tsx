import { useMemo, useState } from 'react';
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
  {
    id: 'copilot',
    label: 'Copilot',
    icon: 'spark' as const,
    description: 'Ask for bottlenecks, priorities, and the next best operational filter.',
    placeholder: 'Example: Where are Delhi tasks getting stuck right now?',
    defaultInput: 'Where are Delhi tasks getting stuck right now?',
    wide: false,
  },
  {
    id: 'skillMatch',
    label: 'Skill Match',
    icon: 'volunteer' as const,
    description: 'See whether a skill bundle really fits a field need before dispatching people.',
    placeholder: 'Example: first aid, triage, women support',
    defaultInput: 'first aid, triage, women support',
    wide: false,
  },
  {
    id: 'impact',
    label: 'Impact Report',
    icon: 'dashboard' as const,
    description: 'Turn raw activity notes into donor-ready narrative, SDG framing, and key stats.',
    placeholder: 'Example: March camps, 140 households, 22 volunteers, 3 wards',
    defaultInput: 'March camps, 140 households reached, 22 volunteers deployed, 3 wards covered',
    wide: true,
  },
  {
    id: 'surge',
    label: 'Surge Forecast',
    icon: 'alert' as const,
    description: 'Project which zones and need types are likely to spike next.',
    placeholder: 'Example: monsoon drains overflowing in north-east cluster',
    defaultInput: 'monsoon drains overflowing in north-east cluster',
    wide: false,
  },
  {
    id: 'burnout',
    label: 'Burnout Prediction',
    icon: 'shield' as const,
    description: 'Check whether coordinator tone and workload suggest fatigue risk.',
    placeholder: 'Example: nonstop escalations, late replies, no backup coverage',
    defaultInput: 'nonstop escalations, late replies, no backup coverage',
    wide: false,
  },
  {
    id: 'escalation',
    label: 'Escalation Draft',
    icon: 'crisis' as const,
    description: 'Draft a ready-to-send escalation letter with evidence and attachment suggestions.',
    placeholder: 'Example: flood water entering low-lying lanes in Zone 4B',
    defaultInput: 'flood water entering low-lying lanes in Zone 4B',
    wide: true,
  },
] as const;

type ToolId = typeof tools[number]['id'];

function FilterChips({ filters }: { filters?: Record<string, string | null | undefined> }) {
  const entries = Object.entries(filters || {}).filter(([, value]) => value && value !== 'all');
  if (entries.length === 0) return null;

  return (
    <div className={styles.chipRow}>
      {entries.map(([key, value]) => (
        <span key={key} className={styles.chip}>{`${key}: ${String(value).replace(/_/g, ' ')}`}</span>
      ))}
    </div>
  );
}

function ResultCard({ toolId, data, loading, error }: CardResult & { toolId: ToolId }) {
  if (loading) return <div className={styles.resultNotice}>Running model + formatting an operator-facing brief...</div>;
  if (error) return <div className={styles.resultNotice}>{error}</div>;
  if (!data) return <div className={styles.resultNotice}>Run the tool to get a plain-language answer, suggested next action, and the model trace.</div>;

  const meta = {
    provider: data.provider,
    model: data.model,
    degraded: data.degraded,
  };

  if (toolId === 'copilot') {
    return (
      <div className={styles.resultBlock}>
        <div className={styles.storyResult}>
          <strong>Direct answer</strong>
          <p>{data.answer}</p>
        </div>
        <FilterChips filters={data.recommendedFilters} />
        <div className={styles.storyResult}>
          <strong>Why this helps</strong>
          <p>{data.explanation}</p>
        </div>
        <div className={styles.metaTrace}>Model: {meta.model || 'unknown'} · Provider: {meta.provider || 'unknown'}{meta.degraded ? ' · fallback mode' : ''}</div>
      </div>
    );
  }

  if (toolId === 'skillMatch') {
    return (
      <div className={styles.resultBlock}>
        <div className={styles.inlineMetric}><span>Skill fit</span><strong>{Math.round((data.semanticSimilarityScore || 0) * 100)}%</strong></div>
        <div className={styles.storyResult}><strong>Why it matched</strong><p>{data.explanation}</p></div>
        <div className={styles.chipRow}>{(data.matchedKeywords || []).map((item: string) => <span key={item} className={styles.chip}>{item}</span>)}</div>
        <div className={styles.metaTrace}>Model: {meta.model || 'unknown'} · Provider: {meta.provider || 'unknown'}{meta.degraded ? ' · fallback mode' : ''}</div>
      </div>
    );
  }

  if (toolId === 'impact') {
    return (
      <div className={styles.resultBlock}>
        <div className={styles.storyResult}><strong>{data.title || 'Impact narrative'}</strong><p>{data.narrative}</p></div>
        <div className={styles.chipRow}>{(data.sdgHighlights || []).map((item: string) => <span key={item} className={styles.chip}>{item}</span>)}</div>
        <div className={styles.bulletList}>{(data.keyStats || []).map((item: string) => <div key={item} className={styles.bulletRow}>{item}</div>)}</div>
        <div className={styles.metaTrace}>Model: {meta.model || 'unknown'} · Provider: {meta.provider || 'unknown'}{meta.degraded ? ' · fallback mode' : ''}</div>
      </div>
    );
  }

  if (toolId === 'surge') {
    return (
      <div className={styles.resultBlock}>
        <div className={styles.inlineMetric}><span>Forecast horizon</span><strong>{data.horizonDays || 14} days</strong></div>
        <div className={styles.matchList}>
          {(data.forecasts || []).slice(0, 4).map((forecast: any, index: number) => (
            <div key={`${forecast.zone}-${index}`} className={styles.matchCard}>
              <div>
                <strong>{forecast.zone}</strong>
                <div className={styles.cardSubtext}>{forecast.category?.replace(/_/g, ' ')}</div>
              </div>
              <span>{Math.round((forecast.demandScore || 0) * 100)} demand</span>
            </div>
          ))}
        </div>
        {(data.forecasts || [])[0]?.recommendation ? <div className={styles.storyResult}><strong>Recommended next move</strong><p>{data.forecasts[0].recommendation}</p></div> : null}
        <div className={styles.metaTrace}>Model: {meta.model || 'unknown'} · Provider: {meta.provider || 'unknown'}{meta.degraded ? ' · fallback mode' : ''}</div>
      </div>
    );
  }

  if (toolId === 'burnout') {
    return (
      <div className={styles.resultBlock}>
        <div className={styles.inlineMetric}><span>Burnout risk</span><strong>{String(data.burnoutRisk || 'unknown').replace(/_/g, ' ')}</strong></div>
        <div className={styles.storyResult}><strong>Action to take</strong><p>{data.suggestion}</p></div>
        <div className={styles.storyResult}><strong>Why the model said that</strong><p>{data.explanation}</p></div>
        <div className={styles.metaTrace}>Model: {meta.model || 'unknown'} · Provider: {meta.provider || 'unknown'}{meta.degraded ? ' · fallback mode' : ''}</div>
      </div>
    );
  }

  if (toolId === 'escalation') {
    return (
      <div className={styles.resultBlock}>
        <div className={styles.storyResult}><strong>{data.subject}</strong><p>{data.letter}</p></div>
        <div className={styles.chipRow}>{(data.recommendedAttachments || []).map((item: string) => <span key={item} className={styles.chip}>{item}</span>)}</div>
        <div className={styles.metaTrace}>Model: {meta.model || 'unknown'} · Provider: {meta.provider || 'unknown'}{meta.degraded ? ' · fallback mode' : ''}</div>
      </div>
    );
  }

  return <pre className={styles.jsonBlock}>{JSON.stringify(data, null, 2)}</pre>;
}

export function GeminiLab() {
  const [results, setResults] = useState<Record<ToolId, CardResult>>(() => {
    const init: Record<string, CardResult> = {};
    tools.forEach((tool) => { init[tool.id] = { loading: false, data: null, error: null }; });
    return init as Record<ToolId, CardResult>;
  });

  const [inputs, setInputs] = useState<Record<ToolId, string>>(() => {
    const init: Record<string, string> = {};
    tools.forEach((tool) => { init[tool.id] = tool.defaultInput; });
    return init as Record<ToolId, string>;
  });

  const explainerCards = useMemo(
    () => [
      { title: 'What this lab is for', text: 'Operational questions, not generic chat. Each card is a concrete tool tied to field workflows.' },
      { title: 'What value it adds', text: 'It turns raw model output into a direct answer, a suggested next action, and a visible model trace.' },
      { title: 'How to use it', text: 'Type a real field question, run one tool, and use the answer as a decision aid - not as a mystery JSON dump.' },
    ],
    []
  );

  async function runTool(toolId: ToolId) {
    setResults((prev) => ({ ...prev, [toolId]: { loading: true, data: null, error: null } }));

    try {
      let res: any;
      const query = inputs[toolId] || tools.find((tool) => tool.id === toolId)?.defaultInput || '';

      switch (toolId) {
        case 'copilot':
          res = await runCoordinatorCopilotQuery(query);
          break;
        case 'skillMatch':
          res = await runSkillMatchProxy(query.split(',').map((item) => item.trim()).filter(Boolean), 'general field need');
          break;
        case 'impact':
          res = await generateGeminiImpactReport({ ngoName: 'SevaSetu', periodLabel: '2025-03', rawActivityLogs: query, language: 'en' });
          break;
        case 'surge':
          res = await runSurgeRagForecast({ historicalSummary: query, weatherSignals: 'stable', socialSignals: 'standard' });
          break;
        case 'burnout':
          res = await runBurnoutDetection({ messageToneSample: query, usageSummary: 'volunteer_001', optIn: true });
          break;
        case 'escalation':
          res = await generateCrisisEscalationDraft({ zone: 'zone_4b', needsSummary: query, evidenceSummary: 'field evidence' });
          break;
      }

      if (res?.success) {
        setResults((prev) => ({ ...prev, [toolId]: { loading: false, data: res.data, error: null } }));
      } else {
        setResults((prev) => ({ ...prev, [toolId]: { loading: false, data: null, error: res?.error?.message || 'Tool run failed' } }));
      }
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [toolId]: { loading: false, data: null, error: err?.message || 'Unknown error' } }));
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>AI Workbench</div>
          <h1 className={styles.heroTitle}>
            Six tools, one surface.<br />
            Ask plain questions, get usable answers.
          </h1>
          <p className={styles.heroSub}>
            Gemini Lab is not a generic playground. It is an operations bench for copilot guidance, volunteer fit checks, donor reporting, surge planning, wellbeing checks, and escalation drafting.
          </p>
        </div>
      </section>

      <section className={styles.explainerRow}>
        {explainerCards.map((card) => (
          <article key={card.title} className={styles.explainerCard}>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </article>
        ))}
      </section>

      <div className={styles.toolGrid}>
        {tools.map((tool) => (
          <article key={tool.id} className={`${styles.toolCard} ${tool.wide ? styles.toolCardWide : ''}`}>
            <div className={styles.toolHeader}>
              <span className={styles.toolIcon}><AppIcon name={tool.icon} size={18} /></span>
              <div>
                <strong>{tool.label}</strong>
                <span className={styles.toolDesc}>{tool.description}</span>
              </div>
            </div>

            <div className={styles.toolBody}>
              <input
                className={styles.toolInput}
                placeholder={tool.placeholder}
                value={inputs[tool.id]}
                onChange={(e) => setInputs((prev) => ({ ...prev, [tool.id]: e.target.value }))}
              />
              <button className={styles.runBtn} type="button" onClick={() => void runTool(tool.id)}>
                <AppIcon name="spark" size={14} /> Run
              </button>
            </div>

            <div className={styles.toolResult}>
              <ResultCard toolId={tool.id} {...results[tool.id]} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default GeminiLab;
