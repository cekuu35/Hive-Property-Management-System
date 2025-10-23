/**
 * Buni/KCB M-Pesa API Integration
 * This service handles M-Pesa payments using the Buni/KCB API
 */

export interface BuniSTKPushRequest {
  BusinessShortCode: string;
  TransactionType: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
  Password: string;
  Timestamp: string;
}

export interface BuniSTKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface BuniCallbackResponse {
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

export class BuniMpesaAPI {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(apiKey: string, environment: 'sandbox' | 'production' = 'sandbox') {
    this.apiKey = apiKey;
    this.baseURL = environment === 'sandbox' 
      ? 'https://sandbox.buni.kcbgroup.com'
      : 'https://api.buni.kcbgroup.com';
  }

  /**
   * Get access token using the API key
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting Buni/KCB access token...');
      
      // Try different authentication methods
      const authMethods = [
        {
          name: 'Bearer Token',
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        },
        {
          name: 'API Key Header',
          headers: { 'X-API-Key': this.apiKey }
        },
        {
          name: 'Custom Header',
          headers: { 'X-Auth-Token': this.apiKey }
        }
      ];

      for (const method of authMethods) {
        try {
          const response = await fetch(`${this.baseURL}/oauth2/v1/generate?grant_type=client_credentials`, {
            method: 'GET',
            headers: {
              ...method.headers,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
            
            console.log(`✅ Access token obtained using ${method.name}`);
            return this.accessToken;
          }
        } catch (error) {
          console.log(`❌ ${method.name} failed:`, error.message);
        }
      }

      throw new Error('All authentication methods failed');

    } catch (error) {
      console.error('❌ Error getting Buni/KCB access token:', error);
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
  async initiateSTKPush(request: Omit<BuniSTKPushRequest, 'Password' | 'Timestamp'>): Promise<BuniSTKPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const passkey = process.env.DARAJA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
      
      const password = this.generatePassword(request.BusinessShortCode, passkey, timestamp);

      const stkPushRequest: BuniSTKPushRequest = {
        ...request,
        Password: password,
        Timestamp: timestamp,
      };

      console.log('🚀 Initiating Buni/KCB STK Push:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference,
      });

      // Try different STK Push endpoints
      const endpoints = [
        `${this.baseURL}/mm/api/request/v1/processrequest`,
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        `${this.baseURL}/api/request/v1/processrequest`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stkPushRequest),
          });

          if (response.ok) {
            const data: BuniSTKPushResponse = await response.json();
            console.log('✅ Buni/KCB STK Push initiated:', data);
            return data;
          } else {
            const errorText = await response.text();
            console.log(`❌ Endpoint ${endpoint} failed:`, response.status, errorText);
          }
        } catch (error) {
          console.log(`❌ Endpoint ${endpoint} error:`, error.message);
        }
      }

      throw new Error('All STK Push endpoints failed');

    } catch (error) {
      console.error('❌ Error initiating Buni/KCB STK Push:', error);
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
          BusinessShortCode: process.env.DARAJA_SHORTCODE_SANDBOX || '174379',
          Password: this.generatePassword(
            process.env.DARAJA_SHORTCODE_SANDBOX || '174379',
            process.env.DARAJA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
            new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
          ),
          Timestamp: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3),
          CheckoutRequestID: checkoutRequestID
        }),
      });

      if (!response.ok) {
        throw new Error(`STK Push query failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error verifying STK Push:', error);
      throw error;
    }
  }

  /**
   * Decode JWT token to get information
   */
  decodeToken(): any {
    try {
      const base64Url = this.apiKey.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Test API key validity
   */
  async testAPIKey(): Promise<boolean> {
    try {
      const tokenData = this.decodeToken();
      if (tokenData) {
        console.log('📋 Buni/KCB Token Information:');
        console.log('- Subject:', tokenData.sub);
        console.log('- Application:', tokenData.application?.name);
        console.log('- Tier:', tokenData.application?.tier);
        console.log('- Key Type:', tokenData.keytype);
        console.log('- Issued At:', new Date(tokenData.iat * 1000).toISOString());
        console.log('- Subscribed APIs:', tokenData.subscribedAPIs?.map(api => api.name));
      }

      await this.getAccessToken();
      return true;
    } catch (error) {
      console.error('❌ API key test failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const buniMpesaAPI = new BuniMpesaAPI(
  process.env.BUNI_API_KEY || "eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJzdWJzY3JpYmVkQVBJcyI6W3sic3Vic2NyaWJlclRlbmFudERvbWFpbiI6ImNhcmJvbi5zdXBlciIsIm5hbWUiOiJNcGVzYUV4cHJlc3NBUElTZXJ2aWNlIiwiY29udGV4dCI6IlwvbW1cL2FwaVwvcmVxdWVzdFwvMS4wLjAiLCJwdWJsaXNoZXIiOiJzdXBlcl9hZG1pbiIsInZlcnNpb24iOiIxLjAuMCIsInN1YnNjcmlwdGlvblRpZXIiOiJVbmxpbWl0ZWQifV0sInRva2VuX3R5cGUiOiJhcGlLZXkiLCJpYXQiOjE3NjA3MDM4MzMsImp0aSI6IjVlYjJjYzY2LTRiN2ItNGIxMi04ODFmLTliOWI1ZDdkZDFiMiJ9.dfxnOskeHO5C3pHQHIgfH42oATV4gdTIFirbud8ZArhoQ8ArCyW9R7xH2B8E8uE7kXIr8uHv1g5cSYunkATsEXHXM6Tx3w7bOxLgfKhvHtJeYTGchilDxnWCsmPTif3r3A1OX_m6r4ivPIl5PUjFTwpgf-OURnIElgLW39KtHec_YD4Ci1elu_NE7fmK4S8obRR6Obk6cOat85AwtihA7WZ54GBGI4Dfmevgp4NfY0DGPg7BAnoqHrMgbIWSKNrBWRjfeNRusPjw03ER7QoUneTZExP8UPkWeI7BmZfxnT_EAFMk6TlYH-yNx-OGeHiMHuX3SsJwc53iffRA4NhwjQ==",
  'production'  // ✅ CHANGED TO PRODUCTION
);


