import type { ValidatorAdapter } from "../ValidatorAdapter";
import { HttpException } from "../../exceptions/HttpException";
import { formatValidationErrors } from "../../utils/formatValidationErrors";

let classValidator: any;
let classTransformer: any;

try {
  classValidator = require("class-validator");
  classTransformer = require("class-transformer");
} catch (error) {
  // Will be checked in constructor
}

export interface ClassValidatorAdapterOptions {
  skipMissingProperties?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  forbidUnknownValues?: boolean;
  disableErrorMessages?: boolean;
  errorHttpStatusCode?: number;
  dismissDefaultMessages?: boolean;
  validationError?: {
    target?: boolean;
    value?: boolean;
  };
  stopAtFirstError?: boolean;
}

export class ClassValidatorAdapter
  implements ValidatorAdapter<ClassValidatorAdapterOptions>
{
  constructor(private options: ClassValidatorAdapterOptions = {}) {
    if (!classValidator || !classTransformer) {
      throw new Error(
        "ClassValidatorAdapter requires class-validator and class-transformer. " +
          "Install with: npm install class-validator class-transformer"
      );
    }
  }

  getName(): string {
    return "ClassValidatorAdapter";
  }

  getOptions(): ClassValidatorAdapterOptions {
    return this.options;
  }

  hasValidation(target: Function): boolean {
    const { getMetadataStorage } = classValidator;
    const metadataStorage = getMetadataStorage();

    const validationMetadata = metadataStorage.getTargetValidationMetadatas(
      target,
      "",
      false,
      false,
      []
    );

    return validationMetadata.length > 0;
  }

  validateAndTransform(target: Function, value: any): any {
    const { validateSync } = classValidator;
    const { plainToInstance } = classTransformer;

    const instance = plainToInstance(target as any, value);
    const errors = validateSync(instance, this.options);

    if (errors.length > 0) {
      const formatted = formatValidationErrors(errors);
      throw new HttpException(formatted, 400);
    }

    return instance;
  }
}
