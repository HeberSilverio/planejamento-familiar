ALTER TABLE public.income_sources
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS pay_day int,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.income_sources ADD CONSTRAINT income_frequency_chk CHECK (frequency IN ('monthly','weekly','biweekly','annual'));
ALTER TABLE public.income_sources ADD CONSTRAINT income_pay_day_chk CHECK (pay_day IS NULL OR pay_day BETWEEN 1 AND 31);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.commitments
  ADD COLUMN IF NOT EXISTS counts_toward_goal boolean NOT NULL DEFAULT false;
UPDATE public.commitments SET counts_toward_goal = true WHERE name ILIKE '%cons_rcio%';

CREATE OR REPLACE FUNCTION public.sync_paid_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.paid AND NEW.paid_at IS NULL THEN NEW.paid_at = now(); END IF;
  IF NOT NEW.paid THEN NEW.paid_at = NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transactions_sync_paid_at BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_paid_at();

-- Pagamento de cada ocorrência mensal de recorrentes, compromissos e dívidas
CREATE TABLE public.obligation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_type text NOT NULL CHECK (source_type IN ('recurring','commitment','debt')),
  source_id uuid NOT NULL,
  month_key text NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id, month_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligation_payments TO authenticated;
GRANT ALL ON public.obligation_payments TO service_role;
ALTER TABLE public.obligation_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.obligation_payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own insert" ON public.obligation_payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own update" ON public.obligation_payments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own delete" ON public.obligation_payments FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX obligation_payments_source_idx ON public.obligation_payments (source_type, source_id);
CREATE TRIGGER obligation_payments_updated_at BEFORE UPDATE ON public.obligation_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();