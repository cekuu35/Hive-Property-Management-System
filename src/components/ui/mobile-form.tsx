import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface MobileFormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function MobileFormField({ 
  label, 
  required = false, 
  error, 
  className,
  children 
}: MobileFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function MobileInput({ 
  label, 
  required = false, 
  error, 
  helperText,
  className,
  ...props 
}: MobileInputProps) {
  return (
    <MobileFormField label={label || ''} required={required} error={error}>
      <Input
        className={cn(
          "h-12 text-base", // Larger touch target and text
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </MobileFormField>
  );
}

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function MobileTextarea({ 
  label, 
  required = false, 
  error, 
  helperText,
  className,
  ...props 
}: MobileTextareaProps) {
  return (
    <MobileFormField label={label || ''} required={required} error={error}>
      <Textarea
        className={cn(
          "min-h-[100px] text-base resize-none", // Larger touch target and text
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </MobileFormField>
  );
}

interface MobileSelectProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function MobileSelect({ 
  label, 
  required = false, 
  error, 
  helperText,
  placeholder = "Select an option",
  value,
  onValueChange,
  options,
  className
}: MobileSelectProps) {
  return (
    <MobileFormField label={label || ''} required={required} error={error}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn(
          "h-12 text-base",
          error && "border-destructive focus:ring-destructive",
          className
        )}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </MobileFormField>
  );
}

interface MobileSwitchProps {
  label?: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function MobileSwitch({ 
  label, 
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className
}: MobileSwitchProps) {
  return (
    <div className={cn("flex items-center justify-between space-x-3", className)}>
      <div className="flex-1">
        {label && (
          <Label className="text-sm font-medium">{label}</Label>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

interface MobileFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export function MobileForm({ children, onSubmit, className }: MobileFormProps) {
  return (
    <form onSubmit={onSubmit} className={cn("space-y-6", className)}>
      {children}
    </form>
  );
}

interface MobileFormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileFormActions({ children, className }: MobileFormActionsProps) {
  return (
    <div className={cn("flex flex-col gap-3 pt-4", className)}>
      {children}
    </div>
  );
}

interface MobileSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export function MobileSubmitButton({ 
  loading = false, 
  children, 
  className,
  ...props 
}: MobileSubmitButtonProps) {
  return (
    <Button
      type="submit"
      className={cn("h-12 text-base font-medium", className)}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Processing...
        </div>
      ) : (
        children
      )}
    </Button>
  );
}
