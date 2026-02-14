#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const workspaceRoot = process.cwd();

const filesToScan = [
  "app/(components)/popularIngredients.tsx",
  "app/(components)/supplementRanking.tsx",
  "app/(components)/popularIngredientsNav.client.tsx",
  "app/(components)/supplementRankingNav.client.tsx",
  "components/common/topBar.tsx",
  "components/common/menuLinks.tsx",
];

function toPos(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile)
  );
  return { line: line + 1, column: character + 1 };
}

function readSourceFile(relativePath) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  return ts.createSourceFile(
    relativePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
}

function jsxTagName(node) {
  const raw = node.tagName?.getText?.() || "";
  if (!raw) return "";
  const lastDot = raw.lastIndexOf(".");
  return lastDot >= 0 ? raw.slice(lastDot + 1) : raw;
}

function countRouterPushInNode(node) {
  let count = 0;
  function walk(current) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.expression.getText() === "router" &&
      current.expression.name.getText() === "push"
    ) {
      count += 1;
    }
    ts.forEachChild(current, walk);
  }
  walk(node);
  return count;
}

function scanSourceFile(sourceFile) {
  const duplicateProps = [];
  const nestedLinks = [];
  const multiPushInTransition = [];
  const topbarMultiPush = [];

  const linkStack = [];

  function scanJsxOpeningLike(node, attributes, name) {
    const attrCounts = new Map();
    attributes.properties.forEach((property) => {
      if (!ts.isJsxAttribute(property) || !property.name) return;
      const attrName = property.name.getText();
      attrCounts.set(attrName, (attrCounts.get(attrName) || 0) + 1);
    });
    for (const [attrName, count] of attrCounts.entries()) {
      if (count > 1) {
        const pos = toPos(sourceFile, node);
        duplicateProps.push({
          file: sourceFile.fileName,
          line: pos.line,
          column: pos.column,
          tag: name,
          prop: attrName,
          count,
        });
      }
    }
  }

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node)) {
      const name = jsxTagName(node);
      scanJsxOpeningLike(node, node.attributes, name);
      const isLink = name === "Link" || name === "IntentPrefetchLink";
      if (isLink && linkStack.length > 0) {
        const pos = toPos(sourceFile, node);
        nestedLinks.push({
          file: sourceFile.fileName,
          line: pos.line,
          column: pos.column,
          tag: name,
          inside: linkStack[linkStack.length - 1],
        });
      }
      return;
    }

    if (ts.isJsxElement(node)) {
      const name = jsxTagName(node.openingElement);
      scanJsxOpeningLike(node.openingElement, node.openingElement.attributes, name);

      const isLink = name === "Link" || name === "IntentPrefetchLink";
      if (isLink && linkStack.length > 0) {
        const pos = toPos(sourceFile, node.openingElement);
        nestedLinks.push({
          file: sourceFile.fileName,
          line: pos.line,
          column: pos.column,
          tag: name,
          inside: linkStack[linkStack.length - 1],
        });
      }

      if (isLink) linkStack.push(name);
      node.children.forEach(visit);
      if (isLink) linkStack.pop();
      return;
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "startTransition" &&
      node.arguments.length >= 1
    ) {
      const callback = node.arguments[0];
      if (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) {
        const pushCount = countRouterPushInNode(callback.body);
        if (pushCount > 1) {
          const pos = toPos(sourceFile, node);
          multiPushInTransition.push({
            file: sourceFile.fileName,
            line: pos.line,
            column: pos.column,
            pushCount,
          });
        }
      }
    }

    if (
      sourceFile.fileName === "components/common/topBar.tsx" &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      (node.name.text === "goHome" || node.name.text === "goSevenDays") &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      const pushCount = countRouterPushInNode(node.initializer.body);
      if (pushCount > 1) {
        const pos = toPos(sourceFile, node);
        topbarMultiPush.push({
          file: sourceFile.fileName,
          line: pos.line,
          column: pos.column,
          functionName: node.name.text,
          pushCount,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    duplicateProps,
    nestedLinks,
    multiPushInTransition,
    topbarMultiPush,
  };
}

function main() {
  const summary = {
    duplicateProps: [],
    nestedLinks: [],
    multiPushInTransition: [],
    topbarMultiPush: [],
  };

  filesToScan.forEach((relativePath) => {
    const sourceFile = readSourceFile(relativePath);
    const result = scanSourceFile(sourceFile);
    summary.duplicateProps.push(...result.duplicateProps);
    summary.nestedLinks.push(...result.nestedLinks);
    summary.multiPushInTransition.push(...result.multiPushInTransition);
    summary.topbarMultiPush.push(...result.topbarMultiPush);
  });

  const totalIssues =
    summary.duplicateProps.length +
    summary.nestedLinks.length +
    summary.multiPushInTransition.length +
    summary.topbarMultiPush.length;

  console.log(JSON.stringify({ totalIssues, ...summary }, null, 2));
  if (totalIssues > 0) process.exitCode = 1;
}

main();

