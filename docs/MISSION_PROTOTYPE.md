# Prototipo de misión: Goose Green

## Controles locales

- Click en una unidad argentina: seleccionar.
- Click en el terreno: mover la unidad seleccionada.
- Click en una unidad británica: ordenar ataque.
- `Solicitar apoyo logístico`: consume el único refuerzo abstracto y recupera munición/moral de la selección.
- `Pausa`, `Continuar` y `Reiniciar`: controlan la sesión local.

## Reglas del slice

- Simulación fija a 10 ticks por segundo.
- El movimiento, el alcance, la munición, la cobertura y el daño se resuelven en `packages/simulation/src/mission.ts`.
- Las unidades británicas tienen una IA mínima que avanza hacia Darwin/Goose Green y ataca cuando entra en alcance.
- Argentina gana si sostiene ambos objetivos hasta el límite de tiempo; Gran Bretaña gana si captura ambos o elimina la defensa.
- El resultado histórico de referencia permanece fijo en `data/missions/goose-green.json`.

## Límites deliberados

Este no es todavía un mapa geográfico real, un orden de batalla completo, un modelo de bajas históricas ni un multiplayer. Es un vertical slice para probar agencia táctica y separación entre resultado histórico y resultado de sesión. Las posiciones y estadísticas son abstraídas y no deben presentarse como datos militares exactos.
