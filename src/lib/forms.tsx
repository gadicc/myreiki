import { valibotResolver } from "@hookform/resolvers/valibot";
import { useLingui } from "@lingui/react";
import { get } from "radash";
import {
  Controller,
  type DeepPartial,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
  type Resolver,
  useForm as reactHookUseForm,
  type UseFormProps,
  type UseFormRegisterReturn,
  type UseFormReturn,
} from "react-hook-form";
import { formFieldRequired } from "./formSchema";
import { displayError } from "./i18n/messages";

type ValibotSchema = Parameters<typeof valibotResolver>[0];
type FieldProps<
  T extends FieldValues,
  Name extends FieldPath<T>,
> = UseFormRegisterReturn<Name> & {
  required: boolean;
  defaultValue?: Readonly<DeepPartial<T>>[Name];
  error: boolean;
  helperText?: string;
};

/** Keep the MUI registration API while Valibot owns validation and coercion. */
export function useForm<
  T extends FieldValues = FieldValues,
  Context = unknown,
  Output extends FieldValues = T,
>(
  props: UseFormProps<T, Context, Output> & { schema: ValibotSchema },
): UseFormReturn<T, Context, Output> & {
  fr<Name extends FieldPath<T>>(
    name: Name,
    options?: RegisterOptions<T, Name> & { onChangeTransform?: boolean },
  ): FieldProps<T, Name>;
  Controller: typeof Controller;
} {
  const { schema, ...formProps } = props;
  const { i18n } = useLingui();
  // The schema strips persistence metadata; callers retain their edit revision.
  const resolver = valibotResolver(schema, {
    message: "Enter a valid value.",
  }) as Resolver<T, Context, Output>;
  const form = reactHookUseForm<T, Context, Output>({
    resolver,
    mode: "onChange",
    reValidateMode: "onChange",
    ...formProps,
  });

  function fr<Name extends FieldPath<T>>(
    name: Name,
    options: RegisterOptions<T, Name> & { onChangeTransform?: boolean } = {},
  ): FieldProps<T, Name> {
    const { onChangeTransform, ...registrationOptions } = options;
    const error = get<{ message?: unknown }>(form.formState.errors, name);
    const registration = form.register(
      name,
      registrationOptions as RegisterOptions<T, Name>,
    );
    if (onChangeTransform) {
      const original = registration.onChange;
      registration.onChange = (value) => original({ target: { name, value } });
    }
    return {
      ...registration,
      required: formFieldRequired(schema, name, (path) =>
        form.getValues(path as FieldPath<T>),
      ),
      defaultValue: get(form.formState.defaultValues, name),
      error: Boolean(error),
      ...(typeof error?.message === "string"
        ? { helperText: displayError(i18n, error.message) }
        : {}),
    };
  }

  return { ...form, fr, Controller };
}
