import express from 'express';
import { verifyToken } from './auth';
import { CATEGORY_ITEM_MAP, decrementInventory, getVolunteerInventory, upsertInventoryItem } from '../services/inventoryEngine';

const router = express.Router();

router.get('/categories', (_req, res) => {
  res.json({ success: true, data: CATEGORY_ITEM_MAP });
});

router.get('/:volunteerId', verifyToken, async (req, res, next) => {
  try {
    const items = await getVolunteerInventory(req.params.volunteerId);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

router.post('/update', verifyToken, async (req, res, next) => {
  try {
    const { volunteerId, itemName, quantity, unit, categoriesRelevant, expiryDate } = req.body;
    const itemId = await upsertInventoryItem(volunteerId, {
      itemName,
      quantity,
      unit,
      categoriesRelevant,
      expiryDate: expiryDate ?? null,
    });

    res.json({ success: true, itemId });
  } catch (error) {
    next(error);
  }
});

router.post('/decrement', verifyToken, async (req, res, next) => {
  try {
    const { volunteerId, itemId, amountUsed } = req.body;
    await decrementInventory(volunteerId, itemId, amountUsed);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
