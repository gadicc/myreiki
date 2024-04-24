import {
  FieldValues,
  useForm as reactHookUseForm,
  UseFormProps,
  UseFormReturn,
  UseFormRegisterReturn,
  FieldPath,
  RegisterOptions,
  DeepPartial,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodRawShape } from "zod";

interface FrProps<
  TFieldValues extends FieldValues = FieldValues,
  TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  required: boolean;
  defaultValue?: Readonly<DeepPartial<TFieldValues>>[TFieldName];
  error: boolean;
  helperText?: string;
}

export function useForm<
  TFieldValues extends FieldValues = FieldValues,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TContext = any,
  TTransformedValues extends FieldValues | undefined = undefined,
>(
  props?: UseFormProps<TFieldValues, TContext> & {
    schema?: Parameters<typeof zodResolver>[0];
  },
): UseFormReturn<TFieldValues, TContext, TTransformedValues> & {
  fr<TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>(
    name: TFieldName,
    options?: RegisterOptions<TFieldValues, TFieldName> & {
      onChangeTransform?: boolean;
    },
  ): UseFormRegisterReturn<TFieldName> & FrProps<TFieldValues, TFieldName>;
} {
  if (!props?.schema) throw new Error("useForm requires a { schema } prop");

  const defaults = {
    resolver: zodResolver(props.schema),
    mode: "onChange" as const,
    reValidateMode: "onChange" as const,
  };

  const outProps = reactHookUseForm<TFieldValues, TContext, TTransformedValues>(
    { ...defaults, ...props },
  );

  // function fr(name: keyof Omit<TFieldValues, "__ObjectIDs">) {
  function fr<
    TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  >(
    name: TFieldName,
    options = {} as RegisterOptions<TFieldValues, TFieldName> & {
      onChangeTransform?: boolean;
    },
  ): UseFormRegisterReturn<TFieldName> & {
    required: boolean;
    defaultValue?: Readonly<DeepPartial<TFieldValues>>[TFieldName];
    error: boolean;
    helperText?: string;
  } {
    if (!(props && props.schema))
      throw new Error("useForm requires a { schema } prop");
    const { formState, register } = outProps;
    const shape =
      "shape" in props.schema
        ? (props.schema.shape as ZodRawShape)[name]
        : props.schema;
    if (!shape) throw new Error(`Form has no such field "${name}"`);
    const error = formState.errors[name];

    const frProps: FrProps<TFieldValues, TFieldName> = {
      required: !shape.isOptional(),
      defaultValue: formState.defaultValues?.[name],
      error: !!error,
    };

    if (error?.message) frProps.helperText = (error.message as string) || "";

    const regProps = register(name);
    if (options.onChangeTransform) {
      const orig = regProps.onChange;
      regProps.onChange = (newValue) => orig({ target: { value: newValue } });
    }

    return { ...regProps, ...frProps };
  }

  return { ...outProps, fr };
}
