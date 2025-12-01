const mongoose = require('mongoose');

const RecetaSchema = new mongoose.Schema({
  usuario: { type: String, required: true },
  titulo: { type: String, required: true },
  tipo: { type: String },
  ingredientes: [String],
  descripcion: String,
  pasos: String,
  imagen: {
    nombreArchivo: String,
    tipo: String,
    almacenadoEn: String
  },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Receta', RecetaSchema, 'recetas');
