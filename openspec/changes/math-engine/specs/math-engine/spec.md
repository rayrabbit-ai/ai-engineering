# Math Engine Delta Specification

## ADDED Requirements

### Requirement: Basic Arithmetic Operations
The system SHALL compute addition, subtraction, multiplication, and division with strict type validation.

#### Scenario: Integer addition and subtraction
- **WHEN** invoking arithmetic operations `add(10, 5)` or `subtract(10, 5)`
- **THEN** the engine MUST return `15` and `5` respectively without side effects

#### Scenario: Division by zero safety
- **WHEN** invoking `divide(10, 0)`
- **THEN** the system SHALL raise a controlled division by zero error

### Requirement: Precedence Expression Evaluation
The system SHALL evaluate basic string arithmetic expressions respecting multiplication precedence over addition and subtraction without invoking arbitrary code execution.

#### Scenario: Precedence of multiplication
- **WHEN** evaluating expression `"10 + 5 * 2"`
- **THEN** the system MUST return `20`
