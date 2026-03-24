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

import { useState, useRef, useEffect } from 'react';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { submitReport, classifyText } from '../../../services/api';
import { IntakeSource, CategoryMetadata } from '../../../types';
import type { Location, NeedCategoryType } from '../../../types';
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
  isTyping?: boolean;
}

type ConversationStep = 
  | 'greeting'
  | 'ask_need'
  | 'ask_details'
  | 'ask_location'
  | 'ask_people'
  | 'confirm'
  | 'submitting'
  | 'success'
  | 'error';

const BOT_NAME = 'SevaSetu Bot';

// Predefined quick replies
const QUICK_REPLIES = {
  greeting: ['Report a need', 'Check status', 'Help'],
  categories: Object.values(CategoryMetadata).map(c => `${c.emoji} ${c.label}`),
  location: ['Share GPS location', 'Type address'],
  people: ['1-10', '10-50', '50-100', '100+'],
  confirm: ['Yes, submit', 'No, cancel'],
};

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    getLocation,
  } = useGeolocation();

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start conversation on mount
  useEffect(() => {
    addBotMessage(
      `Namaste! Welcome to ${BOT_NAME}.\n\nI can help you report community needs quickly. What would you like to do?`,
      QUICK_REPLIES.greeting
    );
  }, []);

  // Add a bot message with typing effect
  const addBotMessage = async (content: string, options?: string[]) => {
    setIsTyping(true);
    
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    setIsTyping(false);
    
    const message: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
      options,
    };
    
    setMessages(prev => [...prev, message]);
  };

  // Add a user message
  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, message]);
  };

  // Handle user input
  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;
    
    setInputText('');
    addUserMessage(messageText);
    
    // Process based on current step
    await processUserResponse(messageText);
  };

  // Process user response based on conversation step
  const processUserResponse = async (response: string) => {
    switch (step) {
      case 'greeting':
        if (response.toLowerCase().includes('report') || response.toLowerCase().includes('need')) {
          setStep('ask_need');
          await addBotMessage(
            'What type of need do you want to report? Select a category or type to describe:',
            QUICK_REPLIES.categories
          );
        } else if (response.toLowerCase().includes('status')) {
          await addBotMessage(
            'To check report status, please visit the dashboard. This simulation focuses on report submission.',
            ['Report a need', 'Help']
          );
        } else if (response.toLowerCase().includes('help')) {
          await addBotMessage(
            `${BOT_NAME} helps you report community needs:\n\n` +
            '1. Report emergency, health, food, education, or other needs\n' +
            '2. Share location and photos\n' +
            '3. Get matched with NGOs who can help\n\n' +
            'Would you like to report a need?',
            ['Report a need']
          );
        } else {
          setStep('ask_need');
          await addBotMessage(
            'I understand you want help. What type of need do you want to report?',
            QUICK_REPLIES.categories
          );
        }
        break;

      case 'ask_need':
        // Try to extract category from response
        let category: NeedCategoryType | '' = '';
        
        for (const [cat, meta] of Object.entries(CategoryMetadata)) {
          if (
            response.toLowerCase().includes(meta.label.toLowerCase()) ||
            response.includes(meta.emoji)
          ) {
            category = cat as NeedCategoryType;
            break;
          }
        }
        
        // If no category matched, try AI classification
        if (!category) {
          try {
            const result = await classifyText(response, 'en');
            if (result.success && result.data?.classification?.category) {
              category = result.data.classification.category;
            }
          } catch (e) {
            // Default to health if classification fails
            category = 'health';
          }
        }
        
        if (!category) category = 'health'; // Fallback
        
        setReportData(prev => ({ ...prev, category }));
        setStep('ask_details');
        
        const categoryMeta = CategoryMetadata[category];
        await addBotMessage(
          `${categoryMeta.emoji} Got it - ${categoryMeta.label}.\n\n` +
          'Please describe the situation in detail. What exactly is happening? Who is affected?'
        );
        break;

      case 'ask_details':
        setReportData(prev => ({ ...prev, description: response }));
        setStep('ask_location');
        await addBotMessage(
          'Thank you for the details. Now I need the location.\n\n' +
          'You can share your GPS location or type the address/village name.',
          QUICK_REPLIES.location
        );
        break;

      case 'ask_location':
        if (response.toLowerCase().includes('gps') || response.toLowerCase().includes('share')) {
          // Get GPS location
          const loc = await getLocation();
          if (loc) {
            setReportData(prev => ({ ...prev, location: loc }));
            setStep('ask_people');
            await addBotMessage(
              `Location captured: ${loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}\n\n` +
              'Approximately how many people are affected?',
              QUICK_REPLIES.people
            );
          } else {
            await addBotMessage(
              'Could not get GPS location. Please type the address or village name instead.'
            );
          }
        } else {
          // Use typed address
          setReportData(prev => ({ 
            ...prev, 
            location: {
              latitude: 0,
              longitude: 0,
              address: response,
            }
          }));
          setStep('ask_people');
          await addBotMessage(
            `Location noted: ${response}\n\n` +
            'Approximately how many people are affected?',
            QUICK_REPLIES.people
          );
        }
        break;

      case 'ask_people':
        let people = 1;
        if (response.includes('100+') || response.includes('100 ')) {
          people = 100;
        } else if (response.includes('50-100') || response.includes('50 ')) {
          people = 50;
        } else if (response.includes('10-50') || response.includes('10 ')) {
          people = 25;
        } else if (response.includes('1-10')) {
          people = 5;
        } else {
          const parsed = parseInt(response, 10);
          if (!isNaN(parsed)) people = parsed;
        }
        
        setReportData(prev => ({ ...prev, estimatedPeople: people }));
        setStep('confirm');
        
        const catMeta = reportData.category ? CategoryMetadata[reportData.category] : null;
        
        await addBotMessage(
          'Please confirm your report:\n\n' +
          `Category: ${catMeta?.emoji || ''} ${catMeta?.label || reportData.category}\n` +
          `Description: ${reportData.description.substring(0, 100)}...\n` +
          `Location: ${reportData.location?.address || 'GPS location'}\n` +
          `People affected: ~${people}\n\n` +
          'Should I submit this report?',
          QUICK_REPLIES.confirm
        );
        break;

      case 'confirm':
        if (response.toLowerCase().includes('yes') || response.toLowerCase().includes('submit')) {
          setStep('submitting');
          await submitReportData();
        } else {
          setStep('greeting');
          setReportData({
            category: '',
            description: '',
            location: null,
            estimatedPeople: 1,
          });
          await addBotMessage(
            'No problem, the report has been cancelled.\n\n' +
            'Would you like to start over?',
            QUICK_REPLIES.greeting
          );
        }
        break;

      default:
        await addBotMessage(
          'I\'m not sure how to help with that. Would you like to report a new need?',
          QUICK_REPLIES.greeting
        );
    }
  };

  // Submit the report
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
          ['Report another need', 'Done']
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
        ['Try again', 'Cancel']
      );
      onError?.(err.message);
    }
  };

  // Handle quick reply click
  const handleQuickReply = (reply: string) => {
    handleSend(reply);
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.avatar}>SS</div>
        <div className={styles.headerInfo}>
          <span className={styles.botName}>{BOT_NAME}</span>
          <span className={styles.status}>
            {isTyping ? 'typing...' : 'online'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${styles[msg.type]}`}
          >
            <div className={styles.bubble}>
              <p className={styles.messageText}>{msg.content}</p>
              <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
            </div>
            
            {/* Quick replies for bot messages */}
            {msg.type === 'bot' && msg.options && (
              <div className={styles.quickReplies}>
                {msg.options.map((option, idx) => (
                  <button
                    key={idx}
                    className={styles.quickReply}
                    onClick={() => handleQuickReply(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className={`${styles.message} ${styles.bot}`}>
            <div className={styles.bubble}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isTyping || step === 'submitting'}
        />
        <button
          className={styles.sendButton}
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
