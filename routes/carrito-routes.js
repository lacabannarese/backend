const express = require('express');
const router = express.Router();
const Carrito = require('../models/Carrito');
const Producto = require('../models/Producto');

// Middleware de autenticación (debes tenerlo en tu proyecto)
// const verificarAutenticacion = require('../middleware/auth');

// ==========================================
// RUTA: Obtener carrito del usuario
// GET /api/carrito
// ==========================================
router.get('/', async (req, res) => {
  try {
    // req.user._id viene del middleware de autenticación
    let carrito = await Carrito.findOne({ usuarioId: req.user._id })
      .populate('items.productoId', 'nombre precio imagen disponible stock');

    // Si no existe carrito, crear uno vacío
    if (!carrito) {
      carrito = new Carrito({ usuarioId: req.user._id });
      await carrito.save();
    }

    res.json({
      success: true,
      carrito: carrito
    });
  } catch (error) {
    console.error('Error al obtener carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el carrito',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Agregar producto al carrito
// POST /api/carrito/agregar
// Body: { productoId, cantidad }
// ==========================================
router.post('/agregar', async (req, res) => {
  try {
    const { productoId, cantidad } = req.body;

    // Validar datos
    if (!productoId || !cantidad || cantidad < 1) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos'
      });
    }

    // Verificar que el producto existe y está disponible
    const producto = await Producto.findById(productoId);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    if (!producto.disponible) {
      return res.status(400).json({
        success: false,
        message: 'Este producto no está disponible'
      });
    }

    // Verificar stock suficiente
    if (producto.stock < cantidad) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo hay ${producto.stock} unidades disponibles`
      });
    }

    // Buscar o crear carrito
    let carrito = await Carrito.findOne({ usuarioId: req.user._id });
    
    if (!carrito) {
      carrito = new Carrito({ usuarioId: req.user._id });
    }

    // Agregar producto usando el método del modelo
    carrito.agregarProducto(producto, cantidad);
    await carrito.save();

    // Poblar el carrito antes de enviarlo
    await carrito.populate('items.productoId', 'nombre precio imagen disponible stock');

    res.json({
      success: true,
      message: 'Producto agregado al carrito',
      carrito: carrito
    });
  } catch (error) {
    console.error('Error al agregar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar producto al carrito',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Actualizar cantidad de un producto
// PUT /api/carrito/actualizar
// Body: { productoId, cantidad }
// ==========================================
router.put('/actualizar', async (req, res) => {
  try {
    const { productoId, cantidad } = req.body;

    // Validar datos
    if (!productoId || cantidad === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos'
      });
    }

    // Buscar carrito
    const carrito = await Carrito.findOne({ usuarioId: req.user._id });
    
    if (!carrito) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }

    // Si la cantidad es mayor a 0, verificar stock
    if (cantidad > 0) {
      const producto = await Producto.findById(productoId);
      
      if (!producto) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      if (producto.stock < cantidad) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente. Solo hay ${producto.stock} unidades disponibles`
        });
      }
    }

    // Actualizar cantidad usando el método del modelo
    carrito.actualizarCantidad(productoId, cantidad);
    await carrito.save();

    // Poblar el carrito
    await carrito.populate('items.productoId', 'nombre precio imagen disponible stock');

    res.json({
      success: true,
      message: cantidad > 0 ? 'Cantidad actualizada' : 'Producto eliminado del carrito',
      carrito: carrito
    });
  } catch (error) {
    console.error('Error al actualizar cantidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cantidad',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Eliminar producto del carrito
// DELETE /api/carrito/eliminar/:productoId
// ==========================================
router.delete('/eliminar/:productoId', async (req, res) => {
  try {
    const { productoId } = req.params;

    // Buscar carrito
    const carrito = await Carrito.findOne({ usuarioId: req.user._id });
    
    if (!carrito) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }

    // Eliminar producto usando el método del modelo
    carrito.eliminarProducto(productoId);
    await carrito.save();

    // Poblar el carrito
    await carrito.populate('items.productoId', 'nombre precio imagen disponible stock');

    res.json({
      success: true,
      message: 'Producto eliminado del carrito',
      carrito: carrito
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto del carrito',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Vaciar carrito
// DELETE /api/carrito/vaciar
// ==========================================
router.delete('/vaciar', async (req, res) => {
  try {
    // Buscar carrito
    const carrito = await Carrito.findOne({ usuarioId: req.user._id });
    
    if (!carrito) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }

    // Vaciar usando el método del modelo
    carrito.vaciar();
    await carrito.save();

    res.json({
      success: true,
      message: 'Carrito vaciado',
      carrito: carrito
    });
  } catch (error) {
    console.error('Error al vaciar carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al vaciar el carrito',
      error: error.message
    });
  }
});

// ==========================================
// RUTA: Obtener resumen del carrito (solo totales)
// GET /api/carrito/resumen
// ==========================================
router.get('/resumen', async (req, res) => {
  try {
    const carrito = await Carrito.findOne({ usuarioId: req.user._id });
    
    if (!carrito) {
      return res.json({
        success: true,
        resumen: {
          totalItems: 0,
          subtotal: 0
        }
      });
    }

    res.json({
      success: true,
      resumen: {
        totalItems: carrito.totalItems,
        subtotal: carrito.subtotal,
        numeroProductos: carrito.items.length
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen del carrito',
      error: error.message
    });
  }
});

module.exports = router;