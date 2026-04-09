const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxn7j-D2w1vNDnmdfO0WjnvJFjZtS2b_sFebfI7R2D6kcYkkLbi_dT5jEFHJSqMlDaa/exec"

export function getAppsScriptUrl() {
  return process.env.APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL
}