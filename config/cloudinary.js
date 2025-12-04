const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configurar Cloudinary con tu URL
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL || 'cloudinary://175251729813653:Y8sMOhJvI622pIVx6IBiM0-iNzk@djhi5payg'
});

// Configuración de almacenamiento para diferentes tipos de archivos
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determinar la carpeta según el tipo de archivo
    let folder = 'redrecetas/general';
    
    if (req.baseUrl.includes('/recetas')) {
      folder = 'redrecetas/recetas';
    } else if (req.baseUrl.includes('/usuarios')) {
      folder = 'redrecetas/usuarios';
    } else if (req.baseUrl.includes('/productos')) {
      folder = 'redrecetas/productos';
    } else if (req.baseUrl.includes('/blogs')) {
      folder = 'redrecetas/blogs';
    }

    return {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Limitar tamaño máximo
        { quality: 'auto:good' } // Optimización automática
      ],
      public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}` // Nombre único
    };
  }
});

// Configuración específica para perfiles de usuario (imágenes más pequeñas)
const storagePerfiles = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'redrecetas/usuarios/perfiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Cuadrado centrado en rostro
      { quality: 'auto:good' }
    ],
    public_id: (req, file) => `perfil-${Date.now()}-${Math.round(Math.random() * 1E9)}`
  }
});

// Función auxiliar para eliminar imágenes antiguas de Cloudinary
const eliminarImagen = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary')) {
      return { success: false, message: 'No es una imagen de Cloudinary' };
    }

    // Extraer el public_id de la URL
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const folder = parts.slice(parts.indexOf('redrecetas'), -1).join('/');
    const publicId = `${folder}/${filename}`;

    const result = await cloudinary.uploader.destroy(publicId);
    return { success: true, result };
  } catch (error) {
    console.error('Error al eliminar imagen de Cloudinary:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  cloudinary,
  storage,
  storagePerfiles,
  eliminarImagen
};