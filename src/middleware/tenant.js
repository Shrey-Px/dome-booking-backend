// src/middleware/tenant.js - Fixed Multi-Tenant Middleware
const Facility = require('../models/mongodb/Facility');

const TenantMiddleware = {
  /**
   * Resolve tenant from facilitySlug in request body or headers
   * Attaches facility info to req object for downstream use
   */
  resolveTenant: async (req, res, next) => {
    try {
      // Try multiple sources for facility slug
      const facilitySlug = 
        req.body.facilitySlug || 
        req.params.facilitySlug || 
        req.query.facilitySlug ||
        req.headers['x-facility-slug'];
      
      console.log('[TenantMiddleware] Resolving tenant:', {
        slug: facilitySlug,
        source: req.body.facilitySlug ? 'body' : 
                req.params.facilitySlug ? 'params' :
                req.query.facilitySlug ? 'query' : 
                req.headers['x-facility-slug'] ? 'header' : 'none',
        method: req.method,
        path: req.path
      });

      if (!facilitySlug) {
        console.error('[TenantMiddleware] No facility slug provided');
        return res.status(400).json({
          success: false,
          message: 'Facility slug is required',
          hint: 'Provide facilitySlug in request body, query params, or x-facility-slug header',
          receivedBody: req.body,
          receivedQuery: req.query
        });
      }

      // Find facility by slug
      const facility = await Facility.findOne({ 
        slug: facilitySlug.toLowerCase().trim(),
        active: true 
      });

      if (!facility) {
        console.error('[TenantMiddleware] Facility not found:', {
          slug: facilitySlug,
          searchedFor: facilitySlug.toLowerCase().trim()
        });
        
        // Help debug: Show what facilities exist
        const allFacilities = await Facility.find({ active: true }, { slug: 1, name: 1 });
        console.log('[TenantMiddleware] Available facilities:', allFacilities);
        
        return res.status(404).json({
          success: false,
          message: 'Facility not found',
          slug: facilitySlug,
          availableFacilities: allFacilities.map(f => f.slug),
          hint: 'Check if facility slug matches exactly (case-insensitive)'
        });
      }

      console.log('[TenantMiddleware] Facility resolved:', {
        slug: facility.slug,
        name: facility.name,
        facilityId: facility._id,
        venueId: facility.venueId
      });

      // Attach facility data to request object
      req.facility = facility;
      req.facilityId = facility._id;
      req.facilitySlug = facility.slug;
      req.venueId = facility.venueId;

      next();
    } catch (error) {
      console.error('[TenantMiddleware] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error resolving facility',
        error: error.message
      });
    }
  },

  /**
   * Use default tenant (Vision Badminton) for backward compatibility
   * Used for routes that don't require explicit tenant specification
   */
  withDefaultTenant: async (req, res, next) => {
    try {
      console.log('[TenantMiddleware] Using default tenant (vision-badminton)');
      
      // Try to load the default facility
      const facility = await Facility.findOne({ 
        slug: 'vision-badminton',
        active: true 
      });

      if (!facility) {
        console.error('[TenantMiddleware] Default facility not found');
        return res.status(500).json({
          success: false,
          message: 'Default facility configuration missing',
          hint: 'vision-badminton facility should exist in database'
        });
      }

      // Attach to request
      req.facility = facility;
      req.facilityId = facility._id;
      req.facilitySlug = facility.slug;
      req.venueId = facility.venueId;

      next();
    } catch (error) {
      console.error('[TenantMiddleware] Error loading default tenant:', error);
      return res.status(500).json({
        success: false,
        message: 'Error loading default facility',
        error: error.message
      });
    }
  },

  /**
   * Try to resolve tenant, but don't fail if not found
   * Used for routes that can work with or without tenant context
   */
  tryResolveTenant: async (req, res, next) => {
    try {
      const facilitySlug = 
        req.body.facilitySlug || 
        req.params.facilitySlug || 
        req.query.facilitySlug ||
        req.headers['x-facility-slug'];
      
      if (facilitySlug) {
        const facility = await Facility.findOne({ 
          slug: facilitySlug.toLowerCase().trim(),
          active: true 
        });

        if (facility) {
          req.facility = facility;
          req.facilityId = facility._id;
          req.facilitySlug = facility.slug;
          req.venueId = facility.venueId;
          
          console.log('[TenantMiddleware] Optional tenant resolved:', facility.slug);
        }
      }

      // Continue regardless of whether facility was found
      next();
    } catch (error) {
      console.error('[TenantMiddleware] Error in tryResolveTenant:', error);
      // Don't fail the request
      next();
    }
  }
};

module.exports = TenantMiddleware;