const portraitPhotoNumbers = new Set([
  6, 7, 8, 9, 10, 11, 12, 14, 15, 20, 21, 29, 30, 31, 32, 33, 35, 37, 38, 39, 40, 41,
]);
const manuallyCroppedCardPhotos = new Set([7, 12, 14, 40, 41]);
const legacyTimestamp = '2000-01-01T00:00:00.000Z';

export type BundledCustomerHandover = {
  _id: string;
  sourceKey: string;
  origin: 'bundled';
  imageUrl: string;
  cardImageUrl?: string;
  portrait: boolean;
  createdAt: string;
  updatedAt: string;
};

export const BUNDLED_CUSTOMER_HANDOVERS: BundledCustomerHandover[] = Array.from(
  { length: 41 },
  (_, index) => {
    const photoNumber = index + 1;
    const paddedNumber = String(photoNumber).padStart(2, '0');
    const imageUrl = `/customer-handovers/handover-${paddedNumber}.webp`;
    const sourceKey = `bundled-${photoNumber}`;

    return {
      _id: sourceKey,
      sourceKey,
      origin: 'bundled',
      imageUrl,
      cardImageUrl: manuallyCroppedCardPhotos.has(photoNumber)
        ? `/customer-handovers/handover-${paddedNumber}-card.webp`
        : undefined,
      portrait: portraitPhotoNumbers.has(photoNumber),
      createdAt: legacyTimestamp,
      updatedAt: legacyTimestamp,
    };
  },
);

export function findBundledCustomerHandover(id: string) {
  return BUNDLED_CUSTOMER_HANDOVERS.find((handover) => handover._id === id);
}
