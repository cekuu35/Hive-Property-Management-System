// Paystack configuration and utilities
export interface PaystackConfig {
  publicKey: string;
  secretKey: string;
}

export interface PaymentData {
  email: string;
  amount: number; // Amount in kobo (smallest currency unit)
  currency: string;
  reference: string;
  metadata?: Record<string, any>;
  callback?: (response: any) => void;
  onClose?: () => void;
}

export interface PaymentResponse {
  status: 'success' | 'error';
  message: string;
  reference?: string;
  transaction?: any;
}

// Get Paystack configuration from environment variables
export const getPaystackConfig = (): PaystackConfig => {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error('Paystack configuration is missing. Please check your environment variables.');
  }

  return {
    publicKey,
    secretKey,
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
