const express = require('express');
const router = express.Router();
const BlogConsejo = require('../models/BlogConsejo');
const upload = require('../middleware/multerConfig');

// Obtener todos los blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await BlogConsejo.find().sort({ fecha: -1 });
    res.json(blogs);
  } catch (err) {
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
    if (req.file) {
      blogData.imagen = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: `/uploads/${req.file.filename}`
      };
    }
    const blog = new BlogConsejo(blogData);
    await blog.save();
    res.status(201).json(blog);
  } catch (err) {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;