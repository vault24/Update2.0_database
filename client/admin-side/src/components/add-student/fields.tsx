import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type Option = string | { value: string; label: string };
const normalize = (o: Option) => (typeof o === 'string' ? { value: o, label: o } : o);

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FieldWrapper({ label, required, helper, error, className, children }: FieldWrapperProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  /** Restrict input to digits only. */
  numeric?: boolean;
}

export function TextField({
  label, value, onChange, placeholder, type = 'text',
  required, helper, error, inputMode, maxLength, numeric,
}: TextFieldProps) {
  const handleChange = (raw: string) => onChange(numeric ? raw.replace(/\D/g, '') : raw);
  return (
    <FieldWrapper label={label} required={required} helper={helper} error={error}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={numeric ? 'numeric' : inputMode}
        pattern={numeric ? '[0-9]*' : undefined}
        maxLength={maxLength}
        aria-invalid={!!error}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={numeric ? (e) => { if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault(); } : undefined}
        className={cn(error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30')}
      />
    </FieldWrapper>
  );
}

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  rows?: number;
}

export function TextareaField({ label, value, onChange, placeholder, required, helper, error, rows = 2 }: TextareaFieldProps) {
  return (
    <FieldWrapper label={label} required={required} helper={helper} error={error}>
      <Textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30')}
      />
    </FieldWrapper>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  disabled?: boolean;
}

export function SelectField({
  label, value, onChange, options, placeholder = 'Select…',
  required, helper, error, disabled,
}: SelectFieldProps) {
  return (
    <FieldWrapper label={label} required={required} helper={helper} error={error}>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          aria-invalid={!!error}
          className={cn(error && 'border-destructive focus:border-destructive focus:ring-destructive/30')}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => {
            const { value: v, label: l } = normalize(o);
            return <SelectItem key={v} value={v}>{l}</SelectItem>;
          })}
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
}

interface SectionCardProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionCard({ icon: Icon, title, description, action, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-border/70 bg-muted/30 p-4 md:p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h4 className="font-semibold leading-tight text-foreground">{title}</h4>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StepIntro({ icon: Icon, title, description }: { icon?: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <h3 className="text-lg font-bold leading-tight md:text-xl">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
