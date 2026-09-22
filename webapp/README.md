# Web App

Aplicación web con estilo Power Apps para la gestión de abandonos legales.

Pestañas: **GIT Registro y Control**, **GIT Operación Logística**, **Administración** (vista 360° de ambos GIT) y **Modelo de Datos**. La visibilidad de cada pestaña depende del rol.

## Lanzar

```powershell
node .\webapp\server.js
```

Abrir:

```text
http://localhost:4173
```

## Modo SharePoint

Editar [config.js](config.js):

- `dataMode: "sharepoint"`
- `sharePoint.siteUrl`
- `sharePoint.listAbandonos`
- `sharePoint.listGestionRegistro`
- `sharePoint.listGestionLogistica`

Nota:

- La lectura de SharePoint REST ya queda preparada.
- La escritura aun usa respaldo local porque depende de autenticacion y formato final del tenant.
