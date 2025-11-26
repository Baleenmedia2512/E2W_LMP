# E2W Lead Management System - Frontend Only

A fully functional UI-only lead management system built with Next.js and Chakra UI. This version has **no backend, no database, and no authentication** - perfect for demonstrations, prototyping, or UI testing.

## 🎨 Custom Theme Colors

The application uses a carefully crafted color palette:

- **Primary Brand**: `#9c5342` - Warm terracotta
- **Dark**: `#0b1316` - Deep charcoal
- **Neutral**: `#b4a097` - Soft taupe
- **Warm**: `#7a5f58` - Rich brown
- **Cool**: `#8c9b96` - Sage green

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
├── app/                    # Next.js 14 App Router pages
│   ├── dashboard/          # Dashboard pages
│   │   ├── leads/          # Lead management
│   │   ├── calls/          # Call logs
│   │   ├── followups/      # Follow-up scheduling
│   │   ├── reports/        # Reports and analytics
│   │   └── settings/       # Settings pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects to dashboard)
│   └── providers.tsx       # Chakra UI provider
├── components/             # Reusable UI components
│   ├── layout/             # Layout components (Header, Sidebar)
│   └── *.tsx               # Feature components
├── lib/                    # Utilities and configurations
│   ├── mock-data.ts        # Mock data for UI
│   ├── theme.ts            # Chakra UI custom theme
│   ├── validations.ts      # Form validation schemas
│   └── hooks/              # Custom React hooks
├── types/                  # TypeScript type definitions
└── public/                 # Static assets
```

## ✨ Features

### Dashboard
- Overview statistics and metrics
- Recent leads display
- Upcoming follow-ups
- Quick actions

### Lead Management
- **Table & Tile Views**: Switch between different viewing modes
- **Filtering**: Filter by status, source, and date
- **Search**: Real-time search across lead data
- **Statuses**: New, Contacted, Qualified, Unqualified, Unreachable, Won, Lost

### Call Logging
- Track call attempts and duration
- Call status (completed, missed, voicemail)
- Notes and follow-up actions

### Follow-ups
- Schedule follow-up tasks
- Priority levels (low, medium, high)
- Calendar view of upcoming tasks

### Reports & Analytics
- Lead conversion metrics
- Source-based analytics
- Agent performance statistics
- Visual data representation

### Notifications
- Real-time notification bell
- Unread count badge
- Notification history

## 🎯 Mock Data

All data is stored in `/lib/mock-data.ts` and includes:

- **8 Sample Leads** with varying statuses
- **5 Call Logs** with different outcomes
- **5 Follow-ups** with priority levels
- **3 Notifications** (2 unread)
- **4 Users** with different roles
- **Dashboard Statistics**
- **Report Data**

### Customizing Mock Data

Edit `/lib/mock-data.ts` to add, modify, or remove data:

```typescript
export const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'Your Lead Name',
    email: 'email@example.com',
    phone: '+1234567890',
    status: 'new',
    source: 'Website',
    company: 'Company Name',
    // ... more fields
  },
  // Add more leads
];
```

## 🎨 Chakra UI Theme

The custom theme is defined in `/lib/theme.ts` with:

- **Custom Color Palettes**: Brand, dark, neutral, warm, and cool colors
- **Component Variants**: Customized Button, Input, Select, Badge, Table
- **Responsive Breakpoints**: Mobile-first responsive design
- **Typography**: Inter font family
- **Shadows and Effects**: Consistent visual language

### Using Theme Colors

```tsx
import { Box } from '@chakra-ui/react';

<Box bg="brand.500" color="white">
  Primary brand color
</Box>

<Box bg="neutral.500">
  Neutral background
</Box>
```

## 📱 Responsive Design

The application is fully responsive with breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: Chakra UI 2.8
- **Language**: TypeScript
- **Styling**: Emotion (via Chakra UI)
- **Icons**: React Icons (Feather Icons)
- **Date Handling**: date-fns
- **Form Validation**: Zod

## 📝 Component Examples

### Adding a New Page

Create a new page in `app/dashboard/yourpage/page.tsx`:

```tsx
'use client';

import { Box, Heading } from '@chakra-ui/react';

export default function YourPage() {
  return (
    <Box>
      <Heading size="lg" mb={6}>
        Your Page Title
      </Heading>
      {/* Your content */}
    </Box>
  );
}
```

### Creating a Form

```tsx
import { Button, Input, VStack } from '@chakra-ui/react';
import { useState } from 'react';

export default function MyForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  const handleSubmit = () => {
    // Simulate success
    console.log('Form submitted:', formData);
    // Show success message
  };

  return (
    <VStack as="form" spacing={4}>
      <Input
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <Input
        placeholder="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <Button onClick={handleSubmit} colorScheme="brand">
        Submit
      </Button>
    </VStack>
  );
}
```

## 🚫 What's NOT Included

This is a **frontend-only** version. The following are removed:

- ❌ No backend API routes
- ❌ No database (MySQL, Prisma, Drizzle)
- ❌ No authentication (Google OAuth, NextAuth)
- ❌ No server-side functions
- ❌ No data persistence (changes are not saved)
- ❌ No real API calls

All "actions" (create, update, delete) simulate success but don't persist data. Perfect for:

- UI/UX demonstrations
- Design reviews
- Prototyping
- Frontend development practice
- Component testing

## 📦 Dependencies

```json
{
  "@chakra-ui/react": "^2.8.2",
  "@chakra-ui/next-js": "^2.2.0",
  "@emotion/react": "^11.11.4",
  "@emotion/styled": "^11.11.5",
  "date-fns": "^3.6.0",
  "framer-motion": "^11.2.12",
  "next": "^14.2.5",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-icons": "^5.2.1",
  "zod": "^3.23.8"
}
```

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Chakra UI Documentation](https://chakra-ui.com/docs)
- [React Icons](https://react-icons.github.io/react-icons/)
- [date-fns](https://date-fns.org/)

## 📄 License

This project is for demonstration purposes.

## 🤝 Contributing

Since this is a UI-only demo version, contributions should focus on:

- UI/UX improvements
- Additional mock data scenarios
- New component variants
- Accessibility enhancements
- Responsive design improvements

---

**Built with ❤️ using Next.js and Chakra UI**
