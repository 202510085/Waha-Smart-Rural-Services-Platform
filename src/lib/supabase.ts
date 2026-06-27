import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          whatsapp_enabled: boolean | null;
          email: string | null;
          location: string | null;
          user_type: string | null;
          email_verified: boolean | null;
          phone_verified: boolean | null;
          phone_verification_method: string | null;
          phone_verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          phone?: string;
          whatsapp_enabled?: boolean;
          email?: string;
          location?: string;
          user_type?: string;
        };
        Update: {
          full_name?: string;
          phone?: string;
          whatsapp_enabled?: boolean;
          email?: string;
          location?: string;
          user_type?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          address: string | null;
          phone: string | null;
          whatsapp_enabled: boolean | null;
          whatsapp_phone: string | null;
          latitude: number | null;
          longitude: number | null;
          working_hours: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string;
          address?: string;
          phone?: string;
          whatsapp_enabled?: boolean;
          whatsapp_phone?: string;
          latitude?: number;
          longitude?: number;
          working_hours?: string;
          description?: string;
        };
      };
      products: {
        Row: {
          id: string;
          user_id: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          owner_whatsapp_enabled: boolean | null;
          title: string;
          category: string | null;
          price: string | null;
          unit: string | null;
          description: string | null;
          location: string | null;
          image_url: string | null;
          is_auction: boolean | null;
          current_bid: number | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          owner_name?: string;
          owner_phone?: string;
          owner_whatsapp_enabled?: boolean;
          title: string;
          category?: string;
          price?: string;
          unit?: string;
          description?: string;
          location?: string;
          image_url?: string;
          is_auction?: boolean;
          current_bid?: number;
          status?: string;
        };
      };
      product_bids: {
        Row: {
          id: string;
          product_id: string | null;
          user_id: string | null;
          bidder_name: string | null;
          bid_amount: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string;
          user_id?: string;
          bidder_name?: string;
          bid_amount?: number;
        };
      };
      community_reports: {
        Row: {
          id: string;
          user_id: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          owner_whatsapp_enabled: boolean | null;
          report_type: string | null;
          description: string | null;
          location: string | null;
          latitude: number | null;
          longitude: number | null;
          urgency: string | null;
          elderly_related: boolean | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          owner_name?: string;
          owner_phone?: string;
          owner_whatsapp_enabled?: boolean;
          report_type?: string;
          description?: string;
          location?: string;
          latitude?: number;
          longitude?: number;
          urgency?: string;
          elderly_related?: boolean;
          status?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          user_id: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          owner_whatsapp_enabled: boolean | null;
          title: string;
          category: string | null;
          event_date: string | null;
          event_time: string | null;
          description: string | null;
          image_url: string | null;
          updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          owner_name?: string;
          owner_phone?: string;
          owner_whatsapp_enabled?: boolean;
          title: string;
          category?: string;
          event_date?: string;
          event_time?: string;
          description?: string;
          image_url?: string;
        };
      };
      health_requests: {
        Row: {
          id: string;
          user_id: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          owner_whatsapp_enabled: boolean | null;
          age: number | null;
          symptoms: string | null;
          urgency: string | null;
          location: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          owner_name?: string;
          owner_phone?: string;
          owner_whatsapp_enabled?: boolean;
          age?: number;
          symptoms?: string;
          urgency?: string;
          location?: string;
          status?: string;
        };
      };
      agriculture_requests: {
        Row: {
          id: string;
          user_id: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          owner_whatsapp_enabled: boolean | null;
          crop_type: string | null;
          problem_description: string | null;
          image_url: string | null;
          ai_diagnosis: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          owner_name?: string;
          owner_phone?: string;
          owner_whatsapp_enabled?: boolean;
          crop_type?: string;
          problem_description?: string;
          image_url?: string;
          ai_diagnosis?: string;
          status?: string;
        };
      };
      rides: {
        Row: {
          id: string;
          user_id: string | null;
          driver_name: string | null;
          driver_phone: string | null;
          whatsapp_enabled: boolean | null;
          from_location: string | null;
          to_location: string | null;
          departure_time: string | null;
          available_seats: number | null;
          uae_pass_verified: boolean | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          driver_name?: string;
          driver_phone?: string;
          whatsapp_enabled?: boolean;
          from_location?: string;
          to_location?: string;
          departure_time?: string;
          available_seats?: number;
          uae_pass_verified?: boolean;
          notes?: string;
        };
      };
      ride_requests: {
        Row: {
          id: string;
          user_id: string | null;
          requester_name: string | null;
          requester_phone: string | null;
          whatsapp_enabled: boolean | null;
          from_location: string | null;
          to_location: string | null;
          requested_time: string | null;
          passengers: number | null;
          notes: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          requester_name?: string;
          requester_phone?: string;
          whatsapp_enabled?: boolean;
          from_location?: string;
          to_location?: string;
          requested_time?: string;
          passengers?: number;
          notes?: string;
          status?: string;
        };
      };
      emergency_requests: {
        Row: {
          id: string;
          user_id: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          latitude: number | null;
          longitude: number | null;
          emergency_type: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          owner_name?: string;
          owner_phone?: string;
          latitude?: number;
          longitude?: number;
          emergency_type?: string;
          status?: string;
        };
      };
    };
  };
};
