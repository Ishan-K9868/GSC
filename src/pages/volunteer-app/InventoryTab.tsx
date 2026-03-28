import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { auth } from '../../config/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS !== 'false';
const DEV_TOKEN = 'dev-mock-token-for-prototype';

const LOW_STOCK_THRESHOLDS: Record<string, number> = {
  rice: 2,
  dal: 1,
  atta: 2,
  medicines: 5,
  bandage: 3,
  blanket: 1,
  'water can': 2,
  ORS: 5,
};

type InventoryItem = {
  itemId: string;
  volunteerId: string;
  itemName: string;
  quantity: number;
  unit: string;
  categoriesRelevant: string[];
  expiryDate: string | null;
  updatedAt?: string;
};

async function getAuthToken(): Promise<string | null> {
  if (DEV_MODE) return DEV_TOKEN;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function inventoryFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || 'Inventory request failed');
  }

  return response.json();
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate).getTime();
  return Number.isFinite(expiry) && expiry < Date.now();
}

function isLowStock(item: InventoryItem): boolean {
  const threshold = LOW_STOCK_THRESHOLDS[item.itemName.toLowerCase()];
  return typeof threshold === 'number' ? item.quantity <= threshold : item.quantity <= 1;
}

export function InventoryTab({ volunteerId }: { volunteerId: string }) {
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('food_nutrition');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('units');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    void loadInventory();
  }, [volunteerId]);

  const itemSuggestions = useMemo(
    () => categories[selectedCategory] || [],
    [categories, selectedCategory]
  );

  async function loadInventory() {
    try {
      setLoading(true);
      setError(null);

      const [categoriesResponse, inventoryResponse] = await Promise.all([
        inventoryFetch<{ success: boolean; data: Record<string, string[]> }>('/inventory/categories'),
        inventoryFetch<{ success: boolean; data: InventoryItem[] }>(`/inventory/${volunteerId}`),
      ]);

      setCategories(categoriesResponse.data || {});
      setItems(inventoryResponse.data || []);

      const firstCategory = Object.keys(categoriesResponse.data || {})[0];
      if (firstCategory) {
        setSelectedCategory((current) => current || firstCategory);
      }
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await inventoryFetch('/inventory/update', {
        method: 'POST',
        body: JSON.stringify({
          volunteerId,
          itemName,
          quantity: Number(quantity),
          unit,
          categoriesRelevant: [selectedCategory],
          expiryDate: expiryDate || null,
        }),
      });

      setSuccessMessage(`${itemName} saved to your field supplies.`);
      setItemName('');
      setQuantity('1');
      setExpiryDate('');
      await loadInventory();
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save inventory item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1rem', padding: '0.85rem' }}>
      <section className="internal-panel">
        <div className="internal-panel-header">My current supplies</div>
        <div className="internal-panel-body" style={{ display: 'grid', gap: '0.75rem' }}>
          {loading ? <p style={{ fontSize: '0.82rem', color: 'var(--text-subtle)' }}>Loading inventory...</p> : null}
          {!loading && items.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
              No supplies logged yet. Add what you can carry so matching can route the right missions.
            </p>
          ) : null}
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {items.map((item) => {
              const expired = isExpired(item.expiryDate);
              const lowStock = isLowStock(item);

              return (
                <article
                  key={item.itemId}
                  style={{
                    border: `1px solid ${expired ? 'rgba(212,68,37,0.28)' : lowStock ? 'rgba(212,146,26,0.28)' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-1)',
                    padding: '0.8rem 0.9rem',
                    display: 'grid',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ display: 'grid', gap: '0.2rem' }}>
                      <strong style={{ fontSize: '0.86rem' }}>{item.itemName}</strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
                        {item.categoriesRelevant.map((category) => category.replace(/_/g, ' ')).join(' · ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span className="internal-badge" data-variant={expired ? 'critical' : lowStock ? 'amber' : 'jade'}>
                        {item.quantity} {item.unit}
                      </span>
                      {expired ? <span className="internal-badge" data-variant="critical">Expired</span> : null}
                      {!expired && lowStock ? <span className="internal-badge" data-variant="amber">Low stock</span> : null}
                    </div>
                  </div>
                  {item.expiryDate ? (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Expires {new Date(item.expiryDate).toLocaleDateString()}
                    </span>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="internal-panel">
        <div className="internal-panel-header">Add / update item</div>
        <div className="internal-panel-body">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span className="internal-metric-label">Category</span>
                <select
                  className="internal-select"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                >
                  {Object.keys(categories).map((category) => (
                    <option key={category} value={category}>
                      {category.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span className="internal-metric-label">Item name</span>
                <>
                  <input
                    className="internal-input"
                    list="inventory-item-options"
                    value={itemName}
                    onChange={(event) => setItemName(event.target.value)}
                    placeholder="Rice, first aid kit, blanket..."
                    required
                  />
                  <datalist id="inventory-item-options">
                    {itemSuggestions.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </>
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span className="internal-metric-label">Quantity</span>
                <input
                  className="internal-input"
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span className="internal-metric-label">Unit</span>
                <select className="internal-select" value={unit} onChange={(event) => setUnit(event.target.value)}>
                  <option value="kg">kg</option>
                  <option value="litres">litres</option>
                  <option value="units">units</option>
                  <option value="packets">packets</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span className="internal-metric-label">Expiry date</span>
                <input
                  className="internal-input"
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                />
              </label>
            </div>

            {error ? <p style={{ fontSize: '0.78rem', color: '#D44425' }}>{error}</p> : null}
            {successMessage ? <p style={{ fontSize: '0.78rem', color: 'var(--jade)' }}>{successMessage}</p> : null}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '42ch' }}>
                Supplies you log here improve mission routing so teams with food, medicine, or shelter stock get priority on matching.
              </p>
              <button className="btn" type="submit" disabled={saving || !itemName.trim()}>
                {saving ? 'Saving item...' : 'Save inventory item'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default InventoryTab;
