import {
  FieldValues,
  useForm as reactHookUseForm,
  UseFormProps,
  UseFormReturn,
  Path,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function useForm<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues extends FieldValues | undefined = undefined
>(
  props?: UseFormProps<TFieldValues, TContext> & { schema?: any }
): UseFormReturn<TFieldValues, TContext, TTransformedValues> & {
  fr: (name: Path<TFieldValues>) => any;
} {
  if (!props?.schema) throw new Error("useForm requires a { schema } prop");

  const defaults = {
    resolver: zodResolver(props.schema),
    mode: "onChange" as const,
    reValidateMode: "onChange" as const,
  };

  const outProps = reactHookUseForm<TFieldValues, TContext, TTransformedValues>(
    { ...defaults, ...props }
  );

  // function fr(name: keyof Omit<TFieldValues, "__ObjectIDs">) {
  function fr(name: Path<TFieldValues>) {
    if (!props) throw new Error("useForm requires a { schema } prop");
    const { formState, register } = outProps;
    const shape = props.schema.shape[name];

    return {
      ...register(name),
      required: !shape.isOptional(),
      defaultValue: formState.defaultValues?.[name],
      error: formState.errors[name] ? true : false,
      helperText: formState.errors[name] ? formState.errors[name]?.message : "",
    };
  }

  return { ...outProps, fr };
}
