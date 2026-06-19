import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Notification types (mirror database.types.ts) ───────────────────────────

const VALID_TYPES = new Set([
  "ride_update",
  "order_update",
  "sos_update",
  "sos_alert",
  "wallet_credit",
  "wallet_debit",
  "driver_request",
  "system",
]);

// ─── Input / Output types ─────────────────────────────────────────────────────

type NotificationChannel = "in_app" | "sms" | "email" | "push";

interface SendNotificationRequest {
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[]; // defaults to ["in_app"]
}

interface ChannelResult {
  channel: NotificationChannel;
  success: boolean;
  reason?: string; // "sent" | "not_configured" | error message
}

interface SendNotificationResponse {
  notification_id: string | null; // null if in_app channel failed
  user_id: string;
  notification_type: string;
  channels_attempted: NotificationChannel[];
  channels_succeeded: NotificationChannel[];
  channels_failed: ChannelResult[];
}

// ─── Channel handlers ─────────────────────────────────────────────────────────

/**
 * in_app: inserts a row into the `notifications` table.
 * NotificationContext Realtime listener fires a toast on the client instantly.
 */
async function handleInApp(
  serviceClient: ReturnType<typeof createClient>,
  params: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, unknown> | null;
  },
): Promise<{ success: boolean; notification_id: string | null; reason?: string }> {
  const { data, error } = await serviceClient
    .from("notifications")
    .insert({
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data,
      is_read: false,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, notification_id: null, reason: error.message };
  }
  return { success: true, notification_id: data.id };
}

/**
 * sms: sends via Twilio SMS API.
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_FROM
 * User must have a `phone` field set in their `profiles` row.
 */
async function handleSms(
  serviceClient: ReturnType<typeof createClient>,
  params: { user_id: string; title: string; body: string },
): Promise<ChannelResult> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_FROM");

  if (!sid || !token || !from) {
    return { channel: "sms", success: false, reason: "not_configured" };
  }

  // Fetch user's phone number
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("phone")
    .eq("id", params.user_id)
    .maybeSingle();

  if (!profile?.phone) {
    return { channel: "sms", success: false, reason: "user_has_no_phone" };
  }

  const message = `${params.title}\n${params.body}`;
  const body = new URLSearchParams({ To: profile.phone, From: from, Body: message });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      return { channel: "sms", success: false, reason: `twilio_error: ${err}` };
    }
    return { channel: "sms", success: true, reason: "sent" };
  } catch (e) {
    return { channel: "sms", success: false, reason: String(e) };
  }
}

/**
 * email: sends via Resend API.
 * Requires: RESEND_API_KEY, RESEND_FROM_EMAIL
 * Fetches recipient email from auth.users via service_role.
 */
async function handleEmail(
  serviceClient: ReturnType<typeof createClient>,
  params: { user_id: string; title: string; body: string },
): Promise<ChannelResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "notifications@thecityapp.com";

  if (!apiKey) {
    return { channel: "email", success: false, reason: "not_configured" };
  }

  // Fetch user's email from auth via service_role admin API
  const { data: userData, error: userErr } = await serviceClient.auth.admin.getUserById(
    params.user_id,
  );

  if (userErr || !userData?.user?.email) {
    return { channel: "email", success: false, reason: "user_has_no_email" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: userData.user.email,
        subject: params.title,
        text: params.body,
        html: `<p>${params.body.replace(/\n/g, "<br>")}</p>`,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { channel: "email", success: false, reason: `resend_error: ${err}` };
    }
    return { channel: "email", success: true, reason: "sent" };
  } catch (e) {
    return { channel: "email", success: false, reason: String(e) };
  }
}

/**
 * push: sends via Expo Push Notifications API.
 * Requires: EXPO_ACCESS_TOKEN
 * User must have a push token stored — currently a stub (no push_tokens table yet).
 * Returns not_configured until a push_tokens table is implemented.
 */
async function handlePush(
  _serviceClient: ReturnType<typeof createClient>,
  _params: { user_id: string; title: string; body: string; data: Record<string, unknown> | null },
): Promise<ChannelResult> {
  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");

  if (!expoToken) {
    return { channel: "push", success: false, reason: "not_configured" };
  }

  // Push token lookup requires a `push_tokens` table (not yet implemented).
  // When that table exists, fetch the token here and POST to:
  // https://exp.host/--/api/v2/push/send
  return { channel: "push", success: false, reason: "push_tokens_table_not_implemented" };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: SendNotificationRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    user_id,
    notification_type,
    title,
    message,
    metadata = {},
    channels = ["in_app"],
  } = body;

  // ── Validate ────────────────────────────────────────────────────────────────
  if (!user_id || !notification_type || !title || !message) {
    return json(
      { error: "user_id, notification_type, title and message are required" },
      400,
    );
  }
  if (!VALID_TYPES.has(notification_type)) {
    return json(
      { error: `notification_type must be one of: ${[...VALID_TYPES].join(", ")}` },
      400,
    );
  }
  if (!Array.isArray(channels) || channels.length === 0) {
    return json({ error: "channels must be a non-empty array" }, 400);
  }
  const invalidChannels = channels.filter(
    (c) => !["in_app", "sms", "email", "push"].includes(c),
  );
  if (invalidChannels.length > 0) {
    return json(
      { error: `Invalid channels: ${invalidChannels.join(", ")}. Valid: in_app, sms, email, push` },
      400,
    );
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── Verify user exists ──────────────────────────────────────────────────────
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("id", user_id)
    .maybeSingle();

  if (!profile) {
    return json({ error: "User not found" }, 404);
  }

  // ── Run channels ────────────────────────────────────────────────────────────
  const channelParams = { user_id, title, body: message, data: metadata };

  const channelPromises = (channels as NotificationChannel[]).map(async (ch) => {
    switch (ch) {
      case "in_app": {
        const r = await handleInApp(serviceClient, {
          user_id,
          type: notification_type,
          title,
          body: message,
          data: metadata,
        });
        return {
          channel: ch as NotificationChannel,
          success: r.success,
          reason: r.reason,
          notification_id: r.notification_id,
        };
      }
      case "sms":
        return { ...(await handleSms(serviceClient, channelParams)), notification_id: null };
      case "email":
        return { ...(await handleEmail(serviceClient, channelParams)), notification_id: null };
      case "push":
        return { ...(await handlePush(serviceClient, { ...channelParams, data: metadata })), notification_id: null };
    }
  });

  const results = await Promise.all(channelPromises);

  const succeeded = results.filter((r) => r.success).map((r) => r.channel);
  const failed = results
    .filter((r) => !r.success)
    .map((r): ChannelResult => ({ channel: r.channel, success: false, reason: r.reason }));

  const inAppResult = results.find((r) => r.channel === "in_app");
  const notification_id = inAppResult?.notification_id ?? null;

  const response: SendNotificationResponse = {
    notification_id,
    user_id,
    notification_type,
    channels_attempted: channels as NotificationChannel[],
    channels_succeeded: succeeded,
    channels_failed: failed,
  };

  // 207 Multi-Status if any channel failed, 200 if all succeeded
  const status = failed.length > 0 && succeeded.length === 0 ? 500
    : failed.length > 0 ? 207
    : 200;

  return json(response, status);
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
