import { FieldValues, Resolver } from 'react-hook-form';
import { Infer, Struct, validate } from 'superstruct';
/**
 * Creates a resolver for react-hook-form using Superstruct schema validation
 * @param {Struct<TFieldValues, any>} schema - The Superstruct schema to validate against
 * @param {Parameters<typeof validate>[2]} [schemaOptions] - Optional Superstruct validation options
 * @param {Object} resolverOptions - Additional resolver configuration
 * @param {boolean} [resolverOptions.raw=false] - If true, returns raw values rather than validated results
 * @returns {Resolver<Infer<typeof schema>>} A resolver function compatible with react-hook-form
 * @example
 * const schema = struct({
 *   name: string(),
 *   age: number()
 * });
 *
 * useForm({
 *   resolver: superstructResolver(schema)
 * });
 */
export declare function superstructResolver<TFieldValues extends FieldValues>(schema: Struct<TFieldValues, any>, schemaOptions?: Parameters<typeof validate>[2], resolverOptions?: {
    raw?: boolean;
}): Resolver<Infer<typeof schema>>;
