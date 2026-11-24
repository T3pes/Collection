-- =====================================================================
-- (Facoltativo) Aggiornamento automatico dei prezzi ogni notte alle 05:30.
-- Richiede le estensioni pg_cron e pg_net (Dashboard > Database > Extensions)
-- e la Edge Function refresh-prices già pubblicata.
--
-- Sostituisci <PROJECT_REF> e <SERVICE_ROLE_KEY> prima di eseguire.
-- Suggerimento: salva la chiave nel Vault invece di scriverla qui:
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- e usa (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('tcg-refresh-prices') where exists (select 1 from cron.job where jobname = 'tcg-refresh-prices');

select cron.schedule(
  'tcg-refresh-prices',
  '30 5 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/refresh-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{"force": true}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
