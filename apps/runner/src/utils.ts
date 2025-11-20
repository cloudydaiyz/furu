export function displayObj(o: any, indent?: number) {
  return JSON.stringify(o, null, indent || 4);
}