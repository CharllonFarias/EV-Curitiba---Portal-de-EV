import React, { useState, useEffect } from 'react';
import { EXPIRATION_OPTIONS, MOCK_HTML_TEMPLATE } from '../constants';
import { AIAssistant } from './AIAssistant';
import { Button } from './Button';
import { supabase } from '../services/supabaseClient';
import { analyzeBrand, generatePortalHtml } from '../services/geminiService';
import { BrandData, PortalSection } from '../types';

interface CreatorDashboardProps {
  editingId?: string | null;
}

const DEFAULT_SECTIONS: PortalSection[] = [
  { id: 'intro', title: 'Introduction', description: 'Overview of the client and the project context.', isRemovable: true },
  { id: 'stakeholders', title: 'Stakeholder Mapping', description: 'Key people, their roles, and influence.', isRemovable: true },
  { id: 'sectors', title: 'Departments/Sectors', description: 'Organizational structure and key departments involved.', isRemovable: true },
  { id: 'pain-points', title: 'Pain Points', description: 'Key challenges and problems identified in the discovery.', isRemovable: true },
];

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ editingId }) => {
  // Basic Info
  const [clientName, setClientName] = useState('');
  const [password, setPassword] = useState('');
  const [expiration, setExpiration] = useState(EXPIRATION_OPTIONS[0].value);
  
  // New Inputs
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contextText, setContextText] = useState('');
  const [sections, setSections] = useState<PortalSection[]>(DEFAULT_SECTIONS);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  
  // Editor State
  const [htmlContent, setHtmlContent] = useState(MOCK_HTML_TEMPLATE); // Start with mock, replace with generated
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  
  // UI State
  const [showAI, setShowAI] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load data if editing
  useEffect(() => {
    if (editingId) {
      const loadPortal = async () => {
        setIsLoadingData(true);
        const { data, error } = await supabase
          .from('portals')
          .select('*')
          .eq('id', editingId)
          .single();

        if (data && !error) {
          setClientName(data.client_name);
          setPassword(data.password);
          setHtmlContent(data.html_content);
          
          // Restore new fields if they exist
          if (data.website_url) setWebsiteUrl(data.website_url);
          if (data.context_text) setContextText(data.context_text);
          if (data.sections) setSections(data.sections);
          if (data.brand_data) setBrandData(data.brand_data);
        }
        setIsLoadingData(false);
      };
      loadPortal();
    }
  }, [editingId]);

  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl) return alert("Please enter a website URL.");
    setIsAnalyzing(true);
    try {
      const data = await analyzeBrand(websiteUrl);
      setBrandData(data);
    } catch (e) {
      alert("Failed to analyze website. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePortal = async () => {
    if (!clientName) return alert("Please enter a Client Name.");
    if (!brandData) return alert("Please analyze the website first to get brand guidelines.");
    if (!contextText) return alert("Please provide some context/transcription.");

    setIsGenerating(true);
    try {
      const html = await generatePortalHtml(clientName, brandData, contextText, sections);
      setHtmlContent(html);
    } catch (e) {
      console.error(e);
      alert("Failed to generate portal. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSection = () => {
    const title = prompt("Enter section title:");
    if (title) {
      setSections([...sections, {
        id: Date.now().toString(),
        title,
        description: 'Custom section added by user.',
        isRemovable: true
      }]);
    }
  };

  const handleRemoveSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    if (!clientName || !password) {
      alert("Please fill in Client Name and Password.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        client_name: clientName,
        html_content: htmlContent,
        password: password,
        expires_at: Date.now() + expiration,
        website_url: websiteUrl,
        context_text: contextText,
        sections: sections,
        brand_data: brandData
      };

      let result;

      if (editingId) {
        result = await supabase
          .from('portals')
          .update(payload)
          .eq('id', editingId)
          .select('id')
          .single();
      } else {
        result = await supabase
          .from('portals')
          .insert(payload)
          .select('id')
          .single();
      }

      const { data, error } = result;

      if (error) throw error;

      if (data) {
        const origin = window.location.origin + window.location.pathname;
        const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
        const link = `${cleanOrigin}/#portal/${data.id}`;
        setGeneratedLink(link);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error saving portal: ${e.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertCode = (code: string) => {
    if (code.includes('<!DOCTYPE html>') || code.includes('<html')) {
        setHtmlContent(code);
    } else {
        if (htmlContent.includes('</body>')) {
            setHtmlContent(htmlContent.replace('</body>', `${code}\n</body>`));
        } else {
            setHtmlContent(prev => prev + '\n' + code);
        }
    }
  };

  const handleInsertImage = (url: string) => {
      const imgTag = `<img src="${url}" alt="Generated by Gemini" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" />`;
      if (htmlContent.includes('</body>')) {
        setHtmlContent(htmlContent.replace('</body>', `${imgTag}\n</body>`));
    } else {
        setHtmlContent(prev => prev + '\n' + imgTag);
    }
  };

  const goBack = () => {
    window.location.hash = '';
  };

  const getPreviewHtml = () => {
    const baseTag = '<base target="_blank" />';
    if (htmlContent.match(/<head>/i)) {
      return htmlContent.replace(/<head>/i, `<head>${baseTag}`);
    }
    return `${baseTag}${htmlContent}`;
  };

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLoadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Loading portal data...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
             <Button variant="ghost" onClick={goBack} className="!p-2">
                ← Back
             </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">S</div>
              <h1 className="font-semibold text-lg tracking-tight">
                SecurePage <span className="text-slate-500 font-normal">{editingId ? 'Editor' : 'Creator'}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowAI(!showAI)} className={`px-3 py-1.5 rounded text-sm font-medium border ${showAI ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-600 text-slate-300'}`}>
                {showAI ? 'Hide AI Assistant' : 'Show AI Assistant'}
             </button>
             <Button onClick={() => setShowPreview(true)} variant="secondary">
                Preview
             </Button>
             <Button onClick={handleSave} variant="primary" isLoading={isSaving}>
               {isSaving ? 'Saving...' : (editingId ? 'Update Portal' : 'Generate Secure Link')}
             </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            {/* Form & Editor */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                
                {/* 1. Client & Brand Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
                        <h3 className="text-lg font-semibold text-white mb-4">1. Client Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Client Name</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Acme Corp"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Website URL (for Brand Analysis)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="url" 
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="https://example.com"
                                        value={websiteUrl}
                                        onChange={e => setWebsiteUrl(e.target.value)}
                                    />
                                    <Button onClick={handleAnalyzeWebsite} isLoading={isAnalyzing} variant="secondary">
                                        {isAnalyzing ? 'Scanning...' : 'Analyze'}
                                    </Button>
                                </div>
                            </div>
                            {brandData && (
                                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs text-slate-400">
                                    <p><strong>Tone:</strong> {brandData.tone}</p>
                                    <p><strong>Layout:</strong> {brandData.layoutStyle}</p>
                                    <div className="flex gap-1 mt-1">
                                        {brandData.colors.map(c => (
                                            <span key={c} className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: c }} title={c} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 flex flex-col">
                        <h3 className="text-lg font-semibold text-white mb-4">2. Context & Structure</h3>
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Context / Transcription</label>
                                <textarea 
                                    className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                                    placeholder="Paste interview notes, meeting transcription, or client brief here..."
                                    value={contextText}
                                    onChange={e => setContextText(e.target.value)}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-400">Portal Sections</label>
                                    <button onClick={handleAddSection} className="text-xs text-blue-400 hover:text-blue-300">+ Add Section</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {sections.map(section => (
                                        <div key={section.id} className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs flex items-center gap-2">
                                            <span>{section.title}</span>
                                            {section.isRemovable && (
                                                <button onClick={() => handleRemoveSection(section.id)} className="text-slate-500 hover:text-red-400">×</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex justify-center mb-6">
                    <Button 
                        onClick={handleGeneratePortal} 
                        isLoading={isGenerating} 
                        className="w-full max-w-md py-3 text-lg shadow-lg shadow-blue-900/20"
                    >
                        ✨ Generate Portal from Scratch
                    </Button>
                </div>

                {/* 3. Security & Editor */}
                <div className="flex-1 flex flex-col min-h-[500px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex gap-6 bg-slate-900/50">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Access Password</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                                placeholder="Secret123"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Duration</label>
                            <select 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                                value={expiration}
                                onChange={e => setExpiration(Number(e.target.value))}
                            >
                                {EXPIRATION_OPTIONS.map(opt => (
                                    <option key={opt.label} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col p-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-slate-400">HTML Source Code</label>
                            <span className="text-xs text-slate-500">Generated code appears here</span>
                        </div>
                        <textarea 
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                            value={htmlContent}
                            onChange={e => setHtmlContent(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Preview Modal Overlay */}
                {showPreview && (
                    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col">
                        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-md">
                            <div className="flex items-center gap-2">
                                <span className="text-blue-400">👁️</span>
                                <h2 className="text-white font-semibold">Live Preview</h2>
                            </div>
                            <Button variant="secondary" onClick={() => setShowPreview(false)}>
                                Close Preview
                            </Button>
                        </header>
                        <div className="flex-1 bg-white relative">
                            <iframe 
                                title="Page Preview"
                                srcDoc={getPreviewHtml()}
                                className="w-full h-full border-none absolute inset-0"
                                sandbox="allow-scripts allow-popups allow-forms"
                            />
                        </div>
                    </div>
                )}

                {/* Result Modal Overlay */}
                {generatedLink && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 max-w-2xl w-full shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-4">
                                {editingId ? 'Portal Updated Successfully!' : 'Portal Created Successfully!'} 🚀
                            </h2>
                            <p className="text-slate-400 mb-6">
                                Share this link with <strong>{clientName}</strong>. They will need the password: <span className="font-mono bg-slate-800 px-2 py-1 rounded text-blue-400">{password}</span>
                            </p>
                            
                            {isLocalhost && (
                              <div className="bg-yellow-500/10 border border-yellow-500/50 p-3 rounded text-yellow-200 text-sm mb-4 flex gap-2 items-start">
                                <span className="text-xl">⚠️</span>
                                <div>
                                  <strong>Localhost Warning:</strong> You are currently running this app locally. 
                                  External users cannot access the link starting with <code>localhost</code> or <code>127.0.0.1</code>. 
                                  Please deploy this application to a public server (like Vercel or Netlify) to share it.
                                </div>
                              </div>
                            )}

                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6 flex items-center gap-3">
                                <input 
                                    readOnly 
                                    value={generatedLink} 
                                    className="flex-1 bg-transparent border-none text-slate-300 text-sm focus:ring-0 truncate font-mono"
                                />
                                <Button 
                                    variant="secondary" 
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedLink);
                                        alert("Copied to clipboard!");
                                    }}
                                >
                                    Copy
                                </Button>
                            </div>
                            
                            <div className="flex justify-end">
                                <Button variant="ghost" onClick={() => setGeneratedLink(null)}>Close</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Assistant Sidebar */}
            {showAI && (
                <AIAssistant 
                    onInsertCode={handleInsertCode}
                    onInsertImage={handleInsertImage}
                    currentHTML={htmlContent}
                />
            )}
        </div>
      </div>
    </div>
  );
};