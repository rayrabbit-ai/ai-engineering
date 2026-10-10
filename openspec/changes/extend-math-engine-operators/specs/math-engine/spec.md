# Math Engine Delta Specification

## MODIFIED Requirements

### Requirement: Operaciones Aritméticas Básicas
El sistema SHALL calcular sumas, restas, multiplicaciones, divisiones, operaciones de módulo y potencias con validación de tipos numéricos.

#### Scenario: Suma y resta de enteros
- **WHEN** se invocan las operaciones `add(10, 5)` o `subtract(10, 5)`
- **THEN** el motor debe retornar `15` y `5` respectivamente

#### Scenario: División segura por cero
- **WHEN** se invoca `divide(10, 0)`
- **THEN** el sistema SHALL retornar `null` en TypeScript y `None` en Python en lugar de lanzar un error

#### Scenario: Operación de módulo
- **WHEN** se invoca `modulo(10, 3)`
- **THEN** el motor debe retornar `1`
- **WHEN** se invoca `modulo(10, 0)`
- **THEN** el motor debe retornar `null` en TypeScript y `None` en Python

#### Scenario: Operación de potencia
- **WHEN** se invoca `power(2, 3)`
- **THEN** el motor debe retornar `8`

### Requirement: Evaluación de Expresiones Aritméticas
El sistema SHALL interpretar y evaluar expresiones matemáticas en formato string respetando la precedencia de operadores: potencia (`^`) primero, luego multiplicación, división y módulo (`*`, `/`, `%`), y finalmente suma y resta (`+`, `-`).

#### Scenario: Precedencia de multiplicación sobre suma
- **WHEN** se evalúa la expresión `"10 + 5 * 2"`
- **THEN** el resultado debe ser `20` sin recurrir a funciones inseguras de ejecución

#### Scenario: Precedencia de operadores en expresiones
- **WHEN** se evalúa la expresión `"2 ^ 3 + 10 % 3"`
- **THEN** el resultado debe ser `9` sin recurrir a funciones inseguras de ejecución
