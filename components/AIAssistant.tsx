import React, { useState, useRef, useEffect } from 'react';
import { AIModelType, AspectRatio, ChatMessage } from '../types';
import { ASPECT_RATIOS } from '../constants';
import * as geminiService from '../services/geminiService';
import { Button } from './Button';

interface AIAssistantProps {
  onInsertCode: (code: string) => void;
  onInsertImage: (imageUrl: string) => void;
  currentHTML: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ onInsertCode, onInsertImage, currentHTML }) => {
  const [activeTab, setActiveTab] = useState<AIModelType>(AIModelType.Search);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(AspectRatio.Square);
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!prompt.trim() && !uploadImage) return;

    const newMsg: ChatMessage = { role: 'user', text: prompt };
    if (uploadImage && activeTab === AIModelType.ImageEdit) {
      newMsg.images = [uploadImage];
    }
    setHistory(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      let responseText = '';
      let responseImages: string[] = [];

      switch (activeTab) {
        case AIModelType.Fast:
          // Gemini 2.5 Flash Lite - Quick format fixes or text generation
          responseText = await geminiService.generateFastResponse(prompt);
          break;
        
        case AIModelType.Thinking:
          // Gemini 3 Pro - Complex reasoning
          const thinkingPrompt = `Analyze and improve this HTML snippet or answer the user request:\n\n${currentHTML.substring(0, 1000)}...\n\nUser Request: ${prompt}`;
          responseText = await geminiService.generateThinkingResponse(thinkingPrompt);
          break;

        case AIModelType.Search:
          // Gemini 3 Flash + Grounding
          const result = await geminiService.generateSearchResponse(prompt);
          responseText = result.text;
          if (result.links.length > 0) {
            responseText += `\n\nSources:\n${result.links.map(l => `- ${l}`).join('\n')}`;
          }
          break;

        case AIModelType.ImageGen:
          // Gemini 3 Pro Image
          const imgUrl = await geminiService.generateImage(prompt, selectedRatio);
          responseImages = [imgUrl];
          responseText = "Image generated successfully. Click 'Insert' to add it to your code.";
          break;

        case AIModelType.ImageEdit:
          // Gemini 2.5 Flash Image
          if (!uploadImage) {
            responseText = "Please upload an image to edit.";
          } else {
            const editedUrl = await geminiService.editImage(uploadImage, prompt);
            responseImages = [editedUrl];
            responseText = "Image edited. You can use it now.";
          }
          break;
      }

      setHistory(prev => [...prev, { role: 'model', text: responseText, images: responseImages }]);
    } catch (err) {
      setHistory(prev => [...prev, { role: 'model', text: "Error generating response. Please try again." }]);
      console.error(err);
    } finally {
      setLoading(false);
      setPrompt('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 w-full md:w-96">
      {/* Tabs */}
      <div className="flex overflow-x-auto p-2 bg-slate-800 gap-1 scrollbar-hide">
        {[
          { id: AIModelType.Search, icon: '🔍', label: 'Search' },
          { id: AIModelType.Thinking, icon: '🧠', label: 'Think' },
          { id: AIModelType.Fast, icon: '⚡', label: 'Fast' },
          { id: AIModelType.ImageGen, icon: '🎨', label: 'Gen' },
          { id: AIModelType.ImageEdit, icon: '✏️', label: 'Edit' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AIModelType)}
            className={`px-3 py-2 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <div className="text-center text-slate-500 mt-10">
            <p className="mb-2 text-xl">✨ Gemini AI</p>
            <p className="text-sm">Select a tool and start creating.</p>
          </div>
        )}
        {history.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`p-3 rounded-lg max-w-[90%] text-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}>
              {msg.images?.map((img, i) => (
                <div key={i} className="mb-2">
                  <img src={img} alt="Generated" className="rounded-md max-w-full h-auto" />
                  <div className="mt-2 flex gap-2">
                     <button 
                       onClick={() => onInsertImage(img)}
                       className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                     >
                       Insert Image
                     </button>
                     {activeTab !== AIModelType.ImageEdit && (
                         <button 
                         onClick={() => {
                             setUploadImage(img);
                             setActiveTab(AIModelType.ImageEdit);
                         }}
                         className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded"
                       >
                         Edit This
                       </button>
                     )}
                  </div>
                </div>
              ))}
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.role === 'model' && !msg.images?.length && activeTab === AIModelType.Thinking && (
                 <button 
                 onClick={() => onInsertCode(msg.text)}
                 className="mt-2 text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded"
               >
                 Use as Code
               </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        
        {/* Contextual Inputs */}
        {activeTab === AIModelType.ImageGen && (
           <div className="mb-3">
             <label className="text-xs text-slate-400 block mb-1">Aspect Ratio</label>
             <div className="grid grid-cols-4 gap-1">
               {ASPECT_RATIOS.map(r => (
                 <button 
                   key={r} 
                   onClick={() => setSelectedRatio(r)}
                   className={`text-[10px] px-1 py-1 rounded border ${selectedRatio === r ? 'bg-blue-900 border-blue-500 text-white' : 'border-slate-600 text-slate-400'}`}
                 >
                   {r}
                 </button>
               ))}
             </div>
           </div>
        )}

        {activeTab === AIModelType.ImageEdit && (
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">Source Image</label>
            {!uploadImage ? (
                <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"
              />
            ) : (
                <div className="relative inline-block">
                    <img src={uploadImage} alt="Preview" className="h-16 w-auto rounded border border-slate-600 opacity-70" />
                    <button onClick={() => setUploadImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
                activeTab === AIModelType.ImageGen ? "Describe the image..." :
                activeTab === AIModelType.ImageEdit ? "Tell me how to change the image..." :
                "Ask Gemini..."
            }
            className="flex-1 bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-20"
            onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
          />
          <Button onClick={handleSend} disabled={loading || (!prompt && !uploadImage)} className="h-20">
             Go
          </Button>
        </div>
      </div>
    </div>
  );
};