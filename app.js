/**
 * app.js
 * ------
 * El "corazón" del servicio web: recibe cada petición, decide a qué endpoint
 * corresponde, lee el JSON que envió el cliente, ejecuta la lógica (rutas.js) y
 * devuelve la respuesta en formato JSON.
 *
 * Está construido solo con el módulo "http" que ya trae Node.js, así que no
 * necesitas instalar ninguna librería para que funcione.
 */

'use strict';

const http = require('node:http');
const path = require('node:path');

const { crearAlmacen } = require('./almacen');
const { crearManejadores } = require('./rutas');

// Tamaño máximo permitido para el cuerpo de una petición: 16 KB (de sobra para un login).
const LIMITE_CUERPO_BYTES = 16 * 1024;

// Mensajes en español para los errores HTTP más comunes.
const MENSAJES_HTTP = {
  400: 'Solicitud incorrecta.',
  404: 'El recurso solicitado no existe.',
  405: 'Método HTTP no permitido para este recurso.',
  413: 'El cuerpo de la petición es demasiado grande.',
  500: 'Error interno del servidor.',
};

/**
 * Error propio para cortar el proceso con un código HTTP concreto.
 * Cuando lanzamos uno, más abajo se convierte en una respuesta JSON de error.
 */
class ErrorHttp extends Error {
  constructor(codigo, mensaje, cabeceras = {}) {
    super(mensaje || MENSAJES_HTTP[codigo] || 'Error.');
    this.codigo = codigo;
    this.cabeceras = cabeceras;
  }
}

/** Envía una respuesta JSON con el código HTTP indicado. */
function enviarJson(res, codigo, cuerpo, cabeceras = {}) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
    ...cabeceras,
  });
  res.end(texto);
}

/**
 * Lee el cuerpo completo de la petición y lo devuelve como texto.
 * Si pasa del límite permitido, descarta lo que sobra y falla con error 413.
 */
function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    const trozos = [];
    let total = 0;
    let excedido = false;

    req.on('data', (trozo) => {
      total += trozo.length;
      if (total > LIMITE_CUERPO_BYTES) {
        excedido = true; // seguimos recibiendo, pero ya no guardamos nada
        return;
      }
      trozos.push(trozo);
    });

    req.on('end', () => {
      if (excedido) {
        reject(new ErrorHttp(413));
      } else {
        resolve(Buffer.concat(trozos).toString('utf8'));
      }
    });

    req.on('error', reject);
  });
}

/**
 * Lee el cuerpo de la petición y lo convierte de texto JSON a objeto de JavaScript.
 * Falla con error 400 si viene vacío, mal escrito o no es un objeto { ... }.
 */
async function leerJson(req) {
  const texto = await leerCuerpo(req);

  const mensajeFormato =
    'El cuerpo de la petición debe ser un objeto JSON válido ' +
    '(por ejemplo: {"usuario": "ana.perez", "contraseña": "Clave2026"}).';

  if (texto.trim() === '') {
    throw new ErrorHttp(400, mensajeFormato);
  }

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (error) {
    throw new ErrorHttp(400, mensajeFormato);
  }

  // Debe ser un objeto { ... }; no sirven un texto, un número, null ni una lista [ ... ].
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ErrorHttp(400, mensajeFormato);
  }
  return datos;
}

/**
 * Crea el servidor web (sin encenderlo todavía).
 * Se hace en una función para poder crear servidores distintos en las pruebas
 * automáticas, cada uno con su propio archivo de usuarios temporal.
 *
 * Opciones:
 *   archivoUsuarios -> ruta del archivo donde se guardan los usuarios
 *                      (por defecto, "usuarios.json" junto a este archivo)
 */
function crearServidor(opciones = {}) {
  const archivoUsuarios = opciones.archivoUsuarios || path.join(__dirname, 'usuarios.json');
  const manejadores = crearManejadores(crearAlmacen(archivoUsuarios));

  // Tabla de rutas: para cada dirección, qué método HTTP se acepta y qué función la atiende.
  const tablaDeRutas = {
    '/': { GET: manejadores.inicio },
    '/registro': { POST: manejadores.registro },
    '/login': { POST: manejadores.login },
  };

  /** Atiende una petición: busca la ruta, lee el JSON si corresponde y responde. */
  async function atender(req, res) {
    const direccion = req.url.split('?')[0]; // ignoramos lo que venga después de "?"

    const rutaEncontrada = tablaDeRutas[direccion];
    if (!rutaEncontrada) {
      throw new ErrorHttp(404);
    }

    const manejador = rutaEncontrada[req.method];
    if (!manejador) {
      // La ruta existe, pero con otro método (por ejemplo, un GET a /login).
      // La cabecera "Allow" le dice al cliente qué métodos sí puede usar.
      throw new ErrorHttp(405, null, { Allow: Object.keys(rutaEncontrada).join(', ') });
    }

    let datos;
    if (req.method === 'POST') {
      datos = await leerJson(req);
    } else {
      req.resume(); // descartamos cualquier cuerpo que llegue en un GET
    }

    const { codigo, cuerpo } = await manejador(datos);
    enviarJson(res, codigo, cuerpo);
  }

  return http.createServer(async (req, res) => {
    try {
      await atender(req, res);
    } catch (error) {
      if (res.headersSent) {
        res.end();
        return;
      }

      if (error instanceof ErrorHttp) {
        // Error "esperado": 400, 404, 405, 413...
        enviarJson(res, error.codigo, { exito: false, mensaje: error.message }, error.cabeceras);
      } else {
        // Error inesperado: se anota en la consola y se responde 500 sin dar detalles internos.
        console.error('Error inesperado:', error);
        enviarJson(res, 500, { exito: false, mensaje: MENSAJES_HTTP[500] });
      }
    }
  });
}

module.exports = { crearServidor };
