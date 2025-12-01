const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }
    const usuario = await Usuario.findOne({
      $or: [{ nombreUsuario: username }, { correoElectronico: username }]
    });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    if (usuario.contrasena !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const usuarioRespuesta = {
      nombreUsuario: usuario.nombreUsuario,
      correoElectronico: usuario.correoElectronico,
      imagenPerfil: usuario.imagenPerfil,
      fechaRegistro: usuario.fechaRegistro
    };
    res.json({ mensaje: 'Login exitoso', usuario: usuarioRespuesta });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Verificar usuario
router.post('/verify', async (req, res) => {
  try {
    const { nombreUsuario } = req.body;
    if (!nombreUsuario) {
      return res.status(400).json({ error: 'Nombre de usuario requerido' });
    }
    const usuario = await Usuario.findOne({ nombreUsuario });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const usuarioRespuesta = {
      nombreUsuario: usuario.nombreUsuario,
      correoElectronico: usuario.correoElectronico,
      imagenPerfil: usuario.imagenPerfil,
      fechaRegistro: usuario.fechaRegistro
    };
    res.json({ valido: true, usuario: usuarioRespuesta });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Cambiar contraseña
router.put('/change-password', async (req, res) => {
  try {
    const { nombreUsuario, oldPassword, newPassword } = req.body;
    if (!nombreUsuario || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const usuario = await Usuario.findOne({ nombreUsuario });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (usuario.contrasena !== oldPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
    usuario.contrasena = newPassword;
    await usuario.save();
    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Recuperar contraseña - Enviar por correo
router.post('/recover-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validar que se proporcionó el email
    if (!email) {
      return res.status(400).json({ error: 'El correo electrónico es requerido' });
    }

    // Buscar usuario por email
    const usuario = await Usuario.findOne({ correoElectronico: email });
    
    if (!usuario) {
      return res.status(404).json({ error: 'No existe un usuario con ese correo electrónico' });
    }

    // Configurar nodemailer
    const nodemailer = require('nodemailer');
    
    // Crear transportador de correo
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Configurar el correo
    const mailOptions = {
      from: `"La Cabaña - RedRecetas" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Recuperación de Contraseña - La Cabaña',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
            .password-box { background-color: #fff; border: 2px solid #4CAF50; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; color: #4CAF50; border-radius: 5px; }
            .footer { background-color: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 15px 0; border-radius: 5px; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏡 La Cabaña - RedRecetas</h1>
            </div>
            <div class="content">
              <h2>Hola, ${usuario.nombreUsuario}!</h2>
              <p>Recibimos una solicitud para recuperar tu contraseña.</p>
              
              <p><strong>Tu información de acceso es:</strong></p>
              
              <div style="margin: 20px 0;">
                <p><strong>Usuario:</strong> ${usuario.nombreUsuario}</p>
                <p><strong>Correo:</strong> ${usuario.correoElectronico}</p>
              </div>
              
              <div class="password-box">
                ${usuario.contrasena}
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> 
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Esta es tu contraseña actual</li>
                  <li>Te recomendamos cambiarla después de iniciar sesión</li>
                  <li>No compartas esta contraseña con nadie</li>
                  <li>Si no solicitaste este correo, ignóralo y cambia tu contraseña inmediatamente</li>
                </ul>
              </div>
              
              <p style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/login.html" 
                   style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Iniciar Sesión
                </a>
              </p>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no responder.</p>
              <p>&copy; ${new Date().getFullYear()} La Cabaña - RedRecetas. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Enviar el correo
    await transporter.sendMail(mailOptions);

    res.json({ 
      mensaje: 'Correo enviado exitosamente',
      info: 'Hemos enviado tu contraseña al correo electrónico proporcionado. Por favor revisa tu bandeja de entrada.'
    });

  } catch (err) {
    console.error('Error en recuperación de contraseña:', err);
    
    if (err.code === 'EAUTH') {
      return res.status(500).json({ 
        error: 'Error de autenticación del servidor de correo. Verifica la configuración de EMAIL_USER y EMAIL_PASSWORD en el archivo .env' 
      });
    }
    
    res.status(500).json({ 
      error: 'Error al enviar el correo de recuperación',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
module.exports = router;