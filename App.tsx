import React, { useState, useEffect } from 'react';
import { CreatorDashboard } from './components/CreatorDashboard';
import { PortalList } from './components/PortalList';
import { Viewer } from './components/Viewer';

type ViewState = 'list' | 'creator' | 'viewer';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('list');
  const [activeId, setActiveId] = useState<string | null>(null);

  const parseRoute = () => {
    const hash = window.location.hash;
    
    // 1. Viewer Route (#portal/ID)
    if (hash.includes('portal/')) {
      const parts = hash.split('portal/');
      if (parts[1]) {
        setActiveId(parts[1]);
        setView('viewer');
        return;
      }
    }

    // 2. Editor Route (#edit/ID)
    if (hash.includes('edit/')) {
      const parts = hash.split('edit/');
      if (parts[1]) {
        setActiveId(parts[1]);
        setView('creator');
        return;
      }
    }

    // 3. Create New Route (#create)
    if (hash === '#create') {
      setActiveId(null);
      setView('creator');
      return;
    }
    
    // 4. Default: List View (empty hash or unknown)
    setActiveId(null);
    setView('list');
  };

  useEffect(() => {
    // Initial check
    parseRoute();

    // Listen for changes
    window.addEventListener('hashchange', parseRoute);
    return () => window.removeEventListener('hashchange', parseRoute);
  }, []);

  return (
    <>
      {view === 'list' && <PortalList />}
      {view === 'creator' && <CreatorDashboard editingId={activeId} />}
      {view === 'viewer' && activeId && <Viewer portalId={activeId} />}
    </>
  );
};

export default App;