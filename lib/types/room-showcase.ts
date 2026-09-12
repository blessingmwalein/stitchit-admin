// Kept in lockstep with:
//  - stitchit-backend: src/modules/room-showcase/dto/room-showcase.dto.ts (ROOM_SHOWCASE_CATEGORIES)
//  - stitchit-web:     components/use-cases-section.tsx (icon lookup table)
export const ROOM_SHOWCASE_CATEGORIES = [
  "LIVING_ROOM",
  "DINING_ROOM",
  "BEDROOM",
  "BATHROOM",
  "ENTRYWAY",
  "HOME_OFFICE",
  "CAR_INTERIOR",
  "RESTAURANT_CAFE",
  "OFFICE",
  "BUSINESS",
  "KIDS_ROOM",
  "CUSTOM",
] as const;

export type RoomShowcaseCategory = (typeof ROOM_SHOWCASE_CATEGORIES)[number];

export const ROOM_SHOWCASE_CATEGORY_LABELS: Record<RoomShowcaseCategory, string> = {
  LIVING_ROOM: "Living Room",
  DINING_ROOM: "Dining Room",
  BEDROOM: "Bedroom",
  BATHROOM: "Bathroom",
  ENTRYWAY: "Entryway",
  HOME_OFFICE: "Home Office",
  CAR_INTERIOR: "Car Interior",
  RESTAURANT_CAFE: "Restaurant & Cafe",
  OFFICE: "Office",
  BUSINESS: "Business",
  KIDS_ROOM: "Kids Room",
  CUSTOM: "Custom Spaces",
};

export interface RoomShowcase {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  category: RoomShowcaseCategory | null;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
