import { useState } from 'react';
import { Dashboard } from './dashboard';
import { Events } from './events';
import '../app.css';

type TabType = 'posts' | 'events';

export function MainDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  return (
    <div className="main-dashboard">
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts
        </button>
        <button 
          className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'posts' && <Dashboard />}
        {activeTab === 'events' && <Events />}
      </div>
    </div>
  );
}
