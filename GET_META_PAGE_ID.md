# How to Get Your META_PAGE_ID

## Method 1: From Facebook Page Settings (Easiest)

1. **Go to your Facebook Page**
   - Visit: https://www.facebook.com/
   - Navigate to your business page

2. **Go to Page Settings**
   - Click on your page
   - Click "Settings" (left sidebar or top right)

3. **Find Page ID**
   - Scroll down to "Page Info" section
   - Look for **"Facebook Page ID"** or **"Page ID"**
   - Copy the number (e.g., `123456789012345`)

## Method 2: From Page URL

1. **Visit your Facebook Page**
   
2. **Look at the URL:**
   - If URL is like: `https://www.facebook.com/YourPageName`
   - Right-click on the page → "View Page Source"
   - Search for `"pageID"` or `"page_id"`
   
   OR
   
   - If URL is like: `https://www.facebook.com/profile.php?id=123456789012345`
   - The numbers after `id=` is your Page ID!

## Method 3: Using Graph API Explorer (Most Reliable)

### Step 1: Get Your User Access Token

1. Go to **Graph API Explorer**:
   - Visit: https://developers.facebook.com/tools/explorer/

2. **Select Your App**:
   - In the top-right dropdown, select **"E2W_LMP"** (your app)

3. **Get User Access Token**:
   - Click "Generate Access Token" button
   - Grant permissions:
     - `pages_manage_metadata`
     - `pages_read_engagement`
     - `leads_retrieval`
   - Click "Continue" → "Done"
   - Copy the access token shown

### Step 2: Get Your Page ID

1. **In Graph API Explorer**, with your token active:
   
2. **Enter this in the query field**:
   ```
   me/accounts
   ```

3. **Click "Submit"** button

4. **Response will look like:**
   ```json
   {
     "data": [
       {
         "access_token": "EAAJ...",
         "category": "Business",
         "category_list": [...],
         "name": "Your Page Name",
         "id": "123456789012345",
         "tasks": ["ANALYZE", "ADVERTISE", ...]
       }
     ]
   }
   ```

5. **Copy the `id` value** - This is your **META_PAGE_ID**!
6. **Also copy the `access_token`** - This is your **META_ACCESS_TOKEN**!

## Method 4: Using cURL (Command Line)

```powershell
# Replace YOUR_USER_ACCESS_TOKEN with token from Graph API Explorer
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_USER_ACCESS_TOKEN"
```

Response will show all your pages with their IDs.

## What You'll Need

After finding your Page ID, you need:

1. **META_PAGE_ID** - The numeric ID you just found
2. **META_ACCESS_TOKEN** - The long-lived page access token (from Method 3, Step 2, response)

## Quick Test: Verify Your Page ID

Once you have the Page ID, test it:

```powershell
# Replace with your actual values
curl "https://graph.facebook.com/v21.0/YOUR_PAGE_ID?access_token=YOUR_ACCESS_TOKEN&fields=id,name,category"
```

Should return:
```json
{
  "id": "123456789012345",
  "name": "Your Page Name",
  "category": "Business"
}
```

## Add to Vercel

Once you have both values:

### Option A: Via Vercel CLI
```powershell
vercel env add META_PAGE_ID
# When prompted, enter your page ID

vercel env add META_ACCESS_TOKEN
# When prompted, paste your page access token
```

### Option B: Via Vercel Dashboard
1. Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp/settings/environment-variables
2. Click "Add New"
3. Add:
   - **Key:** `META_PAGE_ID`
   - **Value:** Your page ID
   - **Environments:** Production, Preview, Development
4. Repeat for `META_ACCESS_TOKEN`

## Important Notes

⚠️ **Page Access Token vs User Access Token:**
- User token works for YOU only
- Page token works for the PAGE (what you need!)
- Use Method 3 to get the correct PAGE access token

⚠️ **Token Expiration:**
- The token from Graph API Explorer is short-lived (1-2 hours)
- For production, you need a **long-lived page access token**
- See `META_SETUP_STEPS.md` for how to generate long-lived token

## Next Steps

After adding environment variables:
1. Redeploy: `vercel --prod`
2. Test webhook: See `META_SETUP_STEPS.md`
3. Subscribe to `leadgen` events in Meta Dashboard
