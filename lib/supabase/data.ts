import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { AISRecord, ScoredDarkPeriod } from '@/types';

type Client = SupabaseClient<Database>;

export async function createUploadBatch(supabase: Client, filename: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('upload_batches')
    .insert({ filename, user_id: user.id, status: 'processing' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUploadBatch(
  supabase: Client,
  batchId: string,
  updates: {
    total_records?: number;
    valid_records?: number;
    unique_vessels?: number;
    dark_periods_found?: number;
    date_range_start?: string;
    date_range_end?: string;
    status?: 'processing' | 'completed' | 'failed';
    completed_at?: string;
  }
) {
  const { error } = await supabase
    .from('upload_batches')
    .update(updates)
    .eq('id', batchId);

  if (error) throw error;
}

export async function insertAISRecords(
  supabase: Client,
  records: AISRecord[],
  batchId: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const BATCH_SIZE = 1000;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE).map((record) => ({
      mmsi: record.mmsi,
      timestamp: record.timestamp.toISOString(),
      latitude: record.latitude,
      longitude: record.longitude,
      sog: record.sog ?? null,
      cog: record.cog ?? null,
      ship_type: record.shipType ?? null,
      ship_name: record.shipName ?? null,
      flag: record.flag ?? null,
      upload_batch_id: batchId,
      user_id: user.id,
    }));

    const { error } = await supabase.from('ais_records').insert(batch);
    if (error) throw error;
  }
}

export async function insertDarkPeriods(
  supabase: Client,
  periods: ScoredDarkPeriod[],
  batchId: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

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
    upload_batch_id: batchId,
    user_id: user.id,
  }));

  const { error } = await supabase.from('dark_periods').insert(dbPeriods);
  if (error) throw error;
}

export async function fetchDarkPeriods(
  supabase: Client,
  options?: {
    batchId?: string;
    riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    minScore?: number;
    limit?: number;
  }
) {
  let query = supabase
    .from('dark_periods')
    .select('*')
    .order('suspicion_score', { ascending: false });

  if (options?.batchId) query = query.eq('upload_batch_id', options.batchId);
  if (options?.riskLevel) query = query.eq('risk_level', options.riskLevel);
  if (options?.minScore) query = query.gte('suspicion_score', options.minScore);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((row) => ({
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
}

export async function fetchUploadBatches(supabase: Client) {
  const { data, error } = await supabase
    .from('upload_batches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export function subscribeToDarkPeriods(
  supabase: Client,
  batchId: string,
  callback: (period: ScoredDarkPeriod) => void
) {
  return supabase
    .channel(`dark_periods:${batchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'dark_periods',
        filter: `upload_batch_id=eq.${batchId}`,
      },
      (payload) => {
        const row = payload.new as Database['public']['Tables']['dark_periods']['Row'];
        callback({
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
        });
      }
    )
    .subscribe();
}
