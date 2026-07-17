import type { FriendlyError } from '@/types';

/**
 * Translates raw JS/browser error messages into beginner-friendly explanations.
 * This is pattern-matching, not magic: we recognize the most common mistakes
 * beginners hit and explain them in plain language, pointing at the likely fix.
 */
export function translateError(rawMessage: string, source?: string): FriendlyError {
  const msg = rawMessage || '';

  // Cannot read properties of null (reading 'X') — classic "element not found" bug
  const nullPropMatch = msg.match(/Cannot read propert(?:y|ies) of null \(reading '([^']+)'\)/);
  if (nullPropMatch) {
    const prop = nullPropMatch[1];
    const idGuess = guessSelectorFromSource(source);
    return {
      title: idGuess
        ? `Element "${idGuess}" was not found`
        : `A page element was not found`,
      explanation: idGuess
        ? `Your script tried to use "${prop}" on an element with id "${idGuess}", but that element doesn't exist on the page yet.`
        : `Your script tried to use "${prop}" on something that turned out to be missing from the page.`,
      hint: idGuess
        ? `Check that your HTML has an element with id="${idGuess}", and that this <script> tag loads after that element (place scripts near the end of <body>).`
        : `Double-check the id or class name you're selecting matches your HTML exactly, and that the script runs after the HTML has loaded.`
    };
  }

  // Cannot read properties of undefined
  const undefPropMatch = msg.match(/Cannot read propert(?:y|ies) of undefined \(reading '([^']+)'\)/);
  if (undefPropMatch) {
    const prop = undefPropMatch[1];
    return {
      title: `Tried to use "${prop}" on something that doesn't exist yet`,
      explanation: `Your code expected a value to already exist before reading "${prop}" from it, but the value was undefined at that point.`,
      hint: `Check that any variable you're using has been created (with let/const) and given a value before this line runs.`
    };
  }

  // is not defined
  const notDefinedMatch = msg.match(/(\w+) is not defined/);
  if (notDefinedMatch) {
    const name = notDefinedMatch[1];
    return {
      title: `"${name}" hasn't been created`,
      explanation: `Your code uses "${name}", but nothing by that name has been declared with let, const, var, or function.`,
      hint: `Check for typos in the name, and make sure any <script> file that defines "${name}" loads before this one.`
    };
  }

  // is not a function
  const notFunctionMatch = msg.match(/(\S+) is not a function/);
  if (notFunctionMatch) {
    const name = notFunctionMatch[1];
    return {
      title: `"${name}" isn't a function`,
      explanation: `Your code tried to call "${name}" like a function (with parentheses), but it isn't one — it might be undefined, a typo, or the wrong type of value.`,
      hint: `Check the spelling of "${name}" and confirm it's actually a function where you defined it.`
    };
  }

  // Unexpected token — syntax error
  if (/Unexpected token/i.test(msg)) {
    return {
      title: `There's a typo in your code`,
      explanation: `The browser found a character it didn't expect while reading your JavaScript, which usually means a missing bracket, comma, or quote mark.`,
      hint: `Look at the line just above where the error points — a common cause is a missing closing } ) or ".`
    };
  }

  // Failed to fetch / network
  if (/Failed to fetch|NetworkError/i.test(msg)) {
    return {
      title: `A file or resource couldn't load`,
      explanation: `Your code tried to load something over the network (an image, script, or API) and it didn't respond.`,
      hint: `Check the file path is correct and, if you're offline, that the resource doesn't require an internet connection.`
    };
  }

  // Fallback: still friendly, still honest
  return {
    title: `Something went wrong while running your code`,
    explanation: msg || 'An unknown error occurred.',
    hint: `Check the Console tab in Preview for the exact line, and look for typos near it.`
  };
}

/** Best-effort guess at which element id a script was targeting, from a getElementById call near the error. */
function guessSelectorFromSource(source?: string): string | null {
  if (!source) return null;
  const match = source.match(/getElementById\(["']([^"']+)["']\)/);
  return match ? match[1] : null;
}
