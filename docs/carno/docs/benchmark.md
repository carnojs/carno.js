---
sidebar_position: 2
---

# ⚡ Benchmark

> **Carno.js is the fastest framework for Bun** — and it's not even close.

---

## 🏆 Performance Comparison

We put Carno.js head-to-head against other popular Bun frameworks under identical conditions. The results speak for themselves.

### Test Environment

| Parameter | Value |
|-----------|-------|
| **Tool** | [oha](https://github.com/hatoo/oha) (Ohayou HTTP load generator) |
| **Duration** | 6 seconds |
| **Endpoint** | `GET /` returning a simple string |
| **Runtime** | Bun |

---

## 📊 Results

<div className="benchmark-results">

| Framework | Requests/sec | Avg Latency | Fastest | Slowest |
|:----------|:------------:|:-----------:|:-------:|:-------:|
| 🥇 **Carno.js** | **234,562** | **0.21 ms** | 0.01 ms | 3.04 ms |
| 🥈 Elysia | 167,206 | 0.29 ms | 0.02 ms | 17.06 ms |

</div>

### ⚡ Carno.js — 40% faster

```ansi
Summary:
  Success rate:   100.00%
  Total:          6000.93 ms
  Slowest:        3.0463 ms
  Fastest:        0.0131 ms
  Average:        0.2116 ms
  Requests/sec:   234,562.81

Response time distribution:
  10.00% in 0.1548 ms
  25.00% in 0.1618 ms
  50.00% in 0.1722 ms   ← median
  75.00% in 0.2701 ms
  90.00% in 0.2940 ms
  95.00% in 0.3230 ms
  99.00% in 0.5540 ms
  99.90% in 1.3634 ms
  99.99% in 1.9256 ms
```

### 🔵 Elysia

```ansi
Summary:
  Success rate:   100.00%
  Total:          6000.99 ms
  Slowest:        17.0686 ms
  Fastest:        0.0238 ms
  Average:        0.2974 ms
  Requests/sec:   167,206.54

Response time distribution:
  10.00% in 0.2063 ms
  25.00% in 0.2152 ms
  50.00% in 0.2311 ms   ← median
```

---

## 🔬 Why Carno.js is Faster

| Feature | Benefit |
|---------|---------|
| **Zero abstraction at runtime** | Everything is compiled at startup |
| **Direct Bun.serve()** | Native routes with no intermediate layers |
| **JIT compiled handlers** | AOT async detection for optimal execution |
| **Radix tree router** | O(log n) routing for dynamic paths |
| **No middleware overhead** | Compiled middleware chain |

---

## 🧪 Run Your Own Benchmark

Don't just take our word for it! Run the benchmark yourself and see the results on your machine.

### Prerequisites

Make sure you have [oha](https://github.com/hatoo/oha) installed:

```bash
# macOS
brew install oha

# Cargo
cargo install oha
```

### Run the test

```bash
# Clone the repository
git clone https://github.com/carnojs/carno.js.git
cd carno.js

# Install dependencies
bun install

# Start the server (in one terminal)
bun benchmarks/http/carno-server.ts

# Run the benchmark (in another terminal)
oha -z 6s http://localhost:3000/
```

:::tip Share Your Results!
Got interesting benchmark results? We'd love to see them! Open an issue or discussion on our [GitHub repository](https://github.com/carnojs/carno.js).
:::
