/// <reference types="vitest" />

import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		reporters: ['github-actions', 'minimal'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.mts'],
			reporter: ['text', 'lcovonly'],
		},
		include: ['test/**/*.test.mts'],
		testTimeout: 10000,
	},
});
