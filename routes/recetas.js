const express = require('express');
const router = express.Router();
const Receta = require('../models/Receta');
const Usuario = require('../models/Usuario');
const upload = require('../middleware/multerConfig');

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
    if (typeof recetaData.ingredientes === 'string') {
      try {
        recetaData.ingredientes = JSON.parse(recetaData.ingredientes);
      } catch (e) {
        recetaData.ingredientes = recetaData.ingredientes.split('\n').filter(i => i.trim());
      }
    }
    if (req.file) {
      recetaData.imagen = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: `/uploads/${req.file.filename}`
      };
    }
    const receta = new Receta(recetaData);
    await receta.save();
    res.json(receta);
  } catch (err) {
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
    const recetas = await Receta.find(filtros);
    res.json(recetas);
  } catch (err) {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;