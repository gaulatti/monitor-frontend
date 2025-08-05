import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { notificationsClient } from '~/clients/notifications';

interface SharedLayoutProps {
  children: ReactNode;
  currentPage: 'posts' | 'events';
}

export function SharedLayout({ children, currentPage }: SharedLayoutProps) {
  return (
    <div className='dashboard-bg'>
      <Header showConnectionStatus={currentPage === 'posts'} />
      <NavigationTabs currentPage={currentPage} />
      {children}
      <div className='dashboard-noise' />
    </div>
  );
}

function NavigationTabs({ currentPage }: { currentPage: 'posts' | 'events' }) {
  return (
    <div className='dashboard-tabs'>
      <Link to='/' className={`tab-button ${currentPage === 'posts' ? 'active' : ''}`}>
        Posts
      </Link>
      <Link to='/events' className={`tab-button ${currentPage === 'events' ? 'active' : ''}`}>
        Events
      </Link>
    </div>
  );
}

function Header({ showConnectionStatus }: { showConnectionStatus: boolean }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);

  // Reset column order function - only for Posts page
  const resetColumnOrder = () => {
    const CATEGORIES = [
      { key: 'all' },
      { key: 'relevant' },
      { key: 'business' },
      { key: 'world' },
      { key: 'politics' },
      { key: 'technology' },
      { key: 'weather' },
    ];

    const defaultOrder = CATEGORIES.map((cat) => cat.key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('column-order', JSON.stringify(defaultOrder));
      window.location.reload();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      if (showConnectionStatus) {
        setIsConnected(notificationsClient.isConnected());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [showConnectionStatus]);

  return (
    <header className='header'>
      <div className='header-left'>
        <span className='header-title'>monitor</span>
        {showConnectionStatus ? (
          <>
            <span className='header-live'>
              <span className={`led led-header ${isConnected ? '' : 'led-error'}`} />
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
            <span className='header-update'>
              {isConnected
                ? 'Real-time updates active'
                : `Last update: ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
            </span>
          </>
        ) : (
          <>
            <span className='header-live'>
              <span className='led led-header' />
              EVENTS
            </span>
            <span className='header-update'>Last update: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </>
        )}
      </div>
      <div className='header-right'>
        {showConnectionStatus && (
          <button className='btn btn-small' onClick={resetColumnOrder} title='Reset column order'>
            Reset Layout
          </button>
        )}
      </div>
    </header>
  );
}
