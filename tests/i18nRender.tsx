import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import {
  type RenderHookOptions,
  type RenderOptions,
  renderHook as renderTestHook,
  render as renderUi,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { catalogs } from "@/lib/i18n/catalogs";

export function English({ children }: { children: ReactNode }) {
  return (
    <I18nProvider i18n={setupI18n({ locale: "en", messages: catalogs })}>
      {children}
    </I18nProvider>
  );
}
export function render(ui: ReactElement, options?: RenderOptions) {
  return renderUi(ui, { wrapper: English, ...options });
}
export function renderHook<Result, Props>(
  hook: (props: Props) => Result,
  options?: RenderHookOptions<Props>,
) {
  return renderTestHook(hook, { wrapper: English, ...options });
}
