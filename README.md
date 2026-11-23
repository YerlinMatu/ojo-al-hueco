# Ojo al Hueco — Prototipo funcional para GitHub Pages

> **Reconstrucción independiente** creada a partir de la descripción del proyecto académico *Ojo al Hueco* de la UPZ El Lucero (Bogotá). **No son los archivos originales de la conversación previa de ChatGPT Work.**

Una web estática, responsiva y sin backend para explorar reportes, crear casos con fotografía y ubicación, identificar posibles duplicados en un radio de 50 metros, recibir una **sugerencia no oficial** de entidad competente, consultar una línea de tiempo, apoyar un caso y exportar un CSV comunitario.

## 1. Ejecutar localmente

Se recomienda **Node.js 18 o superior**. No es necesario instalar dependencias.

```bash
# Desde la carpeta del proyecto
npm start
```

Abre **http://localhost:4173**. Para detener el servidor: `Ctrl + C`.

Alternativa con Python 3:

```bash
python3 -m http.server 4173
```

Y abre http://localhost:4173. **No abras index.html directamente con file://**, porque los módulos de JavaScript pueden quedar bloqueados por el navegador.

## 2. Ejecutar las pruebas

```bash
npm test
```

Se incluyen **18 pruebas automatizadas** con el módulo nativo `node:test` de Node.js:

- E2: proximidad geográfica y agrupación de reportes.
- E3: orientación ilustrativa del canal institucional.
- E4: validación, creación y trazabilidad de reportes.

El archivo `evidencia-pruebas.json` resume la suite. Para verificar el estado actual, ejecuta siempre `npm test`.

## 3. Publicar en GitHub Pages

1. Crea un repositorio nuevo, por ejemplo `ojo-al-hueco`.
2. Sube **los archivos contenidos dentro de esta carpeta** a la raíz del repositorio (`index.html`, `app.js`, `logic.js`, `data.js`, `styles.css`, `assets/`, etc.). También puedes subir el directorio completo si ajustas la ubicación de publicación.
3. En GitHub ve a **Settings → Pages → Build and deployment**.
4. Selecciona **Deploy from a branch**, la rama `main` y la carpeta `/(root)`. Guarda los cambios.
5. Cuando GitHub termine de publicar, tu aplicación estará en una dirección similar a `https://TU-USUARIO.github.io/ojo-al-hueco/`.

Los archivos usan rutas relativas (`./`), por lo que funcionan en repositorios de proyecto y no requieren variables de entorno ni `npm run build`.

### Subir desde terminal (alternativa)

```bash
git init
git add .
git commit -m "Add Ojo al Hueco static prototype"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/ojo-al-hueco.git
git push -u origin main
```

Crea el repositorio en GitHub antes de ejecutar el `push`, y cambia `TU-USUARIO` por tu nombre de usuario.

## 4. Estructura

```text
ojo-al-hueco-github-pages/
├── index.html              # UI principal y formularios
├── styles.css              # Diseño responsivo
├── app.js                  # Interacciones, mapa, almacenamiento y exportación
├── logic.js                # Reglas puras del producto
├── data.js                 # Datos ficticios y casos de demostración
├── assets/logo.svg         # Isotipo original de esta reconstrucción
├── tests/logic.test.mjs    # 18 controles automatizados
├── evidencia-pruebas.json  # Metadatos y resultados registrados
├── server.mjs              # Servidor de desarrollo sin dependencias
├── package.json
├── .nojekyll               # Publicación estática en GitHub Pages
└── README.md
```

## 5. Qué funciona y cuáles son sus límites

| Funcionalidad | Estado |
| --- | --- |
| Visualización de casos en mapa de OpenStreetMap | Funcional con conexión a Internet |
| Filtros por estado y tipo de daño | Funcional |
| Reporte con foto, descripción y coordenadas | Funcional, guardado localmente |
| Selección de ubicación en mapa o por geolocalización | Funcional, con permisos del navegador |
| Detección de reportes a ≤ 50 m | Funcional |
| Apoyo comunitario a casos | Funcional localmente (máximo un apoyo por navegador y caso) |
| Línea de tiempo de cada caso | Funcional, eventos demostrativos o creados localmente |
| Canal sugerido por tipo de vía y daño | Heurística académica; debe validarse con las entidades |
| Resumen CSV de casos | Funcional |
| Sincronización entre usuarios/dispositivos | **No implementada** |
| Registro oficial en IDU, UMV o EAAB | **No implementado** |
| Autenticación y moderación de contenido | **No implementadas** |
| Base de datos compartida y panel JAC multiusuario | **No implementados** |

**Importante:** GitHub Pages sirve contenido estático; **no ofrece por sí solo un backend ni base de datos compartida**. Los datos se guardan con `localStorage` únicamente en el navegador. No sustituyen una PQR oficial ni sirven como radicado. Las fotos quedan en el mismo almacenamiento local después de comprimirse; al borrar los datos del sitio se pierden. Las coordenadas y fotos de prueba no deben contener datos sensibles.

La cartografía se obtiene del servicio público OpenStreetMap mediante Leaflet (CDN). Para uso de producción, revisa los términos de uso de los proveedores de mapa y recursos. Si no hay Internet, se conserva la lista de casos y puedes escribir coordenadas manualmente.

## 6. Cómo probar el recorrido

1. Haz clic en **Crear reporte**.
2. Selecciona `Hueco`, vía `Local`, redacta una descripción y adjunta una imagen.
3. Señala un punto en el mapa. Cerca del caso `OAH-241` aparecerá la advertencia de posible duplicado a 50 m.
4. Puedes abrir el caso cercano y apoyarlo, o confirmar que deseas crear uno nuevo.
5. Guarda el nuevo reporte y consulta su línea de tiempo. Su estado será **Pendiente de radicación**.
6. Vuelve a la lista, cambia filtros y descarga el resumen CSV.
7. Usa **↺** en la lista para restablecer la demostración.

## 7. Privacidad y seguridad

- No se envían reportes ni fotos a servidores propios.
- Las teselas de mapa y la tipografía externa requieren recursos de terceros.
- Los campos de texto se muestran con escape HTML para reducir inyección de contenido.
- La prueba de concepto **no está preparada para capturar información personal real ni operar como sistema oficial**.
- Si se convierte en servicio público, incorporar autenticación, backend, almacenamiento seguro de imágenes, consentimiento, control de acceso, auditoría, moderación, accesibilidad adicional y validación jurídica del enrutamiento.

---
**Objetivo:** demo académica funcional, usable localmente y publicable en GitHub Pages.
