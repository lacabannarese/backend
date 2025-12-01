const mongoose = require('mongoose');

const ValoracionSchema = new mongoose.Schema({
  recetaTitulo: { type: String, required: true },
  usuario: { type: String, required: true },
  estrellas: { type: Number, min: 1, max: 5 },
  comentario: String,
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Valoracion', ValoracionSchema, 'valoraciones');
