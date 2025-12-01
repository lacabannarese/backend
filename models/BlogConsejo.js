const mongoose = require('mongoose');

const BlogConsejoSchema = new mongoose.Schema({
  autor: { type: String, required: true },
  titulo: { type: String, required: true },
  imagen: {
    nombreArchivo: String,
    tipo: String,
    almacenadoEn: String
  },
  contenido: String,
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BlogConsejo', BlogConsejoSchema, 'blogs');
