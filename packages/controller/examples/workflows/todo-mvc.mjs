// Original at: https://github.com/mxschmitt/try-playwright/blob/main/frontend/src/examples/javascript/todo-mvc.js

// @ts-check

/**
 * @import * as index from "./index"
 */

/**
 * Helper function which will compare val1 with val2.
 * If they aren't equal it will throw an error.
 * @param {any} val1 
 * @param {any} val2 
 */
const expectEqual = (val1, val2) => {
  if (val1 !== val2) {
    throw new Error(`${val1} does not match ${val2}`)
  }
}

const TODO_NAME = 'Bake a cake';

// const browser = await playwright.chromium.launch({
//   slowMo: 100
// });
// const context = await browser.newContext({
//   recordVideo: {
//     dir: 'videos/'
//   }
// });

await page.goto('https://demo.playwright.dev/todomvc');

// Helper function to get the amount of todos on the page
const getCountOfTodos = () => page.$$eval('ul.todo-list > li', el => el.length)

// Initially there should be 0 entries
expectEqual(await getCountOfTodos(), 0)

// Adding a todo entry (click in the input, enter the todo title and press the Enter key)
await page.click('input.new-todo');
await page.fill('input.new-todo', TODO_NAME);
await page.press('input.new-todo', 'Enter');

// After adding 1 there should be 1 entry in the list
expectEqual(await getCountOfTodos(), 1)

// Here we get the text in the first todo item to see if it's the same which the user has entered
const textContentOfFirstTodoEntry = await page.$eval('ul.todo-list > li:nth-child(1) label', el => el.textContent)
expectEqual(textContentOfFirstTodoEntry, TODO_NAME)

// The todo list should be persistent. Here we reload the page and see if the entry is still there
await page.reload({
  waitUntil: 'networkidle'
});
expectEqual(await getCountOfTodos(), 1)

// Set the entry to completed
await page.click('input.toggle');

// Filter for active entries. There should be 0, because we have completed the entry already
await page.click('"Active"');
expectEqual(await getCountOfTodos(), 0)

// If we filter now for completed entries, there should be 1
await page.click('"Completed"');
expectEqual(await getCountOfTodos(), 1)

// Clear the list of completed entries, then it should be again 0
await page.click('"Clear completed"');
expectEqual(await getCountOfTodos(), 0)