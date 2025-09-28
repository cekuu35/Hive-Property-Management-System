// This is a simple mock API endpoint for payment verification
// In production, this should be a proper serverless function or API endpoint

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ message: 'Payment reference is required' });
  }

  // Mock verification - in production, verify with Paystack API
  // const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
  //   headers: {
  //     Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  //   },
  // });

  // For demo purposes, always return success
  res.status(200).json({
    status: 'success',
    message: 'Payment verified successfully',
    data: {
      reference,
      status: 'success',
      amount: 0, // Would be actual amount from Paystack
      currency: 'NGN',
      paid_at: new Date().toISOString(),
    },
  });
}
