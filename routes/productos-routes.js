const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');
const multer = require('multer');
const path = require('path');

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'producto-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
  }
});

// ==========================================
// RUTA: Obtener todos los productos (con filtros)
// GET /api/productos
// Query params: categoria, disponible, busqueda, limite, pagina
// ==========================================
router.get('/', async (req, res) => {
  try {
    const {
      categoria,
      disponible,
      busqueda,
      limite = 20,
      pagina = 1
    } = req.query;

    // Construir filtro
    const filtro = {};

    if (categoria) {
      filtro.categoria = categoria;
    }

    if (disponible !== undefined) {
      filtro.disponible = disponible === 'true';
    }

    // Búsqueda por texto
    if (busqueda) {
      filtro.$text = { $search: busqueda };
    }

    // Calcular paginación
    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    // Ejecutar consulta
    const productos = await Producto.find(filtro)
      .sort({ fechaCreacion: -1 })
      .limit(parseInt(limite))
      .skip(skip);

    // Contar total de documentos
    const total = await Producto.countDocuments(filtro);

    res.json({
      success: true,
      productos: productos,
      paginacion: {
        total: total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(total / parseInt(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Obtener un producto por ID
// GET /api/productos/:id
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      producto: producto
    });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Crear nuevo producto
// POST /api/productos
// Body: FormData con imagen y datos del producto
// Requiere autenticación de admin
// ==========================================
router.post('/', upload.single('imagen'), async (req, res) => {
  try {
    // Verificar si el usuario es admin (debes implementar este middleware)
    // if (req.user.tipo !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'No tienes permisos para crear productos'
    //   });
    // }

    const {
      nombre,
      descripcion,
      precio,
      categoria,
      stock,
      disponible,
      unidadMedida,
      etiquetas
    } = req.body;

    // Validar datos requeridos
    if (!nombre || !precio || !categoria) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos (nombre, precio, categoria)'
      });
    }

    // Crear objeto de imagen si se subió archivo
    let imagenData = {};
    if (req.file) {
      imagenData = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: 'uploads',
        url: `/uploads/${req.file.filename}`
      };
    }

    // Procesar etiquetas si vienen como string
    let etiquetasArray = [];
    if (etiquetas) {
      etiquetasArray = typeof etiquetas === 'string' 
        ? etiquetas.split(',').map(tag => tag.trim())
        : etiquetas;
    }

    // Crear nuevo producto
    const nuevoProducto = new Producto({
      nombre,
      descripcion,
      precio: parseFloat(precio),
      categoria,
      imagen: imagenData,
      stock: parseInt(stock) || 0,
      disponible: disponible === 'true' || disponible === true,
      unidadMedida: unidadMedida || 'pieza',
      etiquetas: etiquetasArray
    });

    await nuevoProducto.save();

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      producto: nuevoProducto
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear producto',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Actualizar producto
// PUT /api/productos/:id
// Body: FormData con datos a actualizar
// Requiere autenticación de admin
// ==========================================
router.put('/:id', upload.single('imagen'), async (req, res) => {
  try {
    // Verificar si el usuario es admin
    // if (req.user.tipo !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'No tienes permisos para actualizar productos'
    //   });
    // }

    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Actualizar campos
    const {
      nombre,
      descripcion,
      precio,
      categoria,
      stock,
      disponible,
      unidadMedida,
      etiquetas
    } = req.body;

    if (nombre) producto.nombre = nombre;
    if (descripcion !== undefined) producto.descripcion = descripcion;
    if (precio) producto.precio = parseFloat(precio);
    if (categoria) producto.categoria = categoria;
    if (stock !== undefined) producto.stock = parseInt(stock);
    if (disponible !== undefined) producto.disponible = disponible === 'true' || disponible === true;
    if (unidadMedida) producto.unidadMedida = unidadMedida;

    // Procesar etiquetas
    if (etiquetas) {
      producto.etiquetas = typeof etiquetas === 'string'
        ? etiquetas.split(',').map(tag => tag.trim())
        : etiquetas;
    }

    // Actualizar imagen si se subió una nueva
    if (req.file) {
      producto.imagen = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: 'uploads',
        url: `/uploads/${req.file.filename}`
      };
    }

    await producto.save();

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      producto: producto
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Eliminar producto
// DELETE /api/productos/:id
// Requiere autenticación de admin
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    // Verificar si el usuario es admin
    // if (req.user.tipo !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'No tienes permisos para eliminar productos'
    //   });
    // }

    const producto = await Producto.findByIdAndDelete(req.params.id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Obtener productos por categoría
// GET /api/productos/categoria/:categoria
// ==========================================
router.get('/categoria/:categoria', async (req, res) => {
  try {
    const productos = await Producto.find({
      categoria: req.params.categoria,
      disponible: true
    }).sort({ ventas: -1 }); // Ordenar por más vendidos

    res.json({
      success: true,
      categoria: req.params.categoria,
      total: productos.length,
      productos: productos
    });
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Obtener productos más vendidos
// GET /api/productos/mas-vendidos/:limite
// ==========================================
router.get('/mas-vendidos/:limite?', async (req, res) => {
  try {
    const limite = parseInt(req.params.limite) || 10;

    const productos = await Producto.find({ disponible: true })
      .sort({ ventas: -1 })
      .limit(limite);

    res.json({
      success: true,
      productos: productos
    });
  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Buscar productos
// GET /api/productos/buscar/:termino
// ==========================================
router.get('/buscar/:termino', async (req, res) => {
  try {
    const termino = req.params.termino;

    const productos = await Producto.find({
      $or: [
        { nombre: { $regex: termino, $options: 'i' } },
        { descripcion: { $regex: termino, $options: 'i' } },
        { etiquetas: { $in: [new RegExp(termino, 'i')] } }
      ],
      disponible: true
    });

    res.json({
      success: true,
      termino: termino,
      total: productos.length,
      productos: productos
    });
  } catch (error) {
    console.error('Error al buscar productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar productos',
      error: error.message
    });
  }
});

module.exports = router;