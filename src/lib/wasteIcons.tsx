import {
  Bottle, FileText, Wrench, Wine, Sprout, Cpu,
  Lightbulb, Battery, Recycle, Trash2, Leaf
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface WasteIconConfig {
  icon: LucideIcon;
  color: string;
  bgGradient: string;
}

const WASTE_ICON_MAP: Record<string, WasteIconConfig> = {
  'Plastic Bottles': { icon: Bottle, color: '#3b82f6', bgGradient: 'from-blue-500 to-blue-600' },
  'Paper & Cardboard': { icon: FileText, color: '#f59e0b', bgGradient: 'from-amber-500 to-orange-600' },
  'Metal & Aluminum': { icon: Wrench, color: '#94a3b8', bgGradient: 'from-slate-400 to-slate-500' },
  'Glass': { icon: Wine, color: '#10b981', bgGradient: 'from-emerald-500 to-teal-600' },
  'Organic Waste': { icon: Sprout, color: '#22c55e', bgGradient: 'from-green-500 to-emerald-600' },
  'Electronic Waste': { icon: Cpu, color: '#a855f7', bgGradient: 'from-violet-500 to-purple-600' },
  'LED Bulbs': { icon: Lightbulb, color: '#f97316', bgGradient: 'from-orange-500 to-amber-600' },
  'Batteries': { icon: Battery, color: '#ef4444', bgGradient: 'from-red-500 to-rose-600' },
};

const DEFAULT_CONFIG: WasteIconConfig = {
  icon: Recycle,
  color: '#22c55e',
  bgGradient: 'from-primary-500 to-primary-600',
};

export function getWasteIcon(name: string | null | undefined): WasteIconConfig {
  if (!name) return DEFAULT_CONFIG;
  return WASTE_ICON_MAP[name] ?? DEFAULT_CONFIG;
}

export function getWasteIconComponent(name: string | null | undefined): LucideIcon {
  return getWasteIcon(name).icon;
}

export function getWasteColor(name: string | null | undefined): string {
  return getWasteIcon(name).color;
}
