import type { ChampionRole, Tier } from "@rift/champion";
import { atom } from "jotai";

export const tierAtom = atom<Tier | "all">("all");

export const roleAtom = atom<ChampionRole | "all">("all");

export const patchAtom = atom("latest");
