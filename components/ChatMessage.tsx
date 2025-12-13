import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';
import { User, Volume2, Square, Loader2 } from 'lucide-react';
import { RATAN_TATA_IMAGE_URL } from '../constants';
import { generateSpeech } from '../services/geminiService';
import { decodeBase64, pcmToAudioBuffer, getAudioContext } from '../utils/audioUtils';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Web Speech API refs
  const [speechSynth, setSpeechSynth] = useState<SpeechSynthesis | null>(null);
  
  // Gemini Audio refs
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null); // Cache the AI voice
  
  const hasAutoSpoken = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSpeechSynth(window.speechSynthesis);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        // Stop any active audio node
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.stop();
          } catch (e) {
            // Ignore error if already stopped
          }
        }
      }
    };
  }, []);

  const stopAllSpeech = () => {
    // Web Speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Audio Context
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // already stopped
      }
      sourceNodeRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoadingAudio(false);
  };

  const detectLanguage = (text: string): string => {
    // Unicode ranges for Indian scripts
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'; // Devanagari (Hindi, Marathi)
    if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'; // Gujarati
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'; // Gurmukhi (Punjabi)
    
    return 'en-GB'; // English
  };

  // Helper to clean text for TTS (removes markdown, links, etc)
  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/\*\*/g, '')      // Bold
      .replace(/\*/g, '')        // Italic
      .replace(/__|`/g, '')      // specialized formatting
      .replace(/\[.*?\]\(.*?\)/g, '') // Markdown links [text](url)
      .replace(/\[.*?\]/g, '')   // Reference brackets [1]
      .replace(/[\u{1F600}-\u{1F6FF}]/u, '') // Remove emojis which can sound odd
      .replace(/\n+/g, '. ');    // Convert newlines to pauses
  };

  const playGeminiAudio = async (base64Data: string) => {
    try {
      const ctx = getAudioContext();

      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      let buffer = audioBufferRef.current;
      
      if (!buffer) {
        const pcmData = decodeBase64(base64Data);
        buffer = await pcmToAudioBuffer(pcmData, ctx);
        audioBufferRef.current = buffer;
      }

      // Create source
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        sourceNodeRef.current = null;
      };

      sourceNodeRef.current = source;
      source.start(0);
      setIsSpeaking(true);

    } catch (e) {
      console.error("Audio playback error:", e);
      // Fallback to browser if audio context fails
      handleBrowserSpeak(); 
    }
  };

  const handleBrowserSpeak = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    const textToSpeak = cleanTextForSpeech(message.content);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const targetLang = detectLanguage(message.content);
    const isEnglish = targetLang.startsWith('en');
    const baseLang = targetLang.split('-')[0];

    // Get all available voices
    const voices = synth.getVoices();
    let preferredVoice = null;

    // Strategy: Prioritize "Male" voices for the target language
    
    // 1. Check for specific language + "Male" in name
    preferredVoice = voices.find(v => v.lang === targetLang && v.name.toLowerCase().includes("male"));
    
    // 2. Check for base language (e.g. 'hi' instead of 'hi-IN') + "Male"
    if (!preferredVoice) {
        preferredVoice = voices.find(v => v.lang.startsWith(baseLang) && v.name.toLowerCase().includes("male"));
    }

    // 3. Special handling for English to get a high-quality persona
    if (isEnglish && !preferredVoice) {
         preferredVoice = voices.find(v => v.name.includes("Google UK English Male"));
         if (!preferredVoice) {
             preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes("male"));
         }
    }

    // 4. Fallbacks if no explicit "Male" voice found
    if (!preferredVoice) {
        // Try Google voices (usually higher quality)
        preferredVoice = voices.find(v => v.lang === targetLang && v.name.includes("Google"));
        
        if (!preferredVoice) {
             preferredVoice = voices.find(v => v.lang.startsWith(baseLang) && v.name.includes("Google"));
        }
        
        // Any voice for the language
        if (!preferredVoice) {
             preferredVoice = voices.find(v => v.lang === targetLang);
        }
        
        if (!preferredVoice) {
             preferredVoice = voices.find(v => v.lang.startsWith(baseLang));
        }
    }

    // Apply voice settings with gender correction
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      
      // Check if we managed to find a confirmed male voice
      const isConfirmedMale = preferredVoice.name.toLowerCase().includes("male") || 
                              preferredVoice.name.includes("Fenrir") || 
                              preferredVoice.name.includes("Rishi");
      
      if (isConfirmedMale) {
           // It's already male, just use a dignified pitch
           utterance.pitch = isEnglish ? 0.9 : 1.0; 
      } else {
           // It's likely a female default voice (common in Hindi/Tamil TTS).
           // Lower pitch significantly to simulate a male voice.
           utterance.pitch = 0.7; 
      }
    } else {
        // No voice found for this language at all, use default with low pitch
        utterance.pitch = 0.8;
    }

    utterance.rate = isEnglish ? 0.9 : 0.95; 
    utterance.volume = 1.0;
    utterance.lang = targetLang;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Cancel any current speaking before starting new
    synth.cancel();
    synth.speak(utterance);
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      stopAllSpeech();
      return;
    }

    // Language Check
    const lang = detectLanguage(message.content);

    // If English, try Gemini High Quality Voice first
    if (lang === 'en-GB') {
      // If we already have the buffer cached, play it immediately
      if (audioBufferRef.current) {
         try {
           const ctx = getAudioContext();
           if (ctx.state === 'suspended') await ctx.resume();
           
           const source = ctx.createBufferSource();
           source.buffer = audioBufferRef.current;
           source.connect(ctx.destination);
           source.onended = () => {
               setIsSpeaking(false);
               sourceNodeRef.current = null;
           };
           sourceNodeRef.current = source;
           source.start(0);
           setIsSpeaking(true);
           return;
         } catch(e) {
           console.error("Cached play failed", e);
         }
      }

      // Fetch new audio
      setIsLoadingAudio(true);
      
      const cleanText = cleanTextForSpeech(message.content);
      const audioData = await generateSpeech(cleanText);
      setIsLoadingAudio(false);

      if (audioData) {
        await playGeminiAudio(audioData);
      } else {
        // Fallback to browser if Gemini fails
        handleBrowserSpeak();
      }
    } else {
      // For Indian languages, Browser TTS is often better/native
      handleBrowserSpeak();
    }
  };

  // Auto-Speak Effect
  useEffect(() => {
    if (
        message.shouldSpeak && 
        !message.isStreaming && 
        message.content && 
        !isUser && 
        !hasAutoSpoken.current
    ) {
        const timer = setTimeout(() => {
            handleSpeak();
            hasAutoSpoken.current = true;
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [message.shouldSpeak, message.isStreaming, message.content, isUser]);

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
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=Ratan+Tata&background=random";
              }}
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
                disabled={isLoadingAudio}
                className={`
                  flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all duration-200 border
                  ${isSpeaking 
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50' 
                    : 'bg-transparent text-slate-400 dark:text-slate-500 border-transparent hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-100 dark:hover:border-blue-800'
                  }
                `}
                title={isSpeaking ? "Stop speaking" : "Listen to response"}
              >
                {isLoadingAudio ? (
                  <>
                     <Loader2 size={12} className="animate-spin" />
                     <span className="font-medium">Loading Voice...</span>
                  </>
                ) : isSpeaking ? (
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
