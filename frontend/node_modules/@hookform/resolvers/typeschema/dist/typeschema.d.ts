import type { Resolver } from './types';
/**
 * Creates a resolver for react-hook-form using TypeSchema validation
 * @param {any} schema - The TypeSchema to validate against
 * @param {any} _ - Unused parameter
 * @param {Object} resolverOptions - Additional resolver configuration
 * @param {string} [resolverOptions.mode='async'] - Validation mode
 * @returns {Resolver} A resolver function compatible with react-hook-form
 * @example
 * const schema = z.object({
 *   name: z.string().required(),
 *   age: z.number().required(),
 * });
 *
 * useForm({
 *   resolver: typeschemaResolver(schema)
 * });
 */
export declare const typeschemaResolver: Resolver;
