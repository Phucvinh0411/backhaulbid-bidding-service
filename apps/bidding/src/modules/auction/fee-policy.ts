export enum ParticipationFeeTier {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
  LEVEL_3 = 'LEVEL_3',
  LEVEL_4 = 'LEVEL_4',
  LEVEL_5 = 'LEVEL_5',
}

export interface ParticipationFeeQuote {
  tier: ParticipationFeeTier;
  amount: string;
}

const FEE_LEVELS: Array<{
  maxPrice: number;
  tier: ParticipationFeeTier;
  amount: string;
}> = [
  { maxPrice: 2_000_000, tier: ParticipationFeeTier.LEVEL_1, amount: '10000' },
  { maxPrice: 5_000_000, tier: ParticipationFeeTier.LEVEL_2, amount: '20000' },
  { maxPrice: 15_000_000, tier: ParticipationFeeTier.LEVEL_3, amount: '50000' },
  {
    maxPrice: 50_000_000,
    tier: ParticipationFeeTier.LEVEL_4,
    amount: '100000',
  },
];

export function calculateParticipationFee(
  maxPrice: number,
): ParticipationFeeQuote {
  if (!Number.isFinite(maxPrice) || maxPrice <= 0) {
    throw new Error('maxPrice must be greater than zero');
  }

  const level = FEE_LEVELS.find((entry) => maxPrice <= entry.maxPrice);
  if (level) {
    return { tier: level.tier, amount: level.amount };
  }

  return {
    tier: ParticipationFeeTier.LEVEL_5,
    amount: '200000',
  };
}

export enum CreationFeeTier {
  LEVEL_1 = 'LEVEL_1', // < 10m
  LEVEL_2 = 'LEVEL_2', // < 50m
  LEVEL_3 = 'LEVEL_3', // >= 50m
}

export interface CreationFeeQuote {
  tier: CreationFeeTier;
  amount: string;
}

export function calculateCreationFee(maxPrice: number): CreationFeeQuote {
  if (!Number.isFinite(maxPrice) || maxPrice <= 0) {
    throw new Error('maxPrice must be greater than zero');
  }

  if (maxPrice < 10_000_000) {
    return { tier: CreationFeeTier.LEVEL_1, amount: '50000' };
  }

  if (maxPrice < 50_000_000) {
    return { tier: CreationFeeTier.LEVEL_2, amount: '100000' };
  }

  return { tier: CreationFeeTier.LEVEL_3, amount: '150000' };
}
