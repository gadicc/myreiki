/** The Valibot metadata needed by this app's object, variant and array fields. */
type SchemaNode = {
  type?: string;
  wrapped?: SchemaNode;
  entries?: Record<string, SchemaNode>;
  item?: SchemaNode;
  key?: string;
  options?: SchemaNode[];
  literal?: unknown;
};

/** Resolve the active field and optional ancestors without treating nullable as optional. */
export function formFieldRequired(
  schema: unknown,
  name: string,
  getValue: (path: string) => unknown,
): boolean {
  let node = schema as SchemaNode | undefined;
  let optional = false;
  const path = name.split(".");
  for (let index = 0; index <= path.length; index++) {
    while (node?.wrapped) {
      optional ||= [
        "optional",
        "exact_optional",
        "undefinedable",
        "nullish",
      ].includes(node.type ?? "");
      node = node.wrapped;
    }
    if (node?.type === "variant") {
      const key = node.key!;
      const prefix = path.slice(0, index).join(".");
      const value = getValue(prefix ? `${prefix}.${key}` : key);
      node = node.options?.find(
        (option) => option.entries?.[key]?.literal === value,
      );
    }
    if (!node) throw new Error(`Form has no such field "${name}"`);
    if (index === path.length) return !optional;
    node = node.type === "array" ? node.item : node.entries?.[path[index]];
  }
  throw new Error(`Form has no such field "${name}"`);
}
