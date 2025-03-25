import { VineValidator } from '@vinejs/vine';
import { Infer, ValidationOptions } from '@vinejs/vine/build/src/types';
import { Resolver } from 'react-hook-form';
/**
 * Creates a resolver for react-hook-form using VineJS schema validation
 * @param {T} schema - The VineJS schema to validate against
 * @param {ValidationOptions<any>} [schemaOptions] - Optional VineJS validation options
 * @param {Object} [resolverOptions] - Optional resolver configuration
 * @param {boolean} [resolverOptions.raw=false] - If true, returns raw values instead of validated results
 * @returns {Resolver<Infer<typeof schema>>} A resolver function compatible with react-hook-form
 * @example
 * const schema = vine.compile(
 *   vine.object({
 *     name: vine.string().minLength(2),
 *     age: vine.number().min(18)
 *   })
 * );
 *
 * useForm({
 *   resolver: vineResolver(schema)
 * });
 */
export declare function vineResolver<T extends VineValidator<any, any>>(schema: T, schemaOptions?: ValidationOptions<any>, resolverOptions?: {
    raw?: boolean;
}): Resolver<Infer<typeof schema>>;
