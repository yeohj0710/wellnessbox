export function isColumnEditorEnabled() {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return process.env.COLUMN_EDITOR_ENABLED === "true";
}

export function isColumnEditorProdGateEnabled() {
  return process.env.NODE_ENV === "production" && isColumnEditorEnabled();
}
