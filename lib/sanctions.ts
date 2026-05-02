import { SanctionsResult } from '@/types';

const OPENSANCTIONS_API = 'https://api.opensanctions.org/match/default';

const SANCTIONED_FLAG_STATES: Record<string, string> = {
  RU: '🇷🇺 Russia',
  IR: '🇮🇷 Iran',
  KP: '🇰🇵 North Korea',
  SY: '🇸🇾 Syria',
  CU: '🇨🇺 Cuba',
  VE: '🇻🇪 Venezuela',
};

const FLAGS_OF_CONVENIENCE: Record<string, string> = {
  PA: '🇵🇦 Panama',
  LR: '🇱🇷 Liberia',
  MH: '🇲🇭 Marshall Islands',
  BS: '🇧🇸 Bahamas',
  MT: '🇲🇹 Malta',
  CY: '🇨🇾 Cyprus',
  VU: '🇻🇺 Vanuatu',
};

export async function checkVesselSanctions(
  vesselName?: string,
  flag?: string,
  owner?: string
): Promise<SanctionsResult> {
  const result: SanctionsResult = {
    isSanctioned: false,
    matches: [],
    flagSanctioned: false,
    flagOfConvenience: false,
    reasons: [],
  };

  if (flag) {
    const flagUpper = flag.toUpperCase();

    if (SANCTIONED_FLAG_STATES[flagUpper]) {
      result.flagSanctioned = true;
      result.isSanctioned = true;
      result.reasons.push(`🚫 Sanctioned flag: ${SANCTIONED_FLAG_STATES[flagUpper]}`);
    }

    if (FLAGS_OF_CONVENIENCE[flagUpper]) {
      result.flagOfConvenience = true;
      result.reasons.push(`🏴 Flag of convenience: ${FLAGS_OF_CONVENIENCE[flagUpper]}`);
    }
  }

  if (vesselName || owner) {
    try {
      const queries: Record<string, { schema: string; properties: Record<string, string[]> }> = {};

      if (vesselName) {
        queries.vessel = { schema: 'Vessel', properties: { name: [vesselName] } };
      }
      if (owner) {
        queries.owner = { schema: 'LegalEntity', properties: { name: [owner] } };
      }

      const response = await fetch(OPENSANCTIONS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries }),
      });

      if (response.ok) {
        const data = await response.json();

        for (const queryResult of Object.values(
          data.responses as Record<string, { results: { caption: string; score: number }[] }>
        )) {
          for (const match of queryResult.results || []) {
            if (match.score > 0.7) {
              result.matches.push({ name: match.caption, score: match.score, type: 'entity' });
            }
          }
        }

        if (result.matches.length > 0) {
          result.isSanctioned = true;
          result.reasons.push(`🚫 Sanctions match: ${result.matches[0].name}`);
        }
      }
    } catch (error) {
      console.error('Sanctions API error:', error);
    }
  }

  return result;
}
