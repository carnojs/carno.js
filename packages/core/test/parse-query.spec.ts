import { describe, expect, test } from 'bun:test';
import { parseQueryFromURL, parseQueryString } from '../src/utils/parseQuery';

describe('parseQueryFromURL', () => {
    test('parses simple query params', () => {
        const result = parseQueryFromURL('http://localhost/path?foo=bar&baz=123');

        expect(result.foo).toBe('bar');
        expect(result.baz).toBe('123');
    });

    test('returns empty object for URL without query', () => {
        const result = parseQueryFromURL('http://localhost/path');

        expect(Object.keys(result).length).toBe(0);
    });

    test('handles URL with hash after query', () => {
        const result = parseQueryFromURL('http://localhost/path?foo=bar#section');

        expect(result.foo).toBe('bar');
        expect(result['#section']).toBeUndefined();
    });

    test('decodes URL-encoded values', () => {
        const result = parseQueryFromURL('http://localhost/path?name=John%20Doe&city=S%C3%A3o%20Paulo');

        expect(result.name).toBe('John Doe');
        expect(result.city).toBe('São Paulo');
    });

    test('handles plus signs as spaces', () => {
        const result = parseQueryFromURL('http://localhost/path?name=John+Doe');

        expect(result.name).toBe('John Doe');
    });

    test('handles empty values', () => {
        const result = parseQueryFromURL('http://localhost/path?foo=&bar=value');

        expect(result.foo).toBe('');
        expect(result.bar).toBe('value');
    });

    test('handles keys without values', () => {
        const result = parseQueryFromURL('http://localhost/path?flag&name=test');

        expect(result.flag).toBe('');
        expect(result.name).toBe('test');
    });

    test('handles multiple equals signs in value', () => {
        const result = parseQueryFromURL('http://localhost/path?equation=1+1=2');

        expect(result.equation).toBe('1 1=2');
    });

    test('handles special characters in keys', () => {
        const result = parseQueryFromURL('http://localhost/path?user%5Bname%5D=John');

        expect(result['user[name]']).toBe('John');
    });
});

describe('parseQueryString', () => {
    test('parses query string without leading ?', () => {
        const result = parseQueryString('foo=bar&baz=123');

        expect(result.foo).toBe('bar');
        expect(result.baz).toBe('123');
    });

    test('handles empty string', () => {
        const result = parseQueryString('');

        expect(Object.keys(result).length).toBe(0);
    });
});
