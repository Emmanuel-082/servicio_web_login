/**
 * probar_servicio.js
 * ------------------
 * Script de demostración: le hace al servicio varias peticiones reales (registro,
 * registro repetido, login correcto, login incorrecto...) y muestra qué responde
 * cada vez, indicando si el resultado fue el esperado.
 *
 * Cómo usarlo (el servicio debe estar encendido en OTRA terminal con "node server.js"):
 *     node probar_servicio.js
 *
 * Cada vez que se ejecuta crea un usuario de prueba con un nombre distinto, así se
 * puede repetir todas las veces que quieras.
 */

'use strict';

// Dirección del servicio. Se puede cambiar con la variable de entorno URL_BASE.
const URL_BASE = process.env.URL_BASE || 'http://127.0.0.1:3000';

// Usuario de prueba con un sufijo único para que no choque con ejecuciones anteriores.
const USUARIO = `demo.${Date.now().toString(36)}`;
const PASSWORD = 'Clave2026';

// Cada escenario indica qué se envía y qué código HTTP se espera recibir.
const escenarios = [
  {
    titulo: 'Registrar un usuario nuevo',
    ruta: '/registro',
    cuerpo: { usuario: USUARIO, contraseña: PASSWORD },
    esperado: 201,
  },
  {
    titulo: 'Intentar registrar el mismo usuario otra vez',
    ruta: '/registro',
    cuerpo: { usuario: USUARIO, contraseña: PASSWORD },
    esperado: 409,
  },
  {
    titulo: 'Registrar con una contraseña muy corta (validación)',
    ruta: '/registro',
    cuerpo: { usuario: `${USUARIO}.2`, contraseña: 'abc' },
    esperado: 400,
  },
  {
    titulo: 'Iniciar sesión con usuario y contraseña correctos',
    ruta: '/login',
    cuerpo: { usuario: USUARIO, contraseña: PASSWORD },
    esperado: 200,
  },
  {
    titulo: 'Iniciar sesión con la contraseña incorrecta',
    ruta: '/login',
    cuerpo: { usuario: USUARIO, contraseña: 'ClaveMala999' },
    esperado: 401,
  },
  {
    titulo: 'Iniciar sesión con un usuario que no existe',
    ruta: '/login',
    cuerpo: { usuario: 'usuario.inexistente', contraseña: PASSWORD },
    esperado: 401,
  },
  {
    titulo: 'Iniciar sesión sin enviar la contraseña (validación)',
    ruta: '/login',
    cuerpo: { usuario: USUARIO },
    esperado: 400,
  },
];

async function main() {
  console.log(`Probando el servicio en ${URL_BASE}\n`);

  let correctos = 0;

  for (const [indice, escenario] of escenarios.entries()) {
    let respuesta;
    try {
      respuesta = await fetch(URL_BASE + escenario.ruta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(escenario.cuerpo),
      });
    } catch (error) {
      console.error(
        'No se pudo conectar con el servicio.\n' +
          'Revisa que lo hayas encendido con "node server.js" en OTRA terminal ' +
          'y que siga abierta.'
      );
      process.exit(1);
    }

    const datos = await respuesta.json();
    const esCorrecto = respuesta.status === escenario.esperado;
    if (esCorrecto) {
      correctos += 1;
    }

    console.log(`${indice + 1}. ${escenario.titulo}`);
    console.log(`   Se envía a:  POST ${escenario.ruta}  ${JSON.stringify(escenario.cuerpo)}`);
    console.log(`   Responde:    HTTP ${respuesta.status} -> ${datos.mensaje}`);
    if (datos.errores) {
      console.log(`   Detalle:     ${JSON.stringify(datos.errores)}`);
    }
    console.log(
      `   Resultado:   ${esCorrecto ? '[OK]' : '[FALLÓ]'} (se esperaba HTTP ${escenario.esperado})\n`
    );
  }

  console.log(`Resumen: ${correctos} de ${escenarios.length} escenarios salieron como se esperaba.`);
  if (correctos !== escenarios.length) {
    process.exit(1);
  }
}

main();
