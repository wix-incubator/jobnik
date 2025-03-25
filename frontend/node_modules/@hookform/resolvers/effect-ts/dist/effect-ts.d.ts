import { Schema } from 'effect';
import { ParseOptions } from 'effect/SchemaAST';
import { FieldValues, Resolver } from 'react-hook-form';
/**
 * Creates a resolver for react-hook-form using Effect.ts schema validation
 * @param {Schema.Schema<TFieldValues, I>} schema - The Effect.ts schema to validate against
 * @param {ParseOptions} [schemaOptions] - Optional Effect.ts validation options
 * @returns {Resolver<Schema.Schema.Type<typeof schema>>} A resolver function compatible with react-hook-form
 * @example
 * const schema = Schema.Struct({
 *   name: Schema.String,
 *   age: Schema.Number
 * });
 *
 * useForm({
 *   resolver: effectTsResolver(schema)
 * });
 */
export declare function effectTsResolver<TFieldValues extends FieldValues, I>(schema: Schema.Schema<TFieldValues, I>, schemaOptions?: ParseOptions): Resolver<Schema.Schema.Type<typeof schema>>;
