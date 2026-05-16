import mongoose from 'mongoose';
import User from '../models/User';

export const runMigrations = async () => {
  try {
    console.log('[Migration] Ejecutando sincronización de base de datos...');

    // 1. Verificar/Crear Usuario Administrador Inicial
    const adminEmail = 'admin@system.local';
    const adminUsername = 'admin';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    if (!adminPassword) {
      console.warn(
        '[Migration] ADVERTENCIA: No se encontró INITIAL_ADMIN_PASSWORD en el archivo .env. ' +
        'El usuario admin no podrá ser creado o actualizado de forma segura.'
      );
    } else {
      let adminUser = await User.findOne({ username: adminUsername });

      if (!adminUser) {
        console.log('[Migration] Creando usuario administrador inicial...');
        adminUser = new User({
          username: adminUsername,
          email: adminEmail,
          password: adminPassword,
          isAdmin: true,
          allowedApps: ['gastos'], // Acceso por defecto a la app de gastos
        });
        await adminUser.save();
        console.log('[Migration] Usuario administrador inicial creado con éxito.');
      } else {
        // Asegurarnos de que tenga los permisos de admin
        let modified = false;
        if (!adminUser.isAdmin) {
          adminUser.isAdmin = true;
          modified = true;
        }
        if (!adminUser.allowedApps.includes('gastos')) {
          adminUser.allowedApps.push('gastos');
          modified = true;
        }
        
        if (modified) {
          await adminUser.save();
          console.log('[Migration] Permisos del usuario administrador actualizados.');
        } else {
          console.log('[Migration] Usuario administrador verificado.');
        }
      }
    }

    // Aquí se pueden añadir futuras migraciones (ej: agregar nuevas columnas a documentos existentes)
    // ...

    console.log('[Migration] Sincronización de base de datos completada.');
  } catch (error) {
    console.error('[Migration] Error durante la sincronización:', error);
  }
};
