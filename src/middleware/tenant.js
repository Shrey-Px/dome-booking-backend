// src/middleware/tenant.js
const Facility = require('../models/mongodb/Facility');

class TenantMiddleware {
  // Extract facility slug from various sources
  static extractFacilitySlug(req) {
    // Priority: 1. Query param, 2. Header, 3. Body
    return req.query.facility || 
           req.headers['x-facility-slug'] || 
           req.body.facilitySlug || 
           null;
  }

  // Main tenant middleware
  static async resolveTenant(req, res, next) {
    try {
      const facilitySlug = TenantMiddleware.extractFacilitySlug(req);
      
      if (!facilitySlug) {
        return res.status(400).json({
          success: false,
          message: 'Facility identifier required',
          error: 'Please specify facility in query parameter, header, or body'
        });
      }

      console.log(`[Tenant Middleware] Resolving facility: ${facilitySlug}`);

      // Find facility by slug
      const facility = await Facility.findBySlug(facilitySlug);
      
      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found',
          facilitySlug
        });
      }

      if (!facility.active) {
        return res.status(403).json({
          success: false,
          message: 'Facility is not active',
          facilitySlug
        });
      }

      // Attach facility data to request
      req.facility = facility;
      req.facilityId = facility.venueId.toString();
      req.facilitySlug = facility.slug;

      console.log(`[Tenant Middleware] Resolved facility: ${facility.name} (${facility.slug})`);
      
      next();
    } catch (error) {
      console.error('[Tenant Middleware] Error resolving tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve facility',
        error: error.message
      });
    }
  }

  // Optional middleware - tries to resolve tenant but doesn't fail if not found
  static async tryResolveTenant(req, res, next) {
    try {
      const facilitySlug = TenantMiddleware.extractFacilitySlug(req);
      
      if (facilitySlug) {
        const facility = await Facility.findBySlug(facilitySlug);
        if (facility && facility.active) {
          req.facility = facility;
          req.facilityId = facility.venueId.toString();
          req.facilitySlug = facility.slug;
        }
      }
      
      next();
    } catch (error) {
      console.error('[Tenant Middleware] Error in tryResolveTenant:', error);
      // Continue without tenant data
      next();
    }
  }

  // Backward compatibility middleware - defaults to vision-badminton
  static async withDefaultTenant(req, res, next) {
    try {
      let facilitySlug = TenantMiddleware.extractFacilitySlug(req);
      
      // Default to vision-badminton for backward compatibility
      if (!facilitySlug) {
        facilitySlug = 'vision-badminton';
        console.log('[Tenant Middleware] Using default facility: vision-badminton');
      }

      const facility = await Facility.findBySlug(facilitySlug);
      
      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found',
          facilitySlug
        });
      }

      req.facility = facility;
      req.facilityId = facility.venueId.toString();
      req.facilitySlug = facility.slug;
      
      next();
    } catch (error) {
      console.error('[Tenant Middleware] Error in withDefaultTenant:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve facility',
        error: error.message
      });
    }
  }
}

module.exports = TenantMiddleware;