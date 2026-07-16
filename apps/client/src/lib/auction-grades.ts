export const AUCTION_GRADE_OPTIONS = [
  { value: 'S', description: 'Brand new or near-new condition, usually under 10,000 km.' },
  { value: '6', description: 'Brand new or near-new condition, usually under 10,000 km.' },
  { value: '5', description: 'Excellent condition with minimal wear, typically under 50,000 km.' },
  { value: '4.5', description: 'Very good condition with negligible scratches or dents, up to 100,000 km.' },
  { value: '4', description: 'Good condition with minor flaws consistent with normal use.' },
  { value: '3.5', description: 'Fair condition with scratches, scrapes, or small dents that may need touch-ups.' },
  { value: '3', description: 'Average to below-average condition with major blemishes, dents, or wear.' },
  { value: '2', description: 'Poor or rough condition with severe rust, corrosion, or functional damage.' },
  { value: '1', description: 'Poor or rough condition with severe rust, corrosion, or functional damage.' },
  { value: 'R', description: 'Repair history involving structural or major components.' },
  { value: 'RA', description: 'Minor accident history that was professionally repaired.' },
] as const;

export const AUCTION_GRADES = AUCTION_GRADE_OPTIONS.map(({ value }) => value);

export function auctionGradeDescription(value: string) {
  return AUCTION_GRADE_OPTIONS.find((option) => option.value === value)?.description;
}
