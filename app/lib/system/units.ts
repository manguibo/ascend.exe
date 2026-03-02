import type { UnitSystem } from "./session-state";

const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;

function round(value: number, digits = 1): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function getHeightUnitLabel(unitSystem: UnitSystem): "cm" | "in" {
  return unitSystem === "IMPERIAL" ? "in" : "cm";
}

export function getWeightUnitLabel(unitSystem: UnitSystem): "kg" | "lb" {
  return unitSystem === "IMPERIAL" ? "lb" : "kg";
}

export function heightCmToDisplay(heightCm: number, unitSystem: UnitSystem): number {
  return unitSystem === "IMPERIAL" ? round(heightCm / CM_PER_INCH, 1) : round(heightCm, 1);
}

export function heightDisplayToCm(heightDisplay: number, unitSystem: UnitSystem): number {
  return unitSystem === "IMPERIAL" ? heightDisplay * CM_PER_INCH : heightDisplay;
}

export function kgToDisplayWeight(weightKg: number, unitSystem: UnitSystem): number {
  return unitSystem === "IMPERIAL" ? round(weightKg / KG_PER_POUND, 1) : round(weightKg, 1);
}

export function displayWeightToKg(weightDisplay: number, unitSystem: UnitSystem): number {
  return unitSystem === "IMPERIAL" ? weightDisplay * KG_PER_POUND : weightDisplay;
}

export function formatHeight(heightCm: number, unitSystem: UnitSystem): string {
  return `${heightCmToDisplay(heightCm, unitSystem)} ${getHeightUnitLabel(unitSystem)}`;
}

export function formatWeight(weightKg: number, unitSystem: UnitSystem): string {
  return `${kgToDisplayWeight(weightKg, unitSystem)} ${getWeightUnitLabel(unitSystem)}`;
}

export function formatWeightDelta(weightDeltaKg: number, unitSystem: UnitSystem): string {
  const value = kgToDisplayWeight(weightDeltaKg, unitSystem);
  const signed = value > 0 ? `+${value}` : `${value}`;
  return `${signed} ${getWeightUnitLabel(unitSystem)}`;
}

