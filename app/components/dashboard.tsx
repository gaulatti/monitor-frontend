import type { DragEndEvent } from '@dnd-kit/core';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState, useRef, useCallback } from 'react';
import '../app.css';
import { notificationsClient } from '../clients/notifications';
import { postsAPI } from '../clients/posts';
import type { Category, CategoryKey, Post, PostEntry, Event as ApiEvent } from '../types/api';

// Media Carousel Component
function MediaCarousel({ media, className = '' }: { media: string[]; className?: string }) {
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
      <div className='media-carousel-container'>
        <img
          src={media[currentIndex]}
          alt={`Media ${currentIndex + 1}`}
          className='media-carousel-image'
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {media.length > 1 && (
          <>
            <button className='media-carousel-btn media-carousel-prev' onClick={prevImage}>
              ‹
            </button>
            <button className='media-carousel-btn media-carousel-next' onClick={nextImage}>
              ›
            </button>
            <div className='media-carousel-indicators'>
              {media.map((_, index) => (
                <button key={index} className={`media-carousel-indicator ${index === currentIndex ? 'active' : ''}`} onClick={() => setCurrentIndex(index)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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

// Helper function to safely get hostname from URL, supporting Bluesky at:// protocol
function getUrlHostname(url: string): string | null {
  try {
    // Handle Bluesky at:// protocol and other HTTP protocols
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('at://'))) {
      return null;
    }
    if (url.startsWith('at://')) {
      // For Bluesky at:// protocol, extract the domain/handle part
      const atMatch = url.match(/^at:\/\/([^\/]+)/);
      return atMatch ? atMatch[1] : null;
    }
    return new URL(url).hostname;
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

// Helper function to check if a URL is an image
function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/.test(pathname);
  } catch {
    return false;
  }
}

function transformPostToEntries(post: Post): PostEntry[] {
  console.log('=== TRANSFORM DEBUG START ===');
  console.log('Transform input post:', {
    id: post.id,
    uri: post.uri,
    uriType: typeof post.uri,
    uriLength: post.uri?.length,
    media: post.media,
    linkPreview: post.linkPreview,
    hasUri: !!post.uri,
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
  if (cleanContent.length > 500) {
    cleanContent = cleanContent.substring(0, 500) + '...';
  }

  // Get the primary category (first non-special category) for color coding
  const primaryCategory = applicableCategories[0] || 'world';

  // Create an entry for each applicable category
  const entries = allCategories.map((category) => ({
    id: `${post.id}-${category}`, // Unique ID for each category instance
    text: cleanContent || post.content.substring(0, 300) + '...',
    source: post.author_name || post.author || post.source,
    tags: tags, // Include all tags
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

  console.log(
    'Transform output entries:',
    entries.map((e) => ({
      id: e.id,
      uri: e.uri,
      hasUri: !!e.uri,
      media: e.media,
    }))
  );

  return entries;
}

function useRealTimePosts(): [PostEntry[], boolean, Error | null, (categoryKey: CategoryKey) => void, Partial<Record<CategoryKey, boolean>>, Partial<Record<CategoryKey, boolean>>] {
  const [entries, setEntries] = useState<PostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Per-category pagination state
  const [cursors, setCursors] = useState<Partial<Record<CategoryKey, string | null>>>({});
  const [loadingStates, setLoadingStates] = useState<Partial<Record<CategoryKey, boolean>>>({});
  const [hasMoreStates, setHasMoreStates] = useState<Partial<Record<CategoryKey, boolean>>>({});

  // Load more posts for a specific category
  const loadMore = async (categoryKey: CategoryKey) => {
    if (loadingStates[categoryKey] || !hasMoreStates[categoryKey]) {
      return;
    }

    setLoadingStates(prev => ({ ...prev, [categoryKey]: true }));

    try {
      let posts: Post[];
      
      if (categoryKey === 'all') {
        posts = await postsAPI.getAllPosts({
          limit: 50,
          before: cursors[categoryKey] || undefined
        });
      } else if (categoryKey === 'relevant') {
        // For relevant category, fetch from 'all' and filter by relevance
        posts = await postsAPI.getAllPosts({
          limit: 100, // Fetch more to get enough high-relevance posts
          before: cursors[categoryKey] || undefined
        });
        posts = posts.filter(post => post.relevance >= 4);
      } else {
        // For specific categories, fetch with category filter
        posts = await postsAPI.getAllPosts({
          limit: 50,
          before: cursors[categoryKey] || undefined,
          categories: categoryKey
        });
      }

      console.log(`Loaded ${posts.length} more posts for category: ${categoryKey}`);

      if (posts.length > 0) {
        // Transform and append posts
        const newEntries = posts.flatMap(transformPostToEntries);
        
        setEntries(prevEntries => {
          // Filter out any duplicate entries by ID
          const existingIds = new Set(prevEntries.map(e => e.id));
          const uniqueNewEntries = newEntries.filter(e => !existingIds.has(e.id));
          
          return [...prevEntries, ...uniqueNewEntries];
        });

        // Update cursor with the oldest posted_at from this batch
        const oldestPost = posts.reduce((oldest, post) => 
          !oldest || post.posted_at < oldest.posted_at ? post : oldest
        );
        
        setCursors(prev => ({ 
          ...prev, 
          [categoryKey]: oldestPost.posted_at
        }));
      }

      // Update hasMore state based on the actual results for this specific category
      let hasMorePosts = false;
      if (categoryKey === 'relevant') {
        // For relevant, check if we got enough high-relevance posts suggesting more exist
        hasMorePosts = posts.length >= 25; // Lower threshold since we filter by relevance
      } else {
        // For other categories, check if we got a full batch
        hasMorePosts = posts.length >= 50;
      }
      
      setHasMoreStates(prev => ({
        ...prev,
        [categoryKey]: hasMorePosts
      }));

    } catch (err) {
      console.error(`Error loading more posts for category ${categoryKey}:`, err);
      // On error, disable further loading for this category
      setHasMoreStates(prev => ({
        ...prev,
        [categoryKey]: false
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [categoryKey]: false }));
    }
  };

  useEffect(() => {
    const fetchInitialPosts = async () => {
      try {
        setLoading(true);
        
        // Perform parallel fetches for each category to get independent results
        const categoryPromises = CATEGORIES.map(async (category) => {
          try {
            let posts: Post[];
            if (category.key === 'all') {
              // For 'all' category, fetch without category filter
              posts = await postsAPI.getAllPosts({ limit: 50 });
            } else if (category.key === 'relevant') {
              // For 'relevant' category, we'll handle this after getting all posts
              posts = [];
            } else {
              // For specific categories, fetch with category filter
              posts = await postsAPI.getAllPosts({ 
                limit: 50, 
                categories: category.key 
              });
            }
            
            console.log(`Fetched ${posts.length} posts for category: ${category.key}`);
            return { category: category.key, posts, success: true };
          } catch (err) {
            console.error(`Error fetching posts for category ${category.key}:`, err);
            return { category: category.key, posts: [], success: false };
          }
        });

        const categoryResults = await Promise.all(categoryPromises);
        
        // Initialize pagination states based on actual results per category
        const newCursors: Partial<Record<CategoryKey, string | null>> = {};
        const newHasMoreStates: Partial<Record<CategoryKey, boolean>> = {};
        const newLoadingStates: Partial<Record<CategoryKey, boolean>> = {};
        
        // Collect all posts and track per-category states
        const allPosts: Post[] = [];
        categoryResults.forEach(({ category, posts, success }) => {
          if (success && posts.length > 0) {
            allPosts.push(...posts);
            
            // Set cursor to oldest post in this category
            const oldestPost = posts.reduce((oldest, post) => 
              !oldest || post.posted_at < oldest.posted_at ? post : oldest
            );
            newCursors[category as CategoryKey] = oldestPost.posted_at;
            
            // Set hasMore based on whether we got a full batch (50)
            newHasMoreStates[category as CategoryKey] = posts.length >= 50;
          } else {
            // Category has no posts or failed - no pagination needed
            newCursors[category as CategoryKey] = null;
            newHasMoreStates[category as CategoryKey] = false;
          }
          
          newLoadingStates[category as CategoryKey] = false;
        });

        // Handle 'relevant' category separately by filtering high-relevance posts from 'all'
        const allCategoryResult = categoryResults.find(r => r.category === 'all');
        if (allCategoryResult && allCategoryResult.success) {
          const relevantPosts = allCategoryResult.posts.filter(post => post.relevance >= 4);
          if (relevantPosts.length > 0) {
            const oldestRelevant = relevantPosts.reduce((oldest, post) => 
              !oldest || post.posted_at < oldest.posted_at ? post : oldest
            );
            newCursors['relevant'] = oldestRelevant.posted_at;
            // For relevant, hasMore should match the 'all' category since it's a subset
            newHasMoreStates['relevant'] = newHasMoreStates['all'] || false;
          } else {
            newCursors['relevant'] = null;
            newHasMoreStates['relevant'] = false;
          }
        }

        // Remove duplicates from allPosts since 'all' category overlaps with specific categories
        const uniquePosts = allPosts.reduce((unique, post) => {
          if (!unique.find(p => p.id === post.id)) {
            unique.push(post);
          }
          return unique;
        }, [] as Post[]);

        // Transform posts to entries
        const transformedEntries = uniquePosts.flatMap(transformPostToEntries);
        
        // Debug logging
        const categoryCount = transformedEntries.reduce((acc, entry) => {
          acc[entry.category] = (acc[entry.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('Posts per category after initial fetch:', categoryCount);
        console.log('Pagination states:', newHasMoreStates);

        setEntries(transformedEntries);
        setCursors(newCursors);
        setHasMoreStates(newHasMoreStates);
        setLoadingStates(newLoadingStates);
        
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
        console.log(
          'Transformed SSE entries:',
          newEntries.map((e) => ({ id: e.id, uri: e.uri, media: e.media }))
        );

        setEntries((prevEntries) => {
          // Add new entries to the beginning of the list
          const updatedEntries = [...newEntries, ...prevEntries];

          // Sort by category without limiting entries
          const entriesByCategory = updatedEntries.reduce((acc, entry) => {
            const category = entry.category as CategoryKey;
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(entry);
            return acc;
          }, {} as Record<CategoryKey, PostEntry[]>);

          const allEntries: PostEntry[] = [];
          Object.entries(entriesByCategory).forEach(([category, categoryEntries]) => {
            const sorted = categoryEntries.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
            allEntries.push(...sorted);
          });

          return allEntries;
        });
      },
      undefined, // no event handler needed for posts
      (errorEvent: Error) => {
        console.warn('SSE connection issue:', errorEvent);
        // Don't set error state immediately - this could be a temporary network issue
        // Only set error if it's a permanent failure (max reconnect attempts reached)
        if (errorEvent.message === 'max-reconnect-attempts') {
          setError(new Error('Real-time connection failed after multiple attempts. Posts will not update automatically.'));
        }
        // For other SSE errors, just log them but don't break the UI
      }
    );

    return cleanup;
  }, []);

  return [entries, loading, error, loadMore, loadingStates, hasMoreStates];
}

function useCategoryEntries(category: CategoryKey, allEntries: PostEntry[]): PostEntry[] {
  return allEntries.filter((entry) => entry.category === category).sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
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

  // Fetch real-time posts with pagination support
  const [allEntries, loading, error, loadMore, loadingStates, hasMoreStates] = useRealTimePosts();

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

  // Reset function for layout
  const resetColumnOrder = () => {
    const defaultOrder = CATEGORIES.map((cat) => cat.key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('column-order', JSON.stringify(defaultOrder));
      window.location.reload(); // Simple way to reset the state
    }
  };

  if (loading) {
    return (
      // <Layout showConnectionStatus={true} error={error}>
        <div className='dashboard'>
          <div style={{ color: '#e4e7eb', padding: '24px', textAlign: 'center' }}>Loading news feeds...</div>
        </div>
      // </Layout>
    );
  }

  if (error && error.message.includes('loading news feeds')) {
    // Only show full error screen for initial loading errors
    return (
      // <Layout showConnectionStatus={true} error={error}>
        <div className='dashboard'>
          <div style={{ color: '#ef4444', padding: '24px', textAlign: 'center' }}>Error loading news feeds: {error.message}</div>
        </div>
      // </Layout>
    );
  }

  return (
    // <Layout showConnectionStatus={true} error={error} onResetLayout={resetColumnOrder}>
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
                loadMore={() => loadMore(cat.key)}
                isLoading={!!loadingStates[cat.key]}
                hasMore={!!hasMoreStates[cat.key]}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
    // </Layout>
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
  loadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
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
  loadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
};

function Column({ category, entries, muted, onMute, pinned, onPin, filter, onFilter, dragHandleProps, isDragging, loadMore, isLoading, hasMore }: ColumnProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  const handleObserver = useCallback((entities: IntersectionObserverEntry[]) => {
    const target = entities[0];
    if (target.isIntersecting && hasMore && !isLoading && !muted) {
      console.log(`Loading more for category: ${category.key}`);
      loadMore();
    }
  }, [hasMore, isLoading, muted, loadMore, category.key]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const option = {
      root: null,
      rootMargin: "20px",
      threshold: 0
    };

    const observer = new IntersectionObserver(handleObserver, option);
    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  const filteredEntries = filter ? entries.filter((e: PostEntry) => e.text.toLowerCase().includes(filter.toLowerCase())) : entries;

  // Helper function to get the accent color for an entry
  const getEntryAccent = (entry: PostEntry) => {
    // For "all" and "relevant" columns, use the primary category color
    if (category.key === 'all' || category.key === 'relevant') {
      const primaryCat = CATEGORIES.find((cat) => cat.key === entry.primaryCategory);
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
                    {CATEGORIES.find((cat) => cat.key === entry.primaryCategory)?.label.toUpperCase()}
                  </span>
                )}
              </div>
              <div className='entry-text'>{entry.text}</div>
              {(entry.uri || (entry.media && entry.media.length > 0)) && (
                <div className='entry-media'>
                  {entry.uri && getUrlHostname(entry.uri) && (
                    <a href={convertBlueskyUri(entry.uri)} target='_blank' rel='noopener noreferrer' className='media-link'>
                      🔗 Source ({getUrlHostname(entry.uri)})
                    </a>
                  )}

                  {/* Media Carousel for images */}
                  {(() => {
                    const imageMedia = entry.media?.filter(isImageUrl) || [];
                    return imageMedia.length > 0 ? <MediaCarousel media={imageMedia} className='post-media-carousel' /> : null;
                  })()}

                  {/* Non-image media links */}
                  {entry.media &&
                    entry.media.length > 0 &&
                    entry.media
                      .filter((mediaUrl) => !isImageUrl(mediaUrl))
                      .map((mediaUrl, index) => {
                        const hostname = getUrlHostname(mediaUrl);
                        if (!hostname) return null;

                        return (
                          <a key={index} href={mediaUrl} target='_blank' rel='noopener noreferrer' className='media-link'>
                            🔗 {hostname}
                          </a>
                        );
                      })}
                </div>
              )}
              <div className='entry-meta'>
                <div className='tags'>
                  {entry.tags.map((tag: string) => (
                    <span key={tag} className='tag'>
                      #{tag.toUpperCase()}
                    </span>
                  ))}
                  {entry.lang && entry.lang !== 'en' && <span className='lang-tag'>{entry.lang.toUpperCase()}</span>}
                </div>
                <div className='entry-actions'>
                  <button className='btn btn-small' onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                    {expanded === entry.id ? 'Collapse' : 'Expand'}
                  </button>
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
                        <a href={`https://bsky.app/profile/${entry.author_handle}`} target='_blank' rel='noopener noreferrer' className='expanded-handle'>
                          @{entry.author_handle}
                        </a>
                      )}
                    </div>

                    <div className='expanded-row'>
                      <strong>Relevance:</strong>
                      <span className={`relevance-score relevance-${Math.ceil(entry.relevance / 2)}`}>{entry.relevance}/10</span>
                      {' • '}
                      <strong>Posted:</strong> {new Date(entry.posted_at).toLocaleString()}
                    </div>

                    <div className='expanded-row'>
                      <strong>Language:</strong>
                      <span className='lang-indicator'>{entry.lang?.toUpperCase() || 'N/A'}</span>
                      {' • '}
                      <strong>Category:</strong>
                      <span className={`category-badge category-${entry.primaryCategory}`}>
                        {CATEGORIES.find((cat) => cat.key === entry.primaryCategory)?.label || 'Unknown'}
                      </span>
                    </div>
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
                      {entry.uri && (
                        <button
                          className='btn btn-small'
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(convertBlueskyUri(entry.uri));
                            } catch (err) {
                              console.warn('Failed to copy link:', err);
                            }
                          }}
                        >
                          Copy Link
                        </button>
                      )}
                      {entry.uri && (
                        <a href={convertBlueskyUri(entry.uri)} target='_blank' rel='noopener noreferrer' className='btn btn-small'>
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
        {filteredEntries.length === 0 && !isLoading && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>{muted ? 'Feed muted' : 'No news available for this category'}</div>
        )}
        
        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} style={{ height: '20px', margin: '10px 0' }}>
            {isLoading && (
              <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
                Loading more...
              </div>
            )}
          </div>
        )}
        
        {!hasMore && filteredEntries.length > 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', padding: '10px' }}>
            No more posts
          </div>
        )}
      </div>
      <div className='footer'>
        <span>FEED: {category.label.toUpperCase()}</span>
        <span className='footer-status'>{muted ? 'MUTED' : 'ACTIVE'}</span>
      </div>
    </div>
  );
}
