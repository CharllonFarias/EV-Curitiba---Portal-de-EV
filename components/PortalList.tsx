import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from './Button';

export const PortalList: React.FC = () => {
  const [portals, setPortals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortals();
  }, []);

  const fetchPortals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('portals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPortals(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this portal? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('portals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update UI immediately by filtering out the deleted item
      setPortals(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      console.error("Error deleting:", e);
      alert("Failed to delete portal. Please try again.");
    }
  };

  const getTimeStatus = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) return { label: 'Expired', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return { label: `${days}d ${hours}h left`, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
    return { label: `${hours}h left`, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
  };

  const copyLink = (id: string) => {
    const origin = window.location.origin + window.location.pathname;
    const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const link = `${cleanOrigin}/#portal/${id}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const handleCreateNew = () => {
    window.location.hash = 'create';
  };

  const handleEdit = (id: string) => {
    window.location.hash = `edit/${id}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Portals</h1>
            <p className="text-slate-400">Manage your secure client pages.</p>
          </div>
          <Button onClick={handleCreateNew}>
            + Create New Portal
          </Button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : portals.length === 0 ? (
          <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800 border-dashed">
            <h3 className="text-xl text-slate-300 mb-2">No portals found</h3>
            <p className="text-slate-500 mb-6">Create your first secure page to get started.</p>
            <Button onClick={handleCreateNew} variant="secondary">Create Portal</Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {portals.map((portal) => {
              const status = getTimeStatus(Number(portal.expires_at));
              return (
                <div 
                  key={portal.id} 
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-colors group"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => handleEdit(portal.id)}>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">
                        {portal.client_name}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-mono">ID: {portal.id}</p>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-xs text-slate-500">Password</span>
                        <code className="text-sm bg-slate-950 px-2 py-1 rounded text-slate-300">{portal.password}</code>
                    </div>
                    
                    <Button variant="secondary" className="text-sm" onClick={() => copyLink(portal.id)}>
                      Copy Link
                    </Button>
                    <Button variant="primary" className="text-sm" onClick={() => handleEdit(portal.id)}>
                      Edit
                    </Button>
                    <Button variant="danger" className="text-sm" onClick={() => handleDelete(portal.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};