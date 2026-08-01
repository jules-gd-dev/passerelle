import catalogData from './catalog.json';

export interface SetupField {
  key: string;
  labelKey: string;
  type: 'text' | 'number';
  default: string | number;
}

export interface CatalogItem {
  id: string;
  name: string;
  descKey: string;
  recommended: boolean;
  type: 'cli' | 'docker' | 'network';
  icon?: string;
  command?: string;
  args?: string[];
  port?: number;
  target?: string;
  setupFields?: SetupField[];
}

export const CATALOG_ITEMS: CatalogItem[] = catalogData as CatalogItem[];

export const RECOMMENDED_ITEMS: CatalogItem[] = CATALOG_ITEMS.filter(
  (item) => item.recommended,
);
