export function renderTemplate(template: string, variables: Record<string, any>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = variables[key]
    return v == null ? "" : String(v)
  })
}
