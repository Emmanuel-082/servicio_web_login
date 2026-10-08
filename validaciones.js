/**
 * validaciones.js
 * ---------------
 * Reglas para revisar que los datos que llegan al servicio sean correctos.
 *
 * Cada función de validación devuelve un objeto de errores:
 *   - Si está vacío ({}), los datos son válidos.
 *   - Si tiene contenido, cada clave es el campo con problema y su valor es el
 *     mensaje que se le mostrará a quien usa el servicio.
 *     Ejemplo: { "contraseña": "La contraseña es obligatoria." }
 */

'use strict';

// Usuario: de 4 a 30 caracteres; solo letras, números, punto, guion y guion bajo.
const PATRON_USUARIO = /^[A-Za-z0-9._-]{4,30}$/;

// Límites de la contraseña. El máximo evita que alguien envíe textos gigantes
// solo para hacer lento el cálculo del hash.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

/**
 * Saca el usuario y la contraseña del JSON recibido.
 *
 * Acepta la clave "contraseña" (con ñ) y también "contrasena" (sin ñ), porque a
 * veces las herramientas de prueba se complican con caracteres especiales.
 * Al usuario se le quitan los espacios sobrantes al inicio y al final.
 */
function obtenerCredenciales(datos) {
  let usuario = datos.usuario;
  const password = datos['contraseña'] !== undefined ? datos['contraseña'] : datos.contrasena;

  if (typeof usuario === 'string') {
    usuario = usuario.trim();
  }
  return { usuario, password };
}

/** Indica si un valor "no vino": no existe, es null o es un texto vacío. */
function estaVacio(valor) {
  return valor === undefined || valor === null || valor === '';
}

/**
 * Revisa que el usuario venga y sea un texto.
 * Devuelve true si está bien; si no, anota el error y devuelve false.
 */
function revisarUsuarioPresente(usuario, errores) {
  if (estaVacio(usuario)) {
    errores.usuario = 'El usuario es obligatorio.';
  } else if (typeof usuario !== 'string') {
    errores.usuario = 'El usuario debe ser un texto.';
  } else {
    return true;
  }
  return false;
}

/**
 * Revisa que la contraseña venga, sea un texto y no sea exageradamente larga.
 * Devuelve true si está bien; si no, anota el error y devuelve false.
 */
function revisarPasswordPresente(password, errores) {
  if (estaVacio(password)) {
    errores['contraseña'] = 'La contraseña es obligatoria.';
  } else if (typeof password !== 'string') {
    errores['contraseña'] = 'La contraseña debe ser un texto.';
  } else if (password.length > PASSWORD_MAX) {
    errores['contraseña'] = `La contraseña no puede superar los ${PASSWORD_MAX} caracteres.`;
  } else {
    return true;
  }
  return false;
}

/**
 * Validaciones para CREAR una cuenta (son las reglas estrictas).
 *  - Usuario: de 4 a 30 caracteres (letras, números, '.', '-' o '_').
 *  - Contraseña: mínimo 8 caracteres, con al menos una letra y un número,
 *    y que no sea igual al usuario.
 */
function validarRegistro(usuario, password) {
  const errores = {};

  // ----- Usuario -----
  if (revisarUsuarioPresente(usuario, errores) && !PATRON_USUARIO.test(usuario)) {
    errores.usuario =
      'El usuario debe tener entre 4 y 30 caracteres y solo puede contener ' +
      'letras, números, punto, guion y guion bajo.';
  }

  // ----- Contraseña -----
  if (revisarPasswordPresente(password, errores)) {
    const tieneLetra = /\p{L}/u.test(password); // cualquier letra (incluye tildes y ñ)
    const tieneNumero = /\p{Nd}/u.test(password); // cualquier dígito

    if (password.length < PASSWORD_MIN) {
      errores['contraseña'] = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
    } else if (!tieneLetra || !tieneNumero) {
      errores['contraseña'] = 'La contraseña debe incluir al menos una letra y un número.';
    } else if (typeof usuario === 'string' && password.toLowerCase() === usuario.toLowerCase()) {
      errores['contraseña'] = 'La contraseña no puede ser igual al usuario.';
    }
  }

  return errores;
}

/**
 * Validaciones para INICIAR SESIÓN.
 *
 * Aquí solo se revisa que ambos datos vengan completos y con el tipo correcto.
 * NO se exigen las reglas de complejidad del registro: si la contraseña es
 * incorrecta, eso lo decide la comparación con lo guardado (error 401).
 */
function validarLogin(usuario, password) {
  const errores = {};
  revisarUsuarioPresente(usuario, errores);
  revisarPasswordPresente(password, errores);
  return errores;
}

module.exports = { obtenerCredenciales, validarRegistro, validarLogin };
