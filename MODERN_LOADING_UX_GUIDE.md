# Modern Loading UX Implementation Guide

## Overview

This document describes the modern loading patterns implemented in the E2W Lead Management System to provide a smooth, responsive user experience without blocking the UI during data operations.

## Key Improvements

### 1. **SWR-Based Data Fetching**

We've replaced manual `fetch` calls with [SWR (stale-while-revalidate)](https://swr.vercel.app/), a React hook library for data fetching that provides:

- **Automatic caching** - Data is cached and reused across components
- **Background revalidation** - Data updates in the background without blocking UI
- **Deduplication** - Multiple requests to the same endpoint are deduplicated
- **Stale content while loading** - Shows previous data while fetching new data

#### Usage Example

```tsx
import { useLeadsAndFollowUps } from '@/shared/hooks/useLeadsData';

function MyComponent() {
  const {
    leads,
    followUps,
    isLoading,      // Initial load only
    isValidating,   // Background refresh (doesn't block UI)
    error,
    refreshAll,     // Manual refresh function
  } = useLeadsAndFollowUps({
    assignedToMe: false,
    limit: 2000,
    refreshInterval: 0, // Auto-refresh interval (0 = manual only)
  });

  // Initial loading state - show skeleton
  if (isLoading && leads.length === 0) {
    return <LeadCardGridSkeleton count={9} />;
  }

  // Content is shown immediately, even during background refresh
  return (
    <>
      {isValidating && <RefreshIndicator />}
      {/* Your content here */}
    </>
  );
}
```

### 2. **Skeleton Loaders**

Instead of blocking the entire page with "Loading...", we show skeleton loaders that:

- Match the layout of the actual content
- Provide visual feedback about what's loading
- Keep the UI structure stable
- Only show during **initial load**, not background refreshes

#### Available Skeleton Components

Located in `@/shared/components/SkeletonLoaders.tsx`:

- `<LeadCardSkeleton />` - Single lead card placeholder
- `<LeadCardGridSkeleton count={9} />` - Grid of lead cards
- `<TableRowSkeleton />` - Table row placeholders
- `<SectionHeaderSkeleton />` - Section header with count badge
- `<DashboardStatSkeleton />` - Dashboard statistics card
- `<FilterBarSkeleton />` - Filter controls placeholder
- `<InlineLoadingSkeleton />` - Minimal inline loader

#### Usage Pattern

```tsx
{/* Show skeleton only on initial load */}
{isLoading && data.length === 0 && (
  <LeadCardGridSkeleton count={9} />
)}

{/* Show content once data is available (even while refreshing) */}
{(!isLoading || data.length > 0) && (
  <YourContent data={data} />
)}
```

### 3. **React Transitions for Filter Updates**

Using React's `useTransition` hook to keep UI responsive during filter operations:

```tsx
const [isPending, startTransition] = useTransition();

const handleFilter = (query: string) => {
  startTransition(() => {
    // This update is marked as non-urgent
    // UI stays responsive during processing
    setFilterQuery(query);
  });
};

return (
  <>
    {/* Visual indicator during transition */}
    {isPending && <Progress size="xs" isIndeterminate />}
    
    <FilterInput onChange={handleFilter} />
  </>
);
```

### 4. **Component-Level Loading States**

Loading indicators are now scoped to specific components:

- **Page-level**: Progress bar at the top during transitions
- **Component-level**: Skeleton loaders for initial data fetch
- **Background updates**: Subtle "Updating..." badge (fixed position, non-intrusive)

No more full-page blocking spinners!

## Implementation Checklist

When adding a new data-fetching component:

- [ ] Use SWR hooks instead of manual `fetch` calls
- [ ] Implement skeleton loaders for initial load state
- [ ] Show content immediately once data is available
- [ ] Keep showing content during background revalidation
- [ ] Add optional refresh indicator for background updates
- [ ] Use `useTransition` for filter/search interactions

## File Structure

```
src/
├── shared/
│   ├── components/
│   │   └── SkeletonLoaders.tsx       # Reusable skeleton components
│   └── hooks/
│       └── useLeadsData.ts            # SWR-based data fetching hooks
├── styles/
│   └── animations.css                 # Smooth animations (imported in layout)
└── features/
    └── leads/
        └── components/
            └── LeadsTabContent.tsx    # Example implementation
```

## Best Practices

### ✅ DO

- Use skeleton loaders for initial load (`isLoading && data.length === 0`)
- Keep previous data visible during background refresh
- Use subtle indicators for background operations
- Leverage SWR's built-in caching and deduplication
- Use `useTransition` for non-urgent state updates (filters, search)

### ❌ DON'T

- Don't hide content during background revalidation
- Don't use full-page spinners for data fetching
- Don't make multiple sequential API calls (use SWR's deduplication)
- Don't block UI for filter/search operations
- Don't show "Loading..." text without visual structure

## Performance Considerations

### SWR Configuration

```tsx
{
  refreshInterval: 0,           // Disable auto-refresh unless needed
  revalidateOnFocus: false,    // Reduce unnecessary requests
  revalidateOnReconnect: true, // Refresh on network reconnect
  dedupingInterval: 5000,      // Dedupe requests within 5s
  keepPreviousData: true,      // Show stale data while loading
}
```

## Visual Indicators

### 1. Initial Load (Blocking)
```
┌─────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  Skeleton loader
│ ▓▓▓▓▓  ▓▓▓▓▓▓  ▓▓▓▓▓▓ │  (matches content layout)
└─────────────────────────┘
```

### 2. Background Refresh (Non-blocking)
```
┌─────────────────────────┐
│ ● Updating...           │  Subtle fixed indicator
└─────────────────────────┘
┌─────────────────────────┐
│ Lead Name: John Doe     │  Content remains visible
│ Phone: 555-1234         │  and interactive
│ [Call] [WhatsApp]       │
└─────────────────────────┘
```

### 3. Filter Transition (Non-blocking)
```
━━━━━━━━━━━━━━━━━━━━━━━  Thin progress bar at top
┌─────────────────────────┐
│ [Filter: New] [Search]  │  Filters remain interactive
└─────────────────────────┘
```

## Testing the Implementation

1. **Initial load**: Should show skeleton loaders briefly
2. **Filter changes**: Should show progress bar at top, content stays visible
3. **Background refresh**: Should show "Updating..." badge, content remains interactive
4. **Network slow**: Previous data should remain visible, not blank screen
5. **Rapid filtering**: Should not trigger multiple API calls (deduplication works)

## Migration Guide

### Before (❌ Old Pattern)
```tsx
const [loading, setLoading] = useState(true);
const [data, setData] = useState([]);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);  // Blocks entire UI
    const res = await fetch('/api/leads');
    const json = await res.json();
    setData(json.data);
    setLoading(false);
  };
  fetchData();
}, []);

if (loading) return <Text>Loading...</Text>;  // Blocks everything
return <Content data={data} />;
```

### After (✅ New Pattern)
```tsx
const { leads, isLoading, isValidating } = useLeadsData();

// Initial load - show skeleton
if (isLoading && leads.length === 0) {
  return <LeadCardGridSkeleton count={9} />;
}

// Show content once available (even during background refresh)
return (
  <>
    {isValidating && <RefreshIndicator />}
    <Content data={leads} />
  </>
);
```

## Troubleshooting

### Issue: Data not updating after mutation

**Solution**: Use SWR's `mutate` function:
```tsx
const { leads, mutate } = useLeadsData();

const handleUpdate = async () => {
  await updateLeadAPI(leadId, data);
  mutate(); // Refresh data from API
};
```

### Issue: Too many API calls

**Solution**: Check SWR's `dedupingInterval`:
```tsx
const { leads } = useLeadsData({
  dedupingInterval: 5000, // Dedupe within 5 seconds
});
```

### Issue: Skeleton loader flashes too quickly

**Solution**: Add minimum display time or rely on network conditions (SWR handles this)

## References

- [SWR Documentation](https://swr.vercel.app/)
- [React useTransition](https://react.dev/reference/react/useTransition)
- [Chakra UI Skeleton](https://chakra-ui.com/docs/components/skeleton)
- [Next.js App Router Loading UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

## Support

For questions or issues with loading patterns, check:
1. This documentation
2. Example implementation in `LeadsTabContent.tsx`
3. SWR hook implementation in `useLeadsData.ts`
4. Skeleton components in `SkeletonLoaders.tsx`
