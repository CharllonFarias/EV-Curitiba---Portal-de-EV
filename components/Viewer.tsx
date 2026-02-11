import React, { useState, useEffect } from 'react';
import { PortalData } from '../types';
import { Button } from './Button';
import { supabase } from '../services/supabaseClient';

interface ViewerProps {
  portalId: string;
}

export const Viewer: React.FC<ViewerProps> = ({ portalId }) => {
  const [data, setData] = useState<PortalData | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortal = async () => {
      try {
        setLoading(true);
        const { data: portal, error } = await supabase
          .from('portals')
          .select('*')
          .eq('id', portalId)
          .single();

        if (error) throw error;
        if (!portal) throw new Error("Portal not found");

        // Map DB snake_case to TS camelCase
        const mappedData: PortalData = {
          clientName: portal.client_name,
          htmlContent: portal.html_content,
          password: portal.password,
          expiresAt: Number(portal.expires_at), // BigInt comes as number/string
          created: new Date(portal.created_at).getTime()
        };

        // Check Expiration
        if (Date.now() > mappedData.expiresAt) {
          setError("This secure link has expired.");
          return;
        }

        setData(mappedData);
      } catch (e) {
        console.error(e);
        setError("Invalid link or portal not found.");
      } finally {
        setLoading(false);
      }
    };

    if (portalId) {
      fetchPortal();
    }
  }, [portalId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (data && passwordInput === data.password) {
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError("Incorrect password.");
    }
  };

  const goHome = () => {
      window.location.hash = '';
  }

  if (loading) {
     return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-4">
            <div className="text-white flex flex-col items-center gap-4">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-400">Loading secure content...</p>
            </div>
        </div>
     );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-slate-900 p-8 rounded-xl shadow-2xl border border-red-900 text-center max-w-md w-full relative">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button onClick={goHome} variant="secondary" className="w-full">Create New Portal</Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-slate-900 p-8 rounded-xl shadow-2xl border border-slate-800 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Secure Portal</h1>
            <p className="text-slate-400 mt-2">
              Please enter the password provided by <span className="text-blue-400 font-semibold">{data?.clientName || 'your contact'}</span>.
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter access code"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full">Access Content</Button>
          </form>
          <div className="mt-6 flex flex-col gap-2">
            <p className="text-xs text-slate-600 text-center">
                Secured by Gemini
            </p>
             <button onClick={goHome} className="text-xs text-slate-500 hover:text-slate-400 underline text-center">
                Create your own portal
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white">
        {/* Simple floating home button for viewer context */}
        <div className="absolute bottom-4 right-4 z-50 opacity-20 hover:opacity-100 transition-opacity pointer-events-auto">
            <Button onClick={goHome} variant="secondary" className="text-xs py-1 px-2 shadow-sm">Create New</Button>
        </div>

      {/* 
         Sandbox configured to allow same-origin to prevent CORS issues on hosting.
         We use h-full and fixed inset-0 on parent to ensure full viewport usage.
      */}
      <iframe
        title="Secure Content"
        srcDoc={data?.htmlContent}
        className="w-full h-full border-none block"
        sandbox="allow-scripts allow-popups allow-forms allow-same-origin allow-modals"
      />
    </div>
  );
};