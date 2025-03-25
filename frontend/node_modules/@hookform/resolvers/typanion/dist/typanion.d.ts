import type { FieldValues, Resolver } from 'react-hook-form';
import * as t from 'typanion';
/**
 * Creates a resolver for react-hook-form using Typanion schema validation
 * @param {t.StrictValidator<TFieldValues, TFieldValues>} schema - The Typanion schema to validate against
 * @param {Pick<t.ValidationState, 'coercions' | 'coercion'>} [schemaOptions] - Optional Typanion validation options
 * @returns {Resolver<t.InferType<typeof schema>>} A resolver function compatible with react-hook-form
 * @example
 * const schema = t.isObject({
 *   name: t.isString(),
 *   age: t.isInteger()
 * });
 *
 * useForm({
 *   resolver: typanionResolver(schema)
 * });
 */
export declare function typanionResolver<TFieldValues extends FieldValues>(schema: t.StrictValidator<TFieldValues, TFieldValues>, schemaOptions?: Pick<t.ValidationState, 'coercions' | 'coercion'>): Resolver<t.InferType<typeof schema>>;
