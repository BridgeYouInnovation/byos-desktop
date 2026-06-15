// Allow importing the schema as a raw string in the Vite main build.
declare module '*.sql?raw' {
  const content: string
  export default content
}
