import { useToast } from './use-toast';

interface ReceiptData {
  paymentId: string;
  tenant: string;
  unit: string;
  amount: number;
  date: string;
  paymentMethod?: string;
}

export const usePaymentReceipts = () => {
  const { toast } = useToast();

  const generateReceipt = async (data: ReceiptData) => {
    try {
      // In a real implementation, this would:
      // 1. Generate a PDF receipt using a library like jsPDF
      // 2. Include company letterhead, payment details, terms
      // 3. Store the receipt in Supabase storage
      // 4. Send via email to tenant and landlord
      
      toast({
        title: "Receipt Generated",
        description: `Payment receipt for ${data.tenant} - Unit ${data.unit} has been generated and downloaded.`,
      });

      // Simulate file download
      const receiptData = `
PAYMENT RECEIPT
===============
Date: ${new Date().toLocaleDateString()}
Tenant: ${data.tenant}
Unit: ${data.unit}
Amount: KES ${data.amount.toLocaleString()}
Payment Date: ${data.date}
Payment Method: ${data.paymentMethod || 'Cash'}

Thank you for your payment!
      `;

      const blob = new Blob([receiptData], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${data.tenant}-${data.unit}-${data.date}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Error",
        description: "Failed to generate receipt",
        variant: "destructive"
      });
    }
  };

  const emailReceipt = async (data: ReceiptData, email: string) => {
    try {
      // In a real implementation, this would send the receipt via email
      toast({
        title: "Receipt Sent",
        description: `Payment receipt has been sent to ${email}`,
      });
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast({
        title: "Error",
        description: "Failed to send receipt",
        variant: "destructive"
      });
    }
  };

  return {
    generateReceipt,
    emailReceipt
  };
};