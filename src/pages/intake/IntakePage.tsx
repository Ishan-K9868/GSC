/**
 * IntakePage — Field-Ready Reporting Workspace
 */

import { useState } from 'react';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { AppIcon } from '../../components/shared';
import { VoiceIntake } from './components/VoiceIntake';
import { PhotoIntake } from './components/PhotoIntake';
import { FormIntake } from './components/FormIntake';
import { WhatsAppIntake } from './components/WhatsAppIntake';
import styles from './IntakePage.module.css';

const modes = [
  { id: 'voice', label: 'Voice', labelHi: 'aawaaz', icon: 'intake' as const, hint: 'Speak the need, AI captures it' },
  { id: 'photo', label: 'Photo', labelHi: 'tasveer', icon: 'layers' as const, hint: 'Snap evidence, auto-categorise' },
  { id: 'form', label: 'Form', labelHi: 'form', icon: 'dashboard' as const, hint: 'Structured fields for coordinators' },
  { id: 'whatsapp', label: 'Assisted', labelHi: 'sahayata', icon: 'network' as const, hint: 'Guided chat intake flow' },
] as const;

type ModeId = typeof modes[number]['id'];

export function IntakePage() {
  const [activeMode, setActiveMode] = useState<ModeId>('voice');
  const { queueCount, isOnline, isSyncing, syncQueue } = useOfflineQueue();

  const currentMode = modes.find((m) => m.id === activeMode) || modes[0];

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>Intake Surface</div>
          <h1 className={styles.heroTitle}>
            Four channels, one report.<br />
            Choose the fastest path for the field.
          </h1>
        </div>
        <div className={styles.statusPanel}>
          <div className={styles.statusRow}>
            <span className={styles.statusDot} data-online={isOnline} />
            <span>{isOnline ? 'Connected' : 'Offline mode'}</span>
          </div>
          {queueCount > 0 ? (
            <div className={styles.statusRow}>
              <span>{queueCount} pending</span>
              <button className={styles.inlineBtn} type="button" onClick={() => void syncQueue()}>
                {isSyncing ? 'Syncing...' : 'Sync now'}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Workspace */}
      <div className={styles.workspace}>
        {/* Mode Rail */}
        <aside className={styles.modeRail}>
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`${styles.modeBtn} ${activeMode === mode.id ? styles.modeBtnActive : ''}`}
              onClick={() => setActiveMode(mode.id)}
            >
              <span className={styles.modeIcon}>
                <AppIcon name={mode.icon} size={18} />
              </span>
              <div className={styles.modeCopy}>
                <strong>{mode.label}</strong>
                <span className={styles.modeHi}>{mode.labelHi}</span>
              </div>
            </button>
          ))}

          <div className={styles.tipCard}>
            <strong>{currentMode.label}</strong>
            <p>{currentMode.hint}</p>
          </div>
        </aside>

        {/* Active Surface */}
        <main className={styles.surface}>
          <div className={styles.surfaceHeader}>
            <AppIcon name={currentMode.icon} size={16} />
            <span>{currentMode.label} intake</span>
          </div>
          <div className={styles.surfaceBody}>
            {activeMode === 'voice' && <VoiceIntake onSwitchToForm={() => setActiveMode('form')} />}
            {activeMode === 'photo' && <PhotoIntake />}
            {activeMode === 'form' && <FormIntake />}
            {activeMode === 'whatsapp' && <WhatsAppIntake />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default IntakePage;
