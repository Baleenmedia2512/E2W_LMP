# Missing Leads Insertion Script

This script inserts the 12 missing Meta leads into your database.

## What it does:

1. ✅ Creates leads with proper metadata matching your webhook structure
2. ✅ Auto-assigns to Gomathi (same as webhook logic)
3. ✅ Checks for duplicates (by phone/email) before inserting
4. ✅ Creates activity history for each lead
5. ✅ Uses the campaign names and form details from your data

## Leads to be inserted:

- **Apartment screen Ad Chennai** (6 leads)
  - Boppana Saibabu, Mahaboob Baig, Dharmesh M, Jayaseeli Ashok, Elumalai A, K. Rathinavelu., Aamir Ahmed A

- **No PARKING CHENNAI** (6 leads)
  - Sha Ganesh, Anand, Saravanan E, Satish Patel, shivakumar

**Total: 12 leads**

## How to run:

### Option 1: Using npm script (Recommended)
```powershell
npm run insert-missing-leads
```

### Option 2: Direct execution
```powershell
node --require ts-node/register scripts/insert-missing-leads.ts
```

### Option 3: Using ts-node
```powershell
npx ts-node scripts/insert-missing-leads.ts
```

## Output:

The script will show:
- ✅ Successfully created leads
- ⚠️ Skipped duplicates (if any already exist)
- ❌ Any errors
- 📊 Final summary with counts

## Safety features:

- **Duplicate check**: Won't create duplicates if leads already exist
- **Proper metadata**: Stores campaign ID, form ID, platform info
- **Activity logging**: Creates audit trail for each lead
- **Transaction safety**: Uses Prisma for safe database operations

## After running:

All leads will appear in your dashboard:
- Source: `meta`
- Status: `new`
- Assigned to: Gomathi
- Campaign: Campaign name (stored in lead record)

## To verify:

Check your dashboard or run:
```sql
SELECT id, name, phone, email, campaign, source, status 
FROM Lead 
WHERE JSON_EXTRACT(metadata, '$.manualInsert') = true;
```
