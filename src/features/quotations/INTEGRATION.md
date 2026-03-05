# Integration Guide: Adding Quotations to Lead Pages

## Quick Integration Example

### In Lead Detail Page

Add the quotation button to your lead detail page:

```tsx
// src/app/dashboard/leads/[id]/page.tsx

import { CreateQuotationButton } from '@/features/quotations';

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  // ... your existing code to fetch lead data
  
  return (
    <Container>
      {/* Existing lead details */}
      
      {/* Add Quotation Section */}
      <Card mt={4}>
        <CardHeader>
          <Heading size="md">Quotations</Heading>
        </CardHeader>
        <CardBody>
          <CreateQuotationButton
            leadId={lead.id}
            leadName={lead.full_name}
            leadEmail={lead.email}
            leadPhone={lead.phone}
            buttonText="Create Advertisement Quotation"
            buttonSize="md"
            colorScheme="blue"
          />
          
          {/* You can also display existing quotations here */}
        </CardBody>
      </Card>
    </Container>
  );
}
```

### In Lead List Page (Actions Menu)

Add as an action in the lead list:

```tsx
// src/app/dashboard/leads/page.tsx

import { CreateQuotationButton } from '@/features/quotations';

// Inside your table row actions
<Menu>
  <MenuButton as={IconButton} icon={<MoreVertical />} />
  <MenuList>
    <MenuItem onClick={() => viewLead(lead.id)}>View Details</MenuItem>
    <MenuItem onClick={() => callLead(lead.id)}>Make Call</MenuItem>
    
    {/* Add Quotation Option */}
    <Box px={3} py={2}>
      <CreateQuotationButton
        leadId={lead.id}
        leadName={lead.full_name}
        leadEmail={lead.email}
        leadPhone={lead.phone}
        buttonText="Create Quotation"
        buttonSize="sm"
        variant="ghost"
        colorScheme="blue"
      />
    </Box>
  </MenuList>
</Menu>
```

### In Quick Actions Menu

If you have a quick actions component:

```tsx
// src/shared/components/QuickActionsMenu.tsx

import { CreateQuotationButton } from '@/features/quotations';

export const QuickActionsMenu = ({ lead }: { lead: Lead }) => {
  return (
    <HStack spacing={2}>
      <Button onClick={handleCall}>Call</Button>
      <Button onClick={handleEmail}>Email</Button>
      
      <CreateQuotationButton
        leadId={lead.id}
        leadName={lead.full_name}
        leadEmail={lead.email}
        leadPhone={lead.phone}
        buttonSize="sm"
        variant="outline"
      />
    </HStack>
  );
};
```

## Component Props

```typescript
interface CreateQuotationButtonProps {
  leadId?: string;           // Optional lead ID to link quotation
  leadName?: string;         // Pre-fill customer name
  leadEmail?: string;        // Pre-fill customer email
  leadPhone?: string;        // Pre-fill customer phone
  buttonText?: string;       // Custom button text (default: "Create Quotation")
  buttonSize?: 'sm' | 'md' | 'lg';  // Button size (default: 'md')
  variant?: 'solid' | 'outline' | 'ghost';  // Button variant (default: 'solid')
  colorScheme?: string;      // Chakra UI color scheme (default: 'blue')
}
```

## Advanced Usage

### With Custom Callback

```tsx
import { useState } from 'react';
import { QuotationForm, QuotationPDFPreview } from '@/features/quotations';

export default function CustomQuotationPage() {
  const [quotationData, setQuotationData] = useState(null);
  
  const handleSave = async (data) => {
    // Save to your backend
    const response = await fetch('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const savedQuotation = await response.json();
    
    // Navigate or show success
    router.push(`/dashboard/quotations/${savedQuotation.id}`);
  };
  
  return (
    <QuotationForm
      leadId={leadId}
      leadName={leadName}
      leadEmail={leadEmail}
      leadPhone={leadPhone}
      onSave={handleSave}
      onPreview={setQuotationData}
    />
  );
}
```

## Navigation

The quotation feature adds these routes to your app:

- `/dashboard/quotations` - List all quotations
- `/dashboard/quotations/new` - Create new quotation
- `/dashboard/quotations/[id]` - View quotation
- `/dashboard/quotations/[id]/edit` - Edit quotation

## Sidebar Integration

Already integrated! The "Quotations" menu item has been added to your sidebar navigation.

## Backend Integration (TODO)

For production, you'll need to:

1. **Create API Routes**:
   - `POST /api/quotations` - Create quotation
   - `GET /api/quotations` - List quotations
   - `GET /api/quotations/[id]` - Get quotation
   - `PUT /api/quotations/[id]` - Update quotation
   - `DELETE /api/quotations/[id]` - Delete quotation
   - `POST /api/quotations/[id]/send` - Send quotation email

2. **Add Prisma Schema**:
   ```prisma
   model Quotation {
     id              String   @id @default(cuid())
     quotationNumber String   @unique
     leadId          String?
     lead            Lead?    @relation(fields: [leadId], references: [id])
     customerName    String
     customerEmail   String
     customerPhone   String
     customerCompany String?
     status          String   @default("draft")
     items           Json
     subtotal        Float
     discount        Float    @default(0)
     tax             Float
     total           Float
     notes           String?
     validUntil      DateTime
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
     createdBy       String
     user            User     @relation(fields: [createdBy], references: [id])
   }
   ```

3. **Implement PDF Generation**:
   ```bash
   npm install jspdf html2canvas
   ```

4. **Add Email Service**:
   ```bash
   npm install nodemailer
   ```

## Support

For questions or issues with the quotations feature, refer to:
- [README.md](./README.md) - Feature documentation
- Component source files in `src/features/quotations/`
