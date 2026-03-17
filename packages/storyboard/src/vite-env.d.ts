/// <reference types="vite/client" />

// Vite ?inline CSS imports return a string of CSS text
declare module '*?inline' {
    const css: string;
    export default css;
}
