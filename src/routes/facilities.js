const express = require('express');
const router = express.Router();
const { Facility } = require('../models/mongodb');

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log('🏢 Getting facility by slug:', slug);
    
    const facility = await Facility.findOne({ slug: slug });
    
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }
    
    console.log('✅ Facility found:', facility.name);
    
    res.json({
      success: true,
      data: facility
    });
  } catch (error) {
    console.error('❌ Error getting facility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get facility',
      error: error.message
    });
  }
});

module.exports = router;