export const primary = ['data', 'geometry', 'intersection'] as const;

export type PrimaryId = typeof primary[number];

// TODO: update config instead?
export const typeConversion = new Map<string, PrimaryId>([
  ['intersection', 'intersection'],
  ['parcel', 'geometry'],
  ['property', 'data'],
]);
