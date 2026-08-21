# MALVINAS

RTS histórico-interactivo sobre la Guerra de Malvinas (1982).

## Alcance de esta etapa

Esta primera entrega sólo establece la arquitectura mínima y los contratos de datos. No contiene todavía cronología histórica, assets finales, combate ni networking en producción.

## Principios

- La simulación debe ser determinista y separada del render.
- Los hechos históricos verificables viven fuera del código de gameplay.
- La bitácora distingue hechos documentados de resultados contrafactuales de una partida.
- La interfaz nace bilingüe: español rioplatense e inglés.
- La autoridad online se incorporará detrás de un adaptador; no se usará el matchmaking de RASTRO como sincronización de RTS.

## Desarrollo

```bash
pnpm install
pnpm dev
```
