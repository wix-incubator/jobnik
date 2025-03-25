import { Type } from 'computed-types';
import FunctionType from 'computed-types/lib/schema/FunctionType';
import type { Resolver } from 'react-hook-form';
/**
 * Creates a resolver for react-hook-form using computed-types schema validation
 * @param {Schema} schema - The computed-types schema to validate against
 * @returns {Resolver<Type<typeof schema>>} A resolver function compatible with react-hook-form
 * @example
 * const schema = Schema({
 *   name: string,
 *   age: number
 * });
 *
 * useForm({
 *   resolver: computedTypesResolver(schema)
 * });
 */
export declare function computedTypesResolver<Schema extends FunctionType<any, any>>(schema: Schema): Resolver<Type<typeof schema>>;
