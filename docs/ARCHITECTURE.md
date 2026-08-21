# Arquitectura inicial

## Decisión de base

MALVINAS reutiliza el corte vertical técnico de MANDIBULA: simulación determinista, estado serializable, comandos validados y render desacoplado. Se descartan sus reglas biológicas y contenido visual.

## Paquetes

- `packages/simulation`: tipos y reglas puras de la partida.
- `packages/narrative`: contrato para entradas de bitácora y comparación histórico/contrafactual.
- `apps/web`: menú y futura escena RTS.
- `data/history`: futura cronología JSON auditable, separada del gameplay.

## Contrato de red

El cliente producirá comandos con `tick` y `sequence`. La capa online futura podrá implementar lockstep o autoridad de servidor sin acoplarse al render. Hasta que exista esa autoridad, una partida local sirve como entorno de prueba; no se presentará como multiplayer seguro.
