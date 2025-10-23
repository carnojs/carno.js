# AI Code & Test Generation Rules and Duties

It is a lib (Framework and ORM) and uses **TypeScript** with Bun as the main language.  
The repository contains source code, documentation, and usage examples.

The AI MUST use **all available MCP tools** when performing tasks.

The AI MUST follow this documentation rigorously.
The focus in any development in this project is PERFORMANCE and EFFICIENCY.
All APIs created must be developer-friendly and easy to use.
Any changes to the feature must be updated or the doc created.

---

## 0. PLAN

### ANALYSIS

- The AI MUST perform a detailed analysis including: **Objective, Scope, and Impact**.

### STRATEGY

- The AI MUST define execution order.
- The AI MUST define validation points.
- The AI MUST identify risks and mitigation plans.

### REUSE

- **Backend**: The AI MUST reuse existing services without violating standards.

---

## 1. Engineering Principles

1. The AI MUST explicitly apply all **SOLID** principles.
2. The AI MUST respect all 9 **Object Calisthenics** rules (small methods, small classes, no getters/setters, etc.).
3. The AI MUST prioritize clean, extensible, and maintainable code.
4. The AI MUST eliminate unused or deprecated code immediately upon detection.
5. The AI MUST refactor whenever readability or maintainability improves.
6. The AI MUST always generate code in the **BEST possible way**, avoiding shortcuts or temporary solutions, even if refactoring is required.
7. The AI MUST NOT write code as one-liners. Code MUST be separated into readable blocks.
8. If a method or class grows too large, the AI MUST extract it into smaller ones.
9. The AI MUST use the Singleton pattern when applicable.
10. The AI MUST apply early return.
11. The AI MUST ensure classes are small (≤ 50 lines).
12. The AI MUST ensure methods/functions are small (≤ 5 lines).
13. The AI MUST write optimized queries. It MUST prefer **JOINs** instead of separate queries. It MUST NOT run queries inside loops and MUST use batches when possible.

⚠️ IMPORTANT: The AI MUST separate logical blocks with **blank spaces**.

---

## 2. Tests

1. The AI MUST use the **Given / When / Then** pattern.
2. The AI MUST NOT mock internal code. It MUST use the **pg_test database** for real integrations.
3. The AI MUST mock only **external API calls** (to avoid costs).
4. Tests are considered correct unless there is strong evidence otherwise:

    - If a test fails, the AI MUST evaluate whether the error is in the test or in the code logic.
    - If the failure is due to logic, the AI MUST NOT correct the code automatically.
    - Instead, the AI MUST pause execution and ask for authorization to fix the logic.

   The AI MUST follow this flow:

    1. Identify failing tests.
    2. Verify whether the code logic is wrong.
    3. Clearly explain where the logic error is and why the test is correct.
    4. Ask: **"Would you like me to fix the code logic to align with the tests?"**
    5. The AI MUST proceed with the fix only if explicitly authorized.

⚠️ The AI MUST NEVER alter logic only to make a test pass without validation.

---

## 3. Continuous Review

1. After any change, the AI MUST remove obsolete properties, methods, or modules.
2. The AI MUST run **`npm run build`**, **`npm run lint`**, and **`npm run test`** at the end of every task.
3. The AI MUST ensure the code compiles and passes linting/tests with **zero errors**.

---

## 4. Automatic Checklist (Before Closing Any PR)

The AI MUST verify all items below:

- [ ] All tests passed
- [ ] Build successful, no errors
- [ ] Lint passed with no pending issues
- [ ] Legacy code removed/updated

---