---
sidebar_position: 2
---

# Benchmark

Carno.js is the **fastest framework for Bun**.

## Performance Comparison

We benchmarked Carno.js against Elysia, one of the most popular Bun frameworks, using identical conditions.

### Test Environment

- **Tool**: oha (Ohayou HTTP load generator)
- **Duration**: 6 seconds
- **Endpoint**: Simple `GET /` returning a string
- **Runtime**: Bun

### Results

| Framework | Requests/sec | Avg Latency | p99 Latency |
|-----------|-------------|-------------|-------------|
| **Carno.js** | **69,502** | 0.71 ms | 1.17 ms |
| Elysia | 56,798 | 0.87 ms | 1.77 ms |

### Carno.js

```
Summary:
  Success rate:   100.00%
  Total:          6016.52 ms
  Slowest:        9.37 ms
  Fastest:        0.10 ms
  Average:        0.71 ms
  Requests/sec:   69,502

Response time distribution:
  10.00% in 0.63 ms
  25.00% in 0.64 ms
  50.00% in 0.66 ms
  75.00% in 0.74 ms
  90.00% in 0.83 ms
  95.00% in 0.90 ms
  99.00% in 1.17 ms
  99.90% in 1.94 ms
```

### Elysia

```
Summary:
  Success rate:   100.00%
  Total:          6011.26 ms
  Slowest:        15.76 ms
  Fastest:        0.26 ms
  Average:        0.87 ms
  Requests/sec:   56,798

Response time distribution:
  10.00% in 0.77 ms
  25.00% in 0.79 ms
  50.00% in 0.81 ms
  75.00% in 0.89 ms
  90.00% in 1.01 ms
  95.00% in 1.12 ms
  99.00% in 1.77 ms
  99.90% in 3.13 ms
```

## Why Carno.js is Faster

1. **Zero abstraction at runtime** - Everything is compiled at startup
2. **Direct Bun.serve()** - Native routes with no intermediate layers
3. **JIT compiled handlers** - AOT async detection for optimal execution
4. **Radix tree router** - Efficient routing for dynamic paths

## Run Your Own Benchmark

```bash
# Start Carno server
bun benchmarks/http/turbo-server.ts

# In another terminal, run the benchmark
oha -z 6s http://127.0.0.1:3002/
```
