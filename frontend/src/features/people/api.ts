export interface Person {
  id: string;
  name: string;
  age: number;
  role: string;
  introduction: string;
}
export function isPeople(value: unknown): value is Person[] {
  return Array.isArray(value) && value.every(person =>
    person && typeof person === "object" &&
    ["id", "name", "role", "introduction"].every(key => typeof person[key] === "string" && person[key].length > 0) &&
    Number.isInteger(person.age) && person.age >= 0);
}
