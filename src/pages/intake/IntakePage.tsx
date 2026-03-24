/**
 * Intake Page
 * Main page for submitting need reports via multiple input modes
 * 
 * PRD 5.1: Seva Intake Engine
 * - Voice-First (5.1.1)
 * - Photo Analysis (5.1.2)
 * - WhatsApp Simulation (5.1.3)
 * - Web Form (5.1.4)
 * - Offline Queue indicator (5.1.5)
 */

import { useState } from 'react';
import { VoiceIntake } from './components/VoiceIntake';
import { PhotoIntake } from './components/PhotoIntake';
import { FormIntake } from './components/FormIntake';
import { WhatsAppIntake } from './components/WhatsAppIntake';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import styles from './IntakePage.module.css';

type IntakeMode = 'voice' | 'photo' | 'form' | 'whatsapp';

interface TabConfig {
  id: IntakeMode;
  label: string;
  labelHi: string;
  icon: string;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'voice',
    label: 'Voice',
    labelHi: 'आवाज़',
    icon: '🎤',
    description: 'Press and speak (fastest)',
  },
  {
    id: 'photo',
    label: 'Photo',
    labelHi: 'फ़ोटो',
    icon: '📸',
    description: 'Take a photo for AI analysis',
  },
  {
    id: 'form',
    label: 'Form',
    labelHi: 'फॉर्म',
    icon: '📝',
    description: 'Fill out a detailed form',
  },
  {
    id: 'whatsapp',
    label: 'Chat',
    labelHi: 'चैट',
    icon: '💬',
    description: 'Conversational interface',
  },
];

export function IntakePage() {
  const [activeMode, setActiveMode] = useState<IntakeMode>('voice');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { 
    isOnline, 
    queueCount, 
    isSyncing, 
    syncQueue 
  } = useOfflineQueue();

  const handleSuccess = (reportId: string) => {
    setSuccessMessage(`Report submitted successfully! ID: ${reportId.slice(0, 8)}...`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleError = (error: string) => {
    console.error('Report submission error:', error);
  };

  const renderActiveComponent = () => {
    switch (activeMode) {
      case 'voice':
        return <VoiceIntake onSuccess={handleSuccess} onError={handleError} />;
      case 'photo':
        return <PhotoIntake onSuccess={handleSuccess} onError={handleError} />;
      case 'form':
        return <FormIntake onSuccess={handleSuccess} onError={handleError} />;
      case 'whatsapp':
        return <WhatsAppIntake onSuccess={handleSuccess} onError={handleError} />;
      default:
        return <VoiceIntake onSuccess={handleSuccess} onError={handleError} />;
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Report a Need</h1>
          <p className={styles.subtitle}>
            ज़रूरत की रिपोर्ट करें
          </p>
        </div>

        {/* Offline/Online indicator */}
        <div className={styles.connectionStatus}>
          <span className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`} />
          <span className={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          
          {/* Queue indicator */}
          {queueCount > 0 && (
            <button 
              className={styles.queueBadge}
              onClick={syncQueue}
              disabled={isSyncing || !isOnline}
              title={`${queueCount} reports pending sync`}
            >
              {isSyncing ? (
                <span className={styles.syncingIcon}>↻</span>
              ) : (
                <span>{queueCount}</span>
              )}
              pending
            </button>
          )}
        </div>
      </header>

      {/* Success message */}
      {successMessage && (
        <div className={styles.successBanner}>
          {successMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <nav className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeMode === tab.id ? styles.active : ''}`}
            onClick={() => setActiveMode(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
            <span className={styles.tabLabelHi}>{tab.labelHi}</span>
          </button>
        ))}
      </nav>

      {/* Mode description */}
      <p className={styles.modeDescription}>
        {TABS.find(t => t.id === activeMode)?.description}
      </p>

      {/* Active Component */}
      <main className={styles.content}>
        {renderActiveComponent()}
      </main>

      {/* Quick tips */}
      <footer className={styles.footer}>
        <div className={styles.tips}>
          <strong>Tips:</strong>
          <ul>
            <li>Voice mode is the fastest - just press and speak!</li>
            <li>Photos are analyzed by AI to detect the type of need</li>
            <li>Reports work offline and sync when back online</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

export default IntakePage;
