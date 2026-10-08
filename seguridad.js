/**
 * seguridad.js
 * ------------
 * Cifrado y comprobación de contraseñas.
 *
 * REGLA DE ORO: una contraseña NUNCA se guarda tal cual. Se guarda un "hash":
 * un texto raro e irreversible calculado a partir de la contraseña. Si alguien
 * robara el archivo de usuarios, no podría ver las contraseñas reales.
 *
 * Se usa el algoritmo "scrypt", que viene incluido en Node.js (no hay que
 * instalar nada). Además se mezcla con una "sal" aleatoria distinta para cada
 * usuario: así dos personas con la misma contraseña tienen hashes diferentes.
 */

'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');

// crypto.scrypt trabaja con "callbacks"; promisify lo convierte para poder usar await.
const scrypt = promisify(crypto.scrypt);

const LONGITUD_SAL = 16; // bytes de sal aleatoria
const LONGITUD_HASH = 64; // bytes del hash resultante

/**
 * Convierte una contraseña en un hash seguro.
 * Devuelve un texto con este formato:  scrypt$<sal en hexadecimal>$<hash en hexadecimal>
 */
async function generarHash(password) {
  const sal = crypto.randomBytes(LONGITUD_SAL);
  const hash = await scrypt(password, sal, LONGITUD_HASH);
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Comprueba si una contraseña corresponde a un hash guardado.
 * Devuelve true (coincide) o false (no coincide).
 */
async function verificarPassword(password, hashGuardado) {
  const [algoritmo, salHex, hashHex] = String(hashGuardado).split('$');
  if (algoritmo !== 'scrypt' || !salHex || !hashHex) {
    return false; // el hash guardado tiene un formato que no reconocemos
  }

  const hashEsperado = Buffer.from(hashHex, 'hex');
  const hashCalculado = await scrypt(
    password,
    Buffer.from(salHex, 'hex'),
    hashEsperado.length
  );

  // timingSafeEqual compara en tiempo constante: no deja pistas sobre cuántos
  // caracteres iniciales coincidían (un ataque real, aunque muy sofisticado).
  return crypto.timingSafeEqual(hashCalculado, hashEsperado);
}

/**
 * Hash "de relleno". Cuando alguien intenta entrar con un usuario que NO existe,
 * igual se compara su contraseña contra este hash para que la respuesta tarde lo
 * mismo que con un usuario real. Así nadie puede averiguar qué usuarios existen
 * midiendo cuánto demora el servicio en contestar.
 */
let promesaHashRelleno = null;
function obtenerHashRelleno() {
  if (!promesaHashRelleno) {
    promesaHashRelleno = generarHash('contraseña-de-relleno-no-usar');
  }
  return promesaHashRelleno;
}

module.exports = { generarHash, verificarPassword, obtenerHashRelleno };
