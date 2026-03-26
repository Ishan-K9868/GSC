import type { NeedCategoryType } from '../types';

export function getCategoryIcon(category?: string) {
  const map: Record<string, 'alert' | 'csr' | 'shield' | 'spark' | 'volunteer' | 'civic' | 'network'> = {
    emergency: 'alert',
    food_nutrition: 'csr',
    health: 'shield',
    education: 'spark',
    water_sanitation: 'network',
    shelter: 'civic',
    women_child: 'volunteer',
    environment: 'spark',
  };

  return map[category as NeedCategoryType] || 'shield';
}
