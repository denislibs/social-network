import '@testing-library/jest-dom/vitest'

// jsdom не реализует window.scrollTo, а роутер вызывает его после навигации.
window.scrollTo = () => {}
