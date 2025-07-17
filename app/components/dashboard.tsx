import type { DragEndEvent } from '@dnd-kit/core';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState } from 'react';
import '../app.css';
import { notificationsClient } from '../clients/notifications';
import { postsAPI } from '../clients/posts';
import type { Category, CategoryKey, Post, PostEntry } from '../types/api';

const CATEGORIES: Category[] = [
  { key: 'all', label: 'All', accent: 'gray' },
  { key: 'relevant', label: 'Relevant', accent: 'purple' },
  { key: 'business', label: 'Business', accent: 'green' },
  { key: 'world', label: 'World', accent: 'blue' },
  { key: 'politics', label: 'Politics', accent: 'yellow' },
  { key: 'technology', label: 'Technology', accent: 'cyan' },
  { key: 'weather', label: 'Weather', accent: 'red' },
] as const;

// Map API categories to our display categories
const CATEGORY_MAPPING: Record<string, CategoryKey> = {
  business: 'business',
  world: 'world',
  politics: 'politics',
  technology: 'technology',
  tech: 'technology', // Map 'tech' to 'technology'
  weather: 'weather',
  health: 'world', // Map health to world
  crime: 'world', // Map crime to world
  sports: 'world', // Map sports to world
  breaking: 'world', // Map breaking to world
  // Additional mappings for better categorization
  science: 'technology', // Science goes to technology
  finance: 'business', // Finance goes to business
  economy: 'business', // Economy goes to business
  international: 'world', // International goes to world
  domestic: 'politics', // Domestic politics
  government: 'politics', // Government goes to politics
  congress: 'politics', // Congress goes to politics
  senate: 'politics', // Senate goes to politics
  campaign: 'politics', // Campaign goes to politics
  election: 'politics', // Election goes to politics
  policy: 'politics', // Policy goes to politics
  law: 'politics', // Law goes to politics
  legal: 'politics', // Legal goes to politics
};

function transformPostToEntries(post: Post): PostEntry[] {
  console.log('=== TRANSFORM DEBUG START ===');
  console.log('Transform input post:', { 
    id: post.id, 
    uri: post.uri, 
    uriType: typeof post.uri,
    uriLength: post.uri?.length,
    media: post.media, 
    linkPreview: post.linkPreview,
    hasUri: !!post.uri
  });
  console.log('Full post object keys:', Object.keys(post));
  console.log('Post.uri value:', JSON.stringify(post.uri));
  console.log('=== TRANSFORM DEBUG END ===');

  // Defensive check for required fields
  if (!post.categories || !Array.isArray(post.categories)) {
    console.error('Post missing categories field:', post);
    return [];
  }

  if (!post.id || !post.content) {
    console.error('Post missing required fields (id/content):', post);
    return [];
  }

  // Get all applicable categories for this post from the categories array
  const applicableCategories = post.categories
    .map((cat) => CATEGORY_MAPPING[cat])
    .filter(Boolean) // Remove undefined values
    .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

  // Additional content-based categorization for better accuracy
  const content = post.content.toLowerCase();

  // Check for political keywords in content
  const politicalKeywords = [
    'trump',
    'biden',
    'senate',
    'congress',
    'president',
    'election',
    'campaign',
    'vote',
    'policy',
    'government',
    'administration',
    'white house',
    'capitol',
    'republican',
    'democrat',
    'bill',
    'law',
    'legislation',
  ];
  if (politicalKeywords.some((keyword) => content.includes(keyword)) && !applicableCategories.includes('politics')) {
    applicableCategories.push('politics');
  }

  // Check for technology keywords
  const techKeywords = ['ai', 'artificial intelligence', 'tech', 'software', 'app', 'digital', 'cyber', 'data', 'algorithm', 'startup'];
  if (techKeywords.some((keyword) => content.includes(keyword)) && !applicableCategories.includes('technology')) {
    applicableCategories.push('technology');
  }

  // Check for business keywords
  const businessKeywords = ['market', 'stock', 'economy', 'finance', 'investment', 'company', 'ceo', 'earnings', 'revenue', 'profit'];
  if (businessKeywords.some((keyword) => content.includes(keyword)) && !applicableCategories.includes('business')) {
    applicableCategories.push('business');
  }

  // If no categories match, put it in 'world' as default
  if (applicableCategories.length === 0) {
    applicableCategories.push('world');
  }

  // Add "all" category to every post
  const allCategories = [...applicableCategories, 'all'];

  // Add "relevant" category if relevance >= 4
  if (post.relevance >= 4) {
    allCategories.push('relevant');
  }

  // Extract hashtags from content
  const hashtagRegex = /#\w+/g;
  const hashtags = post.content.match(hashtagRegex) || [];
  const tags = hashtags.map((tag) => tag.slice(1)); // Remove # symbol

  // Clean content by removing excessive hashtags, but keep URLs for consistency
  let cleanContent = post.content
    .replace(/#\w+\s*/g, '') // Remove hashtags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Truncate if too long - more compact for better space usage
  if (cleanContent.length > 300) {
    cleanContent = cleanContent.substring(0, 300) + '...';
  }

  // Get the primary category (first non-special category) for color coding
  const primaryCategory = applicableCategories[0] || 'world';

  // Create an entry for each applicable category
  const entries = allCategories.map((category) => ({
    id: `${post.id}-${category}`, // Unique ID for each category instance
    text: cleanContent || post.content.substring(0, 300) + '...',
    source: post.author_name || post.author || post.source,
    tags: tags.slice(0, 3), // Limit to 3 tags
    timestamp: new Date(post.posted_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    category: category as CategoryKey,
    author: post.author,
    author_name: post.author_name,
    author_handle: post.author_handle,
    author_avatar: post.author_avatar,
    relevance: post.relevance,
    posted_at: post.posted_at,
    primaryCategory: primaryCategory, // Add primary category for color coding
    uri: post.uri,
    media: post.media,
    linkPreview: post.linkPreview,
    lang: post.lang,
  }));

  console.log('Transform output entries:', entries.map(e => ({ 
    id: e.id, 
    uri: e.uri, 
    hasUri: !!e.uri,
    media: e.media 
  })));

  return entries;
}

function useRealTimePosts(): [PostEntry[], boolean, Error | null] {
  const [entries, setEntries] = useState<PostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchInitialPosts = async () => {
      try {
        setLoading(true);
        const posts = await postsAPI.getAllPosts();
        console.log('Initial posts sample:', posts.slice(0, 2).map(p => ({ id: p.id, uri: p.uri, media: p.media, linkPreview: p.linkPreview })));

        // Transform posts to entries and flatten the array since each post can create multiple entries
        const transformedEntries = posts.flatMap(transformPostToEntries);
        console.log('Initial transformed entries sample:', transformedEntries.slice(0, 2).map(e => ({ id: e.id, uri: e.uri, media: e.media })));

        // Debug logging to see category distribution
        const categoryCount = transformedEntries.reduce((acc, entry) => {
          acc[entry.category] = (acc[entry.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('Posts per category:', categoryCount);
        console.log('Total transformed entries:', transformedEntries.length);

        setEntries(transformedEntries);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching initial posts:', err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch initial posts
    fetchInitialPosts();

    // Set up SSE connection for real-time updates
    const cleanup = notificationsClient.connect(
      (newPost: Post) => {
        console.log('=== RAW SSE POST START ===');
        console.log('Received new post via SSE:', JSON.stringify(newPost, null, 2));
        console.log('=== RAW SSE POST END ===');
        console.log('SSE Post ID:', newPost.id);
        console.log('SSE Post URI:', newPost.uri);
        console.log('SSE Post URI type:', typeof newPost.uri);
        console.log('SSE Post media:', newPost.media);
        console.log('SSE Post linkPreview:', newPost.linkPreview);
        
        const newEntries = transformPostToEntries(newPost);
        console.log('Transformed SSE entries:', newEntries.map(e => ({ id: e.id, uri: e.uri, media: e.media })));

        setEntries((prevEntries) => {
          // Add new entries to the beginning of the list
          const updatedEntries = [...newEntries, ...prevEntries];

          // Keep only the most recent 100 entries per category to prevent memory issues
          const entriesByCategory = updatedEntries.reduce((acc, entry) => {
            const category = entry.category as CategoryKey;
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(entry);
            return acc;
          }, {} as Record<CategoryKey, PostEntry[]>);

          // Limit to 100 entries per category, keeping the most recent
          const limitedEntries: PostEntry[] = [];
          Object.entries(entriesByCategory).forEach(([category, categoryEntries]) => {
            const sorted = categoryEntries.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()).slice(0, 100);
            limitedEntries.push(...sorted);
          });

          return limitedEntries;
        });
      },
      (error: Event) => {
        console.warn('SSE connection issue:', error);
        // Don't set error state immediately - this could be a temporary network issue
        // Only set error if it's a permanent failure (max reconnect attempts reached)
        if (error.type === 'max-reconnect-attempts') {
          setError(new Error('Real-time connection failed after multiple attempts. Posts will not update automatically.'));
        }
        // For other SSE errors, just log them but don't break the UI
      }
    );

    return cleanup;
  }, []);

  return [entries, loading, error];
}

function useCategoryEntries(category: CategoryKey, allEntries: PostEntry[]): PostEntry[] {
  return allEntries
    .filter((entry) => entry.category === category)
    .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime())
    .slice(0, 20); // Limit to 20 most recent entries per category
}

type MutedState = Record<CategoryKey, boolean>;
type FiltersState = Record<CategoryKey, string>;

export function Dashboard() {
  const [muted, setMuted] = useState<MutedState>({} as MutedState);
  const [pinned, setPinned] = useState<CategoryKey[]>([]);
  const [filters, setFilters] = useState<FiltersState>({} as FiltersState);

  // Load column order from localStorage or use default
  const [columnOrder, setColumnOrder] = useState<CategoryKey[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('column-order');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Validate that all categories are present
          const validOrder = parsed.filter((key: string) => CATEGORIES.some((cat) => cat.key === key));
          if (validOrder.length === CATEGORIES.length) {
            return validOrder;
          }
        } catch {
          // Fall through to default
        }
      }
    }
    return CATEGORIES.map((cat) => cat.key);
  });

  // Fetch real-time posts
  const [allEntries, loading, error] = useRealTimePosts();

  // Set up drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as CategoryKey);
        const newIndex = items.indexOf(over.id as CategoryKey);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('column-order', JSON.stringify(newOrder));
        }

        return newOrder;
      });
    }
  };

  // Get ordered categories based on custom order and pinning
  const orderedCategories: Category[] = [
    ...pinned.map((key) => CATEGORIES.find((c) => c.key === key)!).filter(Boolean),
    ...columnOrder
      .filter((key) => !pinned.includes(key))
      .map((key) => CATEGORIES.find((c) => c.key === key)!)
      .filter(Boolean),
  ];

  if (loading) {
    return (
      <div className='dashboard-bg'>
        <Header />
        <div className='dashboard'>
          <div style={{ color: '#e4e7eb', padding: '24px', textAlign: 'center' }}>Loading news feeds...</div>
        </div>
      </div>
    );
  }

  if (error && error.message.includes('loading news feeds')) {
    // Only show full error screen for initial loading errors
    return (
      <div className='dashboard-bg'>
        <Header />
        <div className='dashboard'>
          <div style={{ color: '#ef4444', padding: '24px', textAlign: 'center' }}>Error loading news feeds: {error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className='dashboard-bg'>
      <Header error={error} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className='dashboard'>
          <SortableContext items={orderedCategories.map((cat) => cat.key)} strategy={horizontalListSortingStrategy}>
            {orderedCategories.map((cat) => (
              <SortableColumn
                key={cat.key}
                id={cat.key}
                category={cat}
                entries={useCategoryEntries(cat.key, allEntries)}
                muted={!!muted[cat.key]}
                onMute={() => setMuted((m) => ({ ...m, [cat.key]: !m[cat.key] }))}
                pinned={pinned.includes(cat.key)}
                onPin={() => setPinned((p) => (p.includes(cat.key) ? p.filter((k) => k !== cat.key) : [cat.key, ...p]))}
                filter={filters[cat.key] || ''}
                onFilter={(val) => setFilters((f) => ({ ...f, [cat.key]: val }))}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
      <div className='dashboard-noise' />
    </div>
  );
}

function Header({ error }: { error?: Error | null }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setIsConnected(notificationsClient.isConnected());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const resetColumnOrder = () => {
    const defaultOrder = CATEGORIES.map((cat) => cat.key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('column-order', JSON.stringify(defaultOrder));
      window.location.reload(); // Simple way to reset the state
    }
  };

  return (
    <header className='header'>
      <div className='header-left'>
        <span className='header-title'>monitor</span>
        <span className='header-live'>
          <span className={`led led-header ${isConnected ? '' : 'led-error'}`} />
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
        <span className='header-update'>
          {error && error.message.includes('Real-time connection') ? (
            <span style={{ color: '#f59e0b' }}>⚠️ {error.message}</span>
          ) : isConnected ? (
            'Real-time updates active'
          ) : (
            `Last update: ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
          )}
        </span>
      </div>
      <div className='header-right'>
        <button className='btn btn-small' onClick={resetColumnOrder} title='Reset column order'>
          Reset Layout
        </button>
      </div>
    </header>
  );
}

type SortableColumnProps = {
  id: string;
  category: Category;
  entries: PostEntry[];
  muted: boolean;
  onMute: () => void;
  pinned: boolean;
  onPin: () => void;
  filter: string;
  onFilter: (val: string) => void;
};

function SortableColumn(props: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Column {...props} dragHandleProps={listeners} isDragging={isDragging} />
    </div>
  );
}

type ColumnProps = {
  category: Category;
  entries: PostEntry[];
  muted: boolean;
  onMute: () => void;
  pinned: boolean;
  onPin: () => void;
  filter: string;
  onFilter: (val: string) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
};

function Column({ category, entries, muted, onMute, pinned, onPin, filter, onFilter, dragHandleProps, isDragging }: ColumnProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filteredEntries = filter ? entries.filter((e: PostEntry) => e.text.toLowerCase().includes(filter.toLowerCase())) : entries;

  // Helper function to get the accent color for an entry
  const getEntryAccent = (entry: PostEntry) => {
    // For "all" and "relevant" columns, use the primary category color
    if (category.key === 'all' || category.key === 'relevant') {
      const primaryCat = CATEGORIES.find(cat => cat.key === entry.primaryCategory);
      return primaryCat?.accent || 'gray';
    }
    // For regular category columns, use the column's accent
    return category.accent;
  };

  return (
    <div className={`column ${isDragging ? 'column-dragging' : ''}`} data-accent={category.accent}>
      <div className='column-header'>
        <div className='column-header-main'>
          <div className='drag-handle' {...dragHandleProps} title='Drag to reorder column'>
            ⋮⋮
          </div>
          <span className='column-title'>{category.label.toUpperCase()}</span>
          <span className='column-count'>({filteredEntries.length})</span>
          <span className='led led-col' />
          <button className={`btn-icon ${muted ? 'btn-icon-active' : ''}`} onClick={onMute} title={muted ? 'Unmute feed' : 'Mute feed'}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button className={`btn-icon ${pinned ? 'btn-icon-active' : ''}`} onClick={onPin} title={pinned ? 'Unpin column' : 'Pin column'}>
            {pinned ? '📌' : '📍'}
          </button>
        </div>
        <div className='column-header-search'>
          <input className='filter-input' value={filter} onChange={(e) => onFilter(e.target.value)} placeholder='Filter...' />
        </div>
      </div>
      <div className='column-feed'>
        {filteredEntries.map((entry: PostEntry) => {
          console.log(`Rendering entry ${entry.id}:`, { uri: entry.uri, hasUri: !!entry.uri });
          return (
          <div key={entry.id} className='entry' data-relevance={entry.relevance} data-accent={getEntryAccent(entry)}>
            <div className='entry-header'>
              <span className='timestamp'>{entry.timestamp}</span>
              <div className='source-info'>
                {entry.author_avatar && (
                  <img 
                    src={entry.author_avatar} 
                    alt={entry.author_name} 
                    className='author-avatar'
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className='source'>{entry.author_name?.toUpperCase() || entry.source.toUpperCase()}</span>
              </div>

              {(category.key === 'all' || category.key === 'relevant') && entry.primaryCategory && (
                <span className={`category-badge category-${entry.primaryCategory}`}>
                  {CATEGORIES.find(cat => cat.key === entry.primaryCategory)?.label.toUpperCase()}
                </span>
              )}
            </div>
            <div className='entry-text'>{entry.text}</div>
            {entry.media && entry.media.length > 0 && (
              <div className='entry-media'>
                {entry.media.slice(0, 2).map((mediaUrl, index) => (
                  <a key={index} href={mediaUrl} target='_blank' rel='noopener noreferrer' className='media-link'>
                    🔗 {new URL(mediaUrl).hostname}
                  </a>
                ))}
              </div>
            )}
            <div className='entry-meta'>
              <div className='tags'>
                {entry.tags.map((tag: string) => (
                  <span key={tag} className='tag'>
                    #{tag.toUpperCase()}
                  </span>
                ))}
                {entry.lang && entry.lang !== 'en' && (
                  <span className='lang-tag'>{entry.lang.toUpperCase()}</span>
                )}
              </div>
              <div className='entry-actions'>
                <button className='btn btn-small' onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                  {expanded === entry.id ? 'Collapse' : 'Expand'}
                </button>
                {entry.uri ? (
                  <a href={entry.uri} target='_blank' rel='noopener noreferrer' className='btn btn-small'>
                    View Original
                  </a>
                ) : (
                  <span style={{ fontSize: '10px', color: '#6b7280' }}>No URI</span>
                )}
                <button className='btn btn-small'>Context</button>
                <button className='btn btn-small'>Share</button>
              </div>
            </div>
            {expanded === entry.id && (
              <div className='entry-expanded'>
                <div className='expanded-content'>
                  <div className='expanded-row'>
                    <strong>Source:</strong> {entry.author_name || entry.author}
                    {entry.author_handle && (
                      <a href={`https://twitter.com/${entry.author_handle}`} target='_blank' rel='noopener noreferrer' className='expanded-handle'>
                        @{entry.author_handle}
                      </a>
                    )}
                  </div>
                  
                  <div className='expanded-row'>
                    <strong>Relevance:</strong> 
                    <span className={`relevance-score relevance-${Math.ceil(entry.relevance / 2)}`}>
                      {entry.relevance}/10
                    </span>
                    {' • '}
                    <strong>Posted:</strong> {new Date(entry.posted_at).toLocaleString()}
                  </div>
                  
                  <div className='expanded-row'>
                    <strong>Language:</strong> 
                    <span className='lang-indicator'>{entry.lang?.toUpperCase() || 'N/A'}</span>
                    {' • '}
                    <strong>Category:</strong> 
                    <span className={`category-badge category-${entry.primaryCategory}`}>
                      {CATEGORIES.find(cat => cat.key === entry.primaryCategory)?.label || 'Unknown'}
                    </span>
                  </div>
                  
                  {(entry.uri || entry.linkPreview || (entry.media && entry.media.length > 0)) && (
                    <div className='expanded-row'>
                      <strong>Links:</strong>{' '}
                      {entry.uri && (
                        <a href={entry.uri} target='_blank' rel='noopener noreferrer' className='expanded-link'>
                          {new URL(entry.uri).hostname}
                        </a>
                      )}
                      {entry.linkPreview && entry.linkPreview !== entry.uri && (
                        <>
                          {entry.uri && ' • '}
                          <a href={entry.linkPreview} target='_blank' rel='noopener noreferrer' className='expanded-link'>
                            Preview
                          </a>
                        </>
                      )}
                      {entry.media && entry.media.length > 0 && entry.media.map((mediaUrl, index) => (
                        <span key={index}>
                          {(entry.uri || entry.linkPreview || index > 0) && ' • '}
                          <a href={mediaUrl} target='_blank' rel='noopener noreferrer' className='expanded-link'>
                            Media {index + 1}
                          </a>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className='expanded-footer'>
                  <div className='expanded-actions'>
                    <button 
                      className='btn btn-small' 
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(entry.text);
                        } catch (err) {
                          console.warn('Failed to copy text:', err);
                        }
                      }}
                    >
                      Copy Text
                    </button>
                    <button 
                      className='btn btn-small' 
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(entry.uri);
                        } catch (err) {
                          console.warn('Failed to copy link:', err);
                        }
                      }}
                    >
                      Copy Link
                    </button>
                    {entry.uri && (
                      <a href={entry.uri} target='_blank' rel='noopener noreferrer' className='btn btn-small'>
                        Open
                      </a>
                    )}
                  </div>
                  <div className='expanded-meta'>
                    <span className='post-id'>#{entry.id.split('-')[0].slice(-6)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        })}
        {filteredEntries.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>{muted ? 'Feed muted' : 'No news available for this category'}</div>
        )}
      </div>
      <div className='footer'>
        <span>FEED: {category.label.toUpperCase()}</span>
        <span className='footer-status'>{muted ? 'MUTED' : 'ACTIVE'}</span>
      </div>
    </div>
  );
}
