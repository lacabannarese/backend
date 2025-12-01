const express = require('express');
const router = express.Router();
const ComentarioBlog = require('../models/ComentarioBlog');

// Crear comentario
router.post('/', async (req, res) => {
  console.log('📝 [POST] Crear comentario:', req.body);
  
  try {
    const comentario = new ComentarioBlog(req.body);
    await comentario.save();
    
    console.log('✅ Comentario creado:', comentario);
    res.json(comentario);
  } catch (err) {
    console.error('❌ Error al crear comentario:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener todos los comentarios
router.get('/', async (req, res) => {
  try {
    const comentarios = await ComentarioBlog.find().sort({ fecha: -1 });
    res.json(comentarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener comentarios por blog
router.get('/:titulo', async (req, res) => {
  console.log('📖 [GET] Comentarios para:', req.params.titulo);
  
  try {
    const comentarios = await ComentarioBlog.find({ 
      blogTitulo: req.params.titulo 
    }).sort({ fecha: -1 });
    
    console.log(`✅ ${comentarios.length} comentarios encontrados`);
    res.json(comentarios);
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar comentario
router.delete('/:id', async (req, res) => {
  console.log('🗑️ [DELETE] Eliminar comentario:', req.params.id);
  
  try {
    const comentario = await ComentarioBlog.findByIdAndDelete(req.params.id);
    
    if (!comentario) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }
    
    console.log('✅ Comentario eliminado');
    res.json({ mensaje: 'Comentario eliminado', comentario });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;