import { apiFetch, createCrudApi } from "./client";
import type { RoomShowcase } from "@/lib/types/room-showcase";

export const roomShowcaseApi = {
  ...createCrudApi<RoomShowcase>("/room-showcase"),
  reorder: (orderedIds: string[]) =>
    apiFetch<RoomShowcase[]>("/room-showcase/reorder", { method: "POST", body: { orderedIds } }),
};
