/**
 * Map API Routes
 * PRD: 5.2 Community Pulse Map API endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';
import { getMapLayers, getHexagonDetails, getNearbyVolunteers } from '../services/mapAggregation';
import { createError } from '../middleware/errorHandler';

const mapRouter = Router();

/**
 * GET /api/map/layers
 * Get all map layers (active, in-progress, resolved)
 */
mapRouter.get('/layers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Optional bounds filtering
    const bounds = req.query.bounds ? JSON.parse(req.query.bounds as string) : undefined;
    
    const layers = await getMapLayers(bounds);
    
    res.json({
      success: true,
      data: layers,
    });
  } catch (error: any) {
    console.error('Get map layers error:', error);
    next(createError('Failed to fetch map layers', 500, 'MAP_LAYERS_ERROR'));
  }
});

/**
 * GET /api/map/hexagon/:hexId
 * Get detailed data for a specific hexagon
 */
mapRouter.get('/hexagon/:hexId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hexId } = req.params;
    
    if (!hexId) {
      throw createError('Hexagon ID required', 400, 'MISSING_HEX_ID');
    }
    
    const hexagonData = await getHexagonDetails(hexId);
    
    if (!hexagonData) {
      throw createError('Hexagon not found or has no active needs', 404, 'HEX_NOT_FOUND');
    }
    
    // Get nearby volunteers count
    const volunteersCount = await getNearbyVolunteers(hexId);
    hexagonData.nearbyVolunteers = volunteersCount;
    
    res.json({
      success: true,
      data: hexagonData,
    });
  } catch (error: any) {
    console.error('Get hexagon details error:', error);
    if (error.statusCode) {
      next(error);
    } else {
      next(createError('Failed to fetch hexagon details', 500, 'HEX_DETAILS_ERROR'));
    }
  }
});

/**
 * GET /api/map/stats
 * Get overall map statistics
 */
mapRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const layers = await getMapLayers();
    
    const stats = {
      totalActiveNeeds: layers.active.totalNeeds,
      totalInProgress: layers.inProgress.totalNeeds,
      totalResolved: layers.resolved.totalNeeds,
      activeHexagons: layers.active.hexagons.length,
      criticalHexagons: layers.active.hexagons.filter(h => h.dominantUrgency === 'critical').length,
      highUrgencyHexagons: layers.active.hexagons.filter(h => h.dominantUrgency === 'high').length,
      lastUpdated: layers.active.lastUpdated,
    };
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get map stats error:', error);
    next(createError('Failed to fetch map statistics', 500, 'MAP_STATS_ERROR'));
  }
});

export default mapRouter;
