export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ais_records: {
        Row: {
          id: string;
          mmsi: string;
          timestamp: string;
          latitude: number;
          longitude: number;
          sog: number | null;
          cog: number | null;
          ship_type: number | null;
          ship_name: string | null;
          flag: string | null;
          upload_batch_id: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mmsi: string;
          timestamp: string;
          latitude: number;
          longitude: number;
          sog?: number | null;
          cog?: number | null;
          ship_type?: number | null;
          ship_name?: string | null;
          flag?: string | null;
          upload_batch_id?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          mmsi?: string;
          timestamp?: string;
          latitude?: number;
          longitude?: number;
          sog?: number | null;
          cog?: number | null;
          ship_type?: number | null;
          ship_name?: string | null;
          flag?: string | null;
          upload_batch_id?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      dark_periods: {
        Row: {
          id: string;
          mmsi: string;
          last_seen_time: string;
          reappear_time: string;
          gap_hours: number;
          last_lat: number;
          last_lon: number;
          reappear_lat: number;
          reappear_lon: number;
          distance_nm: number;
          implied_speed_knots: number;
          suspicion_score: number;
          risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
          reasons: Json;
          weather_data: Json | null;
          sanctions_data: Json | null;
          storm_data: Json | null;
          upload_batch_id: string | null;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mmsi: string;
          last_seen_time: string;
          reappear_time: string;
          gap_hours: number;
          last_lat: number;
          last_lon: number;
          reappear_lat: number;
          reappear_lon: number;
          distance_nm: number;
          implied_speed_knots: number;
          suspicion_score?: number;
          risk_level?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
          reasons?: Json;
          weather_data?: Json | null;
          sanctions_data?: Json | null;
          storm_data?: Json | null;
          upload_batch_id?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mmsi?: string;
          last_seen_time?: string;
          reappear_time?: string;
          gap_hours?: number;
          last_lat?: number;
          last_lon?: number;
          reappear_lat?: number;
          reappear_lon?: number;
          distance_nm?: number;
          implied_speed_knots?: number;
          suspicion_score?: number;
          risk_level?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
          reasons?: Json;
          weather_data?: Json | null;
          sanctions_data?: Json | null;
          storm_data?: Json | null;
          upload_batch_id?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      upload_batches: {
        Row: {
          id: string;
          filename: string | null;
          total_records: number;
          valid_records: number;
          unique_vessels: number;
          dark_periods_found: number;
          date_range_start: string | null;
          date_range_end: string | null;
          status: 'processing' | 'completed' | 'failed';
          user_id: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          filename?: string | null;
          total_records?: number;
          valid_records?: number;
          unique_vessels?: number;
          dark_periods_found?: number;
          date_range_start?: string | null;
          date_range_end?: string | null;
          status?: 'processing' | 'completed' | 'failed';
          user_id?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          filename?: string | null;
          total_records?: number;
          valid_records?: number;
          unique_vessels?: number;
          dark_periods_found?: number;
          date_range_start?: string | null;
          date_range_end?: string | null;
          status?: 'processing' | 'completed' | 'failed';
          user_id?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
