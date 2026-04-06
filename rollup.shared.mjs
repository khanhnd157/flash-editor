import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

export function createRollupConfig(packageDir) {
  const pkg = JSON.parse(readFileSync(`${packageDir}/package.json`, 'utf-8'));
  const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ];

  return [
    {
      input: `${packageDir}/src/index.ts`,
      output: [
        { file: `${packageDir}/dist/index.mjs`, format: 'esm', sourcemap: true },
        { file: `${packageDir}/dist/index.cjs`, format: 'cjs', sourcemap: true },
      ],
      external,
      plugins: [
        typescript({
          tsconfig: `${packageDir}/tsconfig.json`,
          declaration: false,
        }),
      ],
    },
    {
      input: `${packageDir}/src/index.ts`,
      output: { file: `${packageDir}/dist/index.d.ts`, format: 'esm' },
      external,
      plugins: [dts({ tsconfig: `${packageDir}/tsconfig.json` })],
    },
  ];
}
