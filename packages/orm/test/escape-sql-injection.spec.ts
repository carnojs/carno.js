import { describe, expect, test } from 'bun:test';

describe('SQL Escape Protection', () => {
  test('should escape single quotes in strings', () => {
    // Simular o método escapeString
    const escapeString = (value: string): string => {
      return value.replace(/'/g, "''");
    };

    // Given: texto com aspas simples
    const textWithQuotes = "I'm a test with 'quotes'";

    // When: escapar o texto
    const escaped = escapeString(textWithQuotes);

    // Then: aspas devem ser duplicadas
    expect(escaped).toBe("I''m a test with ''quotes''");
  });

  test('should handle multiple apostrophes', () => {
    const escapeString = (value: string): string => {
      return value.replace(/'/g, "''");
    };

    // Given: letras de música com muitas aspas
    const lyrics = "You've been my chest, calling my spine";

    // When: escapar
    const escaped = escapeString(lyrics);

    // Then: cada aspas deve virar duas
    expect(escaped).toBe("You''ve been my chest, calling my spine");
  });

  test('should protect against SQL injection', () => {
    const escapeString = (value: string): string => {
      return value.replace(/'/g, "''");
    };

    // Given: tentativa de SQL injection
    const maliciousInput = "'; DROP TABLE users; --";

    // When: escapar
    const escaped = escapeString(maliciousInput);

    // Then: a query fica segura
    expect(escaped).toBe("''; DROP TABLE users; --");

    // Isso na query ficaria: '''' ou seja, apenas uma string com aspas
    // Não executaria o DROP TABLE
  });

  test('should handle empty string', () => {
    const escapeString = (value: string): string => {
      return value.replace(/'/g, "''");
    };

    expect(escapeString('')).toBe('');
  });

  test('should handle text without quotes', () => {
    const escapeString = (value: string): string => {
      return value.replace(/'/g, "''");
    };

    const normalText = 'Hello World';
    expect(escapeString(normalText)).toBe('Hello World');
  });
});
