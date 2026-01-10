/**
 * High-performance query string parser.
 * 
 * Based on Elysia's approach - uses manual string parsing with charCodeAt()
 * instead of new URL() for significant performance gains.
 * 
 * Benchmark: ~10x faster than new URL().searchParams
 */

// Bit flags for tracking decode requirements
const KEY_HAS_PLUS = 1;
const KEY_NEEDS_DECODE = 2;
const VALUE_HAS_PLUS = 4;
const VALUE_NEEDS_DECODE = 8;

/**
 * Parse query string from a full URL.
 * Extracts the query portion and parses key-value pairs.
 * 
 * @param url Full URL string (e.g., "http://localhost/path?foo=bar&baz=123")
 * @returns Record<string, string> - parsed query parameters
 */
export function parseQueryFromURL(url: string): Record<string, string> {
    // Find the start of query string
    const queryStart = url.indexOf('?');

    if (queryStart === -1) {
        return Object.create(null);
    }

    // Find the end of query string (before hash if present)
    let queryEnd = url.indexOf('#', queryStart);

    if (queryEnd === -1) {
        queryEnd = url.length;
    }

    return parseQuery(url, queryStart + 1, queryEnd);
}

/**
 * Parse query string directly.
 * 
 * @param input Query string without leading '?' (e.g., "foo=bar&baz=123")
 * @returns Record<string, string> - parsed query parameters
 */
export function parseQueryString(input: string): Record<string, string> {
    return parseQuery(input, 0, input.length);
}

/**
 * Internal parser - parses query string from startIndex to endIndex.
 */
function parseQuery(
    input: string,
    startIndex: number,
    endIndex: number
): Record<string, string> {
    const result: Record<string, string> = Object.create(null);

    let flags = 0;
    let startingIndex = startIndex - 1;
    let equalityIndex = startingIndex;

    for (let i = startIndex; i < endIndex; i++) {
        switch (input.charCodeAt(i)) {
            // '&' - separator between key-value pairs
            case 38:
                processKeyValuePair(i);
                startingIndex = i;
                equalityIndex = i;
                flags = 0;
                break;

            // '=' - separator between key and value
            case 61:
                if (equalityIndex <= startingIndex) {
                    equalityIndex = i;
                } else {
                    // Multiple '=' means value needs decode
                    flags |= VALUE_NEEDS_DECODE;
                }
                break;

            // '+' - space encoding
            case 43:
                if (equalityIndex > startingIndex) {
                    flags |= VALUE_HAS_PLUS;
                } else {
                    flags |= KEY_HAS_PLUS;
                }
                break;

            // '%' - URL encoding
            case 37:
                if (equalityIndex > startingIndex) {
                    flags |= VALUE_NEEDS_DECODE;
                } else {
                    flags |= KEY_NEEDS_DECODE;
                }
                break;
        }
    }

    // Process the last pair
    if (startingIndex < endIndex) {
        processKeyValuePair(endIndex);
    }

    return result;

    function processKeyValuePair(pairEndIndex: number) {
        const hasBothKeyValuePair = equalityIndex > startingIndex;
        const effectiveEqualityIndex = hasBothKeyValuePair
            ? equalityIndex
            : pairEndIndex;

        const keySlice = input.slice(startingIndex + 1, effectiveEqualityIndex);

        // Skip empty keys
        if (!hasBothKeyValuePair && keySlice.length === 0) {
            return;
        }

        let finalKey = keySlice;

        if (flags & KEY_HAS_PLUS) {
            finalKey = finalKey.replace(/\+/g, ' ');
        }

        if (flags & KEY_NEEDS_DECODE) {
            try {
                finalKey = decodeURIComponent(finalKey);
            } catch {
                // Keep original if decode fails
            }
        }

        let finalValue = '';

        if (hasBothKeyValuePair) {
            let valueSlice = input.slice(equalityIndex + 1, pairEndIndex);

            if (flags & VALUE_HAS_PLUS) {
                valueSlice = valueSlice.replace(/\+/g, ' ');
            }

            if (flags & VALUE_NEEDS_DECODE) {
                try {
                    finalValue = decodeURIComponent(valueSlice);
                } catch {
                    finalValue = valueSlice;
                }
            } else {
                finalValue = valueSlice;
            }
        }

        result[finalKey] = finalValue;
    }
}
