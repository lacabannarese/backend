const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // ✅ AGREGADO para diagnóstico
const stripe = require('stripe')('sk_test_51SX1KLQadAnOUAEUK3rhGsScgJth90j1U7Ho8qNXGB1tEUYXn9Al39eJRYfrxji7m6VFpUp7hW6CJjOcAddRauCT00bJySZ2c4');
require('dotenv').config();

const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

connectDB();

const app = express();
const port = process.env.PORT || 3000;

// ⭐ CONFIGURACIÓN DE CORS MEJORADA PARA PRODUCCIÓN
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (apps móviles, Postman)
    if (!origin) return callback(null, true);
    
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'https://lacabannarese.github.io',
      'https://snow-viper-512277.hostingersite.com',
      'https://srv-d4mvel3uibrs738udv7g.onrender.com',
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/
    ];
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('⚠️ CORS bloqueado para:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(logger);

// ✅ MIDDLEWARE GLOBAL PARA HEADERS DE SEGURIDAD
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// ✅ SERVIR ARCHIVOS ESTÁTICOS CON HEADERS CORS CORRECTOS
app.use(express.static('public'));

// ✅ CONFIGURACIÓN ESPECÍFICA PARA /uploads CON HEADERS CORS
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=31536000');
    
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    
    if (mimeTypes[ext]) {
      res.set('Content-Type', mimeTypes[ext]);
    }
  }
}));

// Endpoint raíz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API RedRecetas funcionando',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    render: {
      service: 'srv-d4mvel3uibrs738udv7g',
      region: 'oregon'
    }
  });
});

// ========================================
// ✅ ENDPOINTS DE DIAGNÓSTICO DE IMÁGENES
// ========================================

// 🔍 Verificar qué archivos existen en /uploads
app.get('/api/check-uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  
  try {
    if (!fs.existsSync(uploadsPath)) {
      return res.json({ 
        exists: false, 
        message: '❌ La carpeta uploads no existe',
        path: uploadsPath,
        advertencia: '⚠️ Render usa almacenamiento efímero. Los archivos se eliminan al reiniciar.'
      });
    }
    
    const files = fs.readdirSync(uploadsPath);
    
    const filesDetails = files.map(file => {
      const filePath = path.join(uploadsPath, file);
      const stats = fs.statSync(filePath);
      return {
        nombre: file,
        tamaño: `${(stats.size / 1024).toFixed(2)} KB`,
        fecha: stats.mtime,
        url: `/uploads/${file}`
      };
    });
    
    res.json({ 
      exists: true,
      carpeta: uploadsPath,
      totalArchivos: files.length,
      archivos: filesDetails,
      mensaje: files.length === 0 
        ? '⚠️ La carpeta existe pero está VACÍA (las imágenes fueron borradas)' 
        : `✅ ${files.length} archivos encontrados`,
      advertencia: '⚠️ Render elimina archivos al reiniciar. Soluciones: Cloudinary (gratis) o Render Disk ($7/mes)'
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// 🔍 Verificar una imagen específica
app.get('/api/check-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'uploads', filename);
  
  if (fs.existsSync(imagePath)) {
    const stats = fs.statSync(imagePath);
    res.json({
      existe: true,
      nombre: filename,
      ruta: imagePath,
      tamaño: `${(stats.size / 1024).toFixed(2)} KB`,
      fecha: stats.mtime,
      url: `/uploads/${filename}`,
      mensaje: '✅ La imagen existe en el servidor'
    });
  } else {
    res.status(404).json({
      existe: false,
      nombre: filename,
      ruta: imagePath,
      mensaje: '❌ La imagen NO existe en el servidor',
      explicacion: 'Probablemente fue eliminada cuando Render reinició el servicio',
      soluciones: [
        '1. Volver a subir la receta con la imagen',
        '2. Usar Cloudinary (almacenamiento permanente gratis)',
        '3. Pagar Render Disk ($7/mes)'
      ]
    });
  }
});

// 🔍 Info del sistema de archivos
app.get('/api/system-info', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  
  res.json({
    servidor: 'Render.com',
    entorno: process.env.NODE_ENV || 'development',
    directorio_trabajo: process.cwd(),
    ruta_uploads: uploadsPath,
    carpeta_uploads_existe: fs.existsSync(uploadsPath),
    advertencia: '⚠️ Render usa almacenamiento EFÍMERO',
    explicacion: 'Los archivos en /uploads se ELIMINAN cuando el servicio se reinicia o redeploy',
    soluciones_recomendadas: {
      opcion1: {
        nombre: 'Cloudinary (Recomendado)',
        costo: 'GRATIS hasta 25 GB',
        permanente: true,
        cdn: true
      },
      opcion2: {
        nombre: 'Render Disk',
        costo: '$7/mes',
        permanente: true,
        cdn: false
      },
      opcion3: {
        nombre: 'Mover a Hostinger',
        costo: 'Incluido en plan Business',
        permanente: true,
        cdn: false
      }
    }
  });
});

// ========================================
// RUTAS DE LA API
// ========================================
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/recetas', require('./routes/recetas'));
app.use('/api/valoraciones', require('./routes/valoraciones'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/comentariosBlog', require('./routes/comentarios'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos-routes'));
app.use('/api/carrito', require('./routes/carrito-routes'));

// Stripe endpoints
app.post('/crear-sesion-pago', async (req, res) => {
  try {
    const { nombre, precio, descripcion, cantidad } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: {
            name: nombre,
            description: descripcion,
          },
          unit_amount: precio,
        },
        quantity: cantidad,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'https://snow-viper-512277.hostingersite.com'}/exito.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://snow-viper-512277.hostingersite.com'}/tienda.html?canceled=true`,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['MX'],
      },
      metadata: {
        producto: nombre,
        tienda: 'La Cabaña'
      }
    });
    
    res.json({ id: session.id });
  } catch (error) {
    console.error('Error al crear sesión:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/sesion/:id', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/cobros', async (req, res) => {
  try {
    const charges = await stripe.charges.list({ limit: 100 });
    res.json(charges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ 
    status: 'OK',
    api: 'running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    render: true
  });
});

// Endpoint de prueba para imágenes
app.get('/test-image', (req, res) => {
  res.json({
    message: 'Servicio de imágenes funcionando',
    uploadsPath: path.join(__dirname, 'uploads'),
    cors: 'enabled',
    allowedOrigins: [
      'https://lacabannarese.github.io',
      'https://snow-viper-512277.hostingersite.com',
      'http://localhost:8080'
    ]
  });
});

// Manejo de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
  console.log(`📡 API disponible en /api`);
  console.log(`🖼️  Imágenes disponibles en /uploads`);
  console.log(`🔍 Diagnóstico en /api/check-uploads`);
  console.log(`🌍 Render Service: srv-d4mvel3uibrs738udv7g`);
  console.log(`✅ Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS habilitado para múltiples dominios`);
});

const mongoose = require('mongoose');
