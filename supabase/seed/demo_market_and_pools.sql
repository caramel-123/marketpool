-- Demo data for the hackathon pitch, applied once via
-- mcp__supabase__execute_sql (bypasses RLS -- this is a one-time seed
-- operation, not something the app does at runtime). Pool ids below (0, 1)
-- came from running contracts/scripts/seed_demo_pools.sh against the
-- deployed pool_contract on Testnet; update them if you re-seed elsewhere.
insert into markets (id, name, location_text, admin_wallet)
values (
  '11111111-1111-1111-1111-111111111111',
  'Barangay Palengke Demo Market',
  'Quezon City, Metro Manila',
  'GAQ2SOW2URO3Y5JJPQS5GRI7MXREUEYZZXOVH5CHDC7KRIAOAQWFCUQ3'
)
on conflict (id) do nothing;

insert into pool_metadata (pool_id, market_id, display_name, description, is_seed_demo, created_by)
values
  (
    '0',
    '11111111-1111-1111-1111-111111111111',
    'Daily Ulam Pool',
    'Daily 5 XLM contribution, 10 members max, quick rotation for demo purposes.',
    true,
    'GAQ2SOW2URO3Y5JJPQS5GRI7MXREUEYZZXOVH5CHDC7KRIAOAQWFCUQ3'
  ),
  (
    '1',
    '11111111-1111-1111-1111-111111111111',
    'Weekly Puhunan Pool',
    'Weekly 20 XLM contribution, 8 members max, standard paluwagan cadence.',
    true,
    'GAQ2SOW2URO3Y5JJPQS5GRI7MXREUEYZZXOVH5CHDC7KRIAOAQWFCUQ3'
  )
on conflict (pool_id) do nothing;
