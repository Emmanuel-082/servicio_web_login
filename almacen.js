/**
 * almacen.js
 * ----------
 * Aquí se guardan los usuarios registrados.
 *
 * Para mantener el proyecto simple, los usuarios se guardan en un archivo de texto
 * llamado "usuarios.json" que se crea solo la primera vez que alguien se registra.
 * Al encender el servicio se lee ese archivo, así los usuarios no se pierden aunque
 * apagues y vuelvas a encender el servicio.
 *
 * Mientras el servicio funciona, los usuarios también se mantienen en memoria (en un
 * "Map", que es como un diccionario) para poder buscarlos rápido.
 */

'use strict';

const fs = require('node:fs');

/**
 * Crea el almacén de usuarios usando el archivo indicado.
 * Devuelve un objeto con dos funciones: buscar() y crear().
 */
function crearAlmacen(rutaArchivo) {
  // La clave del Map es el nombre de usuario en minúsculas. Así "Ana" y "ana"
  // se consideran el MISMO usuario (no se pueden registrar los dos).
  const usuarios = new Map();

  cargarDesdeArchivo();

  /** Lee el archivo (si existe) y llena el Map con los usuarios guardados. */
  function cargarDesdeArchivo() {
    if (!fs.existsSync(rutaArchivo)) {
      return; // primera vez: todavía no hay usuarios, no pasa nada
    }

    const texto = fs.readFileSync(rutaArchivo, 'utf8');
    if (texto.trim() === '') {
      return;
    }

    let lista;
    try {
      lista = JSON.parse(texto);
    } catch (error) {
      throw new Error(
        `El archivo de usuarios (${rutaArchivo}) está dañado y no se puede leer. ` +
          'Bórralo para empezar de cero o corrige su contenido.'
      );
    }

    for (const usuario of lista) {
      usuarios.set(usuario.usuario.toLowerCase(), usuario);
    }
  }

  /**
   * Escribe todos los usuarios en el archivo.
   * Primero se escribe en un archivo temporal y luego se renombra: así, si el
   * programa se cierra justo a la mitad, el archivo original nunca queda a medias.
   */
  function guardarEnArchivo() {
    const temporal = `${rutaArchivo}.tmp`;
    fs.writeFileSync(temporal, JSON.stringify([...usuarios.values()], null, 2), 'utf8');
    fs.renameSync(temporal, rutaArchivo);
  }

  return {
    /** Busca un usuario por nombre. Devuelve el usuario o null si no existe. */
    buscar(usuario) {
      return usuarios.get(usuario.toLowerCase()) || null;
    },

    /**
     * Guarda un usuario nuevo.
     * Devuelve true si se creó, o false si ya existía uno con ese nombre.
     */
    crear(usuario, passwordHash) {
      const clave = usuario.toLowerCase();
      if (usuarios.has(clave)) {
        return false;
      }

      usuarios.set(clave, {
        usuario,
        passwordHash,
        creadoEn: new Date().toISOString(),
      });

      try {
        guardarEnArchivo();
      } catch (error) {
        usuarios.delete(clave); // si no se pudo guardar, deshacemos el cambio
        throw error;
      }
      return true;
    },
  };
}

module.exports = { crearAlmacen };
