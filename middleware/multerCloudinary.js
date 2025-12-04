const multer = require('multer');
const { storage, storagePerfiles } = require('../config/cloudinary');

// Filtro de archivos - solo imágenes
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(file.originalname.toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  
  cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif, webp)'));
};

// Configuración general de multer para Cloudinary
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: fileFilter
});

// Configuración específica para imágenes de perfil
const uploadPerfil = multer({
  storage: storagePerfiles,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB máximo para perfiles
  },
  fileFilter: fileFilter
});

module.exports = {
  upload,
  uploadPerfil
};