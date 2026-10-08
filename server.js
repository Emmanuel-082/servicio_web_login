/**
 * server.js
 * ---------
 * Punto de entrada: enciende el servicio web.
 *
 * Para ejecutarlo, desde la carpeta del proyecto:
 *     node server.js
 *
 * El servicio queda disponible en  http://127.0.0.1:3000
 * Para apagarlo, presiona Ctrl + C en la terminal.
 */

'use strict';

const { crearServidor } = require('./app');

// El puerto se puede cambiar con la variable de entorno PORT; por defecto es 3000.
const PUERTO = Number(process.env.PORT) || 3000;

// 127.0.0.1 significa "este mismo computador": nadie más en la red puede entrar.
const DIRECCION = '127.0.0.1';

let servidor;
try {
  servidor = crearServidor();
} catch (error) {
  // Por ejemplo, si el archivo usuarios.json está dañado.
  console.error(`No se pudo iniciar el servicio: ${error.message}`);
  process.exit(1);
}

servidor.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `El puerto ${PUERTO} ya está ocupado. Cierra el otro programa que lo usa ` +
        '(quizás este mismo servicio abierto en otra terminal) e inténtalo de nuevo.'
    );
  } else {
    console.error('Error en el servidor:', error.message);
  }
  process.exit(1);
});

servidor.listen(PUERTO, DIRECCION, () => {
  console.log('Servicio web de registro e inicio de sesión ENCENDIDO');
  console.log(`  Dirección:  http://${DIRECCION}:${PUERTO}`);
  console.log('  Endpoints:  POST /registro   y   POST /login');
  console.log('  Para apagarlo presiona Ctrl + C');
});
