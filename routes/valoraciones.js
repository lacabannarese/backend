const express = require('express');
const router = express.Router();
const Valoracion = require('../models/Valoracion');

// Crear valoración
router.post('/', async (req, res) => {
  try {
    const valoracion = new Valoracion(req.body);
    await valoracion.save();
    res.json(valoracion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener todas las valoraciones
router.get('/', async (req, res) => {
  try {
    const valoraciones = await Valoracion.find();
    res.json(valoraciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener valoraciones por receta
router.get('/:recetaTitulo', async (req, res) => {
  try {
    const valoraciones = await Valoracion.find({ recetaTitulo: req.params.recetaTitulo });
    res.json(valoraciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//promedio
router.get('/:recetaTitulo/promedio', async (req, res) => {
  try {
    const valoraciones = await Valoracion.find({ recetaTitulo: req.params.recetaTitulo });
    if (valoraciones.length === 0) return res.json({ promedio: 0 });
    const promedio = valoraciones.reduce((acc, v) => acc + v.estrellas, 0) / valoraciones.length;
    res.json({ promedio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;