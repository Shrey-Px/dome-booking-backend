// src/models/Discount.js - Correct structure
module.exports = (sequelize, DataTypes) => {
  const Discount = sequelize.define('Discount', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    minAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    maxDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    usedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: false
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'discounts',
    timestamps: true
  });

  // Define associations if needed
  Discount.associate = (models) => {
    // Add associations here if needed in the future
  };

  return Discount;
};