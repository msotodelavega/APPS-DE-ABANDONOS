# Web App

Aplicacion web tipo Power Apps para gestion de abandonos legales.

## Lanzar

```powershell
node .\webapp\server.js
```

Abrir:

```text
http://localhost:4173
```

## Modo SharePoint

Editar [config.js](C:/Users/msoto/Documents/APPS%20DE%20ABANDONOS/webapp/config.js):

- `dataMode: "sharepoint"`
- `sharePoint.siteUrl`
- `sharePoint.listAbandonos`
- `sharePoint.listHistorial`

Nota:

- La lectura de SharePoint REST ya queda preparada.
- La escritura aun usa respaldo local porque depende de autenticacion y formato final del tenant.
