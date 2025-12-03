const express = require('express');
const cors = require('cors');
const path = require('path');
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
      'https://lacabannarese.github.io', // ✅ TU DOMINIO DE GITHUB PAGES
      'https://tu-dominio.hostinger.com',
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
      callback(null, true); // En desarrollo permitir todo
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
    // Headers CORS para permitir carga de imágenes desde cualquier origen
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache de 1 año
    
    // Determinar Content-Type basado en la extensión
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

// Rutas de la API
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
      success_url: `${process.env.FRONTEND_URL || 'https://lacabannarese.github.io/frontend'}/exito.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://lacabannarese.github.io/frontend'}/tienda.html?canceled=true`,
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

// ✅ ENDPOINT DE PRUEBA PARA IMÁGENES
app.get('/test-image', (req, res) => {
  res.json({
    message: 'Servicio de imágenes funcionando',
    uploadsPath: path.join(__dirname, 'uploads'),
    cors: 'enabled',
    allowedOrigins: [
      'https://lacabannarese.github.io',
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
  console.log(`🌍 Render Service: srv-d4mvel3uibrs738udv7g`);
  console.log(`✅ Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS habilitado para: https://lacabannarese.github.io`);
});

const mongoose = require('mongoose');
