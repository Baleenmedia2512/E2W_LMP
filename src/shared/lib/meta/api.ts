/**
 * Meta Graph API Integration
 * Handles all interactions with Facebook/Meta Graph API for lead ads
 */

interface MetaApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id: string;
}

interface MetaApiResponse<T> {
  data?: T;
  error?: MetaApiError;
}

interface LeadField {
  name: string;
  values: string[];
}

interface LeadData {
  id: string;
  created_time: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
  field_data: LeadField[];
}

interface NamedEntity {
  id: string;
  name: string;
}

/**
 * Retry configuration for API calls
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
} as const;

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Meta API errors that are retryable
  if (error.error) {
    const errorCode = error.error.code;
    const errorSubcode = error.error.error_subcode;
    
    // Rate limiting
    if (errorCode === 4 || errorCode === 17 || errorCode === 32 || errorCode === 613) {
      return true;
    }
    
    // Temporary errors
    if (errorCode === 1 || errorCode === 2) {
      return true;
    }
    
    // Temporary API unavailable
    if (errorSubcode === 2108006) {
      return true;
    }
  }

  return false;
}

/**
 * Make API call with retry logic
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    // Check for Meta API errors
    if (data.error) {
      const error = data.error as MetaApiError;
      console.error(`❌ Meta API Error:`, {
        message: error.message,
        type: error.type,
        code: error.code,
        subcode: error.error_subcode,
        trace: error.fbtrace_id,
        url: url.split('?')[0], // Hide access token
      });

      // Check if we should retry
      if (isRetryableError(data) && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(retryCount);
        console.warn(`⚠️ Retrying request (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms...`);
        await sleep(delay);
        return fetchWithRetry<T>(url, options, retryCount + 1);
      }

      throw new Error(`Meta API Error (${error.code}): ${error.message}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return data as T;
  } catch (error: any) {
    // Network or parse errors
    if (isRetryableError(error) && retryCount < RETRY_CONFIG.maxRetries) {
      const delay = getRetryDelay(retryCount);
      console.warn(`⚠️ Network error, retrying (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms...`);
      await sleep(delay);
      return fetchWithRetry<T>(url, options, retryCount + 1);
    }

    console.error(`❌ Fatal error fetching ${url.split('?')[0]}:`, error);
    throw error;
  }
}

/**
 * Get access token from environment
 */
function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error('META_ACCESS_TOKEN not configured');
  }
  return token;
}

/**
 * Validate access token and get its details
 */
export async function validateAccessToken(): Promise<{
  isValid: boolean;
  expiresAt?: Date;
  scopes?: string[];
  error?: string;
}> {
  try {
    const accessToken = getAccessToken();
    
    const response = await fetchWithRetry<{
      data: {
        app_id: string;
        type: string;
        application: string;
        data_access_expires_at: number;
        expires_at: number;
        is_valid: boolean;
        scopes: string[];
        user_id: string;
      };
    }>(`https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`);

    const tokenInfo = response.data;
    
    return {
      isValid: tokenInfo.is_valid,
      expiresAt: tokenInfo.expires_at ? new Date(tokenInfo.expires_at * 1000) : undefined,
      scopes: tokenInfo.scopes,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message,
    };
  }
}

/**
 * Fetch complete lead data from Meta Graph API
 * Includes all fields: ad_id, adset_id, campaign_id, form_id, field_data
 */
export async function fetchLeadData(leadId: string): Promise<LeadData | null> {
  try {
    const accessToken = getAccessToken();
    
    console.log(`🔍 Fetching lead data for ID: ${leadId}`);
    
    const fields = 'id,created_time,ad_id,adset_id,campaign_id,form_id,field_data';
    const url = `https://graph.facebook.com/v21.0/${leadId}?fields=${fields}&access_token=${accessToken}`;
    
    const leadData = await fetchWithRetry<LeadData>(url);
    
    console.log(`✅ Lead data fetched successfully:`, {
      id: leadData.id,
      created_time: leadData.created_time,
      ad_id: leadData.ad_id,
      adset_id: leadData.adset_id,
      campaign_id: leadData.campaign_id,
      form_id: leadData.form_id,
      fields_count: leadData.field_data?.length || 0,
    });
    
    return leadData;
  } catch (error: any) {
    console.error(`❌ Failed to fetch lead data for ${leadId}:`, error.message);
    return null;
  }
}

/**
 * Fetch campaign name by ID
 */
export async function fetchCampaignName(campaignId: string): Promise<string | null> {
  try {
    const accessToken = getAccessToken();
    
    if (!campaignId) {
      console.warn('⚠️ No campaign ID provided');
      return null;
    }
    
    console.log(`🔍 Fetching campaign name for ID: ${campaignId}`);
    
    const url = `https://graph.facebook.com/v21.0/${campaignId}?fields=name&access_token=${accessToken}`;
    const data = await fetchWithRetry<NamedEntity>(url);
    
    if (data.name) {
      console.log(`✅ Campaign name: "${data.name}" (ID: ${campaignId})`);
      return data.name;
    }
    
    console.warn(`⚠️ No name field in response for campaign ${campaignId}`);
    return null;
  } catch (error: any) {
    console.error(`❌ Failed to fetch campaign name for ${campaignId}:`, error.message);
    return null;
  }
}

/**
 * Fetch adset name by ID
 */
export async function fetchAdsetName(adsetId: string): Promise<string | null> {
  try {
    const accessToken = getAccessToken();
    
    if (!adsetId) {
      console.warn('⚠️ No adset ID provided');
      return null;
    }
    
    console.log(`🔍 Fetching adset name for ID: ${adsetId}`);
    
    const url = `https://graph.facebook.com/v21.0/${adsetId}?fields=name&access_token=${accessToken}`;
    const data = await fetchWithRetry<NamedEntity>(url);
    
    if (data.name) {
      console.log(`✅ Adset name: "${data.name}" (ID: ${adsetId})`);
      return data.name;
    }
    
    console.warn(`⚠️ No name field in response for adset ${adsetId}`);
    return null;
  } catch (error: any) {
    console.error(`❌ Failed to fetch adset name for ${adsetId}:`, error.message);
    return null;
  }
}

/**
 * Fetch ad name by ID
 */
export async function fetchAdName(adId: string): Promise<string | null> {
  try {
    const accessToken = getAccessToken();
    
    if (!adId) {
      console.warn('⚠️ No ad ID provided');
      return null;
    }
    
    console.log(`🔍 Fetching ad name for ID: ${adId}`);
    
    const url = `https://graph.facebook.com/v21.0/${adId}?fields=name&access_token=${accessToken}`;
    const data = await fetchWithRetry<NamedEntity>(url);
    
    if (data.name) {
      console.log(`✅ Ad name: "${data.name}" (ID: ${adId})`);
      return data.name;
    }
    
    console.warn(`⚠️ No name field in response for ad ${adId}`);
    return null;
  } catch (error: any) {
    console.error(`❌ Failed to fetch ad name for ${adId}:`, error.message);
    return null;
  }
}

/**
 * Fetch all names (campaign, adset, ad) in parallel for efficiency
 */
export async function fetchAllNames(
  campaignId?: string,
  adsetId?: string,
  adId?: string
): Promise<{
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
}> {
  console.log(`🔍 Fetching names for campaign: ${campaignId}, adset: ${adsetId}, ad: ${adId}`);
  
  const [campaignName, adsetName, adName] = await Promise.allSettled([
    campaignId ? fetchCampaignName(campaignId) : Promise.resolve(null),
    adsetId ? fetchAdsetName(adsetId) : Promise.resolve(null),
    adId ? fetchAdName(adId) : Promise.resolve(null),
  ]);

  return {
    campaignName: campaignName.status === 'fulfilled' ? campaignName.value : null,
    adsetName: adsetName.status === 'fulfilled' ? adsetName.value : null,
    adName: adName.status === 'fulfilled' ? adName.value : null,
  };
}

/**
 * Parse field data from Meta lead
 */
export function parseLeadFields(fieldData: LeadField[]): {
  name: string;
  phone: string;
  email: string | null;
  customFields: Record<string, any>;
} {
  let name = '';
  let phone = '';
  let email: string | null = null;
  const customFields: Record<string, any> = {};

  for (const field of fieldData) {
    const fieldName = field.name.toLowerCase();
    const fieldValue = field.values?.[0];

    if (!fieldValue) continue;

    if (fieldName.includes('name') || fieldName === 'full_name') {
      name = fieldValue;
    } else if (fieldName.includes('phone') || fieldName === 'phone_number') {
      phone = fieldValue;
    } else if (fieldName.includes('email')) {
      email = fieldValue;
    } else {
      customFields[field.name] = fieldValue;
    }
  }

  return { name, phone, email, customFields };
}
