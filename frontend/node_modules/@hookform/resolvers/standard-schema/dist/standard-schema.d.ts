import { StandardSchemaV1 } from '@standard-schema/spec';
import { FieldValues, Resolver } from 'react-hook-form';
/**
 * Creates a resolver for react-hook-form that validates data using a Standard Schema.
 *
 * @param {Schema} schema - The Standard Schema to validate against
 * @param {Object} resolverOptions - Options for the resolver
 * @param {boolean} [resolverOptions.raw=false] - Whether to return raw input values instead of parsed values
 * @returns {Resolver} A resolver function compatible with react-hook-form
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   name: z.string().min(2),
 *   age: z.number().min(18)
 * });
 *
 * useForm({
 *   resolver: standardSchemaResolver(schema)
 * });
 * ```
 */
export declare function standardSchemaResolver<Schema extends StandardSchemaV1<FieldValues>>(schema: Schema, resolverOptions?: {
    raw?: boolean;
}): Resolver<StandardSchemaV1.InferOutput<Schema>>;
