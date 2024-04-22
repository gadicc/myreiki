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
    options?: RegisterOptions<TFieldValues, TFieldName>,
  ): UseFormRegisterReturn<TFieldName> & {
    required: boolean;
    defaultValue?: Readonly<DeepPartial<TFieldValues>>[TFieldName];
    error: boolean;
    helperText?: string;
  };
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
    const error = formState.errors[name];

    const frProps: {
      required: boolean;
      defaultValue?: Readonly<DeepPartial<TFieldValues>>[TFieldName];
      error: boolean;
      helperText?: string;
    } = {
      required: !shape.isOptional(),
      defaultValue: formState.defaultValues?.[name],
      error: !!error,
    };

    if (error?.message) frProps.helperText = (error.message as string) || "";

    return { ...register(name), ...frProps };
  }

  return { ...outProps, fr };
}
