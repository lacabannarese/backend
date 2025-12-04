const express = require('express');
const router = express.Router();
const BlogConsejo = require('../models/BlogConsejo');
const { upload } = require('../middleware/multerCloudinary');
const { eliminarImagen } = require('../config/cloudinary');

// Obtener todos los blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await BlogConsejo.find().sort({ fecha: -1 });
    res.json(blogs);
  } catch (err) {
    console.error('❌ Error al obtener blogs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Crear blog
router.post('/', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.body.titulo) {
      return res.status(400).json({ error: 'El campo "titulo" es requerido' });
    }
    if (!req.body.autor) {
      return res.status(400).json({ error: 'El campo "autor" es requerido' });
    }
    
    const blogData = {
      titulo: req.body.titulo,
      autor: req.body.autor,
      contenido: req.body.contenido
    };
    
    // Si se subió imagen, guardar datos de Cloudinary
    if (req.file) {
      blogData.imagen = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: req.file.path, // URL completa de Cloudinary
        cloudinaryId: req.file.filename
      };
      console.log('✅ Imagen subida a Cloudinary:', req.file.path);
    }
    
    const blog = new BlogConsejo(blogData);
    await blog.save();
    
    console.log('✅ Blog creado:', blog.titulo);
    res.status(201).json(blog);
  } catch (err) {
    console.error('❌ Error al crear blog:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Error de validación', detalles: err.message });
    }
    res.status(500).json({ error: 'Error al crear blog', detalles: err.message });
  }
});

// Obtener blog por título
router.get('/:titulo', async (req, res) => {
  try {
    const blog = await BlogConsejo.findOne({ titulo: req.params.titulo });
    if (!blog) {
      return res.status(404).json({ error: 'Blog no encontrado' });
    }
    res.json(blog);
  } catch (err) {
    console.error('❌ Error al obtener blog:', err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar blog
router.put('/:titulo', upload.single('imagen'), async (req, res) => {
  try {
    const blogAnterior = await BlogConsejo.findOne({ titulo: req.params.titulo });
    
    if (!blogAnterior) {
      return res.status(404).json({ error: 'Blog no encontrado' });
    }
    
    const updateData = { ...req.body };
    
    // Si se subió nueva imagen
    if (req.file) {
      // Eliminar imagen antigua de Cloudinary
      if (blogAnterior.imagen?.almacenadoEn) {
        await eliminarImagen(blogAnterior.imagen.almacenadoEn);
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
    
    const blog = await BlogConsejo.findOneAndUpdate(
      { titulo: req.params.titulo },
      updateData,
      { new: true }
    );
    
    console.log('✅ Blog actualizado:', blog.titulo);
    res.json(blog);
  } catch (err) {
    console.error('❌ Error al actualizar blog:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar blog
router.delete('/:titulo', async (req, res) => {
  try {
    const blog = await BlogConsejo.findOne({ titulo: req.params.titulo });
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog no encontrado' });
    }
    
    // Eliminar imagen de Cloudinary si existe
    if (blog.imagen?.almacenadoEn) {
      await eliminarImagen(blog.imagen.almacenadoEn);
      console.log('🗑️ Imagen eliminada de Cloudinary');
    }
    
    await BlogConsejo.deleteOne({ titulo: req.params.titulo });
    
    console.log('✅ Blog eliminado:', req.params.titulo);
    res.json({ mensaje: 'Blog eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar blog:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;