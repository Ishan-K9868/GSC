/**
 * WhatsApp Intake Simulation Component
 * PRD: 5.1.3 WhatsApp Integration
 *
 * Simulates a WhatsApp-like conversation interface for field workers
 * who are familiar with WhatsApp messaging patterns.
 *
 * Note: Actual WhatsApp integration deferred - this is a simulation
 * that mimics the conversational UX for demo purposes.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { submitReport } from '../../../services/api';
import { CategoryMetadata, IntakeSource } from '../../../types';
import type { Location, NeedCategoryType } from '../../../types';
import LocationPresetPicker from '../../../components/shared/LocationPresetPicker';
import { getDelhiLocationPreset } from '../../../data/delhiLocationPresets';
import styles from './WhatsAppIntake.module.css';

interface WhatsAppIntakeProps {
  onSuccess?: (reportId: string) => void;
  onError?: (error: string) => void;
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  options?: string[];
  selectionMode?: 'single' | 'multi';
}

type ConversationStep =
  | 'greeting'
  | 'help_prompt'
  | 'ask_need'
  | 'ask_details'
  | 'ask_location'
  | 'ask_people'
  | 'confirm'
  | 'submitting'
  | 'success'
  | 'error';

const BOT_NAME = 'SevaSetu Bot';

const QUICK_REPLIES = {
  greeting: ['Report a need', 'Check status', 'Help'],
  categories: Object.values(CategoryMetadata).map((c) => `${c.emoji} ${c.label}`),
  location: ['Share GPS location', 'Type address'],
  people: ['1-10', '10-50', '50-100', '100+'],
  confirm: ['Yes, submit', 'No, cancel'],
  success: ['Report another need', 'Done'],
  retry: ['Try again', 'Cancel'],
} as const;

const BUTTON_ONLY_STEPS: ConversationStep[] = ['greeting', 'help_prompt', 'ask_need', 'ask_people', 'confirm', 'success', 'error'];

function inferCategoryFromText(input: string): NeedCategoryType {
  const text = input.toLowerCase();

  if (/(fire|accident|rescue|attack|emergency|ambulance|blast)/.test(text)) return 'emergency';
  if (/(food|hunger|ration|meal|nutrition)/.test(text)) return 'food_nutrition';
  if (/(doctor|medicine|health|medical|fever|hospital|injury)/.test(text)) return 'health';
  if (/(school|education|teacher|student|book|class|tent)/.test(text)) return 'education';
  if (/(water|sanitation|drain|sewage|toilet|tank)/.test(text)) return 'water_sanitation';
  if (/(shelter|roof|tent|blanket|homeless)/.test(text)) return 'shelter';
  if (/(women|child|maternal|domestic|baby)/.test(text)) return 'women_child';
  if (/(garbage|pollution|waste|cleanup|environment)/.test(text)) return 'environment';

  return 'health';
}

function getCategoryFromOption(option: string): NeedCategoryType | null {
  const entry = Object.entries(CategoryMetadata).find(([, meta]) => option.includes(meta.label) || option.includes(meta.emoji));
  return (entry?.[0] as NeedCategoryType | undefined) || null;
}

export function WhatsAppIntake({ onSuccess, onError }: WhatsAppIntakeProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState<ConversationStep>('greeting');
  const [reportData, setReportData] = useState({
    category: '' as NeedCategoryType | '',
    description: '',
    location: null as Location | null,
    estimatedPeople: 1,
  });
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<NeedCategoryType[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const { getLocation } = useGeolocation();

  const isButtonOnlyStep = useMemo(() => BUTTON_ONLY_STEPS.includes(step), [step]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (messagesRef.current) {
        messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const initialGreeting: Message = {
    id: 'initial-greeting',
    type: 'bot',
    content: `Namaste! Welcome to ${BOT_NAME}.\n\nI can help you report community needs quickly. What would you like to do?`,
    timestamp: new Date(),
    options: [...QUICK_REPLIES.greeting],
    selectionMode: 'single',
  };

  useEffect(() => {
    setMessages((current) => (current.length === 0 ? [initialGreeting] : current));
  }, []);

  const addBotMessage = async (content: string, options?: readonly string[], selectionMode?: 'single' | 'multi') => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));
    setIsTyping(false);

    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'bot',
      content,
      timestamp: new Date(),
      options: options ? [...options] : undefined,
      selectionMode,
    };

    setMessages((prev) => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, message]);
  };

  const resetReportData = () => {
    setReportData({
      category: '',
      description: '',
      location: null,
      estimatedPeople: 1,
    });
    setSelectedCategories([]);
    setSelectedPresetId('');
  };

  const applyResolvedLocation = async (location: Location, userFacingLabel: string) => {
    setReportData((prev) => ({ ...prev, location }));
    addUserMessage(userFacingLabel);
    setStep('confirm');

    const catMeta = reportData.category ? CategoryMetadata[reportData.category] : null;
    await addBotMessage(
      'Please confirm your report:\n\n' +
        `Category: ${catMeta?.emoji || ''} ${catMeta?.label || reportData.category}\n` +
        `Description: ${reportData.description.substring(0, 100)}...\n` +
        `Location: ${location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}\n` +
        `People affected: ~${reportData.estimatedPeople}\n\n` +
        'Should I submit this report?',
      QUICK_REPLIES.confirm
    );
  };

  const handleUseCurrentLocation = async () => {
    const loc = await getLocation();
    if (!loc) return;
    setSelectedPresetId('');
    await applyResolvedLocation(loc, `Using GPS location: ${loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}`);
  };

  const handleSelectLocationPreset = async (presetId: string) => {
    const preset = getDelhiLocationPreset(presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    await applyResolvedLocation(preset.location, `Selected map section: ${preset.label}`);
  };

  const handleSend = async (text?: string) => {
    if (isButtonOnlyStep && !text) return;

    const messageText = (text || inputText).trim();
    if (!messageText) return;

    setInputText('');
    addUserMessage(messageText);
    await processUserResponse(messageText);
  };

  const processUserResponse = async (response: string) => {
    switch (step) {
      case 'greeting':
        if (response.toLowerCase().includes('report')) {
          setStep('ask_need');
          setSelectedCategories([]);
          await addBotMessage(
            'What type of need do you want to report? Select one or more categories, then press Continue.',
            QUICK_REPLIES.categories,
            'multi'
          );
        } else if (response.toLowerCase().includes('status')) {
          await addBotMessage(
            'To check report status, please visit the dashboard. This simulation focuses on report submission.',
            ['Report a need', 'Help']
          );
          setStep('help_prompt');
        } else if (response.toLowerCase().includes('help')) {
          await addBotMessage(
            `${BOT_NAME} helps you report community needs:\n\n` +
              '1. Report emergency, health, food, education, or other needs\n' +
              '2. Share location and photos\n' +
              '3. Get matched with NGOs who can help\n\n' +
              'Would you like to report a need?',
            ['Report a need']
          );
          setStep('help_prompt');
        } else {
          await addBotMessage('Please choose one of the buttons to continue.', QUICK_REPLIES.greeting);
        }
        break;

      case 'help_prompt':
        if (response.toLowerCase().includes('report')) {
          setStep('ask_need');
          setSelectedCategories([]);
          await addBotMessage(
            'What type of need do you want to report? Select one or more categories, then press Continue.',
            QUICK_REPLIES.categories,
            'multi'
          );
        } else {
          await addBotMessage('Please choose one of the buttons to continue.', ['Report a need']);
        }
        break;

      case 'ask_need': {
        const category = inferCategoryFromText(response);
        setReportData((prev) => ({ ...prev, category }));
        setStep('ask_details');

        const categoryMeta = CategoryMetadata[category];
        await addBotMessage(
          `${categoryMeta.emoji} Got it - ${categoryMeta.label}.\n\nPlease describe the situation in detail. What exactly is happening? Who is affected?`
        );
        break;
      }

      case 'ask_details':
        setReportData((prev) => ({ ...prev, description: response }));
        setStep('ask_people');
        await addBotMessage(
          'Thank you for the details. Approximately how many people are affected?',
          QUICK_REPLIES.people
        );
        break;

      case 'ask_people': {
        let people = 1;
        if (response.includes('100+')) {
          people = 100;
        } else if (response.includes('50-100')) {
          people = 50;
        } else if (response.includes('10-50')) {
          people = 25;
        } else if (response.includes('1-10')) {
          people = 5;
        } else {
          const parsed = parseInt(response, 10);
          if (!Number.isNaN(parsed)) people = parsed;
        }

        setReportData((prev) => ({ ...prev, estimatedPeople: people }));
        setStep('ask_location');
        await addBotMessage(
          'Last step: choose the report location. You can pick a Delhi map section below, use GPS, or type the address in the message box.'
        );
        break;
      }

      case 'ask_location':
        await applyResolvedLocation(
          {
            latitude: 0,
            longitude: 0,
            address: response,
          },
          response
        );
        break;

      case 'confirm':
        if (response.toLowerCase().includes('yes') || response.toLowerCase().includes('submit')) {
          setStep('submitting');
          await submitReportData();
        } else if (response.toLowerCase().includes('cancel') || response.toLowerCase().includes('no')) {
          setStep('greeting');
          resetReportData();
          await addBotMessage('No problem, the report has been cancelled. Would you like to start over?', QUICK_REPLIES.greeting);
        } else {
          await addBotMessage('Please choose one of the buttons to continue.', QUICK_REPLIES.confirm);
        }
        break;

      case 'success':
        if (response.toLowerCase().includes('report another')) {
          resetReportData();
          setStep('ask_need');
          await addBotMessage(
            'What type of need do you want to report next? Select one or more categories, then press Continue.',
            QUICK_REPLIES.categories,
            'multi'
          );
        } else if (response.toLowerCase().includes('done')) {
          setStep('greeting');
          await addBotMessage(
            'You are all set. If another community issue comes up, tap Report a need and I will help you file it quickly.',
            ['Report a need']
          );
        } else {
          await addBotMessage('Please choose one of the buttons to continue.', QUICK_REPLIES.success);
        }
        break;

      case 'error':
        if (response.toLowerCase().includes('try again')) {
          setStep('confirm');
          await addBotMessage('Should I submit this report now?', QUICK_REPLIES.confirm);
        } else if (response.toLowerCase().includes('cancel')) {
          setStep('greeting');
          resetReportData();
          await addBotMessage('Okay. If you need me again, choose Report a need.', QUICK_REPLIES.greeting);
        } else {
          await addBotMessage('Please choose one of the buttons to continue.', QUICK_REPLIES.retry);
        }
        break;

      default:
        await addBotMessage("I'm not sure how to help with that. Would you like to report a new need?", QUICK_REPLIES.greeting);
    }
  };

  const submitReportData = async () => {
    try {
      await addBotMessage('Submitting your report...');

      const result = await submitReport({
        description: reportData.description,
        location: reportData.location || { latitude: 0, longitude: 0 },
        source: IntakeSource.WHATSAPP,
        language: 'en',
        category: reportData.category as NeedCategoryType,
        estimatedPeopleAffected: reportData.estimatedPeople,
      });

      if (result.success && result.data) {
        setStep('success');
        const reportId = result.data.report.id || 'unknown';

        await addBotMessage(
          'Your report has been submitted successfully!\n\n' +
            `Report ID: ${reportId.slice(0, 8)}...\n\n` +
            'An NGO will be assigned to address this need. You will be notified of updates.\n\n' +
            'Thank you for helping your community!',
          QUICK_REPLIES.success
        );

        onSuccess?.(reportId);
      } else {
        throw new Error(result.error?.message || 'Submission failed');
      }
    } catch (err: any) {
      setStep('error');
      await addBotMessage(
        'Sorry, there was an error submitting your report.\n\n' +
          `Error: ${err.message}\n\n` +
          'Please try again.',
        QUICK_REPLIES.retry
      );
      onError?.(err.message);
    }
  };

  const handleQuickReply = (reply: string) => {
    if (step === 'ask_need') {
      const category = getCategoryFromOption(reply);
      if (!category) return;

      setSelectedCategories((current) =>
        current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
      );
      return;
    }

    void handleSend(reply);
  };

  const handleCategoryConfirm = async () => {
    if (selectedCategories.length === 0) return;

    const primaryCategory = selectedCategories[0];
    const selectedLabels = selectedCategories.map((category) => CategoryMetadata[category].label).join(', ');

    addUserMessage(`Selected: ${selectedLabels}`);
    setReportData((prev) => ({ ...prev, category: primaryCategory }));
    setStep('ask_details');

    const categoryMeta = CategoryMetadata[primaryCategory];
    await addBotMessage(
      `${categoryMeta.emoji} Got it - ${selectedLabels}.\n\nPlease describe the situation in detail. What exactly is happening? Who is affected?`
    );
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const messageList = messages.length === 0 ? [initialGreeting] : messages;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.avatar}>SS</div>
        <div className={styles.headerInfo}>
          <span className={styles.botName}>{BOT_NAME}</span>
          <span className={styles.status}>{isTyping ? 'typing...' : 'online'}</span>
        </div>
      </div>

      <div className={styles.messages} ref={messagesRef}>
        {messageList.map((msg) => (
          <div key={msg.id} className={`${styles.message} ${styles[msg.type]}`}>
            <div className={styles.bubble}>
              <p className={styles.messageText}>{msg.content}</p>
              <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
            </div>

            {msg.type === 'bot' && msg.options && msg.selectionMode !== 'multi' ? (
              <div className={styles.quickReplies}>
                {msg.options.map((option, idx) => (
                  <button key={idx} className={styles.quickReply} onClick={() => handleQuickReply(option)} type="button">
                    {option}
                  </button>
                ))}
              </div>
            ) : null}

            {msg.type === 'bot' && msg.options && msg.selectionMode === 'multi' && step === 'ask_need' ? (
              <div className={styles.quickRepliesMulti}>
                <div className={styles.quickReplies}>
                  {msg.options.map((option, idx) => {
                    const category = getCategoryFromOption(option);
                    const isSelected = category ? selectedCategories.includes(category) : false;

                    return (
                      <button
                        key={idx}
                        className={`${styles.quickReply} ${isSelected ? styles.quickReplySelected : ''}`}
                        onClick={() => handleQuickReply(option)}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={styles.confirmSelection}
                  onClick={() => void handleCategoryConfirm()}
                  disabled={selectedCategories.length === 0}
                >
                  Continue with selected categories
                </button>
              </div>
            ) : null}
          </div>
        ))}

        {isTyping ? (
          <div className={`${styles.message} ${styles.bot}`}>
            <div className={styles.bubble}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {step === 'ask_location' ? (
        <div className={styles.locationStage}>
          <LocationPresetPicker
            selectedPresetId={selectedPresetId}
            location={reportData.location}
            onSelectPreset={(presetId) => void handleSelectLocationPreset(presetId)}
            onUseCurrentLocation={handleUseCurrentLocation}
          />
        </div>
      ) : null}

      <div className={styles.inputArea}>
        {isButtonOnlyStep ? <div className={styles.inputHint}>Choose one of the buttons above to continue.</div> : null}
        <input
          type="text"
          placeholder={step === 'ask_location' ? 'Type an address if you do not want GPS or a map section' : isButtonOnlyStep ? 'Choose from the buttons above' : 'Type a message...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
          disabled={isTyping || step === 'submitting' || isButtonOnlyStep}
        />
        <button
          className={styles.sendButton}
          onClick={() => void handleSend()}
          disabled={!inputText.trim() || isTyping || isButtonOnlyStep}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default WhatsAppIntake;
