import * as t from 'io-ts';
import { FieldValues, Resolver } from 'react-hook-form';
/**
 * Creates a resolver for react-hook-form using io-ts schema validation
 * @param {t.Type<TFieldValues, T>} schema - The io-ts schema to validate against
 * @param {Object} options - Additional resolver configuration
 * @param {string} [options.mode='async'] - Validation mode
 * @returns {Resolver<t.OutputOf<typeof schema>>} A resolver function compatible with react-hook-form
 * @example
 * const schema = t.type({
 *   name: t.string,
 *   age: t.number
 * });
 *
 * useForm({
 *   resolver: ioTsResolver(schema)
 * });
 */
export declare function ioTsResolver<T extends Record<string, any>, TFieldValues extends FieldValues>(schema: t.Type<TFieldValues, T>): Resolver<t.OutputOf<typeof schema>>;
