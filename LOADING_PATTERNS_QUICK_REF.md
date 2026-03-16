# Quick Reference: Loading Patterns

## Standard Loading Pattern Template

```tsx
import { useLeadsAndFollowUps } from '@/shared/hooks/useLeadsData';
import { LeadCardGridSkeleton } from '@/shared/components/SkeletonLoaders';

function MyComponent() {
  // 1. Use SWR hook for data fetching
  const {
    leads,
    isLoading,      // true only on initial load
    isValidating,   // true during background refresh
    refreshAll,
  } = useLeadsAndFollowUps();

  // 2. Show skeleton on initial load ONLY
  if (isLoading && leads.length === 0) {
    return <LeadCardGridSkeleton count={9} />;
  }

  // 3. Show content (even during background refresh)
  return (
    <>
      {/* Optional: subtle background refresh indicator */}
      {isValidating && leads.length > 0 && (
        <Box position="fixed" top={4} right={4} bg="blue.50" p={2} borderRadius="md">
          <Icon as={HiRefresh} className="spin-animation" />
          <Text fontSize="sm">Updating...</Text>
        </Box>
      )}

      {/* Your content - always visible after initial load */}
      <YourContent data={leads} />
    </>
  );
}
```

## Filter/Search Pattern

```tsx
import { useTransition } from 'react';

function MyComponent() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    startTransition(() => {
      setQuery(value);  // Non-blocking update
    });
  };

  return (
    <>
      {/* Show progress indicator during transition */}
      {isPending && (
        <Progress size="xs" isIndeterminate colorScheme="blue" />
      )}
      
      <SearchInput onChange={handleSearch} />
      <FilteredResults query={query} />
    </>
  );
}
```

## Available Skeleton Loaders

```tsx
import {
  LeadCardSkeleton,           // Single card
  LeadCardGridSkeleton,       // Grid of cards
  TableRowSkeleton,           // Table rows
  SectionHeaderSkeleton,      // Headers with badges
  DashboardStatSkeleton,      // Stat cards
  FilterBarSkeleton,          // Filter controls
  InlineLoadingSkeleton,      // Minimal inline
} from '@/shared/components/SkeletonLoaders';

// Usage
<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
  <LeadCardGridSkeleton count={9} />
</SimpleGrid>
```

## Custom Hooks Available

```tsx
// Leads only
const { leads, isLoading, refresh } = useLeadsData({
  assignedToMe: false,
  limit: 2000,
});

// Follow-ups only
const { followUps, isLoading, refresh } = useFollowUpsData();

// Both combined
const {
  leads,
  followUps,
  isLoading,
  isValidating,
  refreshAll,
} = useLeadsAndFollowUps();
```

## Decision Tree

```
Is this a page load or component mount?
├─ YES: Show skeleton loader
│   └─ <LeadCardGridSkeleton count={9} />
│
└─ NO: Is this a filter/search interaction?
    ├─ YES: Use useTransition + Progress bar
    │   └─ startTransition(() => setFilter(value))
    │
    └─ NO: Is this a background refresh?
        └─ YES: Show subtle indicator
            └─ {isValidating && <RefreshBadge />}
```

## Common Mistakes to Avoid

❌ **DON'T** hide content during background refresh
```tsx
// Wrong!
{isLoading && <Spinner />}
{!isLoading && <Content />}
```

✅ **DO** keep content visible
```tsx
// Correct!
{isLoading && data.length === 0 && <Skeleton />}
{(!isLoading || data.length > 0) && <Content />}
```

❌ **DON'T** use full-page blocking spinners
```tsx
// Wrong!
if (loading) return <Center h="100vh"><Spinner /></Center>;
```

✅ **DO** use component-scoped skeletons
```tsx
// Correct!
if (isLoading && data.length === 0) {
  return <LeadCardGridSkeleton />;
}
```

## Animation Classes

Available in `@/styles/animations.css`:

- `.spin-animation` - Rotating spin (for refresh icons)
- `.fade-in` - Fade in effect
- `.skeleton-pulse` - Pulsing skeleton effect
- `.slide-in-top` - Slide in from top
- `.slide-in-bottom` - Slide in from bottom

Usage:
```tsx
<Icon as={HiRefresh} className="spin-animation" />
```

## When to Use Each Pattern

| Scenario | Pattern | Component |
|----------|---------|-----------|
| Page initial load | Skeleton | `<LeadCardGridSkeleton />` |
| Background refresh | Subtle badge | `isValidating && <Badge>` |
| Filter/Search | Progress bar | `isPending && <Progress />` |
| Button action | Loading state | `<Button isLoading>` |
| Inline update | Spinner | `<Spinner size="sm" />` |

## Performance Tips

1. **Disable unnecessary revalidation**
   ```tsx
   revalidateOnFocus: false,  // Don't refetch on window focus
   ```

2. **Set appropriate deduping interval**
   ```tsx
   dedupingInterval: 5000,  // Dedupe requests within 5s
   ```

3. **Use keepPreviousData**
   ```tsx
   keepPreviousData: true,  // Show stale data while loading
   ```

4. **Limit auto-refresh**
   ```tsx
   refreshInterval: 0,  // Manual refresh only
   ```

## Need Help?

1. Check examples in `LeadsTabContent.tsx`
2. Read full guide: `MODERN_LOADING_UX_GUIDE.md`
3. Review hook implementation: `useLeadsData.ts`
