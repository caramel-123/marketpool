#!/usr/bin/env bash
# Seeds the two hackathon-demo pools on Stellar Testnet via the Stellar CLI,
# using the `marketpool-deployer` identity already configured locally
# (`stellar keys generate marketpool-deployer --network testnet --fund`).
#
# This only creates the on-chain pools and prints their pool_ids -- it does
# NOT insert the matching Supabase `markets`/`pool_metadata` rows, since that
# requires either a signed-in admin session (real RLS path) or direct SQL via
# `mcp__supabase__execute_sql` (bypasses RLS, used once during initial setup).
# See supabase/seed/demo_market_and_pools.sql for the matching rows this
# script's pool_ids were plugged into for the initial hackathon demo.
set -euo pipefail

POOL_CONTRACT_ID="${POOL_CONTRACT_ID:?Set POOL_CONTRACT_ID to the deployed pool_contract address}"
ADMIN_ADDRESS="${ADMIN_ADDRESS:?Set ADMIN_ADDRESS to the market admin's G... address}"
NATIVE_ASSET_CONTRACT_ID="${NATIVE_ASSET_CONTRACT_ID:-$(stellar contract id asset --asset native --network testnet)}"
SOURCE_IDENTITY="${SOURCE_IDENTITY:-marketpool-deployer}"
MARKET_ID="${MARKET_ID:-demo-market-1}"

echo "Using pool_contract: $POOL_CONTRACT_ID"
echo "Using admin address: $ADMIN_ADDRESS"
echo "Using native asset contract: $NATIVE_ASSET_CONTRACT_ID"
echo

echo "--- Creating daily pool (5 XLM, 1-day cycle, max 10 members) ---"
stellar contract invoke --id "$POOL_CONTRACT_ID" --source "$SOURCE_IDENTITY" --network testnet -- \
  create_pool \
  --admin "$ADMIN_ADDRESS" \
  --market_id "$MARKET_ID" \
  --contribution_amount 50000000 \
  --cycle_length_secs 86400 \
  --max_members 10 \
  --token "$NATIVE_ASSET_CONTRACT_ID"

echo
echo "--- Creating weekly pool (20 XLM, 7-day cycle, max 8 members) ---"
stellar contract invoke --id "$POOL_CONTRACT_ID" --source "$SOURCE_IDENTITY" --network testnet -- \
  create_pool \
  --admin "$ADMIN_ADDRESS" \
  --market_id "$MARKET_ID" \
  --contribution_amount 200000000 \
  --cycle_length_secs 604800 \
  --max_members 8 \
  --token "$NATIVE_ASSET_CONTRACT_ID"

echo
echo "Note the two pool_id values printed above (last line of each invoke)."
echo "Insert matching pool_metadata rows in Supabase using those ids -- see"
echo "supabase/seed/demo_market_and_pools.sql for the template used originally."
