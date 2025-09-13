// src/models/Facility.js - MINIMAL VERSION to match existing database
module.exports = (sequelize, DataTypes) => {
  const Facility = sequelize.define('Facility', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    courts: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    operatingHours: {
      type: DataTypes.JSON,
      allowNull: true
    },
    pricePerHour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 25.00
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
    // REMOVED phone and email since they don't exist in your database
  }, {
    tableName: 'facilities',
    timestamps: true
  });

  // Define associations
  Facility.associate = (models) => {
    Facility.hasMany(models.Booking, {
      foreignKey: 'facilityId',
      as: 'bookings'
    });
  };

  return Facility;
};