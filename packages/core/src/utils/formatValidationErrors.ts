export type ValidationIssue = {
  field: string;
  messages: string[];
};

type ValidationErrorLike = {
  property?: string;
  constraints?: Record<string, string>;
  children?: ValidationErrorLike[];
};

export function formatValidationErrors(value: unknown): unknown {
  if (!shouldFormatErrors(value)) {
    return value;
  }

  return collectIssues(value);
}

function shouldFormatErrors(
  value: unknown
): value is ValidationErrorLike[] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length === 0) {
    return false;
  }

  return isValidationError(value[0]);
}

function isValidationError(value: unknown): value is ValidationErrorLike {
  if (!value) {
    return false;
  }

  if (typeof value !== "object") {
    return false;
  }

  return hasValidationShape(value as ValidationErrorLike);
}

function hasValidationShape(value: ValidationErrorLike): boolean {
  if ("constraints" in value) {
    return true;
  }

  if ("property" in value) {
    return true;
  }

  if ("children" in value) {
    return true;
  }

  return false;
}

function collectIssues(errors: ValidationErrorLike[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const error of errors) {
    appendIssues(error, "", issues);
  }

  return issues;
}

function appendIssues(
  error: ValidationErrorLike,
  prefix: string,
  issues: ValidationIssue[]
): void {
  const field = buildField(prefix, error.property);

  appendConstraints(error, field, issues);
  appendChildren(error, field, issues);
}

function appendConstraints(
  error: ValidationErrorLike,
  field: string,
  issues: ValidationIssue[]
): void {
  const constraints = error.constraints;

  if (!constraints) {
    return;
  }

  const messages = Object.values(constraints);

  if (messages.length === 0) {
    return;
  }

  issues.push({ field, messages });
}

function appendChildren(
  error: ValidationErrorLike,
  prefix: string,
  issues: ValidationIssue[]
): void {
  const children = error.children;

  if (!children || children.length === 0) {
    return;
  }

  for (const child of children) {
    appendIssues(child, prefix, issues);
  }
}

function buildField(prefix: string, property?: string): string {
  if (!property) {
    return prefix || "body";
  }

  if (!prefix) {
    return property;
  }

  return `${prefix}.${property}`;
}
