/**
 * Receipt Generator Utility
 * Generates and downloads payment receipts for tenants
 */

interface PaymentReceiptData {
  payment: {
    id: string;
    amount: number;
    date: string;
    status: string;
    method?: string | null;
    reference?: string | null;
    late_fee?: number;
  };
  tenant: {
    name: string;
    email: string;
    phone: string;
  };
}

export function generatePaymentReceipt(data: PaymentReceiptData) {
  const { payment, tenant } = data;
  
  // Create receipt HTML
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Receipt - ${payment.reference || payment.id}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          padding: 40px;
          background: #f5f5f5;
        }
        
        .receipt {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border: 2px solid #333;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #333;
          padding-bottom: 20px;
        }
        
        .header h1 {
          font-size: 32px;
          margin-bottom: 10px;
          color: #333;
        }
        
        .header .subtitle {
          font-size: 18px;
          color: #666;
        }
        
        .receipt-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }
        
        .info-section {
          flex: 1;
        }
        
        .info-section h3 {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .info-section p {
          font-size: 16px;
          color: #333;
          margin: 4px 0;
        }
        
        .payment-details {
          margin: 30px 0;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 15px 20px;
          border-bottom: 1px solid #ddd;
        }
        
        .detail-row:first-child {
          border-top: 2px solid #333;
        }
        
        .detail-row.total {
          background: #f0f0f0;
          border-bottom: 3px solid #333;
          font-weight: bold;
          font-size: 20px;
        }
        
        .detail-label {
          color: #666;
          font-weight: 500;
        }
        
        .detail-value {
          color: #333;
          font-weight: 600;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          background: #22c55e;
          color: white;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #333;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        
        .footer p {
          margin: 8px 0;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          color: rgba(0, 0, 0, 0.03);
          font-weight: bold;
          z-index: -1;
          user-select: none;
          pointer-events: none;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          
          .receipt {
            border: none;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="watermark">PAID</div>
      <div class="receipt">
        <div class="header">
          <h1>🏠 HIVE</h1>
          <div class="subtitle">Property Management</div>
          <div style="margin-top: 15px;">
            <span class="status-badge">PAYMENT RECEIPT</span>
          </div>
        </div>
        
        <div class="receipt-info">
          <div class="info-section">
            <h3>Receipt Details</h3>
            <p><strong>Receipt #:</strong> ${payment.reference || payment.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> ${new Date(payment.date).toLocaleDateString('en-KE', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p><strong>Time:</strong> ${new Date(payment.date).toLocaleTimeString('en-KE', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</p>
          </div>
          
          <div class="info-section" style="text-align: right;">
            <h3>Tenant Information</h3>
            <p><strong>${tenant.name}</strong></p>
            <p>${tenant.email}</p>
            <p>${tenant.phone}</p>
          </div>
        </div>
        
        <div class="payment-details">
          <div class="detail-row">
            <span class="detail-label">Payment Method</span>
            <span class="detail-value">${payment.method || 'M-Pesa'}</span>
          </div>
          
          ${payment.reference ? `
          <div class="detail-row">
            <span class="detail-label">Transaction Reference</span>
            <span class="detail-value">${payment.reference}</span>
          </div>
          ` : ''}
          
          <div class="detail-row">
            <span class="detail-label">Rent Amount</span>
            <span class="detail-value">KES ${payment.amount.toLocaleString()}</span>
          </div>
          
          ${payment.late_fee && payment.late_fee > 0 ? `
          <div class="detail-row">
            <span class="detail-label">Late Fee</span>
            <span class="detail-value" style="color: #dc2626;">KES ${payment.late_fee.toLocaleString()}</span>
          </div>
          ` : ''}
          
          <div class="detail-row total">
            <span class="detail-label">Total Paid</span>
            <span class="detail-value">KES ${((payment.amount || 0) + (payment.late_fee || 0)).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Thank you for your payment!</strong></p>
          <p>This is an official payment receipt from Hive Property Management.</p>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Generated on ${new Date().toLocaleDateString('en-KE', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Open receipt in new window for printing/saving
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  } else {
    // Fallback: Download as HTML file
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.reference || payment.id}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}


