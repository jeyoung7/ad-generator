import type { AdTemplate } from './types.js';
import { carAccident } from './carAccident.js';
import { slipAndFall } from './slipAndFall.js';
import { medicalMalpractice } from './medicalMalpractice.js';
import { truckAccident } from './truckAccident.js';
import { wrongfulDeath } from './wrongfulDeath.js';
import { workplaceInjury } from './workplaceInjury.js';
import { dogBite } from './dogBite.js';
import { rideshareAccident } from './rideshareAccident.js';

export const templates: AdTemplate[] = [
  carAccident,
  slipAndFall,
  medicalMalpractice,
  truckAccident,
  wrongfulDeath,
  workplaceInjury,
  dogBite,
  rideshareAccident,
];

export type { AdTemplate, Scene, SceneOverlay } from './types.js';
