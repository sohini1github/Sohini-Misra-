import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';
import { User, Volume2, Square } from 'lucide-react';
import { RATAN_TATA_IMAGE_URL } from '../constants';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynth, setSpeechSynth] = useState<SpeechSynthesis | null>(null);
  
  // Track if we have already auto-spoken this message to prevent loops
  const hasAutoSpoken = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const synth = window.speechSynthesis;
      setSpeechSynth(synth);
    }
  }, []);

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      if (speechSynth && isSpeaking) {
        speechSynth.cancel();
      }
    };
  }, [speechSynth, isSpeaking]);

  const handleSpeak = () => {
    if (!speechSynth) return;

    if (isSpeaking) {
      speechSynth.cancel();
      setIsSpeaking(false);
      return;
    }
    
    // Cancel any ongoing speech before starting new
    speechSynth.cancel();

    // Clean up text for better speech flow
    // Remove markdown symbols but keep structure; replace newlines with pauses
    const textToSpeak = message.content
      .replace(/[*#_`~]/g, '') 
      .replace(/\[.*?\]/g, '')
      .replace(/\n+/g, '. '); 

    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Voice Modulation Settings for Ratan Tata Persona
    utterance.pitch = 0.7; // Lower pitch for gravitas
    utterance.rate = 0.85; // Measured, thoughtful pace
    utterance.volume = 1.0;

    // Voice Selection Strategy
    const voices = speechSynth.getVoices();
    
    // 1. "Google UK English Male" - Often best for "distinguished" tone
    // 2. "en-IN" Male voices - For authentic accent if high quality
    // 3. "Daniel" - Premium UK voice on Apple devices
    let preferredVoice = voices.find(v => v.name.includes("Google UK English Male"));
    
    if (!preferredVoice) {
      preferredVoice = voices.find(v => v.lang === "en-IN" && (v.name.toLowerCase().includes("male") || v.name.includes("Rishi")));
    }
    
    if (!preferredVoice) {
        preferredVoice = voices.find(v => v.name.includes("Daniel"));
    }

    if (!preferredVoice) {
        preferredVoice = voices.find(v => v.name.toLowerCase().includes("male"));
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      setIsSpeaking(false);
    };

    speechSynth.speak(utterance);
  };

  // Auto-Speak Effect
  useEffect(() => {
    if (
        message.shouldSpeak && 
        !message.isStreaming && 
        message.content && 
        !isUser && 
        !hasAutoSpoken.current &&
        speechSynth
    ) {
        // Small delay to ensure streaming is visibly done and it feels natural
        const timer = setTimeout(() => {
            handleSpeak();
            hasAutoSpoken.current = true;
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [message.shouldSpeak, message.isStreaming, message.content, speechSynth, isUser]);

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 rounded-full flex items-center justify-center shadow-md overflow-hidden border 
          ${isUser 
            ? 'bg-blue-600 text-white w-10 h-10 border-blue-500' 
            : 'bg-slate-200 dark:bg-slate-700 w-12 h-12 md:w-14 md:h-14 border-slate-200 dark:border-slate-600'
          }
        `}>
          {isUser ? (
            <User size={20} />
          ) : (
            <img 
              src={RATAN_TATA_IMAGE_URL} 
              alt="Ratan Tata" 
              className="w-full h-full object-cover object-top" 
            />
          )}
        </div>

        {/* Message Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}>
          <div className={`
            p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed relative group transition-colors duration-300
            ${isUser 
              ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none' 
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none'
            }
          `}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-2 prose-slate dark:prose-invert">
                 <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
            
            {message.isStreaming && !isUser && (
               <span className="inline-block w-2 h-2 ml-1 bg-slate-400 rounded-full animate-pulse"/>
            )}
          </div>

          {/* Voice Controls for Bot */}
          {!isUser && !message.isStreaming && message.content && (
            <div className="mt-1 ml-1">
              <button
                onClick={handleSpeak}
                className={`
                  flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all duration-200 border
                  ${isSpeaking 
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50' 
                    : 'bg-transparent text-slate-400 dark:text-slate-500 border-transparent hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-100 dark:hover:border-blue-800'
                  }
                `}
                title={isSpeaking ? "Stop speaking" : "Listen to response"}
              >
                {isSpeaking ? (
                  <>
                    <Square size={10} fill="currentColor" />
                    <span className="font-medium">Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={14} />
                    <span className="font-medium">Listen</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};