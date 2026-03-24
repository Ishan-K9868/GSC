import { useState } from 'react';
import {
  runCoordinatorCopilotQuery,
  runSkillMatchProxy,
  generateGeminiImpactReport,
  runSurgeRagForecast,
  runBurnoutDetection,
  generateCrisisEscalationDraft,
} from '../../services/api';
import styles from './GeminiLab.module.css';

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function GeminiLab() {
  const [copilotQuery, setCopilotQuery] = useState('Show unresolved medical needs older than 2 hours in Uttar Pradesh.');
  const [copilotOut, setCopilotOut] = useState('');

  const [skills, setSkills] = useState('first aid, rescue ops, child safety');
  const [needDesc, setNeedDesc] = useState('Urgent medical support and triage needed for flood-hit families.');
  const [skillOut, setSkillOut] = useState('');

  const [rawLogs, setRawLogs] = useState('Resolved 43 needs, 1,280 beneficiaries, average response 2.9h, high load in health and food support.');
  const [impactOut, setImpactOut] = useState('');

  const [surgeInput, setSurgeInput] = useState({
    historicalSummary: 'Food and water needs rise sharply after heavy rain in zones 3A and 4B.',
    weatherSignals: 'Forecast indicates 6 days moderate to heavy rainfall.',
    socialSignals: 'Increased local posts about supply disruption and water contamination.',
  });
  const [surgeOut, setSurgeOut] = useState('');

  const [burnoutInput, setBurnoutInput] = useState({
    messageToneSample: 'I am exhausted and still handling late-night escalations daily.',
    usageSummary: '16h/day app usage, 43 coordinator messages after midnight this week.',
    optIn: true,
  });
  const [burnoutOut, setBurnoutOut] = useState('');

  const [escalationInput, setEscalationInput] = useState({
    zone: 'Meerut Cluster',
    needsSummary: 'Multiple high-urgency shelter and food needs with delayed response windows.',
    evidenceSummary: '34 unresolved cases, 11 critical, mapped concentration in 3 wards.',
  });
  const [escalationOut, setEscalationOut] = useState('');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1 className={styles.title}>Gemini Powered Features Lab</h1>
          <p className={styles.sub}>
            Central AI layer playground with explainable outputs and graceful degradation across all key workflows.
          </p>
          <div className={styles.row}>
            <span className={styles.pill}>Multimodal-first</span>
            <span className={styles.pill}>Explainable AI</span>
            <span className={styles.pill}>Graceful fallback</span>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Coordinator Copilot</h2>
            <textarea className={styles.textarea} value={copilotQuery} onChange={(e) => setCopilotQuery(e.target.value)} />
            <button
              className="btn btn-primary"
              type="button"
              onClick={async () => {
                const res = await runCoordinatorCopilotQuery(copilotQuery);
                setCopilotOut(pretty(res.data || res.error));
              }}
            >
              Run Copilot
            </button>
            <div className={styles.output}>{copilotOut || 'Output appears here...'}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Skill Matching Embeddings (Proxy)</h2>
            <input className={styles.input} value={skills} onChange={(e) => setSkills(e.target.value)} />
            <textarea className={styles.textarea} value={needDesc} onChange={(e) => setNeedDesc(e.target.value)} />
            <button
              className="btn btn-primary"
              type="button"
              onClick={async () => {
                const res = await runSkillMatchProxy(skills.split(',').map((v) => v.trim()).filter(Boolean), needDesc);
                setSkillOut(pretty(res.data || res.error));
              }}
            >
              Compute Similarity
            </button>
            <div className={styles.output}>{skillOut || 'Output appears here...'}</div>
          </section>

          <section className={`${styles.card} ${styles.span8}`}>
            <h2>Impact Report Generation</h2>
            <textarea className={styles.textarea} value={rawLogs} onChange={(e) => setRawLogs(e.target.value)} />
            <div className={styles.row}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  const res = await generateGeminiImpactReport({
                    ngoName: 'SevaSetu Foundation',
                    periodLabel: 'March 2026',
                    rawActivityLogs: rawLogs,
                    language: 'en',
                  });
                  setImpactOut(pretty(res.data || res.error));
                }}
              >
                Generate EN
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={async () => {
                  const res = await generateGeminiImpactReport({
                    ngoName: 'SevaSetu Foundation',
                    periodLabel: 'March 2026',
                    rawActivityLogs: rawLogs,
                    language: 'hi',
                  });
                  setImpactOut(pretty(res.data || res.error));
                }}
              >
                Generate HI
              </button>
            </div>
            <div className={styles.output}>{impactOut || 'Output appears here...'}</div>
          </section>

          <section className={`${styles.card} ${styles.span4}`}>
            <h2>Surge Forecast RAG</h2>
            <textarea
              className={styles.textarea}
              value={surgeInput.historicalSummary}
              onChange={(e) => setSurgeInput((prev) => ({ ...prev, historicalSummary: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              value={surgeInput.weatherSignals}
              onChange={(e) => setSurgeInput((prev) => ({ ...prev, weatherSignals: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              value={surgeInput.socialSignals}
              onChange={(e) => setSurgeInput((prev) => ({ ...prev, socialSignals: e.target.value }))}
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={async () => {
                const res = await runSurgeRagForecast(surgeInput);
                setSurgeOut(pretty(res.data || res.error));
              }}
            >
              Run Forecast
            </button>
            <div className={styles.output}>{surgeOut || 'Output appears here...'}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Coordinator Burnout Detection (Opt-in)</h2>
            <textarea
              className={styles.textarea}
              value={burnoutInput.messageToneSample}
              onChange={(e) => setBurnoutInput((prev) => ({ ...prev, messageToneSample: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              value={burnoutInput.usageSummary}
              onChange={(e) => setBurnoutInput((prev) => ({ ...prev, usageSummary: e.target.value }))}
            />
            <div className={styles.row}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  const res = await runBurnoutDetection(burnoutInput);
                  setBurnoutOut(pretty(res.data || res.error));
                }}
              >
                Detect Burnout
              </button>
            </div>
            <div className={styles.output}>{burnoutOut || 'Output appears here...'}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Crisis Escalation Draft</h2>
            <input
              className={styles.input}
              value={escalationInput.zone}
              onChange={(e) => setEscalationInput((prev) => ({ ...prev, zone: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              value={escalationInput.needsSummary}
              onChange={(e) => setEscalationInput((prev) => ({ ...prev, needsSummary: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              value={escalationInput.evidenceSummary}
              onChange={(e) => setEscalationInput((prev) => ({ ...prev, evidenceSummary: e.target.value }))}
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={async () => {
                const res = await generateCrisisEscalationDraft(escalationInput);
                setEscalationOut(pretty(res.data || res.error));
              }}
            >
              Draft Letter
            </button>
            <div className={styles.output}>{escalationOut || 'Output appears here...'}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default GeminiLab;
