import type { ControlsConfig } from "@/lib/demo-types";

export function buildSnippet(
  componentName: string,
  controls: ControlsConfig,
  values?: Record<string, unknown>,
): string {
  const props = Object.entries(controls)
    .filter(([name]) => name !== "children")
    .map(([name, desc]) => {
      const val = values ? (values[name] ?? desc.default) : desc.default;
      if (typeof val === "boolean") return val ? name : `${name}={false}`;
      if (typeof val === "number") return `${name}={${val}}`;
      return `${name}="${val}"`;
    });

  const childrenControl = controls["children"];
  const childrenVal = values
    ? (values["children"] ?? childrenControl?.default)
    : childrenControl?.default;
  const children = childrenVal ? String(childrenVal) : "...";

  const propsStr = props.length > 0 ? " " + props.join(" ") : "";
  return `<${componentName}${propsStr}>${children}</${componentName}>`;
}
