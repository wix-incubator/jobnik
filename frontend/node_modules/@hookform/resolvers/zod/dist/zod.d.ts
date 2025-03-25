import { FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';
/**
 * Creates a resolver function for react-hook-form that validates form data using a Zod schema
 * @param {z.ZodSchema<TFieldValues>} schema - The Zod schema used to validate the form data
 * @param {Partial<z.ParseParams>} [schemaOptions] - Optional configuration options for Zod parsing
 * @param {Object} [resolverOptions] - Optional resolver-specific configuration
 * @param {('async'|'sync')} [resolverOptions.mode='async'] - Validation mode. Use 'sync' for synchronous validation
 * @param {boolean} [resolverOptions.raw=false] - If true, returns the raw form values instead of the parsed data
 * @returns {Resolver<z.infer<typeof schema>>} A resolver function compatible with react-hook-form
 * @throws {Error} Throws if validation fails with a non-Zod error
 * @example
 * const schema = z.object({
 *   name: z.string().min(2),
 *   age: z.number().min(18)
 * });
 *
 * useForm({
 *   resolver: zodResolver(schema)
 * });
 */
export declare function zodResolver<TFieldValues extends FieldValues>(schema: z.ZodSchema<TFieldValues, any, any>, schemaOptions?: Partial<z.ParseParams>, resolverOptions?: {
    mode?: 'async' | 'sync';
    raw?: boolean;
}): Resolver<z.infer<typeof schema>>;
