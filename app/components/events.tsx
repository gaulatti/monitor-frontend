import { useEffect, useState } from 'react';
import { postsAPI } from '../clients/posts';
import type { Event, Post } from '../types/api';
import '../app.css';

// Helper function to safely get hostname from URL
function getUrlHostname(url: string): string | null {
  try {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('at://'))) {
      return null;
    }
    if (url.startsWith('at://')) {
      // For Bluesky at:// protocol, extract the domain/handle part
      const atMatch = url.match(/^at:\/\/([^\/]+)/);
      return atMatch ? atMatch[1] : null;
    }
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

// Helper function to convert Bluesky at:// URIs to web URLs
function convertBlueskyUri(uri: string): string {
  if (uri.startsWith('at://')) {
    // Convert at://did:plc:handle/app.bsky.feed.post/postid to https://bsky.app/profile/handle/post/postid
    const match = uri.match(/^at:\/\/([^\/]+)\/app\.bsky\.feed\.post\/(.+)$/);
    if (match) {
      const [, handle, postId] = match;
      return `https://bsky.app/profile/${handle}/post/${postId}`;
    }
  }
  return uri;
}

// Helper function to check if URL is an image
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
}

// Media Carousel Component
function MediaCarousel({ media, className = "" }: { media: string[]; className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!media || media.length === 0) return null;

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <div className={`media-carousel ${className}`}>
      <div className="media-carousel-container">
        <img
          src={media[currentIndex]}
          alt={`Media ${currentIndex + 1}`}
          className="media-carousel-image"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {media.length > 1 && (
          <>
            <button className="media-carousel-btn media-carousel-prev" onClick={prevImage}>
              ‹
            </button>
            <button className="media-carousel-btn media-carousel-next" onClick={nextImage}>
              ›
            </button>
            <div className="media-carousel-indicators">
              {media.map((_, index) => (
                <button
                  key={index}
                  className={`media-carousel-indicator ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface PostCardProps {
  post: Post;
  expandedPost: string | null;
  setExpandedPost: (id: string | null) => void;
}

function PostCard({ post, expandedPost, setExpandedPost }: PostCardProps) {
  const isExpanded = expandedPost === post.id;
  const imageMedia = post.media?.filter(isImageUrl) || [];

  return (
    <div className="entry" data-relevance={post.relevance} data-accent="blue">
      <div className="entry-header">
        <span className="timestamp">{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="source-info">
          {post.author_avatar && (
            <img
              src={post.author_avatar}
              alt={post.author_name}
              className="author-avatar"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <span className="source">{post.author_name?.toUpperCase() || post.author.toUpperCase()}</span>
        </div>
      </div>
      
      <div className="entry-text">{post.content}</div>
      
      {/* Media Carousel */}
      {imageMedia.length > 0 && (
        <MediaCarousel media={imageMedia} className="post-media-carousel" />
      )}
      
      {(post.uri || (post.media && post.media.length > 0)) && (
        <div className="entry-links">
          {post.uri && getUrlHostname(post.uri) && (
            <a href={convertBlueskyUri(post.uri)} target="_blank" rel="noopener noreferrer" className="media-link">
              🔗 Source ({getUrlHostname(post.uri)})
            </a>
          )}
          {post.media &&
            post.media.length > 0 &&
            post.media.filter(url => !isImageUrl(url)).map((mediaUrl, index) => {
              const hostname = getUrlHostname(mediaUrl);
              if (!hostname) return null;

              return (
                <a key={index} href={convertBlueskyUri(mediaUrl)} target="_blank" rel="noopener noreferrer" className="media-link">
                  🔗 {hostname}
                </a>
              );
            })}
        </div>
      )}
      
      <div className="entry-meta">
        <div className="tags">
          {post.categories && post.categories.map((cat: string) => (
            <span key={cat} className="tag">
              #{cat.toUpperCase()}
            </span>
          ))}
          {post.lang && post.lang !== 'en' && <span className="lang-tag">{post.lang.toUpperCase()}</span>}
        </div>
        <div className="entry-actions">
          <button className="btn btn-small" onClick={() => setExpandedPost(isExpanded ? null : post.id)}>
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button className="btn btn-small">Context</button>
          <button className="btn btn-small">Share</button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="entry-expanded">
          <div className="expanded-content">
            <div className="expanded-row">
              <strong>Source:</strong> {post.author_name || post.author}
              {post.author_handle && (
                <a href={`https://bsky.app/profile/${post.author_handle}`} target="_blank" rel="noopener noreferrer" className="expanded-handle">
                  @{post.author_handle}
                </a>
              )}
            </div>

            <div className="expanded-row">
              <strong>Relevance:</strong>
              <span className={`relevance-score relevance-${Math.ceil(post.relevance / 2)}`}>{post.relevance}/10</span>
              {' • '}
              <strong>Posted:</strong> {new Date(post.createdAt).toLocaleString()}
            </div>

            <div className="expanded-row">
              <strong>Language:</strong>
              <span className="lang-indicator">{post.lang?.toUpperCase() || 'N/A'}</span>
              {' • '}
              <strong>Categories:</strong>
              {post.categories && post.categories.length > 0 ? (
                post.categories.map((cat, index) => (
                  <span key={index} className="category-badge">
                    {cat}{index < post.categories.length - 1 ? ', ' : ''}
                  </span>
                ))
              ) : (
                <span>None</span>
              )}
            </div>
          </div>

          <div className="expanded-footer">
            <div className="expanded-actions">
              <button
                className="btn btn-small"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(post.content);
                  } catch (err) {
                    console.warn('Failed to copy text:', err);
                  }
                }}
              >
                Copy Text
              </button>
              {post.uri && (
                <button
                  className="btn btn-small"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(convertBlueskyUri(post.uri));
                    } catch (err) {
                      console.warn('Failed to copy link:', err);
                    }
                  }}
                >
                  Copy Link
                </button>
              )}
              {post.uri && (
                <a href={convertBlueskyUri(post.uri)} target="_blank" rel="noopener noreferrer" className="btn btn-small">
                  Open
                </a>
              )}
            </div>
            <div className="expanded-meta">
              <span className="post-id">#{post.id.slice(-6)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface EventCardProps {
  event: Event;
  expandedEvent: number | null;
  setExpandedEvent: (id: number | null) => void;
}

function EventCard({ event, expandedEvent, setExpandedEvent }: EventCardProps) {
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const isExpanded = expandedEvent === event.id;

  // Calculate average relevance from posts
  const avgRelevance = event.posts.length > 0 
    ? Math.round(event.posts.reduce((sum, post) => sum + post.relevance, 0) / event.posts.length * 10) / 10
    : 0;

  // Map average relevance to semaphore range (0-5 = green, 6-8 = yellow, 9-10 = red)
  const semaphoreValue = Math.min(10, Math.max(1, Math.round(avgRelevance)));

  return (
    <div className="entry" data-relevance={semaphoreValue} data-accent="purple">
      <div className="entry-header">
        <span className="timestamp">{new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="source-info">
          <span className="source">EVENT</span>
        </div>
        <span className={`category-badge event-status status-${event.status}`}>
          {event.status.toUpperCase()}
        </span>
      </div>
      
      <div className="entry-text">{event.title}</div>
      
      <div className="entry-summary">{event.summary}</div>
      
      <div className="entry-meta">
        <div className="tags">
          <span className="tag event-count">
            {event.posts_count} POSTS
          </span>
          <span className="tag event-relevance">
            AVG {avgRelevance}
          </span>
          <span className="tag event-id">
            #{event.id}
          </span>
        </div>
        <div className="entry-actions">
          <button className="btn btn-small" onClick={() => setExpandedEvent(isExpanded ? null : event.id)}>
            {isExpanded ? 'Hide Posts' : 'Show Posts'}
          </button>
          <button className="btn btn-small">Context</button>
          <button className="btn btn-small">Share</button>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-title">monitor</span>
        <span className="header-live">
          <span className="led led-header" />
          EVENTS
        </span>
        <span className="header-update">
          Last update: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
      <div className="header-right">
        {/* Events-specific actions can go here */}
      </div>
    </header>
  );
}

export function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const eventsData = await postsAPI.getAllEvents();
        console.log('Fetched events:', eventsData.length);
        // Sort events by creation date, newest first
        setEvents(eventsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setError(null);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch events'));
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = filter 
    ? events.filter(event => 
        event.title.toLowerCase().includes(filter.toLowerCase()) ||
        event.summary.toLowerCase().includes(filter.toLowerCase())
      )
    : events;

  const expandedEventData = expandedEvent ? events.find(e => e.id === expandedEvent) : null;

  if (loading) {
    return (
      <div className="dashboard-bg">
        <Header />
        <div className="dashboard">
          <div style={{ color: '#e4e7eb', padding: '24px', textAlign: 'center' }}>Loading events...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-bg">
        <Header />
        <div className="dashboard">
          <div style={{ color: '#ef4444', padding: '24px', textAlign: 'center' }}>
            Error loading events: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-bg">
      <Header />
      <div className="events-dashboard">
        <div className="events-header">
          <div className="events-header-main">
            <span className="column-title">EVENTS</span>
            <span className="column-count">({filteredEvents.length})</span>
            <span className="led led-col" />
          </div>
          <div className="events-header-search">
            <input 
              className="filter-input" 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              placeholder="Filter events..." 
            />
          </div>
        </div>
        
        <div className="events-grid">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              expandedEvent={expandedEvent}
              setExpandedEvent={setExpandedEvent}
            />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
            {filter ? 'No events match your filter' : 'No events available'}
          </div>
        )}

        {/* Event Details Modal */}
        {expandedEventData && (
          <div className="event-modal-overlay" onClick={() => setExpandedEvent(null)}>
            <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="event-modal-header">
                <h3>{expandedEventData.title}</h3>
                <button className="event-modal-close" onClick={() => setExpandedEvent(null)}>×</button>
              </div>
              
              <div className="event-modal-body">
                <div className="event-modal-info">
                  <p className="event-summary">{expandedEventData.summary}</p>
                  <div className="event-details">
                    <span className={`status-badge status-${expandedEventData.status}`}>
                      {expandedEventData.status.toUpperCase()}
                    </span>
                    <span className="event-meta">
                      Created: {new Date(expandedEventData.created_at).toLocaleString()}
                    </span>
                    <span className="event-meta">
                      {expandedEventData.posts_count} posts
                    </span>
                  </div>
                </div>

                {/* Event Media Carousel - All unique media from posts */}
                {(() => {
                  const allMedia = expandedEventData.posts
                    .flatMap(post => post.media || [])
                    .filter(isImageUrl)
                    .filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates
                  
                  return allMedia.length > 0 ? (
                    <div className="event-media-section">
                      <h4>Event Media</h4>
                      <MediaCarousel media={allMedia} className="event-media-carousel" />
                    </div>
                  ) : null;
                })()}

                <div className="event-posts-section">
                  <h4>Related Posts</h4>
                  <div className="event-posts-list">
                    {expandedEventData.posts
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((post) => (
                      <div key={post.id} className="event-post-item">
                        <div className="post-header">
                          <span className="post-timestamp">
                            {new Date(post.createdAt).toLocaleDateString()} {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="post-source">{post.source}</span>
                        </div>
                        <div className="post-content">
                          <div className="post-title">{post.content}</div>
                          <div className="post-summary">
                            {post.author_name && `by ${post.author_name}`}
                            {post.author_handle && ` (@${post.author_handle})`}
                          </div>
                          {post.uri && (
                            <div className="post-links">
                              <a href={convertBlueskyUri(post.uri)} target="_blank" rel="noopener noreferrer" className="media-link">
                                🔗 View Original Post
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="dashboard-noise" />
    </div>
  );
}
