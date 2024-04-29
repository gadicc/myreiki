import React from "react";
import { FormContainer, FieldValues } from "react-hook-form-mui";
import { zodResolver } from "@hookform/resolvers/zod";

export function FormContainerSchema<
  TFieldValues extends FieldValues = FieldValues,
>({
  schema,
  children,
  ...rest
}: {
  schema: Parameters<typeof zodResolver>[0];
  children: React.ReactNode;
} & Parameters<typeof FormContainer<TFieldValues>>[0]) {
  const defaults = {
    resolver: zodResolver(schema),
    mode: "onChange" as const,
    reValidateMode: "onChange" as const,
  };

  return (
    <FormContainer {...defaults} {...rest}>
      {children}
    </FormContainer>
  );
}

export * from "react-hook-form-mui";
