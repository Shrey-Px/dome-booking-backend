// src/models/Booking.js - Correct structure
module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    facilityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'facilities',
        key: 'id'
      }
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    courtNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    bookingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    discountCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    paymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    source: {
      type: DataTypes.STRING,
      defaultValue: 'web'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'bookings',
    timestamps: true
  });

  // Define associations
  Booking.associate = (models) => {
    Booking.belongsTo(models.Facility, {
      foreignKey: 'facilityId',
      as: 'facility'
    });
  };

  return Booking;
};