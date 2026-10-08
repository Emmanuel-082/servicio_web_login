/**
 * rutas.js
 * --------
 * La lógica de cada "endpoint" (dirección) del servicio:
 *
 *   GET  /          -> información del servicio
 *   POST /registro  -> crea un usuario nuevo
 *   POST /login     -> verifica usuario y contraseña
 *
 * Cada función recibe los datos ya leídos del JSON y devuelve un objeto
 *   { codigo, cuerpo }
 * donde "codigo" es el código HTTP (200, 201, 400, 401, 409...) y "cuerpo" es lo que
 * se le responderá a quien llamó al servicio. Quien se encarga de enviarlo es app.js.
 *
 * Todas las respuestas tienen esta forma:
 *   { "exito": true/false, "mensaje": "...", ...datos extra... }
 */

'use strict';

const { generarHash, verificarPassword, obtenerHashRelleno } = require('./seguridad');
const { obtenerCredenciales, validarRegistro, validarLogin } = require('./validaciones');

/** Arma el objeto de respuesta con un formato uniforme. */
function respuesta(exito, mensaje, codigo, extra = {}) {
  return { codigo, cuerpo: { exito, mensaje, ...extra } };
}

/**
 * Crea las funciones de cada endpoint. Recibe el "almacén" donde se guardan los
 * usuarios (ver almacen.js).
 */
function crearManejadores(almacen) {
  /** GET / -> sirve para comprobar que el servicio está encendido. */
  function inicio() {
    return respuesta(
      true,
      'Servicio web de registro e inicio de sesión en funcionamiento.',
      200,
      { endpoints: { registro: 'POST /registro', login: 'POST /login' } }
    );
  }

  /**
   * POST /registro
   * Entrada (JSON): { "usuario": "...", "contraseña": "..." }
   * Respuestas:
   *   201 -> usuario creado
   *   400 -> datos faltantes o inválidos
   *   409 -> el usuario ya existe
   */
  async function registro(datos) {
    const { usuario, password } = obtenerCredenciales(datos);

    // 1) Validar el formato de los datos recibidos.
    const errores = validarRegistro(usuario, password);
    if (Object.keys(errores).length > 0) {
      return respuesta(false, 'Los datos de registro no son válidos.', 400, { errores });
    }

    // 2) Revisar rápido si el nombre ya está tomado (evita cifrar para nada).
    const mensajeDuplicado = 'El usuario ya existe. Elige otro nombre.';
    if (almacen.buscar(usuario)) {
      return respuesta(false, mensajeDuplicado, 409);
    }

    // 3) Cifrar la contraseña y guardar el usuario. Se vuelve a comprobar al
    //    guardar por si alguien registró el mismo nombre justo mientras tanto.
    const hash = await generarHash(password);
    if (!almacen.crear(usuario, hash)) {
      return respuesta(false, mensajeDuplicado, 409);
    }

    return respuesta(true, 'Usuario registrado correctamente.', 201, { usuario });
  }

  /**
   * POST /login
   * Entrada (JSON): { "usuario": "...", "contraseña": "..." }
   * Respuestas:
   *   200 -> autenticación satisfactoria
   *   400 -> datos faltantes o inválidos
   *   401 -> error en la autenticación (usuario o contraseña incorrectos)
   */
  async function login(datos) {
    const { usuario, password } = obtenerCredenciales(datos);

    // 1) Validar que lleguen ambos datos completos.
    const errores = validarLogin(usuario, password);
    if (Object.keys(errores).length > 0) {
      return respuesta(false, 'Los datos de inicio de sesión no son válidos.', 400, { errores });
    }

    // 2) Buscar al usuario y comparar la contraseña contra el hash guardado.
    //    Si el usuario no existe, se compara contra el hash de relleno (ver seguridad.js).
    const usuarioGuardado = almacen.buscar(usuario);
    const hash = usuarioGuardado ? usuarioGuardado.passwordHash : await obtenerHashRelleno();
    const passwordCorrecta = await verificarPassword(password, hash);

    // 3) Mismo mensaje para "usuario inexistente" y "contraseña incorrecta":
    //    así no se le revela a un atacante cuál de las dos cosas falló.
    if (!usuarioGuardado || !passwordCorrecta) {
      return respuesta(
        false,
        'Error en la autenticación: usuario o contraseña incorrectos.',
        401
      );
    }

    return respuesta(true, 'Autenticación satisfactoria.', 200, {
      usuario: usuarioGuardado.usuario,
    });
  }

  return { inicio, registro, login };
}

module.exports = { crearManejadores };
