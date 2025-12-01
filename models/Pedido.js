const mongoose = require('mongoose');

const ItemCarritoSchema = new mongoose.Schema({
  productoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Producto',
    required: true
  },
  nombreProducto: { 
    type: String,
    required: true  // Guardamos el nombre por si el producto se elimina
  },
  precioUnitario: { 
    type: Number,
    required: true,
    min: 0
  },
  cantidad: { 
    type: Number,
    required: true,
    min: [1, 'La cantidad mínima es 1'],
    default: 1
  },
  subtotal: { 
    type: Number,
    required: true,
    min: 0
  },
  fechaAgregado: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: false });  // No necesitamos _id para subdocumentos

const CarritoSchema = new mongoose.Schema({
  usuarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario',
    required: true,
    unique: true  // Un usuario solo tiene un carrito activo
  },
  items: [ItemCarritoSchema],
  subtotal: { 
    type: Number,
    default: 0,
    min: 0
  },
  ultimaActualizacion: { 
    type: Date, 
    default: Date.now 
  },
  estado: {
    type: String,
    enum: ['activo', 'abandonado', 'convertido'],
    default: 'activo'
  }
}, {
  timestamps: true
});

// Índice para búsquedas rápidas por usuario
CarritoSchema.index({ usuarioId: 1 });
CarritoSchema.index({ estado: 1, ultimaActualizacion: -1 });

// Método para calcular el subtotal del carrito
CarritoSchema.methods.calcularSubtotal = function() {
  this.subtotal = this.items.reduce((total, item) => {
    return total + item.subtotal;
  }, 0);
  return this.subtotal;
};

// Método para agregar un producto al carrito
CarritoSchema.methods.agregarProducto = function(producto, cantidad = 1) {
  // Buscar si el producto ya existe en el carrito
  const itemExistente = this.items.find(
    item => item.productoId.toString() === producto._id.toString()
  );

  if (itemExistente) {
    // Si existe, aumentar la cantidad
    itemExistente.cantidad += cantidad;
    itemExistente.subtotal = itemExistente.precioUnitario * itemExistente.cantidad;
  } else {
    // Si no existe, agregarlo como nuevo item
    this.items.push({
      productoId: producto._id,
      nombreProducto: producto.nombre,
      precioUnitario: producto.precio,
      cantidad: cantidad,
      subtotal: producto.precio * cantidad,
      fechaAgregado: new Date()
    });
  }

  this.calcularSubtotal();
  this.ultimaActualizacion = new Date();
};

// Método para actualizar la cantidad de un producto
CarritoSchema.methods.actualizarCantidad = function(productoId, nuevaCantidad) {
  const item = this.items.find(
    item => item.productoId.toString() === productoId.toString()
  );

  if (item) {
    if (nuevaCantidad <= 0) {
      // Si la cantidad es 0 o negativa, eliminar el item
      this.items = this.items.filter(
        item => item.productoId.toString() !== productoId.toString()
      );
    } else {
      item.cantidad = nuevaCantidad;
      item.subtotal = item.precioUnitario * item.cantidad;
    }
    this.calcularSubtotal();
    this.ultimaActualizacion = new Date();
  }
};

// Método para eliminar un producto del carrito
CarritoSchema.methods.eliminarProducto = function(productoId) {
  this.items = this.items.filter(
    item => item.productoId.toString() !== productoId.toString()
  );
  this.calcularSubtotal();
  this.ultimaActualizacion = new Date();
};

// Método para vaciar el carrito
CarritoSchema.methods.vaciar = function() {
  this.items = [];
  this.subtotal = 0;
  this.ultimaActualizacion = new Date();
};

// Método virtual para obtener el número total de items
CarritoSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.cantidad, 0);
});

// Middleware para actualizar el subtotal antes de guardar
CarritoSchema.pre('save', function(next) {
  this.calcularSubtotal();
  this.ultimaActualizacion = new Date();
  next();
});

// Configurar para que los virtuals se incluyan en JSON
CarritoSchema.set('toJSON', { virtuals: true });
CarritoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Carrito', CarritoSchema, 'carritos');