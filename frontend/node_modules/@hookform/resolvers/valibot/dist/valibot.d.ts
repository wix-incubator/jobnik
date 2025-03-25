import { FieldValues, Resolver } from 'react-hook-form';
import { BaseSchema, BaseSchemaAsync, Config, InferIssue, InferOutput } from 'valibot';
/**
 * Creates a resolver for react-hook-form using Valibot schema validation
 * @param {BaseSchema<TFieldValues, TFieldValues, any> | BaseSchemaAsync<TFieldValues, TFieldValues, any>} schema - The Valibot schema to validate against
 * @param {Partial<Omit<Config<InferIssue<typeof schema>>, 'abortPipeEarly' | 'skipPipe'>>} [schemaOptions] - Optional Valibot validation options
 * @param {Object} resolverOptions - Additional resolver configuration
 * @param {('sync' | 'async')} [resolverOptions.mode] - Validation mode
 * @param {boolean} [resolverOptions.raw] - If true, returns raw values rather than validated results
 * @returns {Resolver<InferOutput<typeof schema>>} A resolver function compatible with react-hook-form
 * @example
 * const schema = valibot.object({
 *   name: valibot.string().minLength(2),
 *   age: valibot.number().min(18)
 * });
 *
 * useForm({
 *   resolver: valibotResolver(schema)
 * });
 */
export declare function valibotResolver<TFieldValues extends FieldValues>(schema: BaseSchema<TFieldValues, TFieldValues, any> | BaseSchemaAsync<TFieldValues, TFieldValues, any>, schemaOptions?: Partial<Omit<Config<InferIssue<typeof schema>>, 'abortPipeEarly' | 'skipPipe'>>, resolverOptions?: {
    /**
     * @default async
     */
    mode?: 'sync' | 'async';
    /**
     * Return the raw input values rather than the parsed values.
     * @default false
     */
    raw?: boolean;
}): Resolver<InferOutput<typeof schema>>;
