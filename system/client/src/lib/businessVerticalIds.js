/** يجب أن يطابق قيم enum BusinessVertical في Prisma (system/server/prisma/schema.prisma). */
export const BUSINESS_VERTICAL_IDS = [
  "GROCERY",
  "RESTAURANT",
  "CAFE",
  "PHONE_STORE",
  "AUTO_DEALER",
  "BOOKING_SERVICES",
  "RETAIL_GENERAL",
  "PHARMACY",
  "CLOTHING",
  "HARDWARE_ELECTRONICS",
  "BEAUTY_SALON",
  "PET_STORE",
  "HOTEL",
  "FITNESS",
  "WHOLESALE",
  "SERVICES_OTHER",
];

/**
 * Verticals ready for public signup right now.
 * Others stay in the enum for existing orgs / later unlocks, but are disabled in signup UI.
 * Current sellable set: grocery (lots/FEFO), pharmacy (lots + appointments), café (modifiers/table).
 */
export const MVP_ENABLED_VERTICAL_IDS = [
  "GROCERY",
  "PHARMACY",
  "CAFE",
];

export const MVP_COMING_SOON_VERTICAL_IDS = BUSINESS_VERTICAL_IDS.filter(
  (id) => !MVP_ENABLED_VERTICAL_IDS.includes(id),
);

export function isMvpVerticalEnabled(id) {
  return MVP_ENABLED_VERTICAL_IDS.includes(id);
}
