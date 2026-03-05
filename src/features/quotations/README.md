# Quotations Feature

A comprehensive quotation management system for media advertisement agency providing outdoor advertising services in Chennai.

## 🚀 Recent Enhancements

### ✨ What's New

1. **🗞️ Comprehensive Newspaper Advertising**
   - 30+ advertisement options covering all newspaper ad types
   - Chennai-based newspapers (Tamil & English)
   - Front Page, Display, Line Ads, Classified Display
   - Category targeting (Sports, Business, Jobs, Matrimonial, etc.)
   - Dedicated NewspaperSelector component

2. **📏 Dimensions & Specifications** _(NEW!)_
   - **Precise dimensions** for all display ads (height × width in cm)
   - **Standard newspaper sizes**: Full Page (25×38cm), Half Page, Quarter Page, etc.
   - **Size specifications** for outdoor ads (bus, hoarding, shelter)
   - **Area calculations** in square cm/ft
   - **Visual display** of dimensions in forms and PDFs
   - **Color options**: Color, B&W, or Both
   - **Position tracking**: Front Page, Back Page, Sports Section, etc.
   - **Duration specs** for radio/TV (10 seconds, 30 seconds)

3. **🎨 World-Class PDF Design**
   - Premium gradient header design
   - Modern card-based layout with professional colors
   - Enhanced visual hierarchy with badges and icons
   - Gradient pricing summary card
   - Professional signature section
   - **Dimensions displayed** in item descriptions

4. **✅ Robust Form Validation**
   - Real-time email and phone validation
   - Visual validation feedback
   - Error handling with detailed messages
   - Loading states for async operations
   - Enhanced UX with tooltips and helpers
   - **Dimension badges** shown when selecting options

---

## Features

### Advertisement Mediums Supported

1. **Bus Advertisement** - MTC buses with routes across Chennai
2. **Auto Rickshaw Advertisement** - Zone-based coverage
3. **Radio Advertisement** - Major FM channels (Radio Mirchi, Suryan FM, Big FM, etc.)
4. **TV Advertisement** - Popular Tamil channels (Sun TV, Vijay TV, Zee Tamil, etc.)
5. **Newspaper Advertisement** - **ENHANCED!** Leading Chennai newspapers with comprehensive options
6. **Van Branding** - Mobile advertising with audio/LED options
7. **Bus Shelter Advertisement** - Premium locations across Chennai
8. **Hoarding/Billboard** - Strategic locations in all zones

### 🆕 Enhanced Newspaper Advertising (Chennai-Based)

#### **Language Support**
- **Tamil Newspapers**: Dinamalar, Dinakaran, Daily Thanthi, Dinamani, Tamil Murasu, Malai Malar, and more
- **English Newspapers**: The Hindu, Times of India, New Indian Express, Deccan Chronicle, Hindu Business Line

#### **Advertisement Types**

**Front Page Ads**
- Full Page Front Page
- Half Page Front Page
- Front Page Strip/Ear Panel
- Front Page Solus (Quarter Page)

**Display Ads (Inside Pages)**
- Full Page, Half Page, Quarter Page, 1/8th Page
- Category-specific: Sports, Political/News, Business, Entertainment sections

**Line Ads (Classified Text)**
- Job Vacancy/Recruitment
- Matrimonial
- Real Estate
- General Classified
- Obituary/Remembrance

**Classified Display (Enhanced with Borders/Images)**
- Job Vacancy with Company Logo
- Matrimonial with Photo
- Real Estate with Images
- Education/Admission
- General Enhanced Classified

**Special Positions**
- Back Page (Full/Half)
- Newspaper Jacket/Wrap
- Newspaper Insert/Supplement
- Bookmark Advertisement

#### **Category Targeting**
- Front Page
- Sports Section
- Political/News Section
- Business Section
- Entertainment Section
- Classified Section
- Matrimonial Section
- Job Vacancy/Recruitment
- Real Estate Section
- Education Section
- General/Inside Pages

---

## 📐 Dimensions & Specifications System

All advertisement options now include **precise dimensions and specifications** for accurate pricing calculations.

### Standard Newspaper Dimensions (NEWSPAPER_AD_DIMENSIONS)

```typescript
{
  fullPage:        { width: 25,  height: 38, unit: 'cm', displayText: '25cm × 38cm' },
  halfPage:        { width: 25,  height: 19, unit: 'cm', displayText: '25cm × 19cm' },
  quarterPage:     { width: 12.5, height: 19, unit: 'cm', displayText: '12.5cm × 19cm' },
  eighthPage:      { width: 12.5, height: 9.5, unit: 'cm', displayText: '12.5cm × 9.5cm' },
  stripAd:         { width: 25,  height: 5, unit: 'cm', displayText: '25cm × 5cm' },
  jacketCover:     { width: 48,  height: 63, unit: 'cm', displayText: '48cm × 63cm' },
  insert:          { width: 24,  height: 36, unit: 'cm', displayText: '24cm × 36cm' },
  bookmarkInsert:  { width: 4,   height: 21, unit: 'cm', displayText: '4cm × 21cm' },
  classifiedDisplay: { width: 8, height: 12, unit: 'cm', displayText: '8cm × 12cm' }
}
```

### Specification Types

Each advertisement option can include:

- **dimensions**: Width × Height (for newspaper, print ads)
- **size**: Dimensions for outdoor ads (e.g., "40ft × 10ft")
- **area**: Calculated area in sq cm/sq ft
- **color**: "Color", "B&W", or "Both"
- **position**: Front Page, Back Page, Sports Section, etc.
- **duration**: For radio/TV (10 seconds, 30 seconds, etc.)
- **lines**: Number of text lines (for line ads)

### Examples by Medium

#### Newspaper Front Page Ad
```typescript
{
  value: 'full-page-front',
  label: 'Full Page Front Page',
  priceRange: '₹2,00,000 - ₹5,00,000',
  specifications: {
    dimensions: NEWSPAPER_AD_DIMENSIONS.fullPage,  // 25cm × 38cm
    area: 950,                                      // sq cm
    color: 'Both',
    position: 'Front Page'
  }
}
```

#### Bus Full Wrap
```typescript
{
  value: 'full-wrap',
  label: 'Full Bus Wrap',
  priceRange: '₹25,000 - ₹45,000 per bus',
  specifications: {
    size: '40ft × 10ft',
    area: 400  // sq ft
  }
}
```

#### Radio Advertisement
```typescript
{
  value: 'radio-10sec',
  label: '10 Seconds Spot',
  priceRange: '₹2,000 - ₹5,000 per spot',
  specifications: {
    duration: '10 seconds'
  }
}
```

### Helper Functions

```typescript
// Calculate area from dimensions
calculateAdArea(dimensions: AdDimensions): number
// Returns: width × height
// Example: calculateAdArea({ width: 25, height: 38, unit: 'cm' }) => 950

// Format dimensions for display
formatDimensions(dimensions: AdDimensions): string
// Returns: displayText or formatted string
// Example: formatDimensions({...}) => "25cm × 38cm"
```

### Visual Display

Specifications are displayed throughout the quotation workflow:

**In Selection Dropdown:**
```
Newspaper Front Page Ad
📏 25cm × 38cm  📊 950 sq cm  🎨 Color  📍 Front Page
```

**In Items Table:**
```
Newspaper Front Page Ad
📏 25cm × 38cm    🎨 Color    📍 Front Page
```

**In PDF:**
```
Full Page Front Page
Dimensions: 25cm × 38cm
Color: Color
Position: Front Page
```

---

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

#### 3. **🆕 NewspaperSelector**
Comprehensive newspaper selection with language filter and category targeting.

```tsx
import { NewspaperSelector } from '@/features/quotations';

<NewspaperSelector
  selectedNewspaper={newspaper}
  selectedLanguage="tamil"
  selectedCategory={category}
  onNewspaperChange={setNewspaper}
  onLanguageChange={setLanguage}
  onCategoryChange={setCategory}
  showLanguageFilter={true}
  showCategoryFilter={true}
/>
```

**Features:**
- Toggle between Tamil and English newspapers
- Visual grid of popular Chennai newspapers
- Quick select with circulation indicators
- Category-based targeting for better ad placement
- Real-time validation and feedback

#### 4. **QuotationForm** _(Enhanced with Validation)_
Complete form for creating quotations with:
- **Enhanced Customer Information** with real-time validation
- **Email validation** with visual feedback
- **Phone number validation** (10-digit Indian format)
- **Multiple items** with different mediums
- **Dynamic pricing** based on medium and options
- **Newspaper-specific fields** (newspaper selection, category, lines for line ads)
- **Duration and quantity** management
- **Discount application**
- **Notes and terms**
- **Loading states** for better UX
- **Error handling** and user feedback

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

**Validation Features:**
- ✓ Required field validation
- ✓ Email format validation with regex
- ✓ Phone number validation (10 digits)
- ✓ Real-time error feedback
- ✓ Success indicators
- ✓ Form state management
- ✓ Async save with loading state

#### 5. **🆕 QuotationPDFPreview** _(World-Class Design)_
Professional PDF preview with premium design:

**Design Features:**
- 🎨 **Premium gradient header** (purple-blue gradient)
- 🎨 **Color-coded sections** for better visual hierarchy
- 🎨 **Modern card-based layout** with shadows
- 🎨 **Professional table design** with hover effects
- 🎨 **Gradient summary card** for total amount
- 🎨 **Enhanced typography** with proper hierarchy
- 🎨 **Visual badges and icons** for better readability
- 🎨 **Signature section** for formality
- 🎨 **Professional footer** with branding

```tsx
import { QuotationPDFPreview } from '@/features/quotations';

<QuotationPDFPreview
  data={quotationData}
  onDownload={handleDownload}
  onSend={handleSend}
/>
```

**PDF Features:**
- Company branding with gradient header
- Color-coded customer and quotation details cards
- Modern itemized table with numbered rows
- Tax calculations (18% GST) with visual emphasis
- Enhanced discount display in yellow
- Large, bold total amount with gradient background
- Comprehensive terms and conditions grid
- Professional signature section
- Download and email capabilities with larger buttons

#### 6. **CreateQuotationButton**
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
