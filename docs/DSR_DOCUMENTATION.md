# DSR (Daily Sales Report) - Component Documentation

## Overview
The DSR page is a comprehensive dashboard for tracking daily sales metrics with interactive, clickable KPI cards using a custom color theme.

## Custom Color Theme
```typescript
{
  primary: '#9c5342',  // Rustic Red
  dark: '#0b1316',     // Deep Black
  light: '#b4a097',    // Warm Taupe
  medium: '#7a5f58',   // Brown
  accent: '#8c9b96'    // Sage Green
}
```

## Components

### 1. DSRCard Component (`components/DSRCard.tsx`)

**Purpose**: Reusable, clickable card component for displaying KPI metrics.

**Props**:
```typescript
interface DSRCardProps {
  label: string;           // Card title/label
  value: number | string;  // Main stat value
  total?: number;          // Optional total (shows as "value / total")
  helpText?: string;       // Optional help text below value
  icon?: IconType;         // Optional icon from react-icons
  colorScheme: string;     // Color scheme: 'primary' | 'dark' | 'light' | 'medium' | 'accent'
  type: string;            // Unique identifier for click handling
  onClick: (type: string) => void;  // Click handler callback
  isActive?: boolean;      // Active state for visual feedback
}
```

**Features**:
- ✅ Fully clickable with hover effects
- ✅ Smooth animations (translateY on hover)
- ✅ Active state styling
- ✅ Custom color scheme support
- ✅ Icon support
- ✅ Ratio display (value / total)
- ✅ Help text support
- ✅ Follows Chakra UI Card > Stat structure

**Usage Example**:
```tsx
<DSRCard
  label="New Leads Handled"
  value={15}
  total={45}
  helpText="Within selected date range"
  icon={HiUserAdd}
  colorScheme="primary"
  type="newLeads"
  onClick={handleCardClick}
  isActive={activeCard === 'newLeads'}
/>
```

### 2. DSR Page Component (`app/dashboard/dsr/page.tsx`)

**Features**:

#### Filters
- **Start Date**: Date picker with validation
- **End Date**: Date picker (cannot be before start date)
- **Dropdown**: Options include ABC, EFG, HIGK, and agent names
- **Apply/Reset Buttons**: Control filter application

#### KPI Cards (Clickable)
1. **New Leads Handled** (Primary color - #9c5342)
   - Shows: New leads today / Total leads
   - Filters: Leads created within date range
   - Click: Shows only new leads in table

2. **Follow-ups Handled** (Medium color - #7a5f58)
   - Shows: Follow-ups today / Total follow-ups
   - Filters: Pending follow-ups within date range
   - Click: Shows only leads with follow-ups in table

3. **Total Calls Made** (Accent color - #8c9b96)
   - Shows: Total calls today
   - Help: Displays completed calls count
   - Click: Shows only leads with calls in table

4. **Completed Calls** (Dark color - #0b1316)
   - Shows: Successfully completed calls
   - Click: Shows leads with completed calls in table

#### Interactive Behavior

**Card Click Logic**:
```typescript
const handleCardClick = (type: string) => {
  // Toggle active state
  setActiveCard(activeCard === type ? null : type);
  
  // Show toast notification
  toast({
    title: `${cardLabels[type]} Card Selected`,
    description: `Viewing details for ${cardLabels[type].toLowerCase()}`,
    status: 'info',
  });
};
```

**Table Filtering**:
- When no card is active: Shows all filtered leads
- When a card is clicked: Filters table to show only relevant leads
- Click again to reset and show all leads

#### Data Filtering Logic

**Stats Calculation** (Auto-updates on filter change):
```typescript
// 1. New Leads Handled Today
newLeadsHandledToday = leads where createdAt within [startDate, endDate]

// 2. Total New Leads
totalNewLeads = all leads for selected option (ignoring date)

// 3. Follow-ups Handled Today
followUpsHandledToday = follow-ups where:
  - scheduledFor within [startDate, endDate]
  - status === 'pending'
  - lead belongs to selected option

// 4. Total Calls
callsHandledToday = calls where:
  - createdAt within [startDate, endDate]
  - lead belongs to selected option

// 5. Completed Calls
completedCallsToday = calls where:
  - createdAt within [startDate, endDate]
  - status === 'completed'
  - lead belongs to selected option
```

## UI/UX Features

### Hover Effects
- **Cards**: Lift up 4px on hover with enhanced shadow
- **Border**: Grows from 4px to 6px on hover
- **Cursor**: Pointer to indicate clickability
- **Smooth Transitions**: All animations use 0.3s ease

### Active State
- **Background**: Light tint of card's color scheme
- **Shadow**: Enhanced (xl vs md)
- **Visual Feedback**: Clear indication of selected card

### Responsive Design
```typescript
columns={{ base: 1, md: 2, lg: 4 }}
```
- Mobile: 1 column (stacked)
- Tablet: 2 columns
- Desktop: 4 columns (all cards in one row)

### Color Application
- **Filter Section**: Primary color (#9c5342) border and accents
- **Buttons**: Primary background with medium hover state
- **Table Header**: Gradient from light to accent colors
- **Badges**: Color-coded by status with custom theme colors
- **Typography**: Dark color (#0b1316) for headings

## Data Flow

```
1. User selects filters (dates, option)
   ↓
2. Clicks "Apply Filters"
   ↓
3. Stats recalculate (useMemo)
   ↓
4. Cards update with new values
   ↓
5. Table filters to show relevant leads
   ↓
6. User clicks a KPI card
   ↓
7. Table filters further to show only that metric's leads
   ↓
8. User clicks card again to reset
```

## Adding New KPI Cards

To add a new clickable KPI card:

```tsx
// 1. Add to stats calculation
const stats = useMemo(() => {
  // ... existing calculations ...
  
  const yourNewMetric = // your calculation logic
  
  return {
    // ... existing stats ...
    yourNewMetric,
  };
}, [dependencies]);

// 2. Add DSRCard component
<DSRCard
  label="Your New Metric"
  value={stats.yourNewMetric}
  total={optionalTotal}
  helpText="Description of metric"
  icon={YourIcon}
  colorScheme="primary" // or any theme color
  type="yourMetric"
  onClick={handleCardClick}
  isActive={activeCard === 'yourMetric'}
/>

// 3. Add filtering logic in filteredLeads useMemo
if (activeCard === 'yourMetric') {
  filtered = filtered.filter(lead => {
    // your filtering logic
  });
}

// 4. Add to cardLabels object in handleCardClick
const cardLabels: Record<string, string> = {
  // ... existing labels ...
  yourMetric: 'Your New Metric',
};
```

## Mock Data Structure

The DSR page uses the following mock data:
- `mockLeads`: Lead records with assignedTo, createdAt, status
- `mockCallLogs`: Call history with leadId, createdAt, status
- `mockFollowUps`: Follow-up schedules with leadId, scheduledFor, status

## State Management

```typescript
// Filter state (applied)
const [startDate, setStartDate] = useState(todayString);
const [endDate, setEndDate] = useState(todayString);
const [selectedOption, setSelectedOption] = useState('all');

// Temporary state (before Apply is clicked)
const [tempStartDate, setTempStartDate] = useState(todayString);
const [tempEndDate, setTempEndDate] = useState(todayString);
const [tempSelectedOption, setTempSelectedOption] = useState('all');

// UI state
const [isFiltered, setIsFiltered] = useState(false);
const [activeCard, setActiveCard] = useState<string | null>(null);
```

## Performance Optimization

- **useMemo**: Stats and filtered leads recalculate only when dependencies change
- **Date caching**: Date objects created once per calculation
- **Efficient filtering**: Array operations optimized for performance
- **Component memoization**: DSRCard could be wrapped in React.memo if needed

## Accessibility

- Semantic HTML with proper button roles
- Keyboard navigation support (cards are buttons)
- Screen reader friendly labels
- Color contrast meets WCAG standards
- Toast notifications for visual feedback

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive on all screen sizes
- Touch-friendly on mobile devices
- Smooth animations (CSS transitions supported)

---

**Built with**: Next.js 14, React 18, Chakra UI, TypeScript
**Color Palette**: #9c5342, #0b1316, #b4a097, #7a5f58, #8c9b96
