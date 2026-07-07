// Freighter-signed-message -> Supabase session bridge.
//
// Two-step handshake:
//   1. { action: "challenge", wallet_address } -> { message } to sign with
//      Freighter's signMessage().
//   2. { action: "verify", wallet_address, signature } (base64 signature
//      over the challenge message) -> on success, { token_hash, email } which
//      the frontend exchanges client-side via
//      supabase.auth.verifyOtp({ token_hash, type: "magiclink" }) to obtain a
//      real Supabase session. Supabase embeds `user_metadata` in every
//      session JWT automatically, so `auth.jwt() -> 'user_metadata' ->>
//      'wallet_address'` in RLS policies (see auth_wallet() in the schema
//      migration) reflects the verified wallet with no custom Auth Hook
//      registration required.
//
// verify_jwt is disabled for this function (see deploy call) because callers
// have no Supabase session yet at the point they call it -- that's exactly
// what this function establishes.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Keypair, StrKey } from "npm:@stellar/stellar-sdk@15";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NONCE_TTL_MS = 5 * 60 * 1000;
const MESSAGE_PREFIX = "Market Pool login nonce: ";

function walletEmail(walletAddress: string): string {
  // Deterministic placeholder email so the same wallet always maps back to
  // the same Supabase auth user. Never actually emailed to anyone.
  return `${walletAddress.toLowerCase()}@wallet.marketpool.app`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "POST only" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const walletAddress = String(body.wallet_address ?? "");

  if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
    return jsonResponse({ error: "Invalid Stellar address" }, 400);
  }

  if (body.action === "challenge") {
    const nonce = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();

    const { error } = await admin
      .from("login_nonces")
      .upsert({ wallet_address: walletAddress, nonce, expires_at: expiresAt });
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ message: `${MESSAGE_PREFIX}${nonce}` });
  }

  if (body.action === "verify") {
    const signatureBase64 = String(body.signature ?? "");
    if (!signatureBase64) {
      return jsonResponse({ error: "Missing signature" }, 400);
    }

    const { data: row, error: fetchError } = await admin
      .from("login_nonces")
      .select("nonce, expires_at")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (fetchError || !row) {
      return jsonResponse({ error: "No pending challenge for this wallet -- request one first" }, 400);
    }
    if (new Date(row.expires_at as string).getTime() < Date.now()) {
      await admin.from("login_nonces").delete().eq("wallet_address", walletAddress);
      return jsonResponse({ error: "Challenge expired, request a new one" }, 400);
    }

    const signedMessage = `${MESSAGE_PREFIX}${row.nonce}`;
    // SEP-53 "Sign Message": the wallet signs raw (unhashed) ed25519 bytes of
    // "Stellar Signed Message:\n" + message.
    const payload = new TextEncoder().encode(`Stellar Signed Message:\n${signedMessage}`);
    let signatureBytes: Uint8Array;
    try {
      signatureBytes = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));
    } catch {
      return jsonResponse({ error: "signature must be base64-encoded" }, 400);
    }

    let verified = false;
    try {
      verified = Keypair.fromPublicKey(walletAddress).verify(payload, signatureBytes);
    } catch {
      verified = false;
    }

    if (!verified) {
      return jsonResponse({ error: "Signature verification failed" }, 401);
    }

    // Single-use: consume the nonce immediately so it can't be replayed.
    await admin.from("login_nonces").delete().eq("wallet_address", walletAddress);

    const email = walletEmail(walletAddress);
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) {
      return jsonResponse({ error: listError.message }, 500);
    }

    let userId = existingUsers.users.find((u) => u.email === email)?.id;
    if (userId) {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { wallet_address: walletAddress },
      });
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { wallet_address: walletAddress },
      });
      if (createError || !created?.user) {
        return jsonResponse({ error: createError?.message ?? "Failed to create auth user" }, 500);
      }
      userId = created.user.id;
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError || !linkData) {
      return jsonResponse({ error: linkError?.message ?? "Failed to generate session link" }, 500);
    }

    return jsonResponse({
      token_hash: linkData.properties.hashed_token,
      email,
    });
  }

  return jsonResponse({ error: "Unknown action -- expected 'challenge' or 'verify'" }, 400);
});
