const mongoose = require('mongoose');

const connectDB = async () => {
  // Mostrar información de configuración (sin mostrar passwords)
  const mongoUrl = process.env.MONGO_URL;
  const isAtlas = mongoUrl && mongoUrl.includes('mongodb+srv');
  const isDocker = mongoUrl && mongoUrl.includes('@mongo:');
  
  console.log('🔌 Intentando conectar a MongoDB...');
  console.log(`📍 Tipo de conexión: ${isAtlas ? 'MongoDB Atlas' : isDocker ? 'MongoDB Docker' : 'MongoDB Local'}`);
  
  // Ocultar password en el log
  if (mongoUrl) {
    const urlToShow = mongoUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`🔗 URL de conexión: ${urlToShow}`);
  }
  
  try {
    // Opciones de conexión optimizadas para MongoDB Atlas
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Timeouts importantes para MongoDB Atlas
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_OPTIONS_SERVER_SELECTION_TIMEOUT_MS) || 10000,
      socketTimeoutMS: parseInt(process.env.MONGO_OPTIONS_SOCKET_TIMEOUT_MS) || 45000,
      // Opciones adicionales para mejor estabilidad
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      w: 'majority'
    };

    // Si es MongoDB Atlas, agregar opciones específicas
    if (isAtlas) {
      options.authSource = 'admin';
      options.ssl = true;
      console.log('⚙️ Usando configuración optimizada para MongoDB Atlas');
    }

    // Intentar conexión
    console.log('⏳ Conectando...');
    const conn = await mongoose.connect(mongoUrl, options);
    
    // Información de conexión exitosa
    console.log('✅ Conectado exitosamente a MongoDB');
    console.log(`📊 Base de datos: ${conn.connection.db.databaseName}`);
    console.log(`🖥️ Host: ${conn.connection.host}`);
    console.log(`🔌 Puerto: ${conn.connection.port}`);
    
    // Verificar estado de la conexión
    const adminDb = conn.connection.db.admin();
    const status = await adminDb.ping();
    console.log('🏓 Ping a la base de datos: OK');
    
    // Eventos de conexión para monitoreo
    mongoose.connection.on('error', (err) => {
      console.error('❌ Error de MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB desconectado');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconectado');
    });
    
    return conn;
    
  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err.message);
    
    // Diagnóstico detallado de errores comunes
    if (err.message.includes('ECONNREFUSED')) {
      console.error('📝 Diagnóstico: MongoDB no está ejecutándose o no es accesible');
      console.error('   Soluciones:');
      console.error('   1. Verifica que MongoDB esté corriendo');
      console.error('   2. Verifica el puerto y host');
      console.error('   3. Si es Docker, verifica que el contenedor esté activo');
    } 
    else if (err.message.includes('Authentication failed')) {
      console.error('📝 Diagnóstico: Credenciales incorrectas');
      console.error('   Soluciones:');
      console.error('   1. Verifica usuario y contraseña');
      console.error('   2. En Atlas: verifica que el usuario exista en Database Access');
      console.error('   3. Asegúrate de que el password no tenga caracteres especiales sin encoding');
      console.error('   4. Verifica que el usuario tenga permisos para la base de datos');
    }
    else if (err.message.includes('Network') || err.message.includes('ETIMEDOUT')) {
      console.error('📝 Diagnóstico: Problema de red o timeout');
      console.error('   Soluciones para MongoDB Atlas:');
      console.error('   1. Verifica tu IP en Network Access (whitelist)');
      console.error('   2. Agrega 0.0.0.0/0 temporalmente para permitir todas las IPs');
      console.error('   3. Verifica que el cluster esté activo');
      console.error('   4. Revisa tu conexión a internet');
      console.error('   5. Intenta con otro DNS (8.8.8.8)');
    }
    else if (err.message.includes('MongoServerError') || err.message.includes('not authorized')) {
      console.error('📝 Diagnóstico: Usuario sin permisos suficientes');
      console.error('   Soluciones:');
      console.error('   1. En Atlas: ve a Database Access');
      console.error('   2. Edita el usuario y asegúrate de que tenga rol "Atlas Admin" o "readWriteAnyDatabase"');
      console.error('   3. Verifica que el usuario tenga acceso a la base de datos específica');
    }
    else if (err.message.includes('certificate') || err.message.includes('SSL')) {
      console.error('📝 Diagnóstico: Problema con certificado SSL');
      console.error('   Soluciones:');
      console.error('   1. Actualiza Node.js a la versión más reciente');
      console.error('   2. En el string de conexión, prueba agregando: &tls=true&tlsAllowInvalidCertificates=true');
      console.error('   3. Verifica la fecha y hora de tu sistema');
    }
    else if (err.message.includes('URI does not have hostname')) {
      console.error('📝 Diagnóstico: String de conexión malformado');
      console.error('   Soluciones:');
      console.error('   1. Verifica que la variable MONGO_URL esté definida');
      console.error('   2. Asegúrate de que el formato sea correcto');
      console.error('   3. No uses comillas adicionales en el .env');
      console.error('   Formato correcto: mongodb+srv://usuario:password@cluster.xxxxx.mongodb.net/database');
    }
    else if (err.message.includes('querySrv')) {
      console.error('📝 Diagnóstico: Problema resolviendo DNS SRV para MongoDB Atlas');
      console.error('   Soluciones:');
      console.error('   1. Verifica tu conexión a internet');
      console.error('   2. Intenta usar DNS de Google (8.8.8.8) o Cloudflare (1.1.1.1)');
      console.error('   3. Si estás en una red corporativa, puede estar bloqueado');
      console.error('   4. Prueba con el string de conexión legacy (mongodb:// en lugar de mongodb+srv://)');
    }
    
    // Información adicional del error
    console.error('\n📋 Detalles técnicos del error:');
    console.error('   Nombre:', err.name);
    console.error('   Código:', err.code);
    console.error('   Mensaje completo:', err.message);
    
    // Sugerencias generales
    console.error('\n💡 Sugerencias adicionales:');
    console.error('   1. Copia el string de conexión directamente desde MongoDB Atlas');
    console.error('   2. En Atlas: Connect → Connect your application → Copy connection string');
    console.error('   3. Reemplaza <password> con tu contraseña real');
    console.error('   4. Si el password tiene caracteres especiales, usa URL encoding');
    console.error('   5. Verifica que el nombre de la base de datos sea correcto');
    
    process.exit(1);
  }
};

module.exports = connectDB;