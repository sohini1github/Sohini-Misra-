import React, { useState, useRef, useEffect } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { initializeChat, sendMessageStream } from './services/geminiService';
import { Message, Role } from './types';
import { RATAN_TATA_IMAGE_URL } from './constants';

const generateId = () => Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    // Check local storage or system preference on initial load could be added here
    return false; 
  });
  
  // Use a ref to persist the chat session across renders
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    try {
      chatSessionRef.current = initializeChat();
      
      const initialGreeting: Message = {
        id: generateId(),
        role: Role.MODEL,
        content: "Namaste. I am here to listen and share whatever wisdom I can. How may I assist you today?",
        timestamp: new Date()
      };
      setMessages([initialGreeting]);
    } catch (err) {
      console.error("Failed to initialize chat:", err);
      setError("Unable to connect to the AI service. Please check your API key.");
    }
  }, []);

  const handleSendMessage = async (text: string, isVoice = false) => {
    if (!chatSessionRef.current) return;

    const userMessageId = generateId();
    const botMessageId = generateId();

    const userMessage: Message = {
      id: userMessageId,
      role: Role.USER,
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // If user used voice input, we want the bot to speak back automatically
      const botPlaceholder: Message = {
        id: botMessageId,
        role: Role.MODEL,
        content: "",
        timestamp: new Date(),
        isStreaming: true,
        shouldSpeak: isVoice // Enable auto-speak for this message
      };
      
      setMessages(prev => [...prev, botPlaceholder]);

      const stream = await sendMessageStream(text, chatSessionRef.current);
      
      let accumulatedText = "";

      for await (const chunk of stream) {
        const chunkText = (chunk as GenerateContentResponse).text;
        if (chunkText) {
          accumulatedText += chunkText;
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, content: accumulatedText } 
                : msg
            )
          );
        }
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, isStreaming: false } 
            : msg
        )
      );

    } catch (err) {
      console.error("Chat error:", err);
      setError("I apologize, but I am having trouble collecting my thoughts right now. Please try again.");
      
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === Role.MODEL && lastMsg.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
      
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.07] dark:opacity-[0.1] pointer-events-none grayscale transition-opacity duration-300"
        style={{ 
          backgroundImage: `url(${RATAN_TATA_IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        
        <main className="flex-grow overflow-y-auto px-4 py-6 scroll-smooth">
          <div className="max-w-4xl mx-auto min-h-full flex flex-col justify-end">
             {messages.length === 0 && !error && (
               <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                 <p>Initialize conversation...</p>
               </div>
             )}

             {messages.map((msg) => (
               <ChatMessage key={msg.id} message={msg} />
             ))}
             
             {error && (
               <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm text-center">
                 {error}
               </div>
             )}

             <div ref={messagesEndRef} />
          </div>
        </main>

        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default App;