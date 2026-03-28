import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export interface InventoryItem {
  itemId: string;
  volunteerId: string;
  itemName: string;
  quantity: number;
  unit: string;
  categoriesRelevant: string[];
  expiryDate: string | null;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface SupplyScoreResult {
  score: number;
  matchedItems: string[];
  reason: string;
}

export const CATEGORY_ITEM_MAP: Record<string, string[]> = {
  food_nutrition: ['rice', 'dal', 'atta', 'oil', 'salt', 'biscuits', 'dry ration', 'food packet', 'khichdi', 'poha', 'milk', 'baby food', 'ORS'],
  health: ['medicines', 'paracetamol', 'bandage', 'antiseptic', 'first aid kit', 'ORS', 'gloves', 'mask', 'sanitiser', 'blood pressure kit'],
  shelter: ['blanket', 'tarpaulin', 'tent', 'mat', 'sleeping bag', 'plastic sheet'],
  water_sanitation: ['water can', 'water purification tablet', 'ORS', 'soap', 'hand sanitiser', 'bucket'],
  education: ['notebook', 'pencil', 'pen', 'textbook', 'school bag', 'stationery'],
  environment: ['trash bag', 'gloves', 'broom', 'spade'],
  emergency: ['torch', 'battery', 'rope', 'first aid kit', 'whistle', 'emergency blanket'],
  women_child: ['sanitary pad', 'baby food', 'diapers', 'baby clothes', 'milk'],
};

export async function upsertInventoryItem(
  volunteerId: string,
  item: Omit<InventoryItem, 'itemId' | 'volunteerId' | 'updatedAt'>
): Promise<string> {
  const itemId = item.itemName.toLowerCase().trim().replace(/\s+/g, '_');

  await db
    .collection('resources')
    .doc(volunteerId)
    .collection('items')
    .doc(itemId)
    .set(
      {
        itemId,
        volunteerId,
        ...item,
        updatedAt: new Date(),
      },
      { merge: true }
    );

  return itemId;
}

export async function getVolunteerInventory(volunteerId: string): Promise<InventoryItem[]> {
  const snapshot = await db
    .collection('resources')
    .doc(volunteerId)
    .collection('items')
    .where('quantity', '>', 0)
    .get();

  return snapshot.docs.map((doc) => doc.data() as InventoryItem);
}

export async function decrementInventory(
  volunteerId: string,
  itemId: string,
  amountUsed: number
): Promise<void> {
  const docRef = db.collection('resources').doc(volunteerId).collection('items').doc(itemId);
  const doc = await docRef.get();

  if (!doc.exists) return;

  const current = Number(doc.data()?.quantity || 0);
  await docRef.update({
    quantity: Math.max(0, current - amountUsed),
    updatedAt: new Date(),
  });
}

export async function computeSupplyScore(
  volunteerId: string,
  needCategory: string
): Promise<SupplyScoreResult> {
  try {
    const inventory = await getVolunteerInventory(volunteerId);

    if (inventory.length === 0) {
      return { score: 0, matchedItems: [], reason: 'No inventory logged' };
    }

    const relevantKeywords = CATEGORY_ITEM_MAP[needCategory] ?? [];
    const matchedItems: string[] = [];

    for (const item of inventory) {
      const itemName = item.itemName.toLowerCase();
      const isRelevant =
        item.categoriesRelevant.includes(needCategory) ||
        relevantKeywords.some((keyword) => itemName.includes(keyword.toLowerCase()));

      if (isRelevant && item.quantity > 0) {
        matchedItems.push(`${item.itemName} (${item.quantity} ${item.unit})`);
      }
    }

    if (matchedItems.length === 0) {
      return {
        score: 0,
        matchedItems: [],
        reason: 'No matching supplies for this need category',
      };
    }

    const score = matchedItems.length >= 3 ? 1 : matchedItems.length === 2 ? 0.7 : 0.4;

    return {
      score,
      matchedItems,
      reason: `Has ${matchedItems.join(', ')}`,
    };
  } catch (error) {
    console.error('[InventoryEngine] supplyScore error:', error);
    return { score: 0, matchedItems: [], reason: 'Inventory check failed' };
  }
}

export async function checkInventoryAlerts(): Promise<void> {
  const lowStockThresholds: Record<string, number> = {
    rice: 2,
    dal: 1,
    atta: 2,
    medicines: 5,
    bandage: 3,
    blanket: 1,
    'water can': 2,
    ORS: 5,
  };

  const snapshot = await db.collectionGroup('items').get();

  for (const doc of snapshot.docs) {
    const item = doc.data() as InventoryItem;
    const normalizedName = item.itemName.toLowerCase();
    const threshold = lowStockThresholds[normalizedName] ?? null;

    if (threshold && item.quantity <= threshold) {
      await db.collection('notifications').add({
        userId: item.volunteerId,
        type: 'low_stock_alert',
        message: `Your ${item.itemName} stock is low (${item.quantity} ${item.unit} remaining). Consider restocking before your next deployment.`,
        itemName: item.itemName,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    if (item.expiryDate) {
      const expiryMs = new Date(item.expiryDate).getTime();
      const in72h = Date.now() + 72 * 60 * 60 * 1000;

      if (expiryMs <= in72h && expiryMs > Date.now()) {
        await db.collection('notifications').add({
          userId: item.volunteerId,
          type: 'expiry_alert',
          message: `Your ${item.itemName} expires on ${item.expiryDate}. Please use or return to NGO depot.`,
          itemName: item.itemName,
          expiryDate: item.expiryDate,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }
  }
}
