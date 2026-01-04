import { describe, expect, test } from "bun:test";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  Headers,
} from "../src";
import { withCoreApplication } from "../src/testing";
import type { Context } from "../src";

describe("HTTP Methods Comprehensive Tests", () => {

  // ============================================================
  // GET TESTS
  // ============================================================

  describe("GET requests", () => {

    @Controller({ path: "/get-tests" })
    class GetTestController {

      @Get("/simple")
      simple() {
        return { message: "simple get" };
      }

      @Get("/string-response")
      stringResponse() {
        return "plain text response";
      }

      @Get("/null-response")
      nullResponse() {
        return null;
      }

      @Get("/undefined-response")
      undefinedResponse() {
        return undefined;
      }

      @Get("/number-response")
      numberResponse() {
        return 42;
      }

      @Get("/boolean-response")
      booleanResponse() {
        return true;
      }

      @Get("/array-response")
      arrayResponse() {
        return [1, 2, 3, { nested: true }];
      }

      @Get("/nested-json")
      nestedJson() {
        return {
          level1: {
            level2: {
              level3: {
                value: "deep"
              }
            }
          }
        };
      }

      @Get("/with-query")
      withQuery(@Query() query: Record<string, string>) {
        return { received: query };
      }

      @Get("/with-query-param")
      withQueryParam(
        @Query("name") name: string,
        @Query("age") age: string
      ) {
        return { name, age };
      }

      @Get("/with-headers")
      withHeaders(@Headers() headers: globalThis.Headers) {
        return {
          contentType: headers.get("content-type"),
          accept: headers.get("accept"),
          custom: headers.get("x-custom-header")
        };
      }

      @Get("/with-specific-header")
      withSpecificHeader(
        @Headers("authorization") auth: string,
        @Headers("x-request-id") requestId: string
      ) {
        return { auth, requestId };
      }

      @Get("/users/:id")
      withParam(@Param("id") id: string) {
        return { userId: id };
      }

      @Get("/posts/:postId")
      withPostParam(@Param("postId") postId: string) {
        return { postId };
      }

      @Get("/combined/:id")
      combined(
        @Param("id") id: string,
        @Query("filter") filter: string,
        @Headers("x-tenant") tenant: string
      ) {
        return { id, filter, tenant };
      }
    }

    test("Given simple GET endpoint, When called, Then returns JSON", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/simple");
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.message).toBe("simple get");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET endpoint returning string, When called, Then returns text", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/string-response");
          const text = await response.text();

          expect(response.status).toBe(200);
          expect(text).toBe("plain text response");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET endpoint returning null, When called, Then returns empty", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/null-response");
          const text = await response.text();

          expect(response.status).toBe(200);
          expect(text).toBe("");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET endpoint returning undefined, When called, Then returns empty", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/undefined-response");
          const text = await response.text();

          expect(response.status).toBe(200);
          expect(text).toBe("");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET endpoint returning number, When called, Then returns number as text", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/number-response");
          const text = await response.text();

          expect(response.status).toBe(200);
          expect(text).toBe("42");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET endpoint returning array, When called, Then returns JSON array", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/array-response");
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload).toEqual([1, 2, 3, { nested: true }]);
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET endpoint returning nested JSON, When called, Then returns deep object", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/nested-json");
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.level1.level2.level3.value).toBe("deep");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET with query params, When called with params, Then receives query object", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/with-query?foo=bar&baz=qux");
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.received.foo).toBe("bar");
          expect(payload.received.baz).toBe("qux");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET with specific query params, When called, Then extracts specific params", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/with-query-param?name=John&age=30");
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.name).toBe("John");
          expect(payload.age).toBe("30");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET with headers decorator, When called with headers, Then receives headers", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/with-headers", {
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "X-Custom-Header": "custom-value"
            }
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.contentType).toBe("application/json");
          expect(payload.accept).toBe("application/json");
          expect(payload.custom).toBe("custom-value");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET with specific header params, When called, Then extracts headers", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/with-specific-header", {
            headers: {
              "Authorization": "Bearer token123",
              "X-Request-Id": "req-456"
            }
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.auth).toBe("Bearer token123");
          expect(payload.requestId).toBe("req-456");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET with path param, When called with param, Then extracts param", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/users/user-789");
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.userId).toBe("user-789");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET with post param, When called, Then extracts param", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/posts/post-123");
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.postId).toBe("post-123");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });

    test("Given GET with combined decorators, When called, Then extracts all", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/get-tests/combined/item-123?filter=active", {
            headers: { "X-Tenant": "tenant-abc" }
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.id).toBe("item-123");
          expect(payload.filter).toBe("active");
          expect(payload.tenant).toBe("tenant-abc");
        },
        { listen: true, config: { providers: [GetTestController] } }
      );
    });
  });

  // ============================================================
  // POST TESTS
  // ============================================================

  describe("POST requests", () => {

    @Controller({ path: "/post-tests" })
    class PostTestController {

      @Post("/simple")
      simple() {
        return { message: "simple post" };
      }

      @Post("/with-body")
      withBody(@Body() body: any) {
        return { received: body };
      }

      @Post("/with-body-field")
      withBodyField(
        @Body("name") name: string,
        @Body("email") email: string
      ) {
        return { name, email };
      }

      @Post("/with-nested-body")
      withNestedBody(@Body() body: any) {
        return {
          userName: body.user?.name,
          userEmail: body.user?.email,
          addressCity: body.address?.city
        };
      }

      @Post("/with-array-body")
      withArrayBody(@Body() body: any[]) {
        return { count: body.length, items: body };
      }

      @Post("/with-headers")
      withHeaders(
        @Body() body: any,
        @Headers("content-type") contentType: string,
        @Headers("authorization") auth: string
      ) {
        return { body, contentType, auth };
      }

      @Post("/users/:id")
      withParam(
        @Param("id") id: string,
        @Body() body: any
      ) {
        return { id, ...body };
      }

      @Post("/combined/:id")
      combined(
        @Param("id") id: string,
        @Query("action") action: string,
        @Body() body: any,
        @Headers("x-trace-id") traceId: string
      ) {
        return { id, action, body, traceId };
      }

      @Post("/empty-body")
      emptyBody(@Body() body: any) {
        return { isEmpty: Object.keys(body || {}).length === 0, body };
      }

      @Post("/form-urlencoded")
      formUrlencoded(@Body() body: any) {
        return { received: body };
      }
    }

    test("Given simple POST endpoint, When called, Then returns JSON", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/simple", {
            method: "POST"
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.message).toBe("simple post");
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });

    test("Given POST with JSON body, When called, Then parses body", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/with-body", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "John", age: 30 })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.received.name).toBe("John");
          expect(payload.received.age).toBe(30);
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });

    test("Given POST with body field extraction, When called, Then extracts fields", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/with-body-field", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Jane", email: "jane@test.com", extra: "ignored" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.name).toBe("Jane");
          expect(payload.email).toBe("jane@test.com");
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });

    test("Given POST with nested JSON body, When called, Then parses nested", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/with-nested-body", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user: { name: "Bob", email: "bob@test.com" },
              address: { city: "New York", zip: "10001" }
            })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.userName).toBe("Bob");
          expect(payload.userEmail).toBe("bob@test.com");
          expect(payload.addressCity).toBe("New York");
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });

    test("Given POST with array body, When called, Then parses array", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/with-array-body", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }])
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.count).toBe(3);
          expect(payload.items[0].id).toBe(1);
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });

    test("Given POST with body and headers, When called, Then receives both", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/with-headers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer secret-token"
            },
            body: JSON.stringify({ data: "test" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.body.data).toBe("test");
          expect(payload.contentType).toBe("application/json");
          expect(payload.auth).toBe("Bearer secret-token");
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });

    test("Given POST with path param and body, When called, Then extracts both", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/users/user-999", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Alice", role: "admin" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.id).toBe("user-999");
          expect(payload.name).toBe("Alice");
          expect(payload.role).toBe("admin");
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });

    test("Given POST with all decorator types, When called, Then extracts all", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/combined/item-456?action=create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Trace-Id": "trace-789"
            },
            body: JSON.stringify({ payload: "data" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.id).toBe("item-456");
          expect(payload.action).toBe("create");
          expect(payload.body.payload).toBe("data");
          expect(payload.traceId).toBe("trace-789");
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });

    test("Given POST with empty body, When called, Then handles gracefully", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/empty-body", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.isEmpty).toBe(true);
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });

    test("Given POST with form-urlencoded, When called, Then parses form data", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/post-tests/form-urlencoded", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "username=john&password=secret123"
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.received.username).toBe("john");
          expect(payload.received.password).toBe("secret123");
        },
        { listen: true, config: { providers: [PostTestController] } }
      );
    });
  });

  // ============================================================
  // PUT TESTS
  // ============================================================

  describe("PUT requests", () => {

    @Controller({ path: "/put-tests" })
    class PutTestController {

      @Put("/simple")
      simple() {
        return { message: "simple put" };
      }

      @Put("/with-body")
      withBody(@Body() body: any) {
        return { updated: true, data: body };
      }

      @Put("/resources/:id")
      updateResource(
        @Param("id") id: string,
        @Body() body: any
      ) {
        return { id, ...body, updatedAt: "2024-01-01" };
      }

      @Put("/resources/:id/items/:itemId")
      updateNestedResource(
        @Param("id") resourceId: string,
        @Param("itemId") itemId: string,
        @Body() body: any
      ) {
        return { resourceId, itemId, ...body };
      }

      @Put("/with-headers/:id")
      withHeaders(
        @Param("id") id: string,
        @Body() body: any,
        @Headers("if-match") etag: string,
        @Headers("content-type") contentType: string
      ) {
        return { id, body, etag, contentType };
      }

      @Put("/full/:id")
      fullUpdate(
        @Param("id") id: string,
        @Query("version") version: string,
        @Body() body: any,
        @Headers("authorization") auth: string
      ) {
        return { id, version, body, auth };
      }

      @Put("/replace")
      replaceAll(@Body() body: any) {
        return { replaced: true, newData: body };
      }
    }

    test("Given simple PUT endpoint, When called, Then returns JSON", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/put-tests/simple", {
            method: "PUT"
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.message).toBe("simple put");
        },
        { listen: true, config: { providers: [PutTestController] } }
      );
    });

    test("Given PUT with body, When called, Then updates with body", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/put-tests/with-body", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Updated Name", status: "active" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.updated).toBe(true);
          expect(payload.data.name).toBe("Updated Name");
          expect(payload.data.status).toBe("active");
        },
        { listen: true, config: { providers: [PutTestController] } }
      );
    });

    test("Given PUT with param and body, When called, Then updates resource", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/put-tests/resources/res-123", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New Title", content: "New Content" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.id).toBe("res-123");
          expect(payload.title).toBe("New Title");
          expect(payload.content).toBe("New Content");
          expect(payload.updatedAt).toBe("2024-01-01");
        },
        { listen: true, config: { providers: [PutTestController] } }
      );
    });

    test("Given PUT with nested params, When called, Then extracts all params", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/put-tests/resources/parent-1/items/child-2", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: 100 })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.resourceId).toBe("parent-1");
          expect(payload.itemId).toBe("child-2");
          expect(payload.value).toBe(100);
        },
        { listen: true, config: { providers: [PutTestController] } }
      );
    });

    test("Given PUT with ETag header, When called, Then receives etag", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/put-tests/with-headers/item-789", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "If-Match": '"abc123"'
            },
            body: JSON.stringify({ data: "test" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.id).toBe("item-789");
          expect(payload.etag).toBe('"abc123"');
          expect(payload.contentType).toBe("application/json");
        },
        { listen: true, config: { providers: [PutTestController] } }
      );
    });

    test("Given PUT with all decorators, When called, Then extracts all", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/put-tests/full/doc-456?version=2", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer update-token"
            },
            body: JSON.stringify({ content: "Full update" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.id).toBe("doc-456");
          expect(payload.version).toBe("2");
          expect(payload.body.content).toBe("Full update");
          expect(payload.auth).toBe("Bearer update-token");
        },
        { listen: true, config: { providers: [PutTestController] } }
      );
    });

    test("Given PUT to replace collection, When called, Then replaces all", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/put-tests/replace", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: [{ id: 1 }, { id: 2 }] })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.replaced).toBe(true);
          expect(payload.newData.items.length).toBe(2);
        },
        { listen: true, config: { providers: [PutTestController] } }
      );
    });
  });

  // ============================================================
  // DELETE & PATCH TESTS
  // ============================================================

  describe("DELETE and PATCH requests", () => {

    @Controller({ path: "/other-tests" })
    class OtherMethodsController {

      @Delete("/resources/:id")
      deleteResource(
        @Param("id") id: string,
        @Headers("authorization") auth: string
      ) {
        return { deleted: true, id, auth };
      }

      @Delete("/resources/:id/force")
      forceDelete(
        @Param("id") id: string,
        @Query("confirm") confirm: string
      ) {
        return { deleted: true, id, forced: confirm === "true" };
      }

      @Patch("/resources/:id")
      patchResource(
        @Param("id") id: string,
        @Body() body: any
      ) {
        return { patched: true, id, changes: body };
      }

      @Patch("/resources/:id/status")
      patchStatus(
        @Param("id") id: string,
        @Body("status") status: string
      ) {
        return { id, newStatus: status };
      }
    }

    test("Given DELETE with param and header, When called, Then deletes resource", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/other-tests/resources/del-123", {
            method: "DELETE",
            headers: { "Authorization": "Bearer delete-token" }
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.deleted).toBe(true);
          expect(payload.id).toBe("del-123");
          expect(payload.auth).toBe("Bearer delete-token");
        },
        { listen: true, config: { providers: [OtherMethodsController] } }
      );
    });

    test("Given DELETE with query param, When called, Then processes query", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/other-tests/resources/del-456/force?confirm=true", {
            method: "DELETE"
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.deleted).toBe(true);
          expect(payload.id).toBe("del-456");
          expect(payload.forced).toBe(true);
        },
        { listen: true, config: { providers: [OtherMethodsController] } }
      );
    });

    test("Given PATCH with partial body, When called, Then patches resource", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/other-tests/resources/patch-789", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Patched Name" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.patched).toBe(true);
          expect(payload.id).toBe("patch-789");
          expect(payload.changes.name).toBe("Patched Name");
        },
        { listen: true, config: { providers: [OtherMethodsController] } }
      );
    });

    test("Given PATCH with body field extraction, When called, Then extracts field", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/other-tests/resources/status-123/status", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "completed", extra: "ignored" })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.id).toBe("status-123");
          expect(payload.newStatus).toBe("completed");
        },
        { listen: true, config: { providers: [OtherMethodsController] } }
      );
    });
  });

  // ============================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================

  describe("Edge cases", () => {

    @Controller({ path: "/edge" })
    class EdgeCaseController {

      @Get("/special-chars/:id")
      specialChars(@Param("id") id: string) {
        return { id };
      }

      @Get("/unicode")
      unicode(@Query("name") name: string) {
        return { name };
      }

      @Post("/large-body")
      largeBody(@Body() body: any) {
        return { received: true, keyCount: Object.keys(body).length };
      }

      @Get("/no-params")
      noParams() {
        return { success: true };
      }

      @Post("/mixed-content")
      mixedContent(@Body() body: any) {
        return { body };
      }
    }

    test("Given path param with special characters, When called, Then handles correctly", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/edge/special-chars/item-with-dash_and_underscore");
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.id).toBe("item-with-dash_and_underscore");
        },
        { listen: true, config: { providers: [EdgeCaseController] } }
      );
    });

    test("Given query with unicode characters, When called, Then handles correctly", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/edge/unicode?name=" + encodeURIComponent("José García"));
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.name).toBe("José García");
        },
        { listen: true, config: { providers: [EdgeCaseController] } }
      );
    });

    test("Given large JSON body, When called, Then handles correctly", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const largeObject: Record<string, string> = {};

          for (let i = 0; i < 100; i++) {
            largeObject[`key${i}`] = `value${i}`;
          }

          const response = await request("/edge/large-body", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(largeObject)
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.received).toBe(true);
          expect(payload.keyCount).toBe(100);
        },
        { listen: true, config: { providers: [EdgeCaseController] } }
      );
    });

    test("Given endpoint without any params, When called, Then works correctly", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/edge/no-params");
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.success).toBe(true);
        },
        { listen: true, config: { providers: [EdgeCaseController] } }
      );
    });

    test("Given POST with boolean and number in body, When called, Then preserves types", async () => {
      await withCoreApplication(
        async ({ request }) => {
          const response = await request("/edge/mixed-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              active: true,
              count: 42,
              price: 19.99,
              tags: ["a", "b"],
              nullable: null
            })
          });
          const payload = await response.json();

          expect(response.status).toBe(200);
          expect(payload.body.active).toBe(true);
          expect(payload.body.count).toBe(42);
          expect(payload.body.price).toBe(19.99);
          expect(payload.body.tags).toEqual(["a", "b"]);
          expect(payload.body.nullable).toBeNull();
        },
        { listen: true, config: { providers: [EdgeCaseController] } }
      );
    });
  });
});
