const ts = require("typescript") as typeof import("typescript");

type FunctionLikeNode = import("typescript").FunctionLikeDeclarationBase;
type Node = import("typescript").Node;
type SourceFile = import("typescript").SourceFile;

type FunctionHotspot = {
  name: string;
  kind: string;
  startLine: number;
  endLine: number;
  lines: number;
};

function syntaxKindLabel(kind: import("typescript").SyntaxKind) {
  switch (kind) {
    case ts.SyntaxKind.FunctionDeclaration:
      return "function";
    case ts.SyntaxKind.MethodDeclaration:
      return "method";
    case ts.SyntaxKind.ArrowFunction:
      return "arrow";
    case ts.SyntaxKind.FunctionExpression:
      return "function-expression";
    case ts.SyntaxKind.Constructor:
      return "constructor";
    case ts.SyntaxKind.GetAccessor:
      return "getter";
    case ts.SyntaxKind.SetAccessor:
      return "setter";
    default:
      return ts.SyntaxKind[kind] || "function-like";
  }
}

function getPropertyNameText(
  name:
    | import("typescript").PropertyName
    | import("typescript").DeclarationName
    | undefined
): string | null {
  if (!name) return null;
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name)) return name.text;
  if (ts.isNumericLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name)) return `[${name.expression.getText()}]`;
  return null;
}

function inferFunctionName(node: FunctionLikeNode): string {
  if ("name" in node) {
    const directName = getPropertyNameText(node.name);
    if (directName) return directName;
  }

  const parent = node.parent;
  if (!parent) return "<anonymous>";

  if (ts.isVariableDeclaration(parent)) {
    const variableName = getPropertyNameText(parent.name);
    if (variableName) return variableName;
  }

  if (ts.isPropertyAssignment(parent)) {
    const propName = getPropertyNameText(parent.name);
    if (propName) return propName;
  }

  if (ts.isBinaryExpression(parent)) {
    return parent.left.getText();
  }

  if (ts.isCallExpression(parent)) {
    return `${parent.expression.getText()}::<callback>`;
  }

  return "<anonymous>";
}

function isFunctionLike(node: Node): node is FunctionLikeNode {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function createSourceFile(filePath: string, source: string): SourceFile {
  const lowerPath = filePath.toLowerCase();
  const scriptKind = lowerPath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : lowerPath.endsWith(".ts")
      ? ts.ScriptKind.TS
      : lowerPath.endsWith(".jsx")
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.JS;

  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
}

function scanFunctionHotspots(
  source: string,
  filePath = "unknown",
  minLines = 1
): FunctionHotspot[] {
  const sourceFile = createSourceFile(filePath, source);
  const hotspots: FunctionHotspot[] = [];

  function visit(node: Node) {
    if (isFunctionLike(node) && node.body) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      const lines = end.line - start.line + 1;
      if (lines >= minLines) {
        hotspots.push({
          name: inferFunctionName(node),
          kind: syntaxKindLabel(node.kind),
          startLine: start.line + 1,
          endLine: end.line + 1,
          lines,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return hotspots;
}

module.exports = {
  scanFunctionHotspots,
};
