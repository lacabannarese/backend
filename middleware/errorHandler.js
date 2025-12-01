// Middleware de manejo de errores
module.exports = (err, req, res, next) => {
  console.error('❌ Error:', err.stack || err.message);

  // Si el error viene de validación de Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      detalles: err.message
    });
  }

  // Si el error es de duplicado en Mongo (ej. email único)
  if (err.code === 11000) {
    return res.status(400).json({
      error: 'Duplicado',
      detalles: 'Ya existe un registro con ese valor único'
    });
  }

  // Si es un error de Multer (subida de archivos)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'Error de subida de archivo',
      detalles: err.message
    });
  }

  // Error genérico
  res.status(500).json({
    error: 'Error interno del servidor',
    detalles: err.message || 'Algo salió mal'
  });
};