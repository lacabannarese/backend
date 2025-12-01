const mongoose = require('mongoose');

const comentarioBlogSchema = new mongoose.Schema({
  blogTitulo: {
    type: String,
    required: true
  },
  usuario: {
    type: String,
    required: true
  },
  texto: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ComentarioBlog', comentarioBlogSchema);