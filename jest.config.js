/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: "jsdom",
    transform: {
        "^.+\\.(ts|tsx|js|jsx)$": "babel-jest",
    },
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    },
    setupFilesAfterEnv: ["@testing-library/jest-dom"],
    testMatch: ["**/__tests__/**/*.test.(ts|tsx|js|jsx)"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};
