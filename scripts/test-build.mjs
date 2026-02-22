import { execSync } from 'child_process'

try {
  const output = execSync('cd /vercel/share/v0-project && npx next build 2>&1', {
    encoding: 'utf-8',
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  })
  console.log(output)
} catch (error) {
  console.log('BUILD FAILED:')
  console.log(error.stdout || '')
  console.log(error.stderr || '')
  console.log('Exit code:', error.status)
}
