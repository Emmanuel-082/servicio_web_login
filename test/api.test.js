/**
 * test/api.test.js
 * ----------------
 * Pruebas automáticas del servicio web de registro e inicio de sesión.
 *
 * Cada prueba enciende un servidor nuevo con un archivo de usuarios temporal, así
 * que no se mezclan entre ellas ni tocan el archivo real (usuarios.json).
 *
 * Para ejecutarlas, desde la carpeta del proyecto:
 *     node --test
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { crearServidor } = require('../app');

// Datos de ejemplo que cumplen todas las reglas del registro.
const USUARIO = 'emmanuel.porras';
const PASSWORD = 'Clave2026';

let carpeta; // carpeta temporal de la prueba
let archivoUsuarios; // archivo temporal donde se guardan los usuarios
let servidor; // servidor encendido para la prueba
let urlBase; // por ejemplo http://127.0.0.1:54321

// ---------- Ayudas para no repetir código en cada prueba ----------

/** Enciende un servidor en un puerto libre cualquiera (puerto 0 = "elige uno tú"). */
function encender() {
  servidor = crearServidor({ archivoUsuarios });
  return new Promise((resolve) => {
    servidor.listen(0, '127.0.0.1', () => {
      urlBase = `http://127.0.0.1:${servidor.address().port}`;
      resolve();
    });
  });
}

/** Apaga el servidor y cierra las conexiones que hayan quedado abiertas. */
function apagar() {
  return new Promise((resolve) => {
    servidor.close(() => resolve());
    servidor.closeAllConnections();
  });
}

/**
 * Hace una petición al servidor de prueba.
 * Si "cuerpo" es un objeto se envía como JSON; si es un texto se envía tal cual.
 */
async function enviar(metodo, ruta, cuerpo) {
  const opciones = { method: metodo };
  if (cuerpo !== undefined) {
    opciones.headers = { 'Content-Type': 'application/json' };
    opciones.body = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
  }

  const resp = await fetch(urlBase + ruta, opciones);
  const texto = await resp.text();

  let json = null;
  try {
    json = JSON.parse(texto);
  } catch (error) {
    // la respuesta no era JSON; las pruebas lo detectarán porque json será null
  }
  return { status: resp.status, json, texto, headers: resp.headers };
}

const registrar = (usuario = USUARIO, password = PASSWORD) =>
  enviar('POST', '/registro', { usuario, contraseña: password });

const iniciarSesion = (usuario = USUARIO, password = PASSWORD) =>
  enviar('POST', '/login', { usuario, contraseña: password });

beforeEach(async () => {
  carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'prueba-login-'));
  archivoUsuarios = path.join(carpeta, 'usuarios.json');
  await encender();
});

afterEach(async () => {
  await apagar();
  fs.rmSync(carpeta, { recursive: true, force: true });
});

// ---------- Pruebas del registro ----------

describe('POST /registro', () => {
  it('registra un usuario correctamente (201)', async () => {
    const r = await registrar();
    assert.equal(r.status, 201);
    assert.equal(r.json.exito, true);
    assert.equal(r.json.usuario, USUARIO);
  });

  it('guarda la contraseña cifrada, nunca en texto plano', async () => {
    await registrar();
    const contenido = fs.readFileSync(archivoUsuarios, 'utf8');
    assert.ok(!contenido.includes(PASSWORD), 'la contraseña no debe aparecer en el archivo');
    assert.ok(contenido.includes('scrypt$'), 'debe aparecer el hash cifrado');
  });

  it('acepta la clave "contrasena" (sin ñ)', async () => {
    const r = await enviar('POST', '/registro', { usuario: USUARIO, contrasena: PASSWORD });
    assert.equal(r.status, 201);
  });

  it('rechaza un usuario duplicado (409)', async () => {
    await registrar();
    const r = await registrar();
    assert.equal(r.status, 409);
    assert.equal(r.json.exito, false);
  });

  it('el duplicado ignora mayúsculas y minúsculas (409)', async () => {
    await registrar('MariaLopez');
    const r = await registrar('marialopez');
    assert.equal(r.status, 409);
  });

  it('rechaza una petición sin cuerpo (400)', async () => {
    const r = await enviar('POST', '/registro');
    assert.equal(r.status, 400);
  });

  it('rechaza un JSON mal escrito (400)', async () => {
    const r = await enviar('POST', '/registro', '{esto no es json');
    assert.equal(r.status, 400);
  });

  it('rechaza un JSON que no es un objeto (400)', async () => {
    const r = await enviar('POST', '/registro', ['usuario', 'clave']);
    assert.equal(r.status, 400);
  });

  it('informa los campos faltantes (400)', async () => {
    const r = await enviar('POST', '/registro', {});
    assert.equal(r.status, 400);
    assert.ok(r.json.errores.usuario);
    assert.ok(r.json.errores['contraseña']);
  });

  it('rechaza campos vacíos o con solo espacios (400)', async () => {
    const r = await registrar('   ', '');
    assert.equal(r.status, 400);
    assert.ok(r.json.errores.usuario);
    assert.ok(r.json.errores['contraseña']);
  });

  it('rechaza un usuario demasiado corto (400)', async () => {
    const r = await registrar('ana');
    assert.equal(r.status, 400);
    assert.ok(r.json.errores.usuario);
  });

  it('rechaza un usuario con caracteres no permitidos (400)', async () => {
    const r = await registrar('juan perez!');
    assert.equal(r.status, 400);
    assert.ok(r.json.errores.usuario);
  });

  it('rechaza una contraseña corta (400)', async () => {
    const r = await registrar(USUARIO, 'Ab1');
    assert.equal(r.status, 400);
    assert.ok(r.json.errores['contraseña']);
  });

  it('rechaza una contraseña sin números (400)', async () => {
    const r = await registrar(USUARIO, 'SoloLetras');
    assert.equal(r.status, 400);
  });

  it('rechaza una contraseña sin letras (400)', async () => {
    const r = await registrar(USUARIO, '12345678');
    assert.equal(r.status, 400);
  });

  it('rechaza una contraseña igual al usuario (400)', async () => {
    const r = await registrar('usuario123', 'usuario123');
    assert.equal(r.status, 400);
  });

  it('rechaza datos que no son texto (400)', async () => {
    const r = await enviar('POST', '/registro', { usuario: 12345, contraseña: true });
    assert.equal(r.status, 400);
  });

  it('un registro inválido no crea ningún usuario', async () => {
    await registrar(USUARIO, 'corta');
    const r = await iniciarSesion(USUARIO, 'corta');
    assert.equal(r.status, 401);
  });

  it('los usuarios siguen existiendo después de reiniciar el servicio', async () => {
    await registrar();
    await apagar();
    await encender(); // mismo archivo de usuarios, servidor nuevo
    const r = await iniciarSesion();
    assert.equal(r.status, 200);
  });
});

// ---------- Pruebas del inicio de sesión ----------

describe('POST /login', () => {
  beforeEach(async () => {
    await registrar(); // cada prueba de login parte con un usuario ya registrado
  });

  it('autentica con datos correctos (200)', async () => {
    const r = await iniciarSesion();
    assert.equal(r.status, 200);
    assert.equal(r.json.exito, true);
    assert.equal(r.json.mensaje, 'Autenticación satisfactoria.');
  });

  it('ignora mayúsculas y minúsculas en el usuario', async () => {
    const r = await iniciarSesion(USUARIO.toUpperCase());
    assert.equal(r.status, 200);
  });

  it('rechaza una contraseña incorrecta (401)', async () => {
    const r = await iniciarSesion(USUARIO, 'OtraClave999');
    assert.equal(r.status, 401);
    assert.equal(r.json.exito, false);
    assert.ok(r.json.mensaje.includes('Error en la autenticación'));
  });

  it('la contraseña sí distingue mayúsculas y minúsculas (401)', async () => {
    const r = await iniciarSesion(USUARIO, PASSWORD.toLowerCase());
    assert.equal(r.status, 401);
  });

  it('rechaza un usuario que no existe (401)', async () => {
    const r = await iniciarSesion('no.existe');
    assert.equal(r.status, 401);
  });

  it('da el mismo mensaje si falla el usuario o si falla la contraseña', async () => {
    const sinUsuario = await iniciarSesion('no.existe');
    const sinClave = await iniciarSesion(USUARIO, 'OtraClave999');
    assert.equal(sinUsuario.json.mensaje, sinClave.json.mensaje);
  });

  it('informa los campos faltantes (400)', async () => {
    const r = await enviar('POST', '/login', { usuario: USUARIO });
    assert.equal(r.status, 400);
    assert.ok(r.json.errores['contraseña']);
  });

  it('rechaza una petición sin cuerpo (400)', async () => {
    const r = await enviar('POST', '/login');
    assert.equal(r.status, 400);
  });

  it('rechaza una contraseña demasiado larga (400)', async () => {
    const r = await iniciarSesion(USUARIO, 'a1'.repeat(200));
    assert.equal(r.status, 400);
  });
});

// ---------- Pruebas generales ----------

describe('Comportamiento general', () => {
  it('GET / indica que el servicio está activo', async () => {
    const r = await enviar('GET', '/');
    assert.equal(r.status, 200);
    assert.equal(r.json.exito, true);
  });

  it('las respuestas se envían como JSON', async () => {
    const r = await enviar('GET', '/');
    assert.match(r.headers.get('content-type'), /application\/json/);
  });

  it('una ruta que no existe responde 404 en JSON', async () => {
    const r = await enviar('GET', '/no-existe');
    assert.equal(r.status, 404);
    assert.equal(r.json.exito, false);
  });

  it('un método no permitido responde 405 en JSON con la cabecera Allow', async () => {
    const r = await enviar('GET', '/login');
    assert.equal(r.status, 405);
    assert.equal(r.json.exito, false);
    assert.equal(r.headers.get('allow'), 'POST');
  });

  it('un cuerpo demasiado grande responde 413', async () => {
    const r = await enviar('POST', '/login', { usuario: 'x'.repeat(50000) });
    assert.equal(r.status, 413);
  });

  it('las tildes y la ñ se ven bien en las respuestas', async () => {
    const r = await enviar('POST', '/login', {});
    assert.ok(r.texto.includes('contraseña'));
  });

  it('avisa con un mensaje claro si el archivo de usuarios está dañado', () => {
    const archivoDanado = path.join(carpeta, 'danado.json');
    fs.writeFileSync(archivoDanado, 'esto no es json');
    assert.throws(() => crearServidor({ archivoUsuarios: archivoDanado }), /está dañado/);
  });
});
