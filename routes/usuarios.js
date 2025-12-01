const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const Receta = require('../models/Receta');
const BlogConsejo = require('../models/BlogConsejo');
const Valoracion = require('../models/Valoracion');
const ComentarioBlog = require('../models/ComentarioBlog');
const upload = require('../middleware/multerConfig');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');

// Crear usuario
router.post('/', upload.single('imagenPerfil'), async (req, res) => {
  try {
    const userData = {
      nombreUsuario: req.body.nombreUsuario,
      correoElectronico: req.body.correoElectronico,
      contrasena: req.body.contrasena
    };
    if (req.file) {
      userData.imagenPerfil = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: `/uploads/${req.file.filename}`
      };
    }
    const usuario = new Usuario(userData);
    await usuario.save();
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener usuario por nombre
router.get('/:usuario', async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ nombreUsuario: req.params.usuario })
      .populate("favoritos"); // 👈 importante

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario", detalles: err.message });
  }
});


// Actualizar usuario
router.put('/:nombreUsuario', upload.single('imagenPerfil'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.imagenPerfil = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: `/uploads/${req.file.filename}`
      };
      const usuarioAnterior = await Usuario.findOne({ nombreUsuario: req.params.nombreUsuario });
      if (usuarioAnterior?.imagenPerfil?.nombreArchivo) {
        const oldImagePath = path.join(uploadsDir, usuarioAnterior.imagenPerfil.nombreArchivo);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    const usuario = await Usuario.findOneAndUpdate(
      { nombreUsuario: req.params.nombreUsuario },
      updateData,
      { new: true }
    );
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar usuario con referencias
router.put('/:nombreUsuario/actualizar', upload.single('imagenPerfil'), async (req, res) => {
  console.log('\n========================================');
  console.log('🔍 [PUT /actualizar] Usuario:', req.params.nombreUsuario);
  console.log('========================================');
  
  try {
    const nombreUsuarioActual = req.params.nombreUsuario;
    const usuario = await Usuario.findOne({ nombreUsuario: nombreUsuarioActual });
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const updateData = {};
    const cambios = { recetas: 0, blogs: 0, valoraciones: 0, comentarios: 0 };
    let nombreUsuarioNuevo = nombreUsuarioActual;
    
    if (req.body.nuevoNombreUsuario && req.body.nuevoNombreUsuario !== nombreUsuarioActual) {
      nombreUsuarioNuevo = req.body.nuevoNombreUsuario;
      const usuarioExistente = await Usuario.findOne({ nombreUsuario: nombreUsuarioNuevo });
      if (usuarioExistente) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
      updateData.nombreUsuario = nombreUsuarioNuevo;
      console.log('✏️ Cambio de nombre:', nombreUsuarioActual, '→', nombreUsuarioNuevo);
      
      if (req.body.actualizarReferencias === 'true') {
        console.log('🔄 Actualizando referencias...');
        const recetas = await Receta.updateMany(
          { usuario: nombreUsuarioActual },
          { $set: { usuario: nombreUsuarioNuevo } }
        );
        cambios.recetas = recetas.modifiedCount;
        
        const blogs = await BlogConsejo.updateMany(
          { autor: nombreUsuarioActual },
          { $set: { autor: nombreUsuarioNuevo } }
        );
        cambios.blogs = blogs.modifiedCount;
        
        const valoraciones = await Valoracion.updateMany(
          { usuario: nombreUsuarioActual },
          { $set: { usuario: nombreUsuarioNuevo } }
        );
        cambios.valoraciones = valoraciones.modifiedCount;
        
        const comentarios = await ComentarioBlog.updateMany(
          { usuario: nombreUsuarioActual },
          { $set: { usuario: nombreUsuarioNuevo } }
        );
        cambios.comentarios = comentarios.modifiedCount;
        
        console.log('✅ Referencias actualizadas:', cambios);
      }
    }
    
    if (req.body.correoElectronico) {
      updateData.correoElectronico = req.body.correoElectronico;
      console.log('📧 Nuevo email:', req.body.correoElectronico);
    }
    
    if (req.body.contrasena) {
      updateData.contrasena = req.body.contrasena;
      console.log('🔒 Contraseña actualizada');
    }
    
    if (req.file) {
      updateData.imagenPerfil = {
        nombreArchivo: req.file.filename,
        tipo: req.file.mimetype,
        almacenadoEn: `/uploads/${req.file.filename}`
      };
      console.log('🖼️ Nueva imagen:', updateData.imagenPerfil.almacenadoEn);
      
      if (usuario.imagenPerfil?.nombreArchivo) {
        const oldImagePath = path.join(uploadsDir, usuario.imagenPerfil.nombreArchivo);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('🗑️ Imagen anterior eliminada');
        }
      }
    }
    
    const usuarioActualizado = await Usuario.findOneAndUpdate(
      { nombreUsuario: nombreUsuarioActual },
      { $set: updateData },
      { new: true }
    );
    
    console.log('✅ Usuario actualizado');
    console.log('========================================\n');
    
    const respuesta = {
      mensaje: 'Perfil actualizado correctamente',
      usuario: {
        nombreUsuario: usuarioActualizado.nombreUsuario,
        correoElectronico: usuarioActualizado.correoElectronico,
        imagenPerfil: usuarioActualizado.imagenPerfil,
        fechaRegistro: usuarioActualizado.fechaRegistro
      }
    };
    
    if (req.body.actualizarReferencias === 'true') {
      respuesta.cambios = cambios;
    }
    
    res.json(respuesta);
    
  } catch (err) {
    console.error('❌ ERROR:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'El email ya está en uso' });
    }
    res.status(500).json({ error: 'Error al actualizar usuario', detalles: err.message });
  }
});

// Agregar favorito (CORREGIDO)
router.post('/:usuario/favoritos/:idReceta', async (req, res) => {
  try {
    const recetaId = new mongoose.Types.ObjectId(req.params.idReceta); // 👈 usar 'new'
    const usuario = await Usuario.findOneAndUpdate(
      { nombreUsuario: req.params.usuario },
      { $addToSet: { favoritos: recetaId } },
      { new: true }
    ).populate("favoritos");

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ mensaje: "Receta agregada a favoritos", favoritos: usuario.favoritos });
  } catch (err) {
    console.error('❌ Error al agregar favorito:', err);
    res.status(500).json({ error: "Error al agregar favorito", detalles: err.message });
  }
});

// Eliminar favorito (CORREGIDO)
router.delete('/:usuario/favoritos/:idReceta', async (req, res) => {
  try {
    const recetaId = new mongoose.Types.ObjectId(req.params.idReceta); // 👈 usar 'new'
    const usuario = await Usuario.findOneAndUpdate(
      { nombreUsuario: req.params.usuario },
      { $pull: { favoritos: recetaId } },
      { new: true }
    ).populate("favoritos");

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ mensaje: "Receta eliminada de favoritos", favoritos: usuario.favoritos });
  } catch (err) {
    console.error('❌ Error al eliminar favorito:', err);
    res.status(500).json({ error: "Error al eliminar favorito", detalles: err.message });
  }
});

// Obtener favoritos
router.get('/:usuario/favoritos', async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ nombreUsuario: req.params.usuario })
      .populate("favoritos");
    
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    res.json(usuario.favoritos || []);
  } catch (err) {
    console.error('❌ Error al obtener favoritos:', err);
    res.status(500).json({ error: "Error al obtener favoritos", detalles: err.message });
  }
});

module.exports = router;