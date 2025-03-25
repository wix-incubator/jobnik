import { Type } from 'arktype';
import { Resolver } from 'react-hook-form';
/**
 * Creates a resolver for react-hook-form using Arktype schema validation
 * @param {Schema} schema - The Arktype schema to validate against
 * @param {Object} resolverOptions - Additional resolver configuration
 * @param {string} [resolverOptions.mode='raw'] - Return the raw input values rather than the parsed values
 * @returns {Resolver<Schema['inferOut']>} A resolver function compatible with react-hook-form
 * @example
 * const schema = type({
 *   username: 'string>2'
 * });
 *
 * useForm({
 *   resolver: arktypeResolver(schema)
 * });
 */
export declare function arktypeResolver<Schema extends Type<any, any>>(schema: Schema, _schemaOptions?: never, resolverOptions?: {
    raw?: boolean;
}): Resolver<Schema['inferOut']>;
