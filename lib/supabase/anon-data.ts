import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { ScoredDarkPeriod } from '@/types';

type Client = SupabaseClient<Database>;

/**
 * Save dark periods to Supabase (anonymous - no user_id required)
 * This works when RLS is disabled or has public insert policies
 */
export async function saveDarkPeriodsAnon(
  supabase: Client,
  periods: ScoredDarkPeriod[],
  filename?: string
): Promise<{ success: boolean; batchId?: string; error?: string }> {
  try {
    // Create upload batch
    const { data: batch, error: batchError } = await supabase
      .from('upload_batches')
      .insert({
        filename: filename || 'anonymous_upload',
        status: 'completed',
        dark_periods_found: periods.length,
      })
      .select()
      .single();

    if (batchError) {
      console.warn('Could not create batch:', batchError.message);
      return { success: false, error: batchError.message };
    }

    // Insert dark periods
    const dbPeriods = periods.map((period) => ({
      mmsi: period.mmsi,
      last_seen_time: period.lastSeenTime.toISOString(),
      reappear_time: period.reappearTime.toISOString(),
      gap_hours: period.gapHours,
      last_lat: period.lastLat,
      last_lon: period.lastLon,
      reappear_lat: period.reappearLat,
      reappear_lon: period.reappearLon,
      distance_nm: period.distanceNm,
      implied_speed_knots: period.impliedSpeedKnots,
      suspicion_score: period.suspicionScore,
      risk_level: period.riskLevel,
      reasons: period.reasons,
      upload_batch_id: batch.id,
    }));

    const { error: insertError } = await supabase
      .from('dark_periods')
      .insert(dbPeriods);

    if (insertError) {
      console.warn('Could not save dark periods:', insertError.message);
      return { success: false, error: insertError.message };
    }

    return { success: true, batchId: batch.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn('Supabase save failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Fetch all dark periods from Supabase (public read)
 */
export async function fetchAllDarkPeriods(
  supabase: Client,
  options?: {
    limit?: number;
    minScore?: number;
  }
): Promise<ScoredDarkPeriod[]> {
  try {
    let query = supabase
      .from('dark_periods')
      .select('*')
      .order('suspicion_score', { ascending: false });

    if (options?.minScore) {
      query = query.gte('suspicion_score', options.minScore);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row) => ({
      mmsi: row.mmsi,
      lastSeenTime: new Date(row.last_seen_time),
      reappearTime: new Date(row.reappear_time),
      gapHours: row.gap_hours,
      lastLat: row.last_lat,
      lastLon: row.last_lon,
      reappearLat: row.reappear_lat,
      reappearLon: row.reappear_lon,
      distanceNm: row.distance_nm,
      impliedSpeedKnots: row.implied_speed_knots,
      suspicionScore: row.suspicion_score,
      riskLevel: row.risk_level as ScoredDarkPeriod['riskLevel'],
      reasons: row.reasons as string[],
    }));
  } catch (err) {
    console.warn('Could not fetch dark periods:', err);
    return [];
  }
}

/**
 * Fetch upload history from Supabase
 */
export async function fetchUploadHistory(supabase: Client) {
  try {
    const { data, error } = await supabase
      .from('upload_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Could not fetch history:', err);
    return [];
  }
}
