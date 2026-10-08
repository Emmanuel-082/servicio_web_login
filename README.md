# Servicio web de registro e inicio de sesión

**Evidencia GA7-220501096-AA5-EV01 — Diseño y desarrollo de servicios web (caso)**
Componente formativo: Construcción API

API REST hecha en **JavaScript (Node.js)** que permite **registrar** usuarios e **iniciar sesión**.
El servicio recibe un usuario y una contraseña: si la autenticación es correcta responde con un
mensaje de autenticación satisfactoria; en caso contrario devuelve un error de autenticación.

## Características

- `POST /registro` para crear usuarios y `POST /login` para autenticarlos.
- **Validaciones** de los datos recibidos: campos obligatorios, formato del usuario, fortaleza de la contraseña y usuario duplicado.
- Las contraseñas se guardan **cifradas** (hash `scrypt` con sal aleatoria), nunca en texto plano.
- Los usuarios se guardan en un archivo `usuarios.json` que se crea solo, así no se pierden al reiniciar el servicio.
- Respuestas siempre en **JSON**, con los códigos HTTP adecuados (200, 201, 400, 401, 405, 409, 413...).
- El mensaje de error es el mismo si falla el usuario o si falla la contraseña, para no revelar qué usuarios existen.
- **Sin dependencias externas:** usa solo módulos que ya trae Node.js, por lo que no hay que ejecutar `npm install`.
- Código comentado y 35 pruebas automáticas.

## Estructura del proyecto

```
EMMANUEL_PORRAS_AA5_EV01/
├── server.js          # Enciende el servicio (punto de entrada)
├── app.js             # Recibe las peticiones, lee el JSON y envía las respuestas
├── rutas.js           # Lógica de los endpoints: inicio, registro y login
├── validaciones.js    # Reglas de validación de usuario y contraseña
├── seguridad.js       # Cifrado y comprobación de contraseñas
├── almacen.js         # Guarda y busca usuarios (archivo usuarios.json)
├── probar_servicio.js # Script de demostración que prueba el servicio encendido
├── test/
│   └── api.test.js    # Pruebas automáticas
├── package.json       # Datos del proyecto y comandos
├── repositorio.txt    # Enlace del repositorio (para la entrega)
└── .gitignore         # Archivos que Git no debe subir
```

## Cómo ejecutarlo

Requisito: tener instalado **Node.js 18 o superior** (versión LTS, desde https://nodejs.org).
Para comprobarlo: `node --version`.

Desde una terminal abierta **en la carpeta del proyecto** (la que contiene `server.js`):

```
node server.js
```

Debe aparecer el mensaje `Servicio web de registro e inicio de sesión ENCENDIDO`.
El servicio queda disponible en **http://127.0.0.1:3000**. Para apagarlo, presiona `Ctrl + C`.

## Endpoints

| Método | Ruta        | Descripción                                   |
|--------|-------------|-----------------------------------------------|
| GET    | `/`         | Comprueba que el servicio está activo         |
| POST   | `/registro` | Registra un usuario nuevo                     |
| POST   | `/login`    | Inicia sesión                                 |

Los dos `POST` reciben un JSON con esta forma (también se acepta la clave `contrasena`, sin ñ):

```json
{
  "usuario": "emmanuel.porras",
  "contraseña": "Clave2026"
}
```

### Reglas del registro

- **Usuario:** de 4 a 30 caracteres; solo letras, números, punto (`.`), guion (`-`) y guion bajo (`_`). No distingue mayúsculas de minúsculas.
- **Contraseña:** de 8 a 128 caracteres, con al menos una letra y un número, y distinta del usuario.

### Respuestas

| Situación                                  | Código | Ejemplo de respuesta |
|--------------------------------------------|--------|----------------------|
| Registro correcto                          | 201    | `{"exito": true, "mensaje": "Usuario registrado correctamente.", "usuario": "emmanuel.porras"}` |
| Datos faltantes o inválidos                | 400    | `{"exito": false, "mensaje": "Los datos de registro no son válidos.", "errores": {"contraseña": "..."}}` |
| Usuario ya existente (registro)            | 409    | `{"exito": false, "mensaje": "El usuario ya existe. Elige otro nombre."}` |
| Login correcto                             | 200    | `{"exito": true, "mensaje": "Autenticación satisfactoria.", "usuario": "emmanuel.porras"}` |
| Login con usuario o contraseña incorrectos | 401    | `{"exito": false, "mensaje": "Error en la autenticación: usuario o contraseña incorrectos."}` |

## Cómo probar el servicio

**Con el script de demostración (lo más fácil):** con el servicio encendido en una terminal,
abre una **segunda terminal** en la misma carpeta y ejecuta:

```
node probar_servicio.js
```

El script hace 7 peticiones reales (registro, registro repetido, contraseña débil, login correcto,
login con contraseña incorrecta, usuario inexistente y datos incompletos) y muestra qué responde
el servicio en cada caso. Al final debe decir: `7 de 7 escenarios salieron como se esperaba.`

**Con Postman o Thunder Client (extensión de VS Code):** crea una petición `POST` a
`http://127.0.0.1:3000/registro`, en *Body* elige *raw* → *JSON* y pega el JSON de ejemplo.
Repite con `http://127.0.0.1:3000/login`.

**Con PowerShell (Windows)**, en una segunda terminal mientras el servicio está encendido:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/registro `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"usuario": "emmanuel.porras", "contrasena": "Clave2026"}'
```

**Con curl (Linux / macOS / Git Bash):**

```bash
curl -X POST http://127.0.0.1:3000/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "emmanuel.porras", "contraseña": "Clave2026"}'
```

## Pruebas automáticas

```
node --test
```

Cada prueba usa un archivo de usuarios temporal, así que no afecta a los usuarios reales.
Al final debe indicar `# pass 35` y `# fail 0`.

## Control de versiones

El proyecto se desarrolló con **Git**, con commits separados por funcionalidad
(cifrado, almacenamiento, validaciones, endpoints, pruebas y documentación).
Para ver el historial: `git log --oneline`.

## Correspondencia con la lista de chequeo

| Indicador de logro                                     | Dónde se cumple |
|--------------------------------------------------------|-----------------|
| Realiza un servicio para ser utilizado en un registro  | `POST /registro` (`rutas.js`) |
| Realiza un servicio para un inicio de sesión           | `POST /login` (`rutas.js`) |
| Realiza las validaciones de verificación correctamente | `validaciones.js` + comprobación de credenciales en `rutas.js` |
| Utiliza herramientas de versionamiento                 | Repositorio Git (ver `repositorio.txt` y `git log`) |
