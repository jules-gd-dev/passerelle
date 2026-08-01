import { useTranslation } from 'react-i18next';
import { IconSettings, IconPlus, IconSearch } from '../../Icons';
import { CATALOG_ITEMS, RECOMMENDED_ITEMS, type CatalogItem } from '../../catalog';

interface StoreViewProps {
  search: string;
  onSearchChange: (val: string) => void;
  onSelectCatalogItem: (item: CatalogItem) => void;
  onOpenCustomAppModal: () => void;
}

export function StoreView({ search, onSearchChange, onSelectCatalogItem, onOpenCustomAppModal }: StoreViewProps) {
  const { t } = useTranslation();

  const renderRow = (item: CatalogItem) => (
    <button type="button" key={item.id} className="store-row" onClick={() => onSelectCatalogItem(item)}>
      <span className="store-row-icon">
        {item.icon ? <img src={item.icon} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span>{item.name.slice(0, 2).toUpperCase()}</span>}
      </span>
      <span className="store-row-body">
        <span className="store-row-name">{item.name}</span>
        <span className="store-row-desc">{t(item.descKey)}</span>
      </span>
      <IconPlus width={14} height={14} />
    </button>
  );

  const filtered = search.trim()
    ? CATALOG_ITEMS.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))
    : CATALOG_ITEMS;

  return (
    <>
      <div className="store-search-wrapper">
        <IconSearch width={16} height={16} />
        <input className="input-field" type="text" placeholder={t('catalog.search_placeholder')} value={search} onChange={(e) => onSearchChange(e.target.value)} />
      </div>

      {!search.trim() && (
        <>
          <div className="section-label">{t('catalog.recommended_title')}</div>
          <div className="unified-list">
            {RECOMMENDED_ITEMS.map(renderRow)}
            <button type="button" className="store-row" onClick={onOpenCustomAppModal}>
              <span className="store-row-icon"><IconSettings width={16} height={16} /></span>
              <span className="store-row-body">
                <span className="store-row-name">{t('services.custom')}</span>
                <span className="store-row-desc">{t('services.custom_desc')}</span>
              </span>
              <IconPlus width={14} height={14} />
            </button>
          </div>
        </>
      )}

      <div className="section-label">{t('catalog.all_apps_title')}</div>
      {filtered.length === 0 ? (
        <p className="logs-status">{t('catalog.no_results')}</p>
      ) : (
        <div className="unified-list">{filtered.map(renderRow)}</div>
      )}
    </>
  );
}
