// Demonstrates using the `processTopLevelAwait` API from the `node` vendor.

import ts from "typescript";
import vm from "vm";
import { processTopLevelAwait } from '../vendor/node/await';

function sample() {
  // Here I'm mocking the filename and the code, but you can read this from a real file with any problems
  const filename = "example.ts";
  const code = "const add = (x: number, y: number): number => x + y; add(1, 2);";

  // Here we can pass the ECMAScript version in this case I'm passing the latest one
  const sourceFile = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest);

  const generateAst = (node: ts.Node, sourceFile: ts.SourceFile) => {
    const syntaxKind = ts.SyntaxKind[node.kind];
    const nodeText = node.getText(sourceFile);

    console.log(`${syntaxKind}: ${nodeText}`)
    node.forEachChild((child) => generateAst(child, sourceFile));
  };

  (() => generateAst(sourceFile, sourceFile))();
  console.log(JSON.stringify(sourceFile, null, 2));
}

const src = `
async function hello() {
  return "world";
}
const world = await hello();
const equation = 1 + 2;
console.log(world, equation);
`;

function parseAsyncFunction() {
  const processedSrc = processTopLevelAwait(src);
  console.log(processedSrc);

  const context1 = vm.createContext({ console });
  vm.runInContext(processedSrc, context1);
  vm.runInContext('console.log(hello())', context1);
  vm.runInContext('world', context1);
  vm.runInContext('console.log("Hello world")', context1);
  // console.log(context1);

  const script = new vm.Script(processedSrc);
  const context2 = vm.createContext();
  script.runInContext(context2);
}

parseAsyncFunction();