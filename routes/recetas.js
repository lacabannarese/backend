const express = require('express');
const router = express.Router();
const Receta = require('../models/Receta');
const Usuario = require('../models/Usuario');
const { upload } = require('../middleware/multerCloudinary');
const { eliminarImagen } = require('../config/cloudinary');

// Crear receta
router.post('/', upload.single('imagen'), async (req, res) => {
  try {
    const recetaData = {
      usuario: req.body.usuario,
      titulo: req.body.titulo,
      tipo: req.body.tipo,
      ingredientes: req.body.ingredientes,
      descripcion: req.body.descripcion,
      pasos: req.body.pasos
    };
    
    // Procesar ingredientes si vienen como string
    if (typeof recetaData.ingredientes === 'string') {
      try {
        recetaData.ingredientes = JSON.parse(recetaData.ingredientes);
      } catch (e) {
        recetaData.ingredientes = recetaData.ingredientes.split('\n').filter(i => i.trim());
      }
    }
    
    // Si se subió imagen, guardar datos de Cloudinary
    if (req.file) {
      recetaData.imagen = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: req.file.path, // URL completa de Cloudinary
        cloudinaryId: req.file.filename
      };
      console.log('✅ Imagen subida a Cloudinary:', req.file.path);
    }
    
    const receta = new Receta(recetaData);
    await receta.save();
    
    console.log('✅ Receta creada:', receta.titulo);
    res.json(receta);
  } catch (err) {
    console.error('❌ Error al crear receta:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener recetas con filtros
router.get('/', async (req, res) => {
  try {
    const filtros = {};
    
    if (req.query.tipo) filtros.tipo = req.query.tipo;
    if (req.query.usuario) filtros.usuario = req.query.usuario;
    if (req.query.titulo) filtros.titulo = { $regex: req.query.titulo, $options: "i" };
    if (req.query.ingrediente) filtros.ingredientes = { $in: [ req.query.ingrediente ] };
    
    const recetas = await Receta.find(filtros).sort({ fechaPublicacion: -1 });
    res.json(recetas);
  } catch (err) {
    console.error('❌ Error al filtrar recetas:', err);
    res.status(500).json({ error: "Error al filtrar recetas" });
  }
});

// Obtener receta por título
router.get('/:titulo', async (req, res) => {
  try {
    const receta = await Receta.findOne({ titulo: req.params.titulo });
    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    res.json(receta);
  } catch (err) {
    console.error('❌ Error al obtener receta:', err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar receta
router.put('/:titulo', upload.single('imagen'), async (req, res) => {
  try {
    const recetaAnterior = await Receta.findOne({ titulo: req.params.titulo });
    
    if (!recetaAnterior) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    
    const updateData = { ...req.body };
    
    // Procesar ingredientes si vienen como string
    if (typeof updateData.ingredientes === 'string') {
      try {
        updateData.ingredientes = JSON.parse(updateData.ingredientes);
      } catch (e) {
        updateData.ingredientes = updateData.ingredientes.split('\n').filter(i => i.trim());
      }
    }
    
    // Si se subió nueva imagen
    if (req.file) {
      // Eliminar imagen antigua de Cloudinary
      if (recetaAnterior.imagen?.almacenadoEn) {
        await eliminarImagen(recetaAnterior.imagen.almacenadoEn);
        console.log('🗑️ Imagen anterior eliminada de Cloudinary');
      }
      
      // Guardar nueva imagen
      updateData.imagen = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: req.file.path,
        cloudinaryId: req.file.filename
      };
      console.log('✅ Nueva imagen subida a Cloudinary:', req.file.path);
    }
    
    const receta = await Receta.findOneAndUpdate(
      { titulo: req.params.titulo },
      updateData,
      { new: true }
    );
    
    console.log('✅ Receta actualizada:', receta.titulo);
    res.json(receta);
  } catch (err) {
    console.error('❌ Error al actualizar receta:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar receta
router.delete('/:titulo', async (req, res) => {
  try {
    const receta = await Receta.findOne({ titulo: req.params.titulo });
    
    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    
    // Eliminar imagen de Cloudinary si existe
    if (receta.imagen?.almacenadoEn) {
      await eliminarImagen(receta.imagen.almacenadoEn);
      console.log('🗑️ Imagen eliminada de Cloudinary');
    }
    
    await Receta.deleteOne({ titulo: req.params.titulo });
    
    console.log('✅ Receta eliminada:', req.params.titulo);
    res.json({ mensaje: 'Receta eliminada correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar receta:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;