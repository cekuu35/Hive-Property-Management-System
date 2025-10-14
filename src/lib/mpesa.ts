// M-Pesa Daraja API Helper Functions

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

interface STKPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface CallbackResponse {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

class MpesaAPI {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.DARAJA_ENV === 'sandbox' 
      ? 'https://sandbox.safaricom.co.ke' 
      : 'https://api.safaricom.co.ke';
  }

  /**
   * Get OAuth access token from Daraja API
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const consumerKey = process.env.DARAJA_CONSUMER_KEY;
      const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

      if (!consumerKey || !consumerSecret) {
        throw new Error('M-Pesa credentials not configured');
      }

      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      const response = await fetch(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data: AccessTokenResponse = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry
      
      console.log('✅ M-Pesa access token obtained');
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ Error getting M-Pesa access token:', error);
      throw error;
    }
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(shortcode: string, passkey: string, timestamp: string): string {
    const passwordString = `${shortcode}${passkey}${timestamp}`;
    return Buffer.from(passwordString).toString('base64');
  }

  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush(request: Omit<STKPushRequest, 'Password' | 'Timestamp'>): Promise<STKPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const passkey = process.env.DARAJA_PASSKEY;
      
      if (!passkey) {
        throw new Error('M-Pesa passkey not configured');
      }

      const password = this.generatePassword(request.BusinessShortCode, passkey, timestamp);

      const stkPushRequest: STKPushRequest = {
        ...request,
        Password: password,
        Timestamp: timestamp,
      };

      console.log('🚀 Initiating M-Pesa STK Push:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference,
      });

      const response = await fetch(`${this.baseURL}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPushRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`STK Push failed: ${response.statusText} - ${errorText}`);
      }

      const data: STKPushResponse = await response.json();
      
      console.log('✅ M-Pesa STK Push initiated:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Error initiating STK Push:', error);
      throw error;
    }
  }

  /**
   * Verify STK Push status
   */
  async verifySTKPush(checkoutRequestID: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`${this.baseURL}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.DARAJA_SHORTCODE_SANDBOX,
          Password: this.generatePassword(
            process.env.DARAJA_SHORTCODE_SANDBOX!,
            process.env.DARAJA_PASSKEY!,
            new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
          ),
          Timestamp: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3),
          CheckoutRequestID: checkoutRequestID,
        }),
      });

      if (!response.ok) {
        throw new Error(`STK Push verification failed: ${response.statusText}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('❌ Error verifying STK Push:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mpesaAPI = new MpesaAPI();

// Export types
export type { STKPushRequest, STKPushResponse, CallbackResponse };

