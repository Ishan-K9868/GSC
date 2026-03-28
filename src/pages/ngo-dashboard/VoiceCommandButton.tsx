import { useEffect, useMemo, useState } from 'react';
import { auth } from '../../config/firebase';
import { AppIcon } from '../../components/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS !== 'false';
const DEV_TOKEN = 'dev-mock-token-for-prototype';

type FunctionDeclaration = {
  name: string;
  description: string;
};

type VoiceCommandButtonProps = {
  suggestedNeedId?: string;
  suggestedVolunteerId?: string;
};

async function getToken(): Promise<string | null> {
  if (DEV_MODE) return DEV_TOKEN;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

function extractId(command: string, label: string): string | null {
  const match = command.match(new RegExp(`${label}[\s:#-]*([a-zA-Z0-9_-]+)`, 'i'));
  return match?.[1] || null;
}

function inferCategory(command: string): string | undefined {
  const normalized = command.toLowerCase();
  const categories = [
    'emergency',
    'food_nutrition',
    'health',
    'education',
    'water_sanitation',
    'shelter',
    'women_child',
    'environment',
  ];

  return categories.find((category) => normalized.includes(category) || normalized.includes(category.replace(/_/g, ' ')));
}

function resolveToolFromCommand(
  command: string,
  fallbackNeedId?: string,
  fallbackVolunteerId?: string,
  coordinatorId?: string
): { toolName: string; args: Record<string, any> } | null {
  const normalized = command.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes('summary') || normalized.includes('how many needs') || normalized.includes('show needs')) {
    return {
      toolName: 'get_needs_summary',
      args: {
        category: inferCategory(normalized),
      },
    };
  }

  if (normalized.includes('available volunteers') || normalized.includes('volunteer list')) {
    return {
      toolName: 'get_volunteer_list',
      args: {
        category: inferCategory(normalized),
      },
    };
  }

  if (normalized.includes('assign') || normalized.includes('dispatch') || normalized.includes('send volunteer')) {
    return {
      toolName: 'assign_volunteer',
      args: {
        needReportId: extractId(normalized, 'report') || extractId(normalized, 'need') || fallbackNeedId,
        volunteerId: extractId(normalized, 'volunteer') || fallbackVolunteerId,
      },
    };
  }

  if (normalized.includes('escalate')) {
    return {
      toolName: 'escalate_need',
      args: {
        needReportId: extractId(normalized, 'report') || extractId(normalized, 'need') || fallbackNeedId,
        reason: 'Coordinator voice escalation',
      },
    };
  }

  if (normalized.includes('mark resolved') || normalized.includes('resolve need') || normalized.includes('close need')) {
    return {
      toolName: 'mark_resolved',
      args: {
        needReportId: extractId(normalized, 'report') || extractId(normalized, 'need') || fallbackNeedId,
        coordinatorId,
      },
    };
  }

  return null;
}

export function VoiceCommandButton({ suggestedNeedId, suggestedVolunteerId }: VoiceCommandButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [functions, setFunctions] = useState<FunctionDeclaration[]>([]);
  const [error, setError] = useState<string | null>(null);

  const coordinatorId = useMemo(() => auth.currentUser?.uid || (DEV_MODE ? 'dev-user-001' : undefined), []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadFunctions() {
      try {
        const token = await getToken();
        const result = await fetch(`${API_BASE_URL}/gemini/live-functions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const payload = await result.json();
        if (!cancelled && result.ok && payload.success) {
          setFunctions(payload.data?.functions || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error('Failed to load live function declarations:', loadError);
        }
      }
    }

    void loadFunctions();

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function executeCommand(customCommand?: string) {
    const nextCommand = (customCommand || command).trim();
    setError(null);

    const resolved = resolveToolFromCommand(nextCommand, suggestedNeedId, suggestedVolunteerId, coordinatorId);
    if (!resolved) {
      setError('Could not map that transcript to a supported action. Try summary, volunteer list, assign, escalate, or mark resolved.');
      return;
    }

    if ((resolved.toolName === 'assign_volunteer' || resolved.toolName === 'escalate_need' || resolved.toolName === 'mark_resolved') && !resolved.args.needReportId) {
      setError('A need/report ID is required for that command.');
      return;
    }

    if (resolved.toolName === 'assign_volunteer' && !resolved.args.volunteerId) {
      setError('A volunteer ID is required for assignment commands.');
      return;
    }

    setLoading(true);
    setTranscript(nextCommand);

    try {
      const token = await getToken();
      const result = await fetch(`${API_BASE_URL}/gemini/live-tool-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(resolved),
      });
      const payload = await result.json();

      if (!result.ok || !payload.success) {
        throw new Error(payload.error?.message || 'Live command failed');
      }

      setResponse(payload.data?.result || 'Command executed.');
      setCommand(nextCommand);
    } catch (commandError: any) {
      setError(commandError.message || 'Command failed');
    } finally {
      setLoading(false);
    }
  }

  const quickActions = [
    {
      label: 'Summarize active needs',
      command: 'Summarize active needs',
    },
    {
      label: 'List free volunteers',
      command: 'Show available volunteers',
    },
    {
      label: 'Assign suggested volunteer',
      command: `Assign volunteer ${suggestedVolunteerId || '<volunteer-id>'} to report ${suggestedNeedId || '<report-id>'}`,
    },
    {
      label: 'Escalate suggested need',
      command: `Escalate report ${suggestedNeedId || '<report-id>'}`,
    },
    {
      label: 'Resolve suggested need',
      command: `Mark resolved report ${suggestedNeedId || '<report-id>'}`,
    },
  ];

  return (
    <>
      {open ? (
        <div
          style={{
            position: 'fixed',
            right: '1.25rem',
            bottom: '6.2rem',
            width: 'min(24rem, calc(100vw - 2rem))',
            background: 'var(--surface-glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(14px)',
            padding: '1rem',
            zIndex: 50,
            display: 'grid',
            gap: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
                Voice dispatch copilot
              </div>
              <strong style={{ display: 'block', marginTop: '0.2rem', fontSize: '1rem' }}>Text fallback, real Firestore actions</strong>
              <p style={{ marginTop: '0.28rem', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Hackathon-safe mode: the mic shell stays visible, but commands are executed through text-based function calling.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                border: '1px solid var(--glass-border)',
                background: 'var(--surface-1)',
                borderRadius: '999px',
                width: '2rem',
                height: '2rem',
                cursor: 'pointer',
                color: 'var(--text-subtle)',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  setCommand(action.command);
                  void executeCommand(action.command);
                }}
                style={{
                  border: '1px solid var(--glass-border)',
                  background: 'var(--surface-1)',
                  color: 'var(--text-primary)',
                  borderRadius: '999px',
                  padding: '0.45rem 0.7rem',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Transcript</span>
            <textarea
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Example: Assign volunteer seed-volunteer-001 to report seed-report-004"
              rows={3}
              style={{
                width: '100%',
                borderRadius: '18px',
                border: '1px solid var(--glass-border)',
                background: 'var(--surface-1)',
                color: 'var(--text-primary)',
                padding: '0.75rem 0.85rem',
                resize: 'vertical',
                fontFamily: 'General Sans, sans-serif',
                fontSize: '0.82rem',
              }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {functions.length > 0 ? `${functions.length} live tool functions ready.` : 'Loading live tool schema...'}
            </span>
            <button
              type="button"
              onClick={() => void executeCommand()}
              disabled={loading || !command.trim()}
              style={{
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent), #c65423)',
                color: '#fff8f0',
                borderRadius: '999px',
                padding: '0.65rem 1rem',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                minWidth: '9rem',
              }}
            >
              {loading ? 'Executing...' : 'Execute command'}
            </button>
          </div>

          {transcript ? (
            <div style={{ borderRadius: '18px', background: 'var(--surface-1)', border: '1px solid var(--glass-border)', padding: '0.8rem' }}>
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
                Last transcript
              </span>
              <p style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>{transcript}</p>
            </div>
          ) : null}

          {response ? (
            <div style={{ borderRadius: '18px', background: 'rgba(45,157,120,0.08)', border: '1px solid rgba(45,157,120,0.2)', padding: '0.8rem' }}>
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
                Copilot response
              </span>
              <p style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>{response}</p>
            </div>
          ) : null}

          {error ? (
            <div style={{ borderRadius: '18px', background: 'rgba(212,68,37,0.08)', border: '1px solid rgba(212,68,37,0.2)', padding: '0.8rem', fontSize: '0.8rem', color: '#A53A20' }}>
              {error}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open voice dispatch copilot"
        style={{
          position: 'fixed',
          right: '1.25rem',
          bottom: '1.25rem',
          width: '4.1rem',
          height: '4.1rem',
          borderRadius: '999px',
          border: '1px solid rgba(212,98,42,0.26)',
          background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.2), transparent 40%), linear-gradient(135deg, var(--accent), #bf5425)',
          color: '#fff8f0',
          boxShadow: '0 22px 40px rgba(149, 67, 31, 0.22)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 51,
        }}
      >
        <span style={{ position: 'absolute', inset: '0.35rem', borderRadius: '999px', border: '1px solid rgba(255,248,240,0.18)' }} />
        <AppIcon name="spark" size={20} />
      </button>
    </>
  );
}

export default VoiceCommandButton;
