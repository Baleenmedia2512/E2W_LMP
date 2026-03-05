# Quotations Feature

A comprehensive quotation management system for media advertisement agency providing outdoor advertising services in Chennai.

## Features

### Advertisement Mediums Supported

1. **Bus Advertisement** - MTC buses with routes across Chennai
2. **Auto Rickshaw Advertisement** - Zone-based coverage
3. **Radio Advertisement** - Major FM channels (Radio Mirchi, Suryan FM, Big FM, etc.)
4. **TV Advertisement** - Popular Tamil channels (Sun TV, Vijay TV, Zee Tamil, etc.)
5. **Newspaper Advertisement** - Leading newspapers (The Hindu, Dinamalar, Dinakaran, etc.)
6. **Van Branding** - Mobile advertising with audio/LED options
7. **Bus Shelter Advertisement** - Premium locations across Chennai
8. **Hoarding/Billboard** - Strategic locations in all zones

### Chennai Zone Coverage

- North Chennai
- South Chennai
- Central Chennai
- West Chennai
- East Chennai
- OMR Corridor
- GST Road

### Key Components

#### 1. **MediumSelector**
Visual selector for choosing advertisement medium type.

```tsx
import { MediumSelector } from '@/features/quotations';

<MediumSelector
  value={medium}
  onChange={setMedium}
/>
```

#### 2. **LocationSelector**
Dynamic location picker based on selected medium and Chennai zones.

```tsx
import { LocationSelector } from '@/features/quotations';

<LocationSelector
  medium={medium}
  value={locationId}
  onChange={(id, name) => handleLocationChange(id, name)}
/>
```

#### 3. **QuotationForm**
Complete form for creating quotations with:
- Customer information
- Multiple items with different mediums
- Dynamic pricing
- Duration and quantity management
- Discount application
- Notes and terms

```tsx
import { QuotationForm } from '@/features/quotations';

<QuotationForm
  leadId={leadId}
  leadName={leadName}
  leadEmail={leadEmail}
  leadPhone={leadPhone}
  onSave={handleSave}
  onPreview={handlePreview}
/>
```

#### 4. **QuotationPDFPreview**
Professional PDF preview with:
- Company branding
- Itemized breakdown
- Tax calculations (18% GST)
- Terms and conditions
- Download and email capabilities

```tsx
import { QuotationPDFPreview } from '@/features/quotations';

<QuotationPDFPreview
  data={quotationData}
  onDownload={handleDownload}
  onSend={handleSend}
/>
```

#### 5. **CreateQuotationButton**
Quick integration button for leads pages.

```tsx
import { CreateQuotationButton } from '@/features/quotations';

<CreateQuotationButton
  leadId={lead.id}
  leadName={lead.name}
  leadEmail={lead.email}
  leadPhone={lead.phone}
  buttonText="Create Quotation"
  colorScheme="blue"
/>
```

## Usage

### Creating a Quotation

1. Navigate to **Dashboard > Quotations**
2. Click **New Quotation** button
3. Fill in customer information
4. Select advertisement medium
5. Choose specific options and locations
6. Set duration, quantity, and pricing
7. Add multiple items as needed
8. Apply discount if applicable
9. Preview PDF
10. Save or send to customer

### From Lead Page

Use the `CreateQuotationButton` component:

```tsx
// In your lead detail page
import { CreateQuotationButton } from '@/features/quotations';

export default function LeadDetailPage({ lead }) {
  return (
    <Box>
      {/* Lead details */}
      
      <CreateQuotationButton
        leadId={lead.id}
        leadName={lead.name}
        leadEmail={lead.email}
        leadPhone={lead.phone}
      />
    </Box>
  );
}
```

## Pages

- `/dashboard/quotations` - List all quotations with filters
- `/dashboard/quotations/new` - Create new quotation
- `/dashboard/quotations/[id]` - View quotation details
- `/dashboard/quotations/[id]/edit` - Edit existing quotation

## Pricing Structure

Each medium has predefined price ranges:

- **Bus Full Wrap**: ₹25,000 - ₹45,000 per bus per month
- **Hoarding Premium**: ₹60,000 - ₹2,00,000 per month
- **Radio Prime Time**: ₹2,000 - ₹5,000 per 10-sec slot
- **TV Prime Time**: ₹15,000 - ₹1,00,000 per 10-sec slot
- And more...

## Calculations

- **Subtotal**: Sum of all items (Unit Price × Quantity × Duration)
- **Discount**: Percentage discount on subtotal
- **GST**: 18% on discounted amount
- **Total**: Subtotal - Discount + GST

## Demo Data

The feature includes realistic demo data for development and testing:
- Sample quotations with different statuses
- Chennai-based locations (100+ locations)
- MTC bus routes
- Popular radio/TV channels
- Major newspapers

## Status Workflow

1. **Draft** - Quotation being prepared
2. **Sent** - Sent to customer
3. **Accepted** - Customer accepted
4. **Rejected** - Customer declined
5. **Expired** - Validity period ended

## Future Enhancements

- PDF generation using jsPDF or react-pdf
- Email integration with templates
- WhatsApp integration for sharing
- Quotation approval workflow
- Conversion tracking (quotation to order)
- Payment integration
- Customer portal for quotation review

## Notes

**This is a UI-only demo implementation.** 

Features marked as "demo":
- PDF preview (visual only, no actual PDF generation)
- Email sending (shows success toast, no actual email)
- Data persistence (uses local state, no backend API)

To make it production-ready:
1. Add API routes for CRUD operations
2. Integrate with database (Prisma schema)
3. Implement PDF generation library
4. Add email service integration
5. Add authentication and permissions
6. Implement file storage for PDFs
7. Add quotation numbering system
8. Implement audit logs
