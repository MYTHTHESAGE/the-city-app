export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums / Types ────────────────────────────────────────────────────────────

export type UserRole =
  | "user"
  | "driver"
  | "vendor"
  | "security_responder"
  | "medical_responder"
  | "super_admin";

export type VehicleType =
  | "car"
  | "motorbike"
  | "tricycle"
  | "bicycle"
  | "van"
  | "truck";

export type VendorCategory =
  | "food_drink"
  | "groceries"
  | "fashion_beauty"
  | "electronics"
  | "books_stationery"
  | "health_pharmacy"
  | "services"
  | "other";

export type BloodType =
  | "a_pos"
  | "a_neg"
  | "b_pos"
  | "b_neg"
  | "ab_pos"
  | "ab_neg"
  | "o_pos"
  | "o_neg"
  | "unknown";

export type DriverStatus = "online" | "offline" | "busy";

export type RideStatus =
  | "pending"
  | "searching"
  | "driver_assigned"
  | "driver_enroute"
  | "driver_arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type SosType = "health" | "security";

export type SosStatus =
  | "pending"
  | "dispatched"
  | "responder_assigned"
  | "responder_enroute"
  | "on_scene"
  | "resolved"
  | "false_alarm"
  | "cancelled"
  | "escalated";

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "ride_payment"
  | "ride_refund"
  | "order_payment"
  | "order_refund"
  | "tip"
  | "driver_earning"
  | "vendor_earning";

export type TransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "reversed";

export type PaymentMethod = "wallet" | "cash" | "paystack";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type DisplayStyle = "grid" | "list" | "featured";

export type DeliveryMethod = "delivery" | "pickup";

export type DriverRequestStatus = "pending" | "accepted" | "declined" | "expired";

// ─── Database Definition ──────────────────────────────────────────────────────

type GeneratedDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          is_verified: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          location_in_camp: string | null;
          residential_address: string | null;
          blood_type: BloodType | null;
          allergies: string | null;
          health_info: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_rel: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          location_in_camp?: string | null;
          residential_address?: string | null;
          blood_type?: BloodType | null;
          allergies?: string | null;
          health_info?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_rel?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          location_in_camp?: string | null;
          residential_address?: string | null;
          blood_type?: BloodType | null;
          allergies?: string | null;
          health_info?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_rel?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      driver_profiles: {
        Row: {
          id: string;
          vehicle_type: VehicleType;
          license_plate: string;
          association_id: string | null;
          permit_info: string | null;
          base_location: string | null;
          current_location: any | null; // geography point
          status: DriverStatus;
          rating: number;
          total_trips: number;
          total_earnings: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          vehicle_type: VehicleType;
          license_plate: string;
          association_id?: string | null;
          permit_info?: string | null;
          base_location?: string | null;
          current_location?: any | null;
          status?: DriverStatus;
          rating?: number;
          total_trips?: number;
          total_earnings?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vehicle_type?: VehicleType;
          license_plate?: string;
          association_id?: string | null;
          permit_info?: string | null;
          base_location?: string | null;
          current_location?: any | null;
          status?: DriverStatus;
          rating?: number;
          total_trips?: number;
          total_earnings?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendor_profiles: {
        Row: {
          id: string;
          business_name: string;
          category: VendorCategory;
          business_address: string | null;
          pickup_location: any | null;
          location_in_camp: string | null;
          tagline: string | null;
          description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          display_style: DisplayStyle;
          opening_hours: string | null;
          is_open: boolean;
          rating: number;
          total_orders: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          business_name: string;
          category?: VendorCategory;
          business_address?: string | null;
          pickup_location?: any | null;
          location_in_camp?: string | null;
          tagline?: string | null;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          display_style?: DisplayStyle;
          opening_hours?: string | null;
          is_open?: boolean;
          rating?: number;
          total_orders?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          category?: VendorCategory;
          business_address?: string | null;
          pickup_location?: any | null;
          location_in_camp?: string | null;
          tagline?: string | null;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          display_style?: DisplayStyle;
          opening_hours?: string | null;
          is_open?: boolean;
          rating?: number;
          total_orders?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      responder_profiles: {
        Row: {
          id: string;
          badge_number: string | null;
          current_location: any | null;
          status: DriverStatus;
          assigned_zone: string | null;
          total_responses: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          badge_number?: string | null;
          current_location?: any | null;
          status?: DriverStatus;
          assigned_zone?: string | null;
          total_responses?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          badge_number?: string | null;
          current_location?: any | null;
          status?: DriverStatus;
          assigned_zone?: string | null;
          total_responses?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          stock_status: StockStatus;
          is_available: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          stock_status?: StockStatus;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          stock_status?: StockStatus;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          vendor_id: string;
          driver_id: string | null;
          status: OrderStatus;
          method: DeliveryMethod;
          delivery_address: string | null;
          delivery_location: any | null;
          subtotal: number;
          delivery_fee: number;
          total: number;
          payment_method: PaymentMethod;
          payment_status: "pending" | "paid" | "refunded";
          notes: string | null;
          confirmed_at: string | null;
          ready_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          prep_time_minutes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vendor_id: string;
          driver_id?: string | null;
          status?: OrderStatus;
          method?: DeliveryMethod;
          delivery_address?: string | null;
          delivery_location?: any | null;
          subtotal: number;
          delivery_fee?: number;
          total: number;
          payment_method?: PaymentMethod;
          payment_status?: "pending" | "paid" | "refunded";
          notes?: string | null;
          confirmed_at?: string | null;
          ready_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          prep_time_minutes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vendor_id?: string;
          driver_id?: string | null;
          status?: OrderStatus;
          method?: DeliveryMethod;
          delivery_address?: string | null;
          delivery_location?: any | null;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          payment_method?: PaymentMethod;
          payment_status?: "pending" | "paid" | "refunded";
          notes?: string | null;
          confirmed_at?: string | null;
          ready_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          prep_time_minutes?: number | null;
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          product_price: number;
          quantity: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          product_price: number;
          quantity: number;
          subtotal: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          product_price?: number;
          quantity?: number;
          subtotal?: number;
          created_at?: string;
        };
      };
      ride_requests: {
        Row: {
          id: string;
          user_id: string;
          driver_id: string | null;
          pickup_address: string;
          pickup_location: any;
          dropoff_address: string;
          dropoff_location: any;
          status: RideStatus;
          fare: number | null;
          payment_method: PaymentMethod;
          rating: number | null;
          rating_comment: string | null;
          cancelled_by: "user" | "driver" | "system" | null;
          cancel_reason: string | null;
          accepted_at: string | null;
          driver_arrived_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          scheduled_for: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          driver_id?: string | null;
          pickup_address: string;
          pickup_location: any;
          dropoff_address: string;
          dropoff_location: any;
          status?: RideStatus;
          fare?: number | null;
          payment_method: PaymentMethod;
          rating?: number | null;
          rating_comment?: string | null;
          cancelled_by?: "user" | "driver" | "system" | null;
          cancel_reason?: string | null;
          accepted_at?: string | null;
          driver_arrived_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          driver_id?: string | null;
          pickup_address?: string;
          pickup_location?: any;
          dropoff_address?: string;
          dropoff_location?: any;
          status?: RideStatus;
          fare?: number | null;
          payment_method?: PaymentMethod;
          rating?: number | null;
          rating_comment?: string | null;
          cancelled_by?: "user" | "driver" | "system" | null;
          cancel_reason?: string | null;
          accepted_at?: string | null;
          driver_arrived_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
        };
      };
      driver_requests: {
        Row: {
          id: string;
          driver_id: string;
          request_type: "ride" | "delivery";
          ride_id: string | null;
          order_id: string | null;
          status: DriverRequestStatus;
          distance_m: number | null;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          driver_id: string;
          request_type: "ride" | "delivery";
          ride_id?: string | null;
          order_id?: string | null;
          status?: DriverRequestStatus;
          distance_m?: number | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          driver_id?: string;
          request_type?: "ride" | "delivery";
          ride_id?: string | null;
          order_id?: string | null;
          status?: DriverRequestStatus;
          distance_m?: number | null;
          created_at?: string;
          responded_at?: string | null;
        };
      };
      sos_alerts: {
        Row: {
          id: string;
          user_id: string;
          type: SosType;
          location: any;
          location_address: string | null;
          status: SosStatus;
          responder_id: string | null;
          notes: string | null;
          dispatched_at: string | null;
          responder_arrived_at: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: SosType;
          location: any;
          location_address?: string | null;
          status?: SosStatus;
          responder_id?: string | null;
          notes?: string | null;
          dispatched_at?: string | null;
          responder_arrived_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: SosType;
          location?: any;
          location_address?: string | null;
          status?: SosStatus;
          responder_id?: string | null;
          notes?: string | null;
          dispatched_at?: string | null;
          responder_arrived_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
      };
      sos_status_history: {
        Row: {
          id: string;
          alert_id: string;
          status: SosStatus;
          changed_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          alert_id: string;
          status: SosStatus;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          alert_id?: string;
          status?: SosStatus;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type:
            | "ride_update"
            | "order_update"
            | "sos_update"
            | "sos_alert"
            | "wallet_credit"
            | "wallet_debit"
            | "driver_request"
            | "system";
          title: string;
          body: string;
          data: Json | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type:
            | "ride_update"
            | "order_update"
            | "sos_update"
            | "sos_alert"
            | "wallet_credit"
            | "wallet_debit"
            | "driver_request"
            | "system";
          title: string;
          body: string;
          data?: Json | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?:
            | "ride_update"
            | "order_update"
            | "sos_update"
            | "sos_alert"
            | "wallet_credit"
            | "wallet_debit"
            | "driver_request"
            | "system";
          title?: string;
          body?: string;
          data?: Json | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          currency: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          currency?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          currency?: string;
          updated_at?: string;
        };
      };
      wallet_transactions: {
        Row: {
          id: string;
          wallet_id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          status: TransactionStatus;
          reference: string | null;
          description: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          status?: TransactionStatus;
          reference?: string | null;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          wallet_id?: string;
          user_id?: string;
          type?: TransactionType;
          amount?: number;
          status?: TransactionStatus;
          reference?: string | null;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      paystack_payments: {
        Row: {
          id: string;
          user_id: string;
          reference: string;
          amount: number;
          status: string;
          channel: string | null;
          gateway_response: string | null;
          paid_at: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reference: string;
          amount: number;
          status?: string;
          channel?: string | null;
          gateway_response?: string | null;
          paid_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reference?: string;
          amount?: number;
          status?: string;
          channel?: string | null;
          gateway_response?: string | null;
          paid_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      saved_locations: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          address: string;
          location_coords: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          address: string;
          location_coords: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          address?: string;
          location_coords?: any;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      debit_wallet: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_type: string;
          p_reference?: string;
          p_description?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      credit_wallet: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_type: string;
          p_reference?: string;
          p_description?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      get_online_drivers_map: {
        Args: Record<PropertyKey, never>;
        Returns: {
          driver_id: string;
          lat: number;
          lng: number;
          vehicle_type: VehicleType | null;
          rating: number | null;
        }[];
      };
      get_pending_sos_alerts_map: {
        Args: Record<PropertyKey, never>;
        Returns: {
          alert_id: string;
          alert_type: string;
          status: string;
          lat: number;
          lng: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      vehicle_type: VehicleType;
      vendor_category: VendorCategory;
      blood_type: BloodType;
      driver_status: DriverStatus;
      ride_status: RideStatus;
      order_status: OrderStatus;
      sos_type: SosType;
      sos_status: SosStatus;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      payment_method: PaymentMethod;
      stock_status: StockStatus;
      display_style: DisplayStyle;
      delivery_method: DeliveryMethod;
      driver_request_status: DriverRequestStatus;
    };
  };
};

type TableRelationships = {
  saved_locations: [
    {
      foreignKeyName: "saved_locations_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
  profiles: [];
  user_profiles: [
    {
      foreignKeyName: "user_profiles_id_fkey";
      columns: ["id"];
      isOneToOne: true;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
  driver_profiles: [
    {
      foreignKeyName: "driver_profiles_id_fkey";
      columns: ["id"];
      isOneToOne: true;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
  vendor_profiles: [
    {
      foreignKeyName: "vendor_profiles_id_fkey";
      columns: ["id"];
      isOneToOne: true;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
  responder_profiles: [
    {
      foreignKeyName: "responder_profiles_id_fkey";
      columns: ["id"];
      isOneToOne: true;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
  products: [
    {
      foreignKeyName: "products_vendor_id_fkey";
      columns: ["vendor_id"];
      isOneToOne: false;
      referencedRelation: "vendor_profiles";
      referencedColumns: ["id"];
    }
  ];
  ride_requests: [
    {
      foreignKeyName: "ride_requests_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "ride_requests_driver_id_fkey";
      columns: ["driver_id"];
      isOneToOne: false;
      referencedRelation: "driver_profiles";
      referencedColumns: ["id"];
    }
  ];
  orders: [
    {
      foreignKeyName: "orders_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "orders_vendor_id_fkey";
      columns: ["vendor_id"];
      isOneToOne: false;
      referencedRelation: "vendor_profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "orders_driver_id_fkey";
      columns: ["driver_id"];
      isOneToOne: false;
      referencedRelation: "driver_profiles";
      referencedColumns: ["id"];
    }
  ];
  order_items: [
    {
      foreignKeyName: "order_items_order_id_fkey";
      columns: ["order_id"];
      isOneToOne: false;
      referencedRelation: "orders";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "order_items_product_id_fkey";
      columns: ["product_id"];
      isOneToOne: false;
      referencedRelation: "products";
      referencedColumns: ["id"];
    }
  ];
  sos_alerts: [
    {
      foreignKeyName: "sos_alerts_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "sos_alerts_responder_id_fkey";
      columns: ["responder_id"];
      isOneToOne: false;
      referencedRelation: "responder_profiles";
      referencedColumns: ["id"];
    }
  ];
  sos_status_history: [
    {
      foreignKeyName: "sos_status_history_alert_id_fkey";
      columns: ["alert_id"];
      isOneToOne: false;
      referencedRelation: "sos_alerts";
      referencedColumns: ["id"];
    }
  ];
  wallet_transactions: [
    {
      foreignKeyName: "wallet_transactions_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
  driver_requests: [
    {
      foreignKeyName: "driver_requests_driver_id_fkey";
      columns: ["driver_id"];
      isOneToOne: false;
      referencedRelation: "driver_profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "driver_requests_ride_id_fkey";
      columns: ["ride_id"];
      isOneToOne: false;
      referencedRelation: "ride_requests";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "driver_requests_order_id_fkey";
      columns: ["order_id"];
      isOneToOne: false;
      referencedRelation: "orders";
      referencedColumns: ["id"];
    }
  ];
  paystack_payments: [
    {
      foreignKeyName: "paystack_payments_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
  notifications: [
    {
      foreignKeyName: "notifications_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
};

type FixDatabase<DB> = DB extends { public: infer P }
  ? P extends { Tables: infer T; Functions: infer F; Enums: infer E }
    ? {
        public: {
          Tables: {
            [K in keyof T]: T[K] & {
              Relationships: K extends keyof TableRelationships ? TableRelationships[K] : []
            }
          };
          Views: Record<string, never>;
          Functions: F;
          Enums: E;
          CompositeTypes: Record<string, never>;
        }
      }
    : never
  : never;

export type Database = FixDatabase<GeneratedDatabase>;
