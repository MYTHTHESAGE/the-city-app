import { supabase } from "./supabase";
import { RCCG_CAMP } from "./directions";

// ─── Wallet ──────────────────────────────────────────────────────────────────

export async function fetchWallet(userId: string) {
  const { data, error } = await supabase
    .from("wallets")
    .select("id, balance, currency")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchWalletTransactions(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, type, amount, status, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Profile / user_profiles ─────────────────────────────────────────────────

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, patch: { full_name?: string; phone?: string }) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function updateUserProfile(userId: string, patch: any) {
  const { data } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (data) {
    const { error } = await supabase.from("user_profiles").update(patch).eq("id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("user_profiles").insert({ id: userId, ...patch });
    if (error) throw error;
  }
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export async function fetchVendors() {
  const { data, error } = await supabase
    .from("vendor_profiles")
    .select("id, business_name, category, location_in_camp, logo_url, cover_url, rating, is_open")
    .eq("is_open", true)
    .order("rating", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchVendorById(vendorId: string) {
  const { data, error } = await supabase
    .from("vendor_profiles")
    .select("id, business_name, category, tagline, description, logo_url, cover_url, rating, is_open, opening_hours, location_in_camp")
    .eq("id", vendorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateVendorProfile(vendorId: string, patch: any) {
  const cleanPatch = {
    business_name: patch.business_name ?? "Vendor",
    ...patch,
  };
  const { error } = await supabase
    .from("vendor_profiles")
    .upsert({ id: vendorId, ...cleanPatch });
  if (error) throw error;
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function fetchProductsByVendor(vendorId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, image_url, stock_status, is_available, sort_order, updated_at")
    .eq("vendor_id", vendorId)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllProductsByVendor(vendorId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, image_url, stock_status, is_available, sort_order, updated_at")
    .eq("vendor_id", vendorId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertProduct(
  vendorId: string,
  product: {
    id?: string;
    name: string;
    description?: string | null;
    price: number;
    image_url?: string | null;
    stock_status?: any;
    is_available?: boolean;
    sort_order?: number;
  },
) {
  if (product.id) {
    const { error } = await supabase
      .from("products")
      .update(product)
      .eq("id", product.id)
      .eq("vendor_id", vendorId);
    if (error) throw error;
    return product.id;
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...product, vendor_id: vendorId })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw error;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function createOrder(payload: {
  user_id: string;
  vendor_id: string;
  status: any;
  method: any;
  delivery_address?: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: any;
  items: { product_id?: string; product_name: string; product_price: number; quantity: number; subtotal: number }[];
}) {
  const { items, ...orderFields } = payload;
  const { data: order, error } = await supabase
    .from("orders")
    .insert(orderFields)
    .select("id")
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((it) => ({ ...it, order_id: order.id })),
  );
  if (itemsError) throw itemsError;
  return order.id as string;
}

export async function fetchOrderById(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, status, method, delivery_address, delivery_location, subtotal, delivery_fee, total,
      payment_method, payment_status, notes, created_at, driver_id,
      vendor_profiles ( business_name, pickup_location, location_in_camp ),
      driver_profiles ( id, vehicle_type, current_location, profiles ( full_name ) ),
      order_items ( id, product_name, product_price, quantity, subtotal )
    `)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUserOrders(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, status, method, total, created_at,
      vendor_profiles ( business_name )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchVendorOrders(vendorId: string, statuses?: string[]) {
  let q = supabase
    .from("orders")
    .select(`
      id, status, method, delivery_address, subtotal, total, payment_method, created_at,
      profiles ( full_name ),
      order_items ( product_name, quantity )
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (statuses && statuses.length > 0) {
    q = q.in("status", statuses as any);
  }

  const { data, error } = await q.limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(orderId: string, status: string) {
  const patch: any = { status };
  if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
  if (status === "ready") patch.ready_at = new Date().toISOString();
  if (status === "picked_up") patch.picked_up_at = new Date().toISOString();
  if (status === "delivered") patch.delivered_at = new Date().toISOString();

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) throw error;
}

// ─── Vendor sales analytics ──────────────────────────────────────────────────

export async function fetchVendorSalesStats(vendorId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("orders")
    .select("id, total, status, created_at, order_items ( product_name, quantity, subtotal )")
    .eq("vendor_id", vendorId)
    .gte("created_at", todayStart.toISOString())
    .in("status", ["confirmed", "preparing", "ready", "picked_up", "delivered"]);
  if (error) throw error;
  return data ?? [];
}

// ─── Edge Function callers ────────────────────────────────────────────────────

export interface MatchDriverResult {
  ride_id: string;
  status: "dispatched" | "no_drivers";
  candidates: {
    driver_id: string;
    full_name: string;
    vehicle_type: string;
    license_plate: string;
    rating: number;
    distance_m: number;
  }[];
  requests_sent: number;
  attempt_number: number;
}

export async function invokeMatchDriver(params: {
  ride_id: string;
  pickup_lat: number;
  pickup_lng: number;
  radius_m?: number;
}): Promise<MatchDriverResult> {
  const { data, error } = await supabase.functions.invoke<MatchDriverResult>(
    "match-driver",
    { body: params },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No response from match-driver function");
  return data;
}

export interface FareBreakdown {
  vehicle_type: string;
  distance_km: number;
  base_fare: number;
  distance_fare: number;
  total_fare: number;
  currency: string;
  breakdown: { label: string; amount: number }[];
}

export async function invokeCalculateFare(params: {
  distance_km: number;
  vehicle_type?: string;
}): Promise<FareBreakdown> {
  const { data, error } = await supabase.functions.invoke<FareBreakdown>(
    "calculate-fare",
    { body: params },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No response from calculate-fare function");
  return data;
}

export interface BroadcastSosResult {
  alert_id: string;
  status: "dispatched" | "no_responders";
  alert_type: "health" | "security";
  candidates: {
    responder_id: string;
    full_name: string;
    role: string;
    distance_m: number;
  }[];
  notifications_sent: number;
  attempt_number: number;
}

export async function invokeBroadcastSos(params: {
  sos_alert_id: string;
  alert_type: "health" | "security";
  latitude: number;
  longitude: number;
  radius_m?: number;
}): Promise<BroadcastSosResult> {
  const { data, error } = await supabase.functions.invoke<BroadcastSosResult>(
    "broadcast-sos",
    { body: params },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No response from broadcast-sos function");
  return data;
}

export type NotificationChannel = "in_app" | "sms" | "email" | "push";
export type NotificationType =
  | "ride_update"
  | "order_update"
  | "sos_update"
  | "sos_alert"
  | "wallet_credit"
  | "wallet_debit"
  | "driver_request"
  | "system";

export interface SendNotificationResult {
  notification_id: string | null;
  user_id: string;
  notification_type: string;
  channels_attempted: NotificationChannel[];
  channels_succeeded: NotificationChannel[];
  channels_failed: { channel: NotificationChannel; success: false; reason?: string }[];
}

export async function invokeSendNotification(params: {
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
}): Promise<SendNotificationResult> {
  const { data, error } = await supabase.functions.invoke<SendNotificationResult>(
    "send-notification",
    { body: params },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No response from send-notification function");
  return data;
}

// ─── Rides ───────────────────────────────────────────────────────────────────

export async function createRideRequest(payload: {
  user_id: string;
  pickup_address: string;
  dropoff_address: string;
  fare?: number;
  payment_method: any;
}) {
  const { data, error } = await supabase
    .from("ride_requests")
    .insert({
      ...payload,
      status: "pending",
      pickup_location: `POINT(${RCCG_CAMP.lng} ${RCCG_CAMP.lat})`,
      dropoff_location: `POINT(${RCCG_CAMP.lng} ${RCCG_CAMP.lat})`,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function fetchUserRides(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from("ride_requests")
    .select("id, status, pickup_address, dropoff_address, fare, payment_method, created_at, completed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDriverRequests(driverId: string) {
  const { data, error } = await supabase
    .from("driver_requests")
    .select(`
      id, request_type, status, distance_m, created_at,
      ride_requests ( id, pickup_address, dropoff_address, fare, user_id, profiles!ride_requests_user_id_fkey ( full_name ) ),
      orders ( id, delivery_address, total, user_id, profiles!orders_user_id_fkey ( full_name ), vendor_profiles ( business_name, location_in_camp ) )
    `)
    .eq("driver_id", driverId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDriverStats(driverId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [rideRes, deliveryRes] = await Promise.all([
    supabase
      .from("ride_requests")
      .select("id, fare")
      .eq("driver_id", driverId)
      .eq("status", "completed")
      .gte("completed_at", todayStart.toISOString()),
    supabase
      .from("orders")
      .select("id, delivery_fee")
      .eq("driver_id", driverId)
      .eq("status", "delivered")
      .gte("delivered_at", todayStart.toISOString()),
  ]);

  const rides = rideRes.data ?? [];
  const deliveries = deliveryRes.data ?? [];
  const totalTrips = rides.length + deliveries.length;
  const earnings =
    rides.reduce((s, r) => s + Number(r.fare ?? 0), 0) +
    deliveries.reduce((s, d) => s + Number(d.delivery_fee ?? 0), 0);

  return { totalTrips, earnings };
}

export async function updateDriverStatus(driverId: string, status: "online" | "offline" | "busy") {
  // First, check if the driver profile exists. If not, insert it; otherwise, update it.
  const { data, error } = await supabase
    .from("driver_profiles")
    .update({ status })
    .eq("id", driverId)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { error: upsertError } = await supabase
      .from("driver_profiles")
      .upsert({
        id: driverId,
        status,
        vehicle_type: "tricycle", // default fallback vehicle type (Keke)
        license_plate: "PENDING", // default fallback license plate
      });
    if (upsertError) throw upsertError;
  }
}

export async function fetchDriverProfile(driverId: string) {
  const { data, error } = await supabase
    .from("driver_profiles")
    .select("id, vehicle_type, license_plate, association_id, permit_info, base_location, status, rating")
    .eq("id", driverId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDriverProfile(driverId: string, patch: any) {
  const cleanPatch = {
    vehicle_type: patch.vehicle_type ?? "tricycle",
    license_plate: patch.license_plate ?? "PENDING",
    ...patch,
  };
  const { error } = await supabase
    .from("driver_profiles")
    .upsert({ id: driverId, ...cleanPatch });
  if (error) throw error;
}

export async function updateResponderProfile(responderId: string, patch: any) {
  const { error } = await supabase
    .from("responder_profiles")
    .upsert({ id: responderId, ...patch });
  if (error) throw error;
}

// ─── SOS ─────────────────────────────────────────────────────────────────────

export async function createSosAlert(payload: {
  user_id: string;
  sos_type: "health" | "security";
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
}) {
  const { user_id, sos_type, lat, lng, notes } = payload;
  // location is NOT NULL — use fallback RCCG Camp coords if GPS unavailable
  const resolvedLat = lat ?? RCCG_CAMP.lat;
  const resolvedLng = lng ?? RCCG_CAMP.lng;
  const locationGeo = `POINT(${resolvedLng} ${resolvedLat})`;

  const { data, error } = await supabase
    .from("sos_alerts")
    .insert({
      user_id,
      type: sos_type,
      status: "pending",
      location: locationGeo,
      notes,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function fetchSosAlertById(alertId: string) {
  const { data, error } = await supabase
    .from("sos_alerts")
    .select(`
      id, type, status, notes, location, location_address, dispatched_at, responder_arrived_at, resolved_at, created_at,
      profiles!sos_alerts_user_id_fkey (
        full_name,
        phone,
        user_profiles (
          blood_type,
          allergies,
          health_info,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_rel
        )
      ),
      responder_profiles ( id, current_location, profiles ( full_name ) )
    `)
    .eq("id", alertId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUserSosAlerts(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from("sos_alerts")
    .select("id, type, status, notes, created_at, dispatched_at, resolved_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Recent activity feed ────────────────────────────────────────────────────

export async function fetchRecentActivity(userId: string, limit = 10) {
  const [ridesRes, ordersRes, sosRes, txnRes] = await Promise.all([
    supabase
      .from("ride_requests")
      .select("id, pickup_address, dropoff_address, fare, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("orders")
      .select("id, total, status, created_at, vendor_profiles ( business_name )")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("sos_alerts")
      .select("id, type, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("wallet_transactions")
      .select("id, type, amount, status, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  type ActivityItem = {
    id: string;
    kind: "ride" | "order" | "sos" | "wallet";
    title: string;
    sub: string;
    amount: string;
    positive: boolean;
    created_at: string;
  };

  const items: ActivityItem[] = [];

  for (const r of ridesRes.data ?? []) {
    items.push({
      id: r.id,
      kind: "ride",
      title: `${r.pickup_address} → ${r.dropoff_address}`,
      sub: r.status,
      amount: r.fare ? `-₦${Number(r.fare).toLocaleString()}` : "",
      positive: false,
      created_at: r.created_at,
    });
  }
  for (const o of ordersRes.data ?? []) {
    const vendor = (o.vendor_profiles as { business_name: string } | null)?.business_name ?? "Vendor";
    items.push({
      id: o.id,
      kind: "order",
      title: `Order from ${vendor}`,
      sub: o.status,
      amount: `-₦${Number(o.total).toLocaleString()}`,
      positive: false,
      created_at: o.created_at,
    });
  }
  for (const s of sosRes.data ?? []) {
    items.push({
      id: s.id,
      kind: "sos",
      title: `SOS — ${s.type}`,
      sub: s.status,
      amount: "",
      positive: false,
      created_at: s.created_at,
    });
  }
  for (const t of txnRes.data ?? []) {
    const isCredit = ["deposit", "ride_refund", "order_refund", "driver_earning", "vendor_earning"].includes(t.type);
    items.push({
      id: t.id,
      kind: "wallet",
      title: t.description ?? t.type.replace(/_/g, " "),
      sub: t.status,
      amount: `${isCredit ? "+" : "-"}₦${Number(t.amount).toLocaleString()}`,
      positive: isCredit,
      created_at: t.created_at,
    });
  }

  return items
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

// ─── Driver request accept / decline ────────────────────────────────────────

export async function acceptDriverRequest(requestId: string, driverId: string, requestType: "ride" | "delivery", linkedId: string) {
  const now = new Date().toISOString();

  const { error: reqError } = await supabase
    .from("driver_requests")
    .update({ status: "accepted", responded_at: now })
    .eq("id", requestId);
  if (reqError) throw reqError;

  if (requestType === "ride") {
    const { error } = await supabase
      .from("ride_requests")
      .update({ driver_id: driverId, status: "driver_assigned", accepted_at: now })
      .eq("id", linkedId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("orders")
      .update({ driver_id: driverId, status: "picked_up", picked_up_at: now })
      .eq("id", linkedId);
    if (error) throw error;
  }
}

export async function declineDriverRequest(requestId: string) {
  const { error } = await supabase
    .from("driver_requests")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
}

// ─── Responder ────────────────────────────────────────────────────────────────

export async function fetchResponderProfile(userId: string) {
  const { data, error } = await supabase
    .from("responder_profiles")
    .select("id, status, current_location")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const ACTIVE_SOS_STATUSES = [
  "pending",
  "dispatched",
  "responder_assigned",
  "responder_enroute",
  "on_scene",
  "escalated",
] as const;

export type ActiveSosStatus = (typeof ACTIVE_SOS_STATUSES)[number];
export type SosActionStatus = "dispatched" | "responder_assigned" | "responder_enroute" | "on_scene" | "resolved" | "false_alarm" | "escalated";

export async function fetchPendingSosAlerts(role: "medical_responder" | "security_responder" | "super_admin", limit = 50) {
  let query = supabase
    .from("sos_alerts")
    .select(`
      id, type, status, responder_id, location, location_address, notes, created_at, dispatched_at, responder_arrived_at, resolved_at,
      profiles!sos_alerts_user_id_fkey (
        full_name,
        phone,
        user_profiles (
          blood_type,
          allergies,
          health_info,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_rel
        )
      )
    `)
    .in("status", [...ACTIVE_SOS_STATUSES])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (role === "medical_responder") {
    query = query.eq("type", "health");
  } else if (role === "security_responder") {
    query = query.eq("type", "security");
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchResolvedSosAlerts(role: "medical_responder" | "security_responder" | "super_admin", limit = 20) {
  let query = supabase
    .from("sos_alerts")
    .select("id, type, status, location, location_address, notes, created_at, resolved_at, profiles!sos_alerts_user_id_fkey ( full_name )")
    .in("status", ["resolved", "false_alarm", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (role === "medical_responder") {
    query = query.eq("type", "health");
  } else if (role === "security_responder") {
    query = query.eq("type", "security");
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function assignSosAlert(alertId: string, responderId: string) {
  const { error } = await supabase
    .from("sos_alerts")
    .update({
      status: "responder_assigned",
      responder_id: responderId,
      dispatched_at: new Date().toISOString(),
    })
    .eq("id", alertId);
  if (error) throw error;
}

export async function updateSosAlertStatus(alertId: string, status: SosActionStatus) {
  const patch: any = { status };
  if (status === "dispatched") patch.dispatched_at = new Date().toISOString();
  if (status === "on_scene") patch.responder_arrived_at = new Date().toISOString();
  if (status === "resolved") patch.resolved_at = new Date().toISOString();

  const { error } = await supabase.from("sos_alerts").update(patch).eq("id", alertId);
  if (error) throw error;
}

export async function fetchSosStatusHistory(alertId: string) {
  const { data, error } = await supabase
    .from("sos_status_history")
    .select("id, status, changed_by, note, created_at")
    .eq("alert_id", alertId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ─── Ride detail / lifecycle ─────────────────────────────────────────────────

export async function fetchRideById(rideId: string) {
  const { data, error } = await supabase
    .from("ride_requests")
    .select(`
      id, status, pickup_address, pickup_location, dropoff_address, dropoff_location, fare,
      payment_method, created_at, accepted_at, started_at, completed_at,
      driver_profiles ( id, vehicle_type, license_plate, rating, current_location,
        profiles ( full_name, phone )
      )
    `)
    .eq("id", rideId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchActiveRide(userId: string) {
  const { data, error } = await supabase
    .from("ride_requests")
    .select(`
      id, status, pickup_address, pickup_location, dropoff_address, dropoff_location, fare,
      payment_method, created_at, accepted_at, started_at,
      driver_profiles ( id, vehicle_type, license_plate, rating, current_location,
        profiles ( full_name, phone )
      )
    `)
    .eq("user_id", userId)
    .in("status", ["pending", "searching", "driver_assigned", "driver_enroute", "driver_arrived", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function cancelRideRequest(rideId: string) {
  const { error } = await supabase
    .from("ride_requests")
    .update({ status: "cancelled", cancelled_by: "user" })
    .eq("id", rideId);
  if (error) throw error;
}

export async function rateRide(rideId: string, rating: number, comment?: string) {
  const { error } = await supabase
    .from("ride_requests")
    .update({ rating, rating_comment: comment ?? null })
    .eq("id", rideId);
  if (error) throw error;
}

// ─── Map RPCs ─────────────────────────────────────────────────────────────────

export interface OnlineDriverMapRow {
  driver_id: string;
  lat: number;
  lng: number;
  vehicle_type: string | null;
  rating: number | null;
}

export async function fetchOnlineDriversMap(): Promise<OnlineDriverMapRow[]> {
  const { data, error } = await supabase.rpc("get_online_drivers_map");
  if (error) throw error;
  return (data ?? []) as OnlineDriverMapRow[];
}

export interface PendingSosAlertMapRow {
  alert_id: string;
  alert_type: string;
  status: string;
  lat: number;
  lng: number;
}

export async function fetchPendingSosAlertsMap(): Promise<PendingSosAlertMapRow[]> {
  const { data, error } = await supabase.rpc("get_pending_sos_alerts_map");
  if (error) throw error;
  return (data ?? []) as PendingSosAlertMapRow[];
}

export async function fetchRegisteredUsersCount() {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "user");
  if (error) throw error;
  return count ?? 0;
}

export async function fetchRegisteredUsersList(search?: string, limit = 50) {
  let query = supabase
    .from("profiles")
    .select(`
      id, full_name, phone, role, created_at,
      user_profiles (
        location_in_camp,
        residential_address,
        blood_type,
        allergies,
        health_info,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_rel
      )
    `)
    .eq("role", "user")
    .order("full_name", { ascending: true })
    .limit(limit);

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchDriverTripHistory(driverId: string, limit = 30) {
  const [ridesRes, ordersRes] = await Promise.all([
    supabase
      .from("ride_requests")
      .select("id, pickup_address, dropoff_address, fare, status, rating, created_at, completed_at, profiles!ride_requests_user_id_fkey ( full_name )")
      .eq("driver_id", driverId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(limit),
    supabase
      .from("orders")
      .select("id, delivery_address, total, status, delivery_fee, created_at, delivered_at, profiles!orders_user_id_fkey ( full_name ), vendor_profiles ( business_name )")
      .eq("driver_id", driverId)
      .eq("status", "delivered")
      .order("delivered_at", { ascending: false })
      .limit(limit),
  ]);

  const rides = (ridesRes.data ?? []).map((r) => ({
    id: r.id,
    type: "ride" as const,
    customer: r.profiles?.full_name ?? "Customer",
    from: r.pickup_address,
    to: r.dropoff_address,
    earning: Number(r.fare ?? 0),
    rating: r.rating ?? 5,
    timestamp: r.completed_at || r.created_at,
  }));

  const deliveries = (ordersRes.data ?? []).map((o) => ({
    id: o.id,
    type: "delivery" as const,
    customer: o.profiles?.full_name ?? "Customer",
    from: o.vendor_profiles?.business_name ?? "Vendor Store",
    to: o.delivery_address ?? "—",
    earning: Number(o.delivery_fee ?? 0),
    rating: 5,
    timestamp: o.delivered_at || o.created_at,
  }));

  return [...rides, ...deliveries]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}



