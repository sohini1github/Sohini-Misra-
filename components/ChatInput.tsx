import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, isVoice?: boolean) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition if available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Set to Indian English for better recognition in this context

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          
          // Focus back on textarea
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  // Wrapper to track if input came from voice
  useEffect(() => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition && recognitionRef.current) {
         recognitionRef.current.onresult = (event: any) => {
             const transcript = event.results[0][0].transcript;
             if (transcript) {
                 setInput(transcript);
                 // We'll set a temporary flag on the component instance or state 
                 // to indicate this text is from voice
                 (textareaRef.current as any)._isVoiceInput = true;
             }
         };
      }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // If user typed, clear the voice flag
      if (textareaRef.current) (textareaRef.current as any)._isVoiceInput = false;
      handleManualSubmit(e as any);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim() && !isLoading) {
          const isVoice = !!(textareaRef.current as any)?._isVoiceInput;
          onSend(input, isVoice);
          setInput('');
          if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              (textareaRef.current as any)._isVoiceInput = false;
          }
      }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const hasSpeechSupport = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors duration-300">
      <form onSubmit={handleManualSubmit} className="max-w-4xl mx-auto relative flex items-end gap-2">
        
        {/* Input Area */}
        <div className="relative flex-grow">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
                setInput(e.target.value);
                // If user edits manually, it's no longer purely voice
                if (textareaRef.current) (textareaRef.current as any)._isVoiceInput = false;
            }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Ask Ratan Tata for advice..."}
            className={`w-full bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white text-base rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none max-h-32 min-h-[50px] transition-all
                ${isListening 
                  ? 'border-red-400 ring-2 ring-red-100 dark:ring-red-900 placeholder-red-400' 
                  : 'border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500'
                }
            `}
            rows={1}
            disabled={isLoading}
          />
          
          {/* Mic Button inside Input */}
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className={`absolute right-3 bottom-2.5 p-1.5 rounded-full transition-all duration-200 
                ${isListening 
                  ? 'bg-red-500 text-white animate-pulse shadow-md' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }
              `}
              title="Voice Input"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`
            flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
            ${!input.trim() || isLoading 
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
              : 'bg-blue-900 dark:bg-blue-700 text-white hover:bg-blue-800 dark:hover:bg-blue-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
            }
          `}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Send size={20} className={input.trim() ? 'ml-0.5' : ''} />
          )}
        </button>
      </form>
      <div className="text-center mt-2">
        <p className="text-xs text-slate-400 dark:text-slate-600">
          AI-generated responses. Treat them as simulated advice, not historical fact.
        </p>
      </div>
    </div>
  );
};