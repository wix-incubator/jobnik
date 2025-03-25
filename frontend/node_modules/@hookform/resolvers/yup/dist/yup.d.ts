import { FieldValues, Resolver } from 'react-hook-form';
import * as Yup from 'yup';
/**
 * Creates a resolver for react-hook-form using Yup schema validation
 * @param {Yup.ObjectSchema<TFieldValues> | ReturnType<typeof Yup.lazy<Yup.ObjectSchema<TFieldValues>>>} schema - Yup validation schema
 * @param {Parameters<(typeof schema)['validate']>[1]} schemaOptions - Options to pass to Yup's validate/validateSync
 * @param {Object} resolverOptions - Additional resolver configuration
 * @param {('async' | 'sync')} [resolverOptions.mode] - Validation mode
 * @param {boolean} [resolverOptions.raw] - If true, returns raw values instead of validated results
 * @returns {Resolver<Yup.InferType<typeof schema>>} A resolver function compatible with react-hook-form
 * @example
 * const schema = Yup.object({
 *   name: Yup.string().required(),
 *   age: Yup.number().required(),
 * });
 *
 * useForm({
 *   resolver: yupResolver(schema)
 * });
 */
export declare function yupResolver<TFieldValues extends FieldValues>(schema: Yup.ObjectSchema<TFieldValues> | ReturnType<typeof Yup.lazy<Yup.ObjectSchema<TFieldValues>>>, schemaOptions?: Parameters<(typeof schema)['validate']>[1], resolverOptions?: {
    mode?: 'async' | 'sync';
    raw?: boolean;
}): Resolver<Yup.InferType<typeof schema>>;
