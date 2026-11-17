# Arcana & Elixires · Coven Bar — Maqueta front-end

SPA visual en **HTML5 + Bootstrap 5 (CDN) + JavaScript vanilla**. Sin build ni dependencias.

## Cómo abrirla
Abre `index.html` en el navegador (doble clic) o sírvela con cualquier servidor estático:
```
npx serve .        # o: python3 -m http.server
```

## Estructura
```
index.html        Estructura, sprite de iconos SVG y todas las vistas (<section data-view>)
css/styles.css    1) Tokens de diseño  2) Puente con Bootstrap  3) Base/a11y  4) Componentes  5) Responsive
js/data.js        Datos simulados (usuario, cuentas, movimientos, carta, experiencias)
js/app.js         Router, render de componentes, modal, toasts, formularios e interacciones
img/              Fotografías de la carta y del ritual destacado
```

## Mapa de vistas (equivalencia con una app financiera)
| Vista          | Hash         | Equivale a     | Contenido |
|----------------|--------------|----------------|-----------|
| Inicio         | `#inicio`    | Panel          | Saldo total con tendencia, acciones rápidas, ritual destacado, próxima reserva, gráfico de consumos, movimientos recientes |
| Mi Grimorio    | `#grimorio`  | Cuentas        | Carnet de miembro con nivel, monedero, puntos de Esencia, tarjeta regalo |
| Reservar       | `#reservar`  | Transferencias | Formulario de reserva (abono desde cuenta origen) y "Regalar Esencia" (monto, origen, destinatario) |
| Carta & Pagos  | `#carta`     | Pagos          | Carta filtrable + cuenta de mesa con propina y pago |
| Historial      | `#historial` | Movimientos    | Búsqueda y filtro de ingresos/consumos |
| Ajustes        | `#ajustes`   | Configuración  | Perfil validado (+18), notificaciones, reducir animaciones |
| Más            | `#mas`       | —              | Accesos secundarios desde la barra inferior |

## Navegación sincronizada
Todo enlace con `data-view-link="vista"` (navbar superior, tabbar inferior, botones) pasa por el router
de `app.js`, que actualiza `.active` y `aria-current="page"` en ambas navegaciones.
`TAB_GROUP` define qué pestaña inferior se ilumina para vistas secundarias (Historial/Ajustes → Más).

## Flujos para probar
- **Reserva con error**: elige un lunes o martes → "El coven descansa".
- **Regalo con error**: regala más de lo disponible en la cuenta de origen → saldo insuficiente.
- **Pago**: añade elixires a la cuenta de mesa y paga; ganas puntos de Esencia.
- **Validación**: envía cualquier formulario vacío para ver los estilos nativos de Bootstrap.

## Migrar a otro stack
- Copia la sección **1. TOKENS** de `styles.css` como tema global.
- Cada función `render*` de `app.js` es un componente; `state` es el store.
- Sustituye `window.AE_DATA` por llamadas a tu API manteniendo los mismos campos.
- Las clases propias llevan prefijo `ae-`; el comportamiento depende solo de atributos `data-*`.
