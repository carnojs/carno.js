import { z } from "zod";
import type { ValidatorAdapter } from "../ValidatorAdapter";
import { Metadata } from "../../domain/Metadata";
import { HttpException } from "../../exceptions/HttpException";
import { VALIDATION_ZOD_SCHEMA } from "../../constants";
import type { ValidationIssue } from "../../utils/formatValidationErrors";

export interface ZodAdapterOptions {
  // Future: custom error messages, error formatting options
}

export class ZodAdapter implements ValidatorAdapter<ZodAdapterOptions> {
  constructor(private options: ZodAdapterOptions = {}) {}

  getName(): string {
    return "ZodAdapter";
  }

  getOptions(): ZodAdapterOptions {
    return this.options;
  }

  hasValidation(target: Function): boolean {
    return Metadata.has(VALIDATION_ZOD_SCHEMA, target);
  }

  validateAndTransform(target: Function, value: any): any {
    const schema = this.getSchema(target);

    if (!schema) {
      return value;
    }

    const result = schema.safeParse(value);

    if (!result.success) {
      const formattedErrors = this.formatZodErrors(result.error);
      throw new HttpException(formattedErrors, 400);
    }

    return result.data;
  }

  private getSchema(target: Function): z.ZodSchema | null {
    return Metadata.get(VALIDATION_ZOD_SCHEMA, target);
  }

  private formatZodErrors(error: z.ZodError): ValidationIssue[] {
    const issuesMap = new Map<string, string[]>();

    for (const issue of error.issues) {
      const field = this.buildFieldPath(issue.path);

      if (!issuesMap.has(field)) {
        issuesMap.set(field, []);
      }

      issuesMap.get(field)!.push(issue.message);
    }

    return Array.from(issuesMap.entries()).map(([field, messages]) => ({
      field,
      messages,
    }));
  }

  private buildFieldPath(path: (string | number | symbol)[]): string {
    if (path.length === 0) {
      return "body";
    }

    return path.map(p => String(p)).join(".");
  }
}
