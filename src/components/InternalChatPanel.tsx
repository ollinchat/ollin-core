import React, { useState } from 'react';
import { Send, Brain, Sparkles } from 'lucide-react';

const InternalChatPanel = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // This sends the message to your Gemini route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: Make sure your API key is correct in .env.local" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100" dir="ltr">
      {/* Clean Header - No Dropdowns */}
      <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-sm tracking-tight">GEMINI AI</h3>
            <p className="text-[10px] opacity-70 font-bold uppercase">System Active</p>
          </div>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center pt-10">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Brain className="text-blue-600" size={24} />
            </div>
            <p className="text-gray-400 text-xs font-medium italic">How can I help you today, Emil?</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] animate-pulse">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
            THINKING...
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="p-4 bg-white border-t flex gap-2 items-center">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Message Gemini..."
          className="flex-1 p-4 bg-gray-100 rounded-2xl outline-none text-sm font-medium focus:ring-2 ring-blue-500/10 transition-all"
        />
        <button 
          onClick={handleSend}
          disabled={isLoading}
          className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default InternalChatPanel;