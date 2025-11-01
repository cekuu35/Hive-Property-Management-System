import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, X } from 'lucide-react';
import { useApprovedLease } from '@/hooks/useApprovedLease';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaseDocumentViewerProps {
  open: boolean;
  onClose: () => void;
}

interface LeaseTemplate {
  header_content: string | null;
  standard_terms: string | null;
  additional_terms: string | null;
  footer_content: string | null;
}

// Helper function to get default template
const getDefaultTemplate = (): LeaseTemplate => ({
  header_content: null,
  standard_terms: `Use of Premises: The Premises shall be used solely as a private residence.
Maintenance: Tenant shall maintain the Premises in good condition and shall be responsible for any damage caused by Tenant or Tenant's guests.
Utilities: Tenant shall be responsible for all utilities unless otherwise agreed in writing.
Alterations: No alterations or improvements to the Premises may be made without Landlord's prior written consent.
Termination: Either party may terminate this lease with proper written notice as required by law.`,
  additional_terms: null,
  footer_content: 'This document is a legally binding agreement. Please keep a copy for your records.',
});

export const LeaseDocumentViewer = ({ open, onClose }: LeaseDocumentViewerProps) => {
  const { approvedLease } = useApprovedLease();
  const { profile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<LeaseTemplate | null>(getDefaultTemplate());
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  if (!approvedLease) return null;

  const lease = approvedLease;
  const startDate = lease.start_date ? new Date(lease.start_date) : null;
  const endDate = lease.end_date ? new Date(lease.end_date) : null;
  const createdDate = lease.created_at ? new Date(lease.created_at) : new Date();
  const landlordId = lease.units?.properties?.landlord_id;

  // Fetch lease template when dialog opens
  useEffect(() => {
    if (open && landlordId) {
      fetchLeaseTemplate(landlordId);
    } else if (open && !landlordId) {
      // If no landlord ID, just use default template
      setTemplate(getDefaultTemplate());
    }
  }, [open, landlordId]);

  const fetchLeaseTemplate = async (landlordId: string) => {
    try {
      setLoadingTemplate(true);
      
      if (!landlordId) {
        // No landlord ID, use default template
        setTemplate(getDefaultTemplate());
        return;
      }

      // First try to get the default template
      const { data: defaultTemplate, error: defaultError } = await supabase
        .from('lease_templates')
        .select('header_content, standard_terms, additional_terms, footer_content')
        .eq('landlord_id', landlordId)
        .eq('is_default', true)
        .maybeSingle();

      // Check if error is because table doesn't exist
      if (defaultError) {
        // If table doesn't exist, use default template
        if (defaultError.message?.includes('does not exist') || defaultError.code === '42P01') {
          console.log('Lease templates table does not exist yet, using default template');
          setTemplate(getDefaultTemplate());
          return;
        }
        // For other errors, log but continue
        console.warn('Error fetching default template:', defaultError);
      }

      // If we got data (even if null), use it
      if (defaultTemplate) {
        setTemplate(defaultTemplate);
        return;
      }

      // If no default, get the first template (not using .single() to avoid error if none exists)
      const { data: templates, error: templatesError } = await supabase
        .from('lease_templates')
        .select('header_content, standard_terms, additional_terms, footer_content')
        .eq('landlord_id', landlordId)
        .limit(1);

      if (templatesError) {
        // If table doesn't exist, use default template
        if (templatesError.message?.includes('does not exist') || templatesError.code === '42P01') {
          console.log('Lease templates table does not exist yet, using default template');
          setTemplate(getDefaultTemplate());
          return;
        }
        console.warn('Error fetching templates:', templatesError);
      }

      if (templates && templates.length > 0) {
        setTemplate(templates[0]);
      } else {
        // Use default template if none exists
        setTemplate(getDefaultTemplate());
      }
    } catch (error: any) {
      console.error('Error fetching lease template:', error);
      // Use default template on error - this ensures the document still displays
      setTemplate(getDefaultTemplate());
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = printRef.current;
    if (!element) return;

    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lease Agreement - ${lease.units?.unit_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 { text-align: center; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
            h2 { color: #2c3e50; margin-top: 30px; border-bottom: 2px solid #ecf0f1; padding-bottom: 5px; }
            h3 { color: #34495e; margin-top: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin: 20px 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
            .info-item { padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; }
            .info-label { font-weight: bold; color: #7f8c8d; font-size: 0.9em; }
            .info-value { margin-top: 5px; }
            .terms { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .signature-section { margin-top: 50px; }
            .signature-line { border-top: 1px solid #000; width: 300px; margin-top: 50px; }
            .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #7f8c8d; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Residential Lease Agreement</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Lease Document for {lease.units?.unit_number}
          </DialogDescription>
        </DialogHeader>

        <div ref={printRef} className="lease-document p-6 bg-background text-foreground">
          {/* Document Header */}
          <div className="header text-center mb-6">
            <h1 className="text-3xl font-bold mb-2 text-foreground">RESIDENTIAL LEASE AGREEMENT</h1>
            <p className="text-sm text-muted-foreground">
              Agreement Date: {format(createdDate, 'MMMM dd, yyyy')}
            </p>
            <p className="text-sm text-muted-foreground">
              Lease ID: {lease.id.substring(0, 8).toUpperCase()}
            </p>
          </div>

          <Separator className="my-6" />

          {/* Parties Section */}
          <div className="section mb-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">1. PARTIES TO THIS AGREEMENT</h2>
            
            <h3 className="text-base font-medium mt-4 mb-3 text-foreground">1.1 LANDLORD:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Name:</div>
                <div className="mt-1 text-foreground">
                  {lease.units?.properties?.profiles?.first_name} {lease.units?.properties?.profiles?.last_name}
                </div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Email:</div>
                <div className="mt-1 text-foreground">{lease.units?.properties?.profiles?.email || 'N/A'}</div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Phone:</div>
                <div className="mt-1 text-foreground">{lease.units?.properties?.profiles?.phone || 'N/A'}</div>
              </div>
            </div>

            <h3 className="text-base font-medium mt-5 mb-3 text-foreground">1.2 TENANT:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Name:</div>
                <div className="mt-1 text-foreground">{profile?.first_name} {profile?.last_name}</div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Email:</div>
                <div className="mt-1 text-foreground">{profile?.email || 'N/A'}</div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Phone:</div>
                <div className="mt-1 text-foreground">{profile?.phone || 'N/A'}</div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">ID Number:</div>
                <div className="mt-1 text-foreground">{profile?.id_number || 'N/A'}</div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Property Details */}
          <div className="section mb-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">2. PROPERTY DETAILS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Property Name:</div>
                <div className="mt-1 text-foreground">{lease.units?.properties?.name}</div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Unit Number:</div>
                <div className="mt-1 text-foreground">{lease.units?.unit_number}</div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Address:</div>
                <div className="mt-1 text-foreground">{lease.units?.properties?.address}</div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Unit Type:</div>
                <div className="mt-1 text-foreground capitalize">
                  {lease.units?.type || 'Residential Unit'}
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Lease Terms */}
          <div className="section mb-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">3. LEASE TERM</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Lease Start Date:</div>
                <div className="mt-1 text-foreground">{startDate ? format(startDate, 'MMMM dd, yyyy') : 'N/A'}</div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Lease End Date:</div>
                <div className="mt-1 text-foreground">{endDate ? format(endDate, 'MMMM dd, yyyy') : 'N/A'}</div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Lease Duration:</div>
                <div className="mt-1 text-foreground">
                  {startDate && endDate 
                    ? `${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))} Months`
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-foreground">
                This lease shall commence on <strong>{startDate ? format(startDate, 'MMMM dd, yyyy') : 'N/A'}</strong> and 
                shall terminate on <strong>{endDate ? format(endDate, 'MMMM dd, yyyy') : 'N/A'}</strong>, unless 
                terminated earlier in accordance with the terms of this Agreement.
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Rent and Fees */}
          <div className="section mb-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">4. RENT AND FEES</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-primary/10 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Monthly Rent:</div>
                <div className="mt-1 text-2xl font-bold text-primary">
                  KES {lease.rent_amount?.toLocaleString() || '0'}
                </div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Security Deposit:</div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  KES {(lease.security_deposit || lease.deposit_amount || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Payment Due Date:</div>
                <div className="mt-1 text-foreground">
                  {lease.payment_due_date ? `Day ${lease.payment_due_date} of each month` : '1st of each month'}
                </div>
              </div>
              <div className="p-3 bg-muted/50 border-l-4 border-primary rounded">
                <div className="text-sm text-muted-foreground font-medium">Late Fee Policy:</div>
                <div className="mt-1 text-foreground">
                  {lease.late_fee_type === 'percentage' 
                    ? `${lease.late_fee_value}% per day (max ${lease.late_fee_max_percentage}%)`
                    : lease.late_fee_type === 'flat'
                    ? `KES ${lease.late_fee_value?.toLocaleString()} (one-time)`
                    : lease.late_fee_type === 'none'
                    ? 'No late fees'
                    : lease.late_fee_amount 
                    ? `KES ${lease.late_fee_amount.toLocaleString()}` 
                    : 'As per agreement'}
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <p className="text-foreground"><strong>4.1 Rent Payment:</strong></p>
              <p className="text-foreground">
                Tenant agrees to pay rent in the amount of <strong>KES {lease.rent_amount?.toLocaleString()}</strong> per month, 
                due on or before the <strong>{lease.payment_due_date ? `${lease.payment_due_date}${getOrdinalSuffix(lease.payment_due_date)}` : 'specified'}</strong> day 
                of each month.
              </p>
              <p className="text-foreground"><strong>4.2 Security Deposit:</strong></p>
              <p className="text-foreground">
                Tenant has paid a security deposit of <strong>KES {(lease.security_deposit || lease.deposit_amount || 0).toLocaleString()}</strong> which 
                shall be held by the Landlord and returned to the Tenant at the end of the lease term, subject to deductions 
                for damages beyond normal wear and tear.
              </p>
              {(lease.late_fee_type || lease.late_fee_amount) && (
                <>
                  <p className="text-foreground"><strong>4.3 Late Fees:</strong></p>
                  {lease.late_fee_type === 'percentage' ? (
                    <p className="text-foreground">
                      If rent payment is not received by the due date, a late fee will be charged at a rate of{' '}
                      <strong>{lease.late_fee_value}% per day</strong>{' '}
                      {lease.late_fee_grace_period_days > 0 && (
                        <>
                          after a grace period of <strong>{lease.late_fee_grace_period_days} day(s)</strong>
                        </>
                      )}
                      , calculated on the outstanding rent amount, with a maximum cap of{' '}
                      <strong>{lease.late_fee_max_percentage}% of the monthly rent</strong>.
                    </p>
                  ) : lease.late_fee_type === 'flat' ? (
                    <p className="text-foreground">
                      If rent payment is not received by the due date{' '}
                      {lease.late_fee_grace_period_days > 0 && (
                        <>
                          (after a grace period of <strong>{lease.late_fee_grace_period_days} day(s)</strong>)
                        </>
                      )}
                      , a one-time late fee of <strong>KES {lease.late_fee_value?.toLocaleString()}</strong> will be charged.
                    </p>
                  ) : lease.late_fee_type === 'none' ? (
                    <p className="text-foreground">
                      No late fees will be charged for this lease. However, timely payment is expected and appreciated.
                    </p>
                  ) : lease.late_fee_amount ? (
                    <p className="text-foreground">
                      A late fee of <strong>KES {lease.late_fee_amount.toLocaleString()}</strong> will be charged if rent 
                      is not received within the grace period.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Custom Header Content from Template */}
          {template?.header_content && (
            <>
              <Separator className="my-6" />
              <div className="section mb-6">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="whitespace-pre-wrap text-foreground">{template.header_content}</p>
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />

          {/* Additional Terms - from lease or template */}
          {(lease.terms || template?.additional_terms) && (
            <>
              <div className="section mb-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">5. ADDITIONAL TERMS AND CONDITIONS</h2>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="whitespace-pre-wrap text-foreground">
                    {template?.additional_terms || lease.terms}
                  </p>
                </div>
              </div>
              <Separator className="my-6" />
            </>
          )}

          {/* Standard Terms - from template */}
          {template?.standard_terms && (
            <div className="section mb-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                {lease.terms || template?.additional_terms ? '6' : '5'}. STANDARD TERMS
              </h2>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="whitespace-pre-wrap text-foreground">{template.standard_terms}</p>
              </div>
            </div>
          )}

          {/* Fallback Standard Terms if no template */}
          {!template?.standard_terms && (
            <div className="section mb-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                {lease.terms || template?.additional_terms ? '6' : '5'}. STANDARD TERMS
              </h2>
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <p className="text-foreground"><strong>Use of Premises:</strong> The Premises shall be used solely as a private residence.</p>
                <p className="text-foreground"><strong>Maintenance:</strong> Tenant shall maintain the Premises in good condition and shall be responsible for any damage caused by Tenant or Tenant's guests.</p>
                <p className="text-foreground"><strong>Utilities:</strong> Tenant shall be responsible for all utilities unless otherwise agreed in writing.</p>
                <p className="text-foreground"><strong>Alterations:</strong> No alterations or improvements to the Premises may be made without Landlord's prior written consent.</p>
                <p className="text-foreground"><strong>Termination:</strong> Either party may terminate this lease with proper written notice as required by law.</p>
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Signatures */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-8 text-foreground">SIGNATURES</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <p className="font-bold mb-3 text-foreground">LANDLORD:</p>
                <div className="border-t-2 border-foreground/20 mt-12 mb-2"></div>
                <p className="mt-2 text-foreground">
                  {lease.units?.properties?.profiles?.first_name} {lease.units?.properties?.profiles?.last_name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Date: __________________</p>
              </div>
              <div>
                <p className="font-bold mb-3 text-foreground">TENANT:</p>
                <div className="border-t-2 border-foreground/20 mt-12 mb-2"></div>
                <p className="mt-2 text-foreground">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-sm text-muted-foreground mt-1">Date: __________________</p>
              </div>
            </div>
          </div>

          {/* Footer - from template or default */}
          <div className="text-center mt-12 pt-6 border-t border-border">
            {template?.footer_content ? (
              <>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{template.footer_content}</p>
                <p className="text-sm text-muted-foreground mt-1">Generated on {format(new Date(), 'MMMM dd, yyyy \'at\' hh:mm a')}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">This document is a legally binding agreement. Please keep a copy for your records.</p>
                <p className="text-sm text-muted-foreground mt-1">Generated on {format(new Date(), 'MMMM dd, yyyy \'at\' hh:mm a')}</p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function for ordinal suffixes
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

