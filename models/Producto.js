const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: [true, 'El nombre del producto es requerido'],
    trim: true
  },
  descripcion: { 
    type: String,
    trim: true
  },
  precio: { 
    type: Number, 
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  categoria: { 
    type: String,
    enum: ['Desayuno', 'Almuerzo', 'Cena', 'Postre', 'Bebida', 'Snack', 'Otro'],
    required: true
  },
  imagen: {
    nombreArchivo: String,
    tipo: String,
    almacenadoEn: String,
    url: String  // URL completa de la imagen
  },
  stock: { 
    type: Number, 
    default: 0,
    min: [0, 'El stock no puede ser negativo']
  },
  disponible: { 
    type: Boolean, 
    default: true 
  },
  unidadMedida: { 
    type: String,
    enum: ['kg', 'g', 'pieza', 'litro', 'ml', 'porción'],
    default: 'pieza'
  },
  etiquetas: [{ 
    type: String,
    lowercase: true,
    trim: true
  }],
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  },
  fechaActualizacion: { 
    type: Date, 
    default: Date.now 
  },
  ventas: { 
    type: Number, 
    default: 0 
  }
}, {
  timestamps: true  // Agrega automáticamente createdAt y updatedAt
});

// Índices para mejorar búsquedas
ProductoSchema.index({ nombre: 'text', descripcion: 'text', etiquetas: 'text' });
ProductoSchema.index({ categoria: 1 });
ProductoSchema.index({ disponible: 1 });
ProductoSchema.index({ precio: 1 });

// Middleware para actualizar fechaActualizacion antes de guardar
ProductoSchema.pre('save', function(next) {
  this.fechaActualizacion = Date.now();
  next();
});

// Método virtual para verificar si hay stock disponible
ProductoSchema.virtual('tieneStock').get(function() {
  return this.stock > 0 && this.disponible;
});

module.exports = mongoose.model('Producto', ProductoSchema, 'productos');