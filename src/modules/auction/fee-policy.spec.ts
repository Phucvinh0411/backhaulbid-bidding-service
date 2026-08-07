import { ParticipationFeeTier, calculateParticipationFee } from './fee-policy';

describe('calculateParticipationFee', () => {
  it.each([
    [2_000_000, ParticipationFeeTier.LEVEL_1, '10000'],
    [2_000_001, ParticipationFeeTier.LEVEL_2, '20000'],
    [5_000_000, ParticipationFeeTier.LEVEL_2, '20000'],
    [5_000_001, ParticipationFeeTier.LEVEL_3, '50000'],
    [15_000_000, ParticipationFeeTier.LEVEL_3, '50000'],
    [15_000_001, ParticipationFeeTier.LEVEL_4, '100000'],
    [50_000_000, ParticipationFeeTier.LEVEL_4, '100000'],
    [50_000_001, ParticipationFeeTier.LEVEL_5, '200000'],
  ])('maps maxPrice=%s to %s and %s VND', (maxPrice, tier, amount) => {
    expect(calculateParticipationFee(maxPrice)).toEqual({ tier, amount });
  });

  it('rejects a non-positive max price', () => {
    expect(() => calculateParticipationFee(0)).toThrow(
      'maxPrice must be greater than zero',
    );
  });
});
