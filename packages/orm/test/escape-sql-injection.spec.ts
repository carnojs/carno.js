import { describe, expect, test } from 'bun:test';
import { escapeString, escapeLikePattern } from '../src/utils/sql-escape';

describe('SQL Escape Protection', () => {
  describe('Basic Escaping', () => {
    test('should escape single quotes in strings', () => {
      // Given
      const textWithQuotes = "I'm a test with 'quotes'";

      // When
      const escaped = escapeString(textWithQuotes);

      // Then
      expect(escaped).toBe("I''m a test with ''quotes''");
    });

    test('should handle multiple apostrophes', () => {
      // Given
      const lyrics = "You've been my chest, calling my spine";

      // When
      const escaped = escapeString(lyrics);

      // Then
      expect(escaped).toBe("You''ve been my chest, calling my spine");
    });

    test('should handle empty string', () => {
      expect(escapeString('')).toBe('');
    });

    test('should handle text without special characters', () => {
      const normalText = 'Hello World';

      expect(escapeString(normalText)).toBe('Hello World');
    });

    test('should escape backslashes', () => {
      // Given
      const textWithBackslash = "path\\to\\file";

      // When
      const escaped = escapeString(textWithBackslash);

      // Then
      expect(escaped).toBe("path\\\\to\\\\file");
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should protect against basic DROP TABLE injection', () => {
      // Given
      const maliciousInput = "'; DROP TABLE users; --";

      // When
      const escaped = escapeString(maliciousInput);

      // Then
      expect(escaped).toBe("''; DROP TABLE users; --");
    });

    test('should detect and reject null byte injection', () => {
      // Given
      const nullByteInjection = "admin\x00' OR '1'='1";

      // When / Then
      expect(() => escapeString(nullByteInjection)).toThrow(
        'SQL injection attempt detected: null byte in string value',
      );
    });

    test('should protect against UNION SELECT injection', () => {
      // Given
      const unionInjection = "' UNION SELECT password FROM users WHERE '1'='1";

      // When
      const escaped = escapeString(unionInjection);

      // Then
      expect(escaped).toBe("'' UNION SELECT password FROM users WHERE ''1''=''1");
    });

    test('should protect against comment-based injection', () => {
      // Given
      const commentInjection = "admin'--";

      // When
      const escaped = escapeString(commentInjection);

      // Then
      expect(escaped).toBe("admin''--");
    });

    test('should protect against stacked queries injection', () => {
      // Given
      const stackedQuery = "'; INSERT INTO users VALUES ('hacker', 'password'); --";

      // When
      const escaped = escapeString(stackedQuery);

      // Then
      expect(escaped).toBe("''; INSERT INTO users VALUES (''hacker'', ''password''); --");
    });

    test('should protect against backslash escape attack', () => {
      // Given
      const backslashAttack = "\\' OR 1=1 --";

      // When
      const escaped = escapeString(backslashAttack);

      // Then
      expect(escaped).toBe("\\\\'' OR 1=1 --");
    });

    test('should protect against double encoding attack', () => {
      // Given
      const doubleQuoteAttempt = "admin'' OR ''1''=''1";

      // When
      const escaped = escapeString(doubleQuoteAttempt);

      // Then
      expect(escaped).toBe("admin'''' OR ''''1''''=''''1");
    });

    test('should protect against nested quote injection', () => {
      // Given
      const nestedQuote = "test'); DELETE FROM users WHERE ('1'='1";

      // When
      const escaped = escapeString(nestedQuote);

      // Then
      expect(escaped).toBe("test''); DELETE FROM users WHERE (''1''=''1");
    });

    test('should handle very long injection attempts', () => {
      // Given
      const longInjection = "' OR '1'='1".repeat(1000);

      // When
      const escaped = escapeString(longInjection);

      // Then
      expect(escaped).toBe("'' OR ''1''=''1".repeat(1000));
    });

    test('should protect against time-based blind injection', () => {
      // Given
      const blindInjection = "' OR SLEEP(10) --";

      // When
      const escaped = escapeString(blindInjection);

      // Then
      expect(escaped).toBe("'' OR SLEEP(10) --");
    });

    test('should protect against boolean-based blind injection', () => {
      // Given
      const booleanBlind = "' AND 1=1 AND 'a'='a";

      // When
      const escaped = escapeString(booleanBlind);

      // Then
      expect(escaped).toBe("'' AND 1=1 AND ''a''=''a");
    });

    test('should protect against second-order injection', () => {
      // Given
      const secondOrder = "admin'-- stored for later";

      // When
      const escaped = escapeString(secondOrder);

      // Then
      expect(escaped).toBe("admin''-- stored for later");
    });

    test('should protect against hex encoding bypass', () => {
      // Given
      const hexBypass = "0x27 OR 1=1";

      // When
      const escaped = escapeString(hexBypass);

      // Then
      expect(escaped).toBe("0x27 OR 1=1");
    });

    test('should handle combined attack vectors', () => {
      // Given
      const combined = "admin'\\; DROP TABLE users; SELECT * FROM passwords WHERE '1'='1";

      // When
      const escaped = escapeString(combined);

      // Then
      expect(escaped).toBe(
        "admin''\\\\; DROP TABLE users; SELECT * FROM passwords WHERE ''1''=''1",
      );
    });
  });

  describe('escapeLikePattern', () => {
    test('should escape single quotes', () => {
      // Given
      const pattern = "O'Reilly";

      // When
      const escaped = escapeLikePattern(pattern);

      // Then
      expect(escaped).toBe("O''Reilly");
    });

    test('should escape percent wildcard', () => {
      // Given
      const pattern = "100% complete";

      // When
      const escaped = escapeLikePattern(pattern);

      // Then
      expect(escaped).toBe("100\\% complete");
    });

    test('should escape underscore wildcard', () => {
      // Given
      const pattern = "user_name";

      // When
      const escaped = escapeLikePattern(pattern);

      // Then
      expect(escaped).toBe("user\\_name");
    });

    test('should escape all special LIKE characters together', () => {
      // Given
      const pattern = "50% off_sale's";

      // When
      const escaped = escapeLikePattern(pattern);

      // Then
      expect(escaped).toBe("50\\% off\\_sale''s");
    });

    test('should detect null bytes in LIKE patterns', () => {
      // Given
      const nullBytePattern = "search\x00%";

      // When / Then
      expect(() => escapeLikePattern(nullBytePattern)).toThrow(
        'SQL injection attempt detected: null byte in string value',
      );
    });

    test('should protect against LIKE injection with wildcards', () => {
      // Given
      const likeInjection = "admin%' AND '1'='1";

      // When
      const escaped = escapeLikePattern(likeInjection);

      // Then
      expect(escaped).toBe("admin\\%'' AND ''1''=''1");
    });
  });

  describe('Edge Cases', () => {
    test('should handle unicode characters safely', () => {
      // Given
      const unicode = "用户'名称";

      // When
      const escaped = escapeString(unicode);

      // Then
      expect(escaped).toBe("用户''名称");
    });

    test('should handle emoji in strings', () => {
      // Given
      const emoji = "Hello 👋' World";

      // When
      const escaped = escapeString(emoji);

      // Then
      expect(escaped).toBe("Hello 👋'' World");
    });

    test('should handle newlines in strings', () => {
      // Given
      const newline = "line1'\nline2";

      // When
      const escaped = escapeString(newline);

      // Then
      expect(escaped).toBe("line1''\nline2");
    });

    test('should handle tab characters', () => {
      // Given
      const tab = "col1'\tcol2";

      // When
      const escaped = escapeString(tab);

      // Then
      expect(escaped).toBe("col1''\tcol2");
    });

    test('should handle carriage return', () => {
      // Given
      const cr = "line1'\r\nline2";

      // When
      const escaped = escapeString(cr);

      // Then
      expect(escaped).toBe("line1''\r\nline2");
    });

    test('should handle only special characters', () => {
      // Given: 3 quotes + 2 backslashes + 3 quotes
      const special = "'''\\\\'''";

      // When
      const escaped = escapeString(special);

      // Then: 6 quotes + 4 backslashes + 6 quotes
      expect(escaped).toBe("''''''\\\\\\\\''''''");
    });
  });
});
