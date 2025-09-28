// Paystack configuration and utilities
export interface PaystackConfig {
  publicKey: string;
}

export interface PaymentData {
  email: string;
  amount: number; // Amount in kobo (smallest currency unit)
  currency: string;
  reference: string;
  metadata?: Record<string, any>;
}

// Get Paystack configuration from environment variables
export const getPaystackConfig = (): PaystackConfig => {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  if (!publicKey) {
    // Return a placeholder key for development
    console.warn('Paystack public key is missing. Using placeholder key for development.');
    return {
      publicKey: 'pk_test_placeholder_key',
    };
  }

  return {
    publicKey,
  };
};

// Generate a unique reference for payments
export const generatePaymentReference = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `rent_${timestamp}_${random}`;
};

// Convert amount from KES to kobo (Paystack uses kobo as the smallest unit)
export const convertToKobo = (amountInKes: number): number => {
  return Math.round(amountInKes * 100);
};

// Convert amount from kobo to KES
export const convertFromKobo = (amountInKobo: number): number => {
  return amountInKobo / 100;
};
